import type { Config, Project, User } from '../types';
import { defaultConfig } from './templates';

export interface Backend {
  mode: 'firebase' | 'local';
  /** Calls back with the current user (or null). Returns unsubscribe. */
  onUser(cb: (u: User | null) => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  subscribe(u: User, cb: (p: Project[]) => void): () => void;
  save(u: User, p: Project): Promise<void>;
  remove(u: User, id: string): Promise<void>;
  /** Admin settings; cb gets defaults when nothing is stored yet. */
  subscribeConfig(u: User, cb: (c: Config) => void): () => void;
  saveConfig(u: User, c: Config): Promise<void>;
}

/** Firestore rejects `undefined`; drop it. */
export const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- Local (no Firebase config available, e.g. `npm run dev`) ----------
const KEY = 'tracker.projects.v1';
const listeners = new Set<() => void>();
const read = (): Project[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};
const write = (p: Project[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable */
  }
  listeners.forEach((l) => l());
};

const CKEY = 'tracker.config.v1';
const readConfig = (): Config => {
  try {
    return { ...defaultConfig(), ...JSON.parse(localStorage.getItem(CKEY) || '{}') };
  } catch {
    return defaultConfig();
  }
};

export const localBackend: Backend = {
  mode: 'local',
  onUser(cb) {
    cb({ uid: 'local', name: 'You' });
    return () => {};
  },
  async signIn() {},
  async signOut() {},
  subscribe(_u, cb) {
    const fire = () => cb(read());
    listeners.add(fire);
    fire();
    return () => listeners.delete(fire);
  },
  async save(_u, p) {
    const all = read();
    const i = all.findIndex((x) => x.id === p.id);
    if (i >= 0) all[i] = p;
    else all.push(p);
    write(all);
  },
  async remove(_u, id) {
    write(read().filter((x) => x.id !== id));
  },
  subscribeConfig(_u, cb) {
    const fire = () => cb(readConfig());
    listeners.add(fire);
    fire();
    return () => listeners.delete(fire);
  },
  async saveConfig(_u, c) {
    try {
      localStorage.setItem(CKEY, JSON.stringify(c));
    } catch {
      /* storage unavailable */
    }
    listeners.forEach((l) => l());
  },
};

// ---------- Firebase (config auto-served by Firebase Hosting) ----------
export async function loadBackend(): Promise<Backend> {
  let config: Record<string, string> | null = null;
  try {
    const r = await fetch('/__/firebase/init.json', { cache: 'no-store' });
    const ct = r.headers.get('content-type') || '';
    if (r.ok && ct.includes('json')) config = await r.json();
  } catch {
    /* not on Firebase Hosting */
  }
  if (!config?.apiKey) return localBackend;

  const [{ initializeApp }, auth, fs] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const app = initializeApp(config);
  const a = auth.getAuth(app);
  const db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache() });
  const col = (u: User) => fs.collection(db, 'users', u.uid, 'projects');

  return {
    mode: 'firebase',
    onUser: (cb) =>
      auth.onAuthStateChanged(a, (u) =>
        cb(u ? { uid: u.uid, name: u.displayName || u.email || 'You', email: u.email || undefined, photo: u.photoURL || undefined } : null),
      ),
    signIn: async () => {
      await auth.signInWithPopup(a, new auth.GoogleAuthProvider());
    },
    signOut: () => auth.signOut(a),
    subscribe: (u, cb) => fs.onSnapshot(col(u), (s) => cb(s.docs.map((d) => d.data() as Project))),
    save: (u, p) => fs.setDoc(fs.doc(col(u), p.id), clean(p)),
    remove: (u, id) => fs.deleteDoc(fs.doc(col(u), id)),
    subscribeConfig: (u, cb) =>
      fs.onSnapshot(fs.doc(db, 'users', u.uid, 'meta', 'config'), (s) => cb({ ...defaultConfig(), ...(s.data() as Partial<Config>) })),
    saveConfig: (u, c) => fs.setDoc(fs.doc(db, 'users', u.uid, 'meta', 'config'), clean(c)),
  };
}
