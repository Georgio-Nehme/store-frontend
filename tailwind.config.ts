import type { Config } from "tailwindcss";
import { theme } from "./lib/theme";

const config: Config = {
  // lib/theme.ts (defaults) and store.config/ (per-store overrides) hold class strings
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store.config/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: { brand: theme.colors },
      // Falls back to the inherited font when a store sets no display font
      fontFamily: { display: ["var(--font-display)"] },
    },
  },
  plugins: [],
};
export default config;
