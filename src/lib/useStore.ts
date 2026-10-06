import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Config, Project, User } from '../types';
import { defaultConfig } from './templates';
import { normalize } from './pm';
import { loadBackend, type Backend } from './backend';

export function useStore() {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [user, setUser] = useState<User | null | undefined>(undefined); // undefined = resolving
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [config, setConfig] = useState<Config>(defaultConfig);

  useEffect(() => {
    loadBackend().then(setBackend);
  }, []);

  useEffect(() => (backend ? backend.onUser(setUser) : undefined), [backend]);

  useEffect(() => {
    if (!backend || !user) {
      setProjects(null);
      return;
    }
    const a = backend.subscribe(user, (ps) => setProjects(ps.map(normalize)));
    const b = backend.subscribeConfig(user, setConfig);
    return () => {
      a();
      b();
    };
  }, [backend, user]);

  const save = useCallback(
    (p: Project) => (backend && user ? backend.save(user, { ...p, updatedAt: Date.now() }) : Promise.resolve()),
    [backend, user],
  );
  const remove = useCallback((id: string) => (backend && user ? backend.remove(user, id) : Promise.resolve()), [backend, user]);

  const saveConfig = useCallback((c: Config) => (backend && user ? backend.saveConfig(user, c) : Promise.resolve()), [backend, user]);

  return useMemo(
    () => ({
      ready: !!backend && user !== undefined,
      mode: backend?.mode,
      user: user || null,
      projects,
      config,
      saveConfig,
      save,
      remove,
      signIn: () => backend?.signIn(),
      signOut: () => backend?.signOut(),
    }),
    [backend, user, projects, config, saveConfig, save, remove],
  );
}
export type Store = ReturnType<typeof useStore>;
