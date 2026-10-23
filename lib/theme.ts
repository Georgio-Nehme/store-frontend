// Resolves a store's look from store.config/branding.ts, falling back to the template
// defaults below. New theme options get their default HERE (template-owned), so adding
// one never requires editing a fork's store.config files — template merges stay clean.
//
// Relative imports only: tailwind.config.ts imports this file outside Next's path aliases.
import { branding } from '../store.config/branding';

type ColorScale = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;

export interface BrandingConfig {
  storeName: string;
  metaDescription: string;
  /** Short line under the shop heading on the home page. */
  tagline?: string;
  /** Path under /public (e.g. '/logo.jpg') shown next to the store name in the navbar. */
  logoUrl?: string;
  /** Accent colour scale, used as `brand-*` in Tailwind classes. */
  colors?: Partial<ColorScale>;
  /** Tailwind class overrides. Literal strings only — Tailwind scans store.config/. */
  classes?: Partial<ThemeClasses>;
}

interface ThemeClasses {
  /** <body> background. */
  page: string;
  /** Page headings (h1): weight, colour, font. Sizes stay in the components. */
  heading: string;
  /** Store name in the navbar (its link has the `group` class). */
  storeName: string;
}

// Tailwind's blue palette — the template's look before theming existed.
const DEFAULT_COLORS: ColorScale = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
};

const DEFAULT_CLASSES: ThemeClasses = {
  page: 'bg-gray-50',
  heading: 'font-bold text-gray-800',
  storeName: 'font-bold text-gray-800 group-hover:text-gray-600',
};

const config = branding as BrandingConfig;

export const theme = {
  colors: { ...DEFAULT_COLORS, ...config.colors } as ColorScale,
  classes: { ...DEFAULT_CLASSES, ...config.classes } as ThemeClasses,
  tagline: config.tagline ?? null,
  logoUrl: config.logoUrl ?? null,
};
