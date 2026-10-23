// Single source of per-store branding. Store forks that need custom name/copy/logo/colours
// edit *this file* (and store.config/fonts.ts) only — never the shared components that
// read it — so pulling in a new template release stays a conflict-free merge. See RUNBOOK.md.
//
// Optional fields (all documented on BrandingConfig in lib/theme.ts):
//   tagline:  'Short line under the shop heading'
//   logoUrl:  '/logo.jpg'                       (file in public/)
//   colors:   { 50: '#...', ..., 900: '#...' }  (used as brand-* classes; default = blue)
//   classes:  { page, heading, storeName }      (Tailwind class strings)

export const branding = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'My Store',
  metaDescription: 'Online Store',
};
