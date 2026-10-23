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

## [1.3.0] - 2026-10-23

### Added

- Store theming from `store.config/` only: `branding.ts` can set the `brand-*`
  accent colour scale, a navbar logo, a home tagline and class overrides for the page
  background, headings and navbar store name; `fonts.ts` can set a display font.
  Storefront components now use `brand-*` instead of hardcoded `blue-*` (the default
  brand scale is Tailwind blue, so unthemed stores look the same). Forks that had
  restyled shared files should move those choices into `store.config/` and take the
  template's version of the shared files — see `RUNBOOK.md` › Customizing design.
- Rich-text product descriptions (bold, italic, underline, lists, text colour) with a
  formatting toolbar in the admin; plain-text descriptions keep their line breaks.
  Needs the backend sanitizer from `ecom-platform` deployed first.
- Promo codes can be limited per client ("Max Uses Per Client"). Backend migration
  `0022` — run `alembic upgrade head` after deploying the backend.
- Customer-facing storefront is mobile-first (sticky navbar with cart, larger tap
  targets, 16px inputs, sticky add-to-cart / place-order bars). Admin unchanged.

## [1.2.0] - 2026-07-27

### Added

- Quantity-break pricing per product: store admins define any number of tiers
  (buy N+ units → % off) on the product form. When a cart line reaches a tier's
  quantity, every unit in that line gets that tier's discount (highest qualifying
  tier wins). The storefront product page shows a "Buy more, save more" table and
  the quantity-adjusted price; the cart/checkout reflect the discounted line
  totals; and the backend recomputes the discount authoritatively at order time.

  Backend: new `product_price_tiers` table (migration `0021`), so this release
  touches the backend — run `alembic upgrade head` after deploying the new image
  (see `RUNBOOK.md` › Backend changes; note the `create_all` collision applies
  since `0021` adds a new table).

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
