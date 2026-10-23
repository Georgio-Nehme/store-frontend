// Optional display font for headings and the navbar store name (`font-display`).
// To use one, load it with next/font and give it the `--font-display` variable, e.g.:
//
//   import { Fraunces } from 'next/font/google';
//   export const displayFont = Fraunces({ subsets: ['latin'], weight: ['600'], variable: '--font-display' });
//
// null = headings use the body font.
export const displayFont: { variable: string } | null = null;
