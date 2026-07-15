# Changelog

All notable changes to the `store-frontend` template are documented here, following
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
[Semantic Versioning](https://semver.org/).

Versioning convention:

- **MAJOR** — a change that requires a store fork to touch `store.config/` itself
  (e.g. a renamed/removed branding field). Call this out explicitly in the entry.
- **MINOR** — a new feature or non-breaking API change.
- **PATCH** — a bug fix.

Every release: bump the version below and in `package.json`, add an entry here, then
`git tag vX.Y.Z` and push the tag. This triggers `notify-stores.yml`, which opens a
sync PR on every store fork listed in `stores.json`. See `RUNBOOK.md`.

## [1.1.0] - 2026-07-15

### Added

- Minimum order quantity (MOQ) per product: store admins set it on the product form;
  storefront quantity steppers and add-to-cart floor at it, and the backend rejects
  orders placed below it.
- Product and store-level customer reviews (1–5 star rating, optional title/body),
  published immediately with admin hide/delete moderation from a new Admin › Reviews
  page. A `/reviews` storefront page covers store-level reviews; product pages show
  reviews + average rating inline.
- Configurable merchandising tags — Best Seller, Low in Stock, Limited Time Only.
  Store admins enable/disable each tag store-wide and set the low-stock threshold from
  Settings; Best Seller / Limited Time are assigned per product, Low in Stock is
  computed automatically from stock vs. threshold.

## [1.0.0] - 2026-07-14

### Added

- Established this repo as the multi-store template: per-store identity
  (`NEXT_PUBLIC_STORE_ID`/`NAME`/`API_URL`, `ECR_REPOSITORY`) now comes entirely from
  GitHub repo Variables/Secrets injected as Docker build-args, instead of a committed
  `.env` file — no code differs between store forks for deployment.
- `store.config/branding.ts` as the single, isolated place for per-store
  branding/copy, so store forks can customize without touching shared components.
- Image tags now carry the template version (`<version>-<sha>`) alongside `latest`.
- `stores.json` manifest + `notify-stores.yml` workflow to auto-open a sync PR on
  every tracked store fork when a new template version is tagged.
