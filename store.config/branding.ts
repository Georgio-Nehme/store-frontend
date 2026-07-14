// Single source of per-store branding. Store forks that need custom name/copy/logo
// edit *this file only* — never the shared components that import it — so pulling in
// a new template release stays a conflict-free merge. See RUNBOOK.md.

export const branding = {
  storeName: process.env.NEXT_PUBLIC_STORE_NAME || 'My Store',
  metaDescription: 'Online Store',
};
