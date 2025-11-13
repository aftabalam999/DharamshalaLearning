# Git History Purge Plan (secrets & sensitive files)

This document shows safe, repeatable steps you can run to purge secrets from git history. **Warning:** rewriting history is disruptive — coordinate with collaborators and back up the repository first.

Recommended approaches
----------------------
1) git-filter-repo (recommended)

Prereq: install git-filter-repo (e.g., on macOS via `brew install git-filter-repo` or see https://github.com/newren/git-filter-repo).

Example: replace explicit webhook and API key strings with placeholders.

1. Clone a fresh mirror of the repo:

```bash
git clone --mirror https://github.com/<owner>/<repo>.git repo-mirror.git
cd repo-mirror.git
```

2. Create a replacements file `replacements.txt` with lines of the form:

```
# Replace exact webhook with placeholder
https://discord.com/api/webhooks/1436988350031728713/GdRSz1rDru8d6UvRRNI...==>REDACTED_DISCORD_WEBHOOK

# Replace AIza keys
AIzaSyBaLncnVJzGRHxgpAhyl9IeX8dz2e3e-VA==>REDACTED_FIREBASE_API_KEY
```

3. Run git-filter-repo:

```bash
git filter-repo --replace-text ../replacements.txt
```

4. Push rewritten history (force push):

```bash
git push --force --all
git push --force --tags
```

2) BFG Repo-Cleaner (alternate)

Prereq: Install BFG (https://rtyley.github.io/bfg-repo-cleaner/).

Example to remove a file or pattern:

```bash
# Create a local mirror
git clone --mirror https://github.com/<owner>/<repo>.git
java -jar bfg.jar --replace-text replacements.txt <repo>.git
cd <repo>.git
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

Notes / Warnings
----------------
- Rewriting history requires every collaborator to reclone or reset branches. Plan and communicate.
- Rotate any credentials immediately after purging (removal from history doesn't guarantee they weren't previously used).
- Keep backups before doing destructive history edits.
