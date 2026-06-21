## ⚠️ Environment boundary (read first)

This repo runs on the **test VM only** (`elevate-test`, 192.168.10.19). It is an
isolated clone of the production Elevate platform, for developing features and
fixing bugs **without touching production**.

- **Never** SSH to, edit, deploy to, or run commands against the production VM
  (192.168.10.15) or the Dell fallback (192.168.10.10) from here.
- **NEVER add a `cloudflared` service to the test compose.** Production's compose
  runs its own tunnel container (`elevate-cloudflared`) using the production
  `TUNNEL_TOKEN`. Starting a connector here would join the LIVE tunnel and can
  hijack production traffic. The test stack has cloudflared intentionally
  removed. Access test via `http://192.168.10.19:8080` only. If a real hostname
  is ever needed, use a SEPARATE tunnel with its OWN token and hostname.
- **Never** mount or point at the production data path `/mnt/elevate-data`. Test
  uses a local `./test-data` directory only.
- All work happens in `/home/hernan/elevate-test/` on the `test` git branch.
- This is a place to break things safely. If unsure whether an action affects
  prod, stop and ask.

## What this project is

The **Elevate HR platform** — a multi-tenant SaaS HR app. Express API + BullMQ
worker + Redis + PostgreSQL, behind nginx. Serves an employee directory, HR
form submissions, customer reviews, and login/audit logs. The current live build
(the Scooters deployment) is what this test environment mirrors.

## Architecture (as actually deployed in this test stack)

Five services on one bridge network (`elevate-test-network`). The production
`cloudflared` service is omitted here on purpose.

| Service         | Container             | Image / Build         | Port (host→container) | Role |
|-----------------|-----------------------|-----------------------|-----------------------|------|
| `nginx`         | `elevate-nginx-test`  | nginx:alpine          | 8080→80               | Static frontend + reverse proxy to API; serves `/uploads` read-only |
| `elevate-api`   | `elevate-api-test`    | built (./backend)     | (internal) 3000       | Express API, all routes in `backend/server.js` |
| `elevate-worker`| `elevate-worker-test` | built (./backend)     | (internal)            | BullMQ worker (`backend/worker.js`): pdf-generation + email-sending queues |
| `redis`         | `elevate-redis-test`  | redis:7-alpine        | (internal) 6379       | BullMQ job queue backend (appendonly) |
| `elevate-db`    | `elevate-db-test`     | postgres:16-alpine    | 6432→5432             | All data (DB name `elevate`, user `elevate`) |

**Live-reload bind mount:** `elevate-api` and `elevate-worker` mount
`./backend:/app` with an anonymous `/app/node_modules` volume. Editing files in
`backend/` changes behavior after a container **restart** (no rebuild needed
unless dependencies in package.json change). This means edits to `backend/`
directly alter how the app runs — treat them with care.

**Data:** two named volumes, `elevate-db-data-test` and `elevate-redis-data-test`.
The `/data` mount and nginx `/uploads` point at local `./test-data` (NOT prod's
`/mnt/elevate-data`).

**Migrations:** `database/migrations/` is mounted to
`/docker-entrypoint-initdb.d` and runs automatically on a FRESH db volume only.
To re-run migrations, the db volume must be recreated (`docker compose down -v`).

**File layout:**
```
docker-compose.yml          # TEST stack: no cloudflared, shifted ports, isolated volumes, ./test-data
.env                        # test secrets (gitignored) — NO TUNNEL_TOKEN
backend/
  server.js                 # the ENTIRE Express API (all routes here)
  worker.js                 # BullMQ worker: pdf-generation, email-sending
  create-user.js            # CLI utility to create a user
  Dockerfile
database/migrations/        # auto-run on fresh db
frontend/                   # static site served by nginx
nginx/nginx.conf            # host-side nginx config
test-data/                  # local stand-in for prod /mnt/elevate-data (uploads, etc.)
```

**Database schema (7 tables):** users, companies, employees, form_submissions,
customer_reviews, login_logs, audit_log.

**API surface (all in backend/server.js):**
- Auth: `POST /auth/login`, `GET /auth/logout`, `GET /auth/check-session`,
  `GET /auth/current-user` (JWT via `authenticateToken`)
- Employees: `GET /api/employees`, `GET /api/employees/all`,
  `POST /api/employees`, `GET /api/employees/:id`, `PUT /api/employees/:id`,
  `DELETE /api/employees/:id`
- Records/forms: `GET /api/records`, `POST /api/forms/submit`,
  `GET /api/forms/pdf/:filename`, `DELETE /api/forms/:id`
- Reviews: `GET /api/reviews`, `POST /api/reviews`, `PUT /api/reviews/:id`,
  `DELETE /api/reviews/:id`
- Logs: `GET /api/logs/logins`, `GET /api/logs/submissions`
- Health/test: `GET /health`, `GET /api/test`

## Coding standards

- **Incremental edits, not rewrites.** `server.js` is one large file holding the
  whole API. Change only the specific lines needed. Never regenerate the file.
- **Plain ASCII hyphens in all JS/HTML.** Never em dashes (—) or smart quotes in
  code, template literals, or strings — they cause encoding/rendering bugs.
- **Relative URLs, never hardcoded hosts** for in-app navigation. Email links and
  anything needing a full host should come from an env var, not a literal.
- **Cache-bust assets.** Bump `?v=N` on JS/CSS tags after editing frontend assets,
  or the browser/edge serves stale files.
- **Server-side multi-line edits: use a Python heredoc**, not `sed`. `sed -i`
  with backticks, `!`, `&`, `$` breaks on shell interpretation. For deletions use
  a content-anchored Python script with a guard that aborts if the target range
  contains a known-good block.
- **Apply changes by restart, not rebuild,** for `backend/` code edits:
  `docker compose restart elevate-api elevate-worker`. Only rebuild
  (`docker compose up -d --build`) when `backend/package.json` changes.

## Known landmines (real, present in this code)

- **DUPLICATE ROUTE: `GET /api/employees/:id` is defined twice** in
  `backend/server.js` (around lines 314 and 340). Express uses the FIRST; the
  second is dead/stale. Verify which is canonical before editing, and don't add a
  third. This is the recurring "stale duplicate shadowing the patched version"
  problem — scan for duplicate route/function definitions before editing any
  handler.
- **`/api/employees` filtering vs `/api/employees/all`.** The filtered list must
  not drop Manager/Assistant Manager titles needed for supervisor dropdowns;
  `/api/employees/all` serves the unfiltered list for that purpose. Keep them
  distinct.
- **`userTitle` must come from the employee DB record** (look it up in the
  employees data), NOT from `users.role` (which stores a generic value like
  'manager'). A logged-in user who qualifies by title but was filtered out by
  location must still be injected into the supervisor list.
- **Supervisor dropdown logic is fragile** and has been a heavy source of bugs.
  Test carefully after any change that touches how supervisors are populated.
- **Location `<select>` name attribute:** a location select with a `name`
  attribute alongside the hidden input produces duplicate values in form
  submissions. Keep only the hidden input.
- **Auth cookies need `secure: true` and `sameSite: 'lax'`** over HTTPS/Cloudflare.
  On plain-HTTP test access behavior can differ — note this when debugging
  sessions.
- **Worker jobs are placeholders.** `worker.js` pdf-generation and email-sending
  handlers are stubs (`TODO`): PDF via Puppeteer and email via Resend are not yet
  implemented. Don't assume they work end to end.
- **nginx:** edit the host-side `nginx/nginx.conf` (bind-mounted), not the
  container's default. Use `root` + `rewrite`, not `alias` + `try_files`
  (has caused 500s).
- **Migrations only run on a fresh db volume.** A new migration file won't apply
  to an existing test DB without `docker compose down -v` (destroys test data) or
  running the SQL manually.

## Git & promotion discipline

- Standalone git repo on branch `test`, with **no production remote**. Do not add
  one or push to prod.
- Every change is a reviewable diff. Commit logically scoped changes with clear
  messages. The clean baseline commit + Hyper-V checkpoint are the rollback points.
- **Promotion is one-directional and manual:** `test → staging → prod → fallback`.
  Schema migrations follow the same order. Nothing here auto-deploys, and Claude
  Code does not perform prod deploys.

## When in doubt

Prefer the smallest change that solves the problem. Surface assumptions before
acting. If a task seems to require touching prod, the fallback, the production
tunnel, or `/mnt/elevate-data` — stop and confirm first.
