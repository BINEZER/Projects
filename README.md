# Project Tracker

Minimal, calm tracker for any project — shipments, client jobs, personal goals — with **weighted stages**.
Progress = Σ(stage weight × stage progress) ÷ Σ(weights), so weights are relative and fully adjustable per project.

- **Levels** – portfolio → program → project; progress, health, budget and risk roll up the tree (set a "weight in parent" per item)
- **Methods** – per project: **Traditional** (weighted phases), **Agile** (backlog, sprints, board, burndown, velocity) or **Hybrid** (phases, where a phase can be driven by its backlog items)
- **Health & metrics** – automatic green/amber/red from schedule (SPI), cost (CPI), overdue dates and risks; earned-value panel; RAID log with a probability × impact heat map
- **Team & work** – add people in Admin → Team; owners on projects/programs/phases; tasks with assignee, due date and hour estimate; a Work page with everyone's workload; a phase's progress can follow its tasks
- **Timeline** – Gantt chart of the whole portfolio (expandable into phases, sprints, dated tasks) plus a Timeline tab on every project
- **Costs & time** – expense ledger and time log (hourly rates per person) feed Spent, CPI and the forecast
- **Reminders** – bell with overdue and upcoming deadlines, optional daily browser notification, and a downloadable calendar (.ics) so your calendar reminds you when the app is closed
- **Dashboard** – KPIs, needs-attention list, filter/sort/search by level, method, category
- **Projects** – editable stages (name, weight, order), per-stage progress, custom details, activity log (add/edit/delete), duplicate, print
- **Reports** – filter by category/status/due range; charts; export **CSV** (projects, stages) and **Print / PDF**
- **Admin** – categories, templates (method, sprint length, agile phases), currency label, in-app PM guide, JSON backup & restore, theme, account
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
