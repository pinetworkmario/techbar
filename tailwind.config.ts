import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", "[data-shell=\"tech\"]"],
  theme: {
    extend: {
      colors: {
        // ANZ Worldline-inspired teal palette. All existing `bg-brand-600`,
        // `text-brand-700` etc. now resolve to teal. Marketing pages are
        // bypassed by the root redirect, so we don't need a separate palette.
        brand: {
          50: "#e6faf7",
          100: "#bff2eb",
          200: "#86e6d8",
          300: "#42d2bf",
          400: "#1bb9a3",
          500: "#0fa18a",
          600: "#0a8472",
          700: "#0c685b",
          800: "#0f5249",
          900: "#11423c",
          950: "#03251f",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        soft: "0 4px 18px -4px rgba(15,23,42,0.08)",
        "glow-cyan": "0 0 24px rgba(34,211,238,0.35)",
        "glow-emerald": "0 0 24px rgba(52,211,153,0.35)",
        "glow-rose": "0 0 24px rgba(251,113,133,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
