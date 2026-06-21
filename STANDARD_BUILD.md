# STANDARD_BUILD.md — Multi-Tenant Standard App Plan

> Living planning doc for building the `standard/` white-label version of Elevate
> from the Scooters build. Read alongside CLAUDE.md for standard-app work.
> Findings below are from the Claude Code code-analysis pass.

## Vision

- **`standard/`** = one running, multi-tenant app used by many companies.
- **Elevate-branded** by default, with per-tenant logo + colors from company config.
- **Companies added + features toggled from the super-admin site.**
- The **Scooters build (this `elevate-test` repo) stays as-is** = the custom build.
  `standard/` is a NEW directory/repo, not a rename of this one.
- No live file-sharing between the two builds (creates sync debt). Backend is a
  near-copy minus the `|| 1` fallbacks; frontend is rebuilt from the Scooters
  base with all Scooters strings/paths/assets replaced.

## Core principles (non-negotiable)

1. **Tenant isolation is sacred.** Every query touching employees,
   form_submissions, customer_reviews, login_logs MUST scope by the logged-in
   user's `company_id`. Company A must never see Company B's data.
2. **Verify isolation after every data change.** Log in as two different
   companies; confirm each sees only its own data. Required test, not optional.
3. **Features are per-company toggles** read from company config.
4. **Build in small, reviewable slices.** One step per branch; review the diff;
   test; merge. Each step must not break the existing Scooters build.

## SECURITY — fix first (highest priority)

These two are real cross-tenant data-leak risks. They go before any branding work.

- **`|| 1` fallback (18 sites).** `req.user.company_id || 1` silently defaults
  every query to Scooters (company_id = 1) when a user has no company. Harmless
  with one tenant; a data breach the moment a second tenant exists.
  Sites: server.js lines 202, 230, 299, 324, 350, 380, 438, 472, 492, 617, 640,
  662, 681, 700, 719, 757, 773 (18 total).
  Fix: replace with `req.user.company_id` + a guard that returns 400 if missing.
- **PDF serve route has NO company check.** `GET /api/forms/pdf/:filename`
  (server.js ~540): any authenticated user with a filename can fetch any
  company's PDF. Fix: look up form_submissions by filename, verify
  company_id = req.user.company_id, else 403.

## Open question to resolve early

- **`slug` column mismatch.** Login queries `c.slug` (server.js 91-96, 137) but
  the DB backup has no slug column. Either the running DB has an undocumented
  column or login falls through to a non-existent `/dashboard/` path. VERIFY
  before building redirect logic on it:
  `docker exec -it elevate-db-test psql -U elevate -d elevate -c "\d companies"`

## Architecture decisions

**Branding/theme (per-tenant):** groundwork exists — dashboard.css already uses
CSS custom properties on `:root`.
- Add to `companies`: `logo_url TEXT`, `primary_color VARCHAR(7)`,
  `secondary_color VARCHAR(7)`.
- Add `GET /api/company-config` returning
  `{ name, slug, logo_url, primary_color, secondary_color, features }` for the
  logged-in user's company (or fold into `/auth/current-user`).
- Dashboard + forms JS read config on load, set CSS vars
  (`--brand-primary` etc.), set logo `src` and company name dynamically.
- `buildFormPDF()` (server.js 558-578): pass `company.primary_color` into the
  template instead of hardcoded `#991b1b`.
- Net effect: zero frontend routing changes; works for any number of companies.

**Feature toggles:** JSONB column on companies (chosen over a join table —
small, stable feature set; simpler admin UI; no per-request join).
- `ALTER TABLE companies ADD COLUMN features JSONB NOT NULL DEFAULT '{}';`
- Example: `{"forms":true,"directory":true,"customer_reviews":true,"logs":true,"resources":true}`
- Super admin sets via `PUT /api/admin/companies/:id`.
- Frontend reads once, gates nav rendering via `isEnabled('customer_reviews')`.
- UX concern at this stage; backend enforcement only if billing requires it.
- Upgrade path: normalize to a table later if per-feature metadata/billing needed.

## What already works (do NOT rebuild)

- `company_id` is on all relevant tables; the data model IS multi-tenant — it
  just needs `|| 1` cleaned up.
- JWT already carries `company_id` and `is_super_admin` — auth plumbing is done.
- `companies` table exists (id, name, status) — just needs config columns.
- `login_logs` scope via `WHERE u.company_id = $1` is correct.
- `/api/employees/all` vs `/api/employees` distinction (supervisor dropdowns) is
  correct — preserve as-is.
- The login page (frontend/index.html) is already Elevate-branded — only needs
  the logo path fixed from `/scooters/elevate_logo_white.png` to
  `/images/elevate_logo_white.png`.

## Scooters-specific references to genericize

Backend (server.js): `|| 1` fallback (18 sites, see Security); `buildFormPDF()`
hardcodes Scooters-red #991b1b (558-578); seed inserts 5 @scooters.com employees
(migration 137-144); redirect_url default `.../scooters/landing`.

Frontend dashboard: `<title>Scooters - Employee Portal</title>`; ScooterLogo.png
in sidebar; `<div class="logo-text">Scooters</div>`; favicon + css/js on
`/scooters/` paths; `jane.smith@scooters.com` placeholder; hardcoded locations
(Iowa Falls, Webster City, Elkhorn); localStorage keys `scooters_recent_*`; 9
form URLs hardcoded `/scooters/forms/...`; `scooters-page-*` tokens; resource URL
`/scooters/forms/job-offer.html`; color palette `--red/#dc2626/#991b1b`.

Frontend forms (all 9): ScooterLogo.png header; `/scooters/` favicon + styles.css;
hardcoded locations; `LANDING_URL = '.../scooters/forms'` (5 review forms);
`btoa('scooters-page-...')` tokens; "Scooter's values" (barista-review);
"Scooter's Handbook" (handbook-acknowledgment); "Scooters Coffee" x6+
(job-offer); "Scooterversity" (monthly-one-on-one); #dc2626/#991b1b x7 in
forms/styles.css (no vars).

Login/root: logo `src="/scooters/elevate_logo_white.png"` (index, forgot, reset);
favicon from `/scooters/` path.

nginx: `location /scooters/` rewrite to `/custom/scooters/` — no generic route.
Images: ScooterLogo.png present in two locations.

## Tenant-scoping audit (summary)

Data model is well-structured; `company_id` on every relevant table and most
WHERE clauses include it. Two problems: (1) the `|| 1` fallback (18 sites);
(2) the unscoped PDF serve route. All other data routes scope correctly (subject
to removing `|| 1`). Auth routes (login/logout/check-session/current-user) need
no scoping — login is by globally-unique email; current-user fetches own row.

## Proposed standard/ structure

```
standard/
  backend/        server.js (|| 1 removed, /api/company-config added), worker.js,
                  create-user.js, Dockerfile, package.json (mostly unchanged copies)
  frontend/
    index.html, login/{forgot,reset}.html   (Elevate-branded; logo path fixed)
    images/elevate_logo_*.png               (no ScooterLogo.png)
    dashboard/index.html, dashboard.js, dashboard.css (config-driven branding), favicon.ico
    forms/styles.css (CSS vars) + 9 forms (Elevate logo, locations from API, Scooters text removed)
    css/style.css   (shared success-page styles, already Elevate-colored)
  nginx/nginx.conf  (serves /dashboard/ directly; no /scooters/ rewrite)
  database/migrations/
    001_base_schema.sql
    002_company_config.sql  (slug, logo_url, primary_color, secondary_color, features)
```

## Build order

**Phase 0 — Schema**
1. Formalize `slug` column (verify running DB first), set scooters for id=1.
2. Add `logo_url`, `primary_color`, `secondary_color`, `features` to companies;
   set Scooters values as initial data.

**Phase 1 — Backend hardening (server.js, restartable) — DO FIRST**
3. Eliminate `|| 1` (18 sites) + add company_id guard → 400 if missing.
4. Secure the PDF serve route (verify ownership, else 403).
5. Add `GET /api/company-config`; validate with curl.

**Phase 2 — Standard dashboard shell (new files; Scooters untouched)**
6. `standard/.../dashboard.css` — CSS vars only, no hardcoded reds.
7. `standard/.../dashboard/index.html` — Elevate-branded; companyName + companyLogo placeholders.
8. `standard/.../dashboard.js` — fetch company-config, set vars/logo/name; generic
   localStorage keys; `/forms/` paths; drop `scooters-` tokens.
9. nginx: add `location /dashboard/`; keep `/scooters/`. Test both companies route correctly.

**Phase 3 — Standard forms (new files)**
10. `standard/.../forms/styles.css` — hex → CSS vars; small per-form config fetch.
11. Recreate 9 forms, stripping Scooters content (logo, locations from API,
    Handbook/Scooterversity/Scooters Coffee/values text). One form per commit.

**Phase 4 — Feature toggles**
12. Wire toggles into dashboard.js (gate nav rendering on `features[key]`).
13. Super-admin company API: `GET /api/admin/companies`, `PUT /api/admin/companies/:id`
    (is_super_admin guarded). Validate with curl; admin UI later.

**Phase 5 — First non-Scooters tenant (acceptance test)**
14. Onboard a second company end-to-end. Verify: new name/colors show; employees
    API returns empty (not Scooters'); PDFs can't be cross-accessed; features
    reflect config. This is the acceptance test for everything above.

## Working agreement with Claude Code

- One scoped task per session/branch. Review every `git diff` before applying.
- Claude Code edits files but does NOT run docker — I restart and test.
- Follow CLAUDE.md standards and landmines. Plain ASCII hyphens. Incremental edits.
- After any data-touching change, run the two-company isolation test.
- Promotion order: test → staging → prod → fallback. Never touch prod or the
  production tunnel from the test VM.

## Progress log

_(Append per merged slice: date, branch, what changed, isolation tested?)_
