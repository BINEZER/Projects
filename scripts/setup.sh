#!/usr/bin/env bash
# One-time setup: Firebase project + Firestore + Hosting + GitHub auto-deploy.
# Needs: node, and (for GitHub auto-deploy) the `gcloud` and `gh` CLIs logged in.
# Usage: ./scripts/setup.sh <firebase-project-id>
set -euo pipefail
PROJECT="${1:?Usage: ./scripts/setup.sh <firebase-project-id>}"
FB="npx firebase"

echo "→ Logging in to Firebase…"; $FB login
echo "→ Creating project (skips if it already exists)…"
$FB projects:create "$PROJECT" --display-name "Project Tracker" 2>/dev/null || echo "  (exists, continuing)"
sed -i.bak "s/\"default\": \".*\"/\"default\": \"$PROJECT\"/" .firebaserc && rm -f .firebaserc.bak

echo "→ Adding a web app (enables the auto-config at /__/firebase/init.json)…"
$FB apps:create web "Project Tracker" --project "$PROJECT" 2>/dev/null || echo "  (exists, continuing)"

echo "→ Creating Firestore database…"
$FB firestore:databases:create "(default)" --location nam5 --project "$PROJECT" 2>/dev/null || echo "  (exists, continuing)"

echo "→ First deploy…"
npm ci && npm run build && $FB deploy --only hosting,firestore --project "$PROJECT"

if command -v gcloud >/dev/null && command -v gh >/dev/null; then
  echo "→ Wiring GitHub auto-deploy…"
  SA="gh-deploy@$PROJECT.iam.gserviceaccount.com"
  gcloud iam service-accounts create gh-deploy --project "$PROJECT" 2>/dev/null || true
  for role in roles/firebasehosting.admin roles/datastore.owner roles/firebaserules.admin roles/serviceusage.serviceUsageConsumer; do
    gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA" --role "$role" --condition=None >/dev/null
  done
  KEY="$(mktemp)"; gcloud iam service-accounts keys create "$KEY" --iam-account "$SA" --project "$PROJECT"
  gh secret set FIREBASE_SERVICE_ACCOUNT < "$KEY"; rm -f "$KEY"
  gh variable set FIREBASE_PROJECT_ID --body "$PROJECT"
  git add .firebaserc && git commit -m "Set Firebase project" >/dev/null 2>&1 || true
else
  echo "! gcloud/gh not found — skipping GitHub auto-deploy (see README)."
fi

cat <<MSG

✅ Deployed: https://$PROJECT.web.app
One click left (can't be scripted): Firebase console → Authentication → Get started →
Sign-in method → Google → Enable.  https://console.firebase.google.com/project/$PROJECT/authentication/providers
MSG
