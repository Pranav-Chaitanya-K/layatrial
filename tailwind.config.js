/**
 * Tailwind CSS configuration for Utopian Music Player (Vite + React).
 *
 * Install peer tooling (example):
 *   npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography
 *
 * PostCSS: ensure `postcss.config.js` exists with `tailwindcss` and `autoprefixer`.
 *
 * - `darkMode: "class"` — enable `dark:` utilities when `<html class="dark">` is set (optional).
 * - `theme.extend.colors.utopian.*` — tokens for Gold/Purple/Neon Blue/Dark Red/Glass themes; use
 *   e.g. `text-utopian-gold`, `bg-utopian-purple-surface`, `border-utopian-glass-border`.
 * - Plugins: `@tailwindcss/forms` (inputs/sliders), `@tailwindcss/typography` (`prose`).
 */

import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  darkMode: "class",

  theme: {
    extend: {
      colors: {
        utopian: {
          gold: {
            DEFAULT: "#e7bc6e",
            muted: "#c9a227",
            surface: "#0c0a09",
          },
          purple: {
            DEFAULT: "#8b5cf6",
            muted: "#7c3aed",
            surface: "#09090b",
          },
          blue: {
            DEFAULT: "#22d3ee",
            muted: "#06b6d4",
            surface: "#020617",
          },
          red: {
            DEFAULT: "#f87171",
            muted: "#ef4444",
            surface: "#0a0a0a",
          },
          glass: {
            border: "rgba(255,255,255,0.08)",
            highlight: "rgba(255,255,255,0.06)",
            surface: "rgba(9,9,11,0.55)",
          },
        },
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glass-lg": "0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "utopian-gold-glow":
          "radial-gradient(ellipse 100% 60% at 50% -10%, rgba(245,158,11,0.14), transparent 55%)",
        "utopian-blue-glow":
          "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,211,238,0.12), transparent 50%)",
        "utopian-red-glow":
          "radial-gradient(ellipse 90% 50% at 50% -5%, rgba(248,113,113,0.1), transparent 55%)",
      },
    },
  },

  plugins: [
    forms({
      strategy: "class",
    }),
    typography,
  ],
};
