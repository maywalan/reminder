@AGENTS.md

## Working across multiple machines

This project is cloned on more than one laptop, sharing history through
`https://github.com/maywalan/reminder.git`. At the start of any session here, `git pull` before
making changes; at the end, commit and push before switching machines — otherwise the two copies
drift apart and conflict. `routine-app/.env` (the Google Places API key) is gitignored on
purpose and does **not** sync between machines — recreate it from `.env.example` on each one if
location autocomplete is wanted there.

See `README.md` in this folder for current feature status and architecture — that's kept up to
date as the authoritative source, not duplicated here.
