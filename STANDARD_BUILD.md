# STANDARD_BUILD.md — Multi-Tenant Standard App Plan

> Living planning doc for building the `standard/` white-label version of Elevate
> from the Scooters build. Update as decisions are made. Claude Code should read
> this alongside CLAUDE.md when working on standard-app tasks.

## Vision

- **`standard/`** = one running, multi-tenant app used by many companies.
- **Elevate-branded** by default (Elevate logo + color theme), with per-tenant
  branding where appropriate.
- **Companies added + features toggled from the super-admin site.**
- The **Scooters build stays** as the separate custom deployment.
- This is the sellable white-label product.

## Core principles (non-negotiable)

1. **Tenant isolation is sacred.** Every query that touches employees,
   form_submissions, customer_reviews, or login_logs MUST scope by the logged-in
   user's `company_id`. Company A must never see Company B's data.
2. **Verify isolation after every data change.** Log in as two different
   companies; confirm each sees only its own data. This is a required test, not
   optional.
3. **Features are per-company toggles.** The app shows/hides features based on
   the company's config, set from the admin site.
4. **Build in small, reviewable slices.** One feature per branch, review the
   diff, test, then merge.

## Architecture decisions

_(Fill in from the Claude Code planning analysis.)_

- standard/ structure:
- Branding/theme mechanism (per-tenant logo + colors):
- Feature-toggle storage (table vs JSON column):
- How admin site sets toggles:
- How the app reads toggles:
- Shared vs duplicated code between Scooters and standard:

## Tenant-scoping audit

_(Fill in: route -> scoped by company_id? -> fix needed. From planning step 2.)_

| Route | Scoped? | Action needed |
|-------|---------|---------------|
|       |         |               |

## Scooters-specific references to genericize

_(Fill in: file:line -> what it is -> how to genericize. From planning step 1.)_

## Build order

_(Fill in from planning step 6. Each item = one branch, one review, one test.)_

1. Scaffold `standard/` + Elevate branding (cosmetic/structural, low risk)
2. Tenant foundation — thread `company_id` through every data query
3. Feature-toggle mechanism (schema + admin UI + app read)
4. Port features behind toggles, one at a time (directory, forms, reviews, logs)
5. Net-new standard features (self-service portal, PTO, onboarding wizard)

## Working agreement with Claude Code

- One scoped task per session/branch. Review every `git diff` before applying.
- Claude Code edits files but does NOT run docker — I restart and test.
- Follow CLAUDE.md standards and landmines at all times.
- After any data-touching change, run the two-company isolation test.
- Promotion order stays: test -> staging -> prod -> fallback. Never touch prod
  or the production tunnel from the test VM.
```

## Progress log

_(Append a line per merged slice: date, branch, what changed, isolation tested?)_
