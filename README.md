# Project Tracker

Minimal, calm tracker for any project — shipments, client jobs, personal goals — with **weighted stages**.
Progress = Σ(stage weight × stage progress) ÷ Σ(weights), so weights are relative and fully adjustable per project.

- **Dashboard** – KPIs, needs-attention list, filter/sort/search
- **Projects** – editable stages (name, weight, order), per-stage progress, custom details, activity log (add/edit/delete), duplicate, print
- **Reports** – filter by category/status/due range; charts; export **CSV** (projects, stages) and **Print / PDF**
- **Admin** – rename/delete categories, create/edit/duplicate/delete templates, JSON backup & restore, theme, account
- Everything user-defined can be edited and deleted.

## Run locally
```bash
npm install && npm run dev      # local mode: data stays in your browser
```

## Deploy (Firebase + GitHub Actions)
```bash
./scripts/setup.sh my-tracker-id
```
Creates the Firebase project, web app, Firestore and rules; deploys; then (if `gcloud` + `gh` are logged in)
creates a deploy service account and sets the `FIREBASE_SERVICE_ACCOUNT` secret and `FIREBASE_PROJECT_ID`
variable, so every push to `main` deploys via `.github/workflows/deploy.yml`.

**No config files to edit:** on Firebase Hosting the app loads its config from `/__/firebase/init.json`.

**Only manual step:** enable Google sign-in (Firebase console → Authentication → Sign-in method → Google).

Data lives at `users/{uid}/projects/*` and `users/{uid}/meta/config`; rules limit access to the owner.
