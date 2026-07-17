# Store fork runbook

This repo is the **template**. Every store is a GitHub fork of it that tracks
template releases. Read this before onboarding a store, customizing one store's
design, or shipping a shared feature to every store.

## One-time setup (template repo only)

1. Create a fine-grained GitHub PAT with **Contents: read/write** and **Pull
   requests: read/write** scoped to every store fork repo (add new forks to its
   scope as they're created, or use an org-wide GitHub App token instead).
2. Add it as a repo secret on the template repo: `STORES_SYNC_TOKEN`.
3. This is what `.github/workflows/notify-stores.yml` uses to open sync PRs on forks.

## Onboarding a new store

GitHub's "Fork" button doesn't work here — you can't fork a repo into the same
account that owns it. Instead, each store gets its own independent repo, seeded from
this one. "Sync" (`notify-stores.yml`) works over a plain git remote, so it doesn't
care whether the store repo is a real GitHub fork or not.

1. **Create the store in the platform** (platform-frontend > Stores > New Store).
   Copy its `id` (UUID) from the URL you land on (`/stores/<id>`) — that's
   `NEXT_PUBLIC_STORE_ID`. (The "Slug" field on that form is currently not saved by
   the backend — ignore it, use the UUID.)
2. **Create a new empty GitHub repo** for the store, e.g. `store-frontend-acme`
   (private).
3. **Seed it from the template**:
   ```
   git clone git@github.com:Georgio-Nehme/store-frontend.git store-frontend-acme
   cd store-frontend-acme
   git remote rename origin template
   git remote add origin git@github.com:Georgio-Nehme/store-frontend-acme.git
   git push -u origin main
   ```
   (`template` remote is for your own convenience if you ever want to merge manually;
   the automated sync workflow doesn't depend on it.)
4. In the new repo's **Settings > Secrets and variables > Actions**:
   - **Variables**: `ECR_REPOSITORY` (unique per store, e.g. `store-frontend-acme`),
     `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STORE_ID`, `NEXT_PUBLIC_STORE_NAME`.
   - **Secrets**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
   - None of this requires touching any file — a new store never needs a code diff
     just to exist.
5. **Create the ECR repository** for this store (it must exist before the first
   push — `docker push` doesn't auto-create it): AWS Console > ECR > Create
   repository, name it exactly matching the `ECR_REPOSITORY` value from step 4, same
   region as `deploy.yml`'s `AWS_REGION` (`eu-central-1`).
6. In the **template repo**, add `"<your-account>/store-frontend-acme"` to
   `stores.json` so this store receives future sync PRs, then commit + push.
7. Trigger the first build: **Actions tab > Build & Push (store frontend) >
   Run workflow** (`workflow_dispatch`) on the new store's repo — the `git push` in
   step 3 likely already fired a run, but it would have failed since steps 4–5
   weren't done yet, so re-run it manually now. Confirm in the logs it pushes
   `1.0.0-<sha>` and `latest` to the new ECR repo.
8. Optional cleanup: `notify-stores.yml` and `stores.json` are only meaningful in the
   template repo — you can delete both from the new store repo (they're harmless
   left in place, just dead weight).

Pulling the image and running it somewhere reachable (host, reverse proxy, DNS) is a
separate manual step on your end for now — not covered here.

## Customizing design for one store

- Edit only inside `store.config/` in that store's own fork (e.g.
  `store.config/branding.ts`). Add new page files there too if a store needs a
  genuinely different layout.
- **Never** edit shared `app/`/`components/`/`lib/` files in a store fork unless you
  intend that store to permanently diverge from the template on that file — doing so
  is what turns a future sync into a manual-resolution conflict for that store
  (which is fine and expected, but should be a deliberate choice, not an accident).

## Shipping a feature or API change to every store

1. Make the change in the template repo's `main`.
2. Bump `package.json`'s `version` (semver — see convention in `CHANGELOG.md`) and
   add a `CHANGELOG.md` entry.
3. `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. `notify-stores.yml` fires automatically: it opens a "Sync template vX.Y.Z" PR on
   every fork listed in `stores.json`.
   - If a fork only customized `store.config/`, this PR merges cleanly — review and
     merge it, which triggers that fork's own `deploy.yml` and deploys the update.
   - If a fork hand-edited a shared file the release also touched, that PR alone
     shows the conflict, isolated to that one store. Resolve it there; other stores'
     PRs are unaffected.

## Pulling a feature from the template into your store

This is the "receiving" side of the flow above — what to actually do when a template
release lands, or when you want to pull in a not-yet-tagged change early.

### Normal path: merge the sync PR

1. `notify-stores.yml` already opened a "Sync template vX.Y.Z" PR on your store's repo
   (see "Shipping a feature" above for how it's triggered).
2. Review the diff like any PR. If your fork only customized `store.config/`, it merges
   cleanly.
3. Merge it — this triggers your fork's own `deploy.yml`, which builds and pushes the
   new image.
4. **If the feature touches the backend** (new model fields, a new table, a new
   endpoint — check the template's `CHANGELOG.md` entry for that release), pulling the
   frontend image is not the whole story: see "Backend changes" below before you
   consider the release actually live.

### Manual path: pull a specific commit before it's tagged

Use this if you want a change now instead of waiting for the next version tag:

```
git remote add template git@github.com:Georgio-Nehme/store-frontend.git   # one-time
git fetch template
git merge template/main          # or: git cherry-pick <sha> for a single commit
git push origin main
```

Resolve conflicts if your fork hand-edited a shared file the change also touches.

### Backend changes — don't skip this

Unlike `store-frontend`, the backend (`ecom-platform`) is **not** forked per store —
it's one shared deployment. A frontend feature that depends on new backend fields or
endpoints needs its own rollout on that repo, and this is where things have actually
broken in practice:

1. **Check for untracked files before you push.** `git status` on `ecom-platform`
   before every commit — new model/schema/route files are easy to `git add` selectively
   and forget one. A forgotten file means the *code that imports it* ships, but the
   file itself doesn't, and the container crash-loops on boot (`ModuleNotFoundError`)
   the moment it's deployed. This has happened more than once — treat an untracked file
   showing up in `git status` right before a push as a blocker, not a FYI.
2. **Migrations don't run themselves.** After deploying a new backend image, you still
   need to run `docker exec ecom-backend alembic upgrade head` on the target server —
   pushing the image does not apply pending migrations. Check first with
   `docker exec ecom-backend alembic current` if you're not sure it's behind.
3. **Watch for the `Base.metadata.create_all()` collision.** `app/main.py` runs
   `Base.metadata.create_all(bind=engine)` on every boot as a dev convenience (wrapped in
   a silent `try/except: pass`). If a release adds a brand-new table, this can create it
   with an incomplete schema (e.g. missing indexes defined only in the migration) *before*
   you get a chance to run `alembic upgrade head` — the migration's own `CREATE TABLE`
   then fails with `DuplicateTable`. If you hit that: drop the incomplete table
   (`DROP TABLE <name>;`) and re-run the migration so it's created correctly instead.
4. Only after both the migration is applied and the container is running clean logs
   (`docker logs ecom-backend`) is the feature actually live end-to-end.

## Image tags

Every deploy pushes `<template-version>-<git-sha>` (e.g. `1.4.0-a1b2c3d`) alongside
`latest`, so you can always tell which template release a given store is running from
its ECR tags — check before debugging "why does store X behave differently."

## Testing the sync workflow

Before relying on `notify-stores.yml` for a real store, add a throwaway fork to
`stores.json`, push a test tag, and confirm the PR opens correctly end-to-end.
