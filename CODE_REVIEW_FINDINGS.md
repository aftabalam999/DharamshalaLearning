# Code Review Findings — Campus Learning Dashboard

Date: 2025-11-13
Repository: DharamshalaLearning (branch: main)

Summary
-------
This document summarizes a targeted code review focused on data-sync scripts, secrets exposure, and integration points for Google Sheets and Discord webhooks. It includes prioritized findings, recommended fixes, and a short remediation plan.

High priority findings
---------------------
1) Exposed secret-like values committed in repo
   - Discord webhook appears in `.env.example`, `.env`, and several docs. Example value: `https://discord.com/api/webhooks/1436988350031728713/...`
   - Firebase client API keys (strings starting with `AIzaSy...`) appear in `.env*`, `src/services/firebase.ts` and built assets in `/build`.
   - Why it matters: Webhooks and service account credentials (if present) are sensitive. If these are live, rotate them immediately. Client-side Firebase API keys are less sensitive (intended for public use) but should still be audited.

2) Secrets used by server scripts rely on `process.env` and service account JSON blobs
   - Scripts expect `FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_SERVICE_ACCOUNT` environment variables containing JSON. These must be provided securely via GitHub Actions Secrets or environment variables on the host.

3) Firestore quota observed during testing
   - Past runs exhausted Firestore quota. Large scans (sync all) should be throttled, run incrementally, or executed on Blaze plan.

4) Many debug logs scattered throughout frontend and backend
   - Helpful during development, but noisy for production. Consider using a logging framework with levels (info/warn/error) and redacting PII.

Medium priority findings
------------------------
1) TODOs and incomplete features
   - Items like session reassignment, email integration, export functionality are marked TODO across `src/services` and components.

2) Built assets contain embedded API keys
   - The `build/` folder contains client env values. Avoid committing built assets with secrets; prefer building during deployment.

3) `.env.example` contained real-looking values
   - This file has been updated in this commit to use placeholders.

Low priority findings
---------------------
1) Firestore security rules appear reasonable but rely on user doc existence checks — recommend a full security review.
2) Many scripts call `admin.initializeApp()` which is expected for admin scripts; ensure the service account provided has limited permissions.

Immediate actions taken (safe, non-destructive)
-----------------------------------------------
- Replaced real-looking tokens in `.env.example` with placeholder values to avoid accidental copy/paste of live secrets.
- Created this `CODE_REVIEW_FINDINGS.md` and committed both files.

Recommendations (short-term)
----------------------------
1) Rotate compromised or exposed secrets now
   - Regenerate Discord webhooks found in the repo and update environment variables wherever the bot runs.
   - Rotate any server-side service account keys that were committed or may have been exposed.

2) Remove secrets from history (optional, disruptive)
   - If secrets were committed to git history, use `git filter-repo` or BFG to purge them. Coordinate with collaborators because this rewrites history.

3) Use GitHub Secrets & environment variables
   - Store `FIREBASE_SERVICE_ACCOUNT`, `GOOGLE_SERVICE_ACCOUNT`, `GOOGLE_SHEETS_ID`, `DISCORD_WEBHOOK_URL`, etc. in GitHub Actions secrets (already referenced in workflows).

4) Add automated checks
   - Add a pre-commit hook / CI job that prevents accidental commit of high-entropy strings or webhook URLs.

5) Throttle and test sync scripts
   - Use incremental `since` timestamps (already implemented) and test with a small dataset to avoid quota exhaustion.

6) Move built artifacts out of repo
   - Remove committed `build/` from the repo if present and build during CI/CD. Ensure `.gitignore` contains `/build` (already present).

Follow-ups (next steps)
-----------------------
- Rotate any exposed webhooks/keys (owner action).
- If you want, I can prepare a `git filter-repo` or BFG command list to remove secrets from history.
- Add a lightweight CI check to detect webhook patterns or long base64 JSON blobs in commits.

Files inspected
---------------
- `scripts/sync-sheets.js` (sync logic, dedup hash, headers expectation)
- `package.json` (scripts & dependencies)
- `firestore.rules` (security rules)
- `.github/workflows/sync-sheets.yml` (uses GitHub Secrets for service accounts — good)
- `src/types/index.ts` (data types)
- `.env.example` (contained real-looking values — replaced)

Contact / questions
-------------------
If you'd like, I can also:
- Prepare and optionally run a non-destructive sweep (search & replace) to remove webhook strings from markdown/docs and replace them with placeholders.
- Generate the exact `git filter-repo` commands to purge secrets from history.
- Add a pre-commit Git hook and CI job to detect secrets.

---

Committed by automated review helper on behalf of repository owner.
