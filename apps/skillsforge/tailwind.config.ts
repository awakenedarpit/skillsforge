import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./shims/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["InterVariable", "Inter", "Noto Sans Devanagari", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "Fira Code", "monospace"],
      },

      colors: {
        /* Accent — signal amber */
        accent: {
          50:  "rgb(var(--accent-50) / <alpha-value>)",
          100: "rgb(var(--accent-100) / <alpha-value>)",
          200: "rgb(var(--accent-200) / <alpha-value>)",
          300: "rgb(var(--accent-300) / <alpha-value>)",
          400: "rgb(var(--accent-400) / <alpha-value>)",
          500: "rgb(var(--accent-500) / <alpha-value>)",
          600: "rgb(var(--accent-600) / <alpha-value>)",
          700: "rgb(var(--accent-700) / <alpha-value>)",
          800: "rgb(var(--accent-800) / <alpha-value>)",
          900: "rgb(var(--accent-900) / <alpha-value>)",
        },

        /* Semantic surface tokens */
        canvas: "rgb(var(--bg) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-raised":   "rgb(var(--surface-raised) / <alpha-value>)",
        "surface-overlay":  "rgb(var(--surface-overlay) / <alpha-value>)",

        /* Text tokens */
        "text-base":      "rgb(var(--text) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "text-muted":     "rgb(var(--text-muted) / <alpha-value>)",

        /* Border tokens */
        "border-token":       "rgb(var(--border) / <alpha-value>)",
        "border-token-strong":"rgb(var(--border-strong) / <alpha-value>)",
      },

      borderRadius: {
        token:      "var(--radius-md)",
        "token-xs":  "var(--radius-xs)",
        "token-sm":  "var(--radius-sm)",
        "token-lg":  "var(--radius-lg)",
        "token-xl":  "var(--radius-xl)",
        "token-2xl": "var(--radius-2xl)",
      },

      boxShadow: {
        "token-xs": "var(--shadow-xs)",
        "token-sm": "var(--shadow-sm)",
        "token-md": "var(--shadow-md)",
        "token-lg": "var(--shadow-lg)",
        "token-xl": "var(--shadow-xl)",
      },

      transitionDuration: {
        micro:  "var(--duration-micro, 120ms)",
        normal: "var(--duration-normal, 220ms)",
        enter:  "var(--duration-enter, 300ms)",
        slow:   "var(--duration-slow, 500ms)",
      },

      transitionTimingFunction: {
        "spring": "var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1))",
        "ease-out-token": "var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
      },

      keyframes: {
        /* Heatmap glow */
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 12px 2px rgba(220, 38, 38, 0.6)" },
          "50%":       { boxShadow: "0 0 4px 1px rgba(220, 38, 38, 0.2)" },
        },
        /* Skeleton shimmer */
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        /* Ping ring for live dots */
        pingRing: {
          "75%, 100%": { transform: "scale(2)", opacity: "0" },
        },
        /* Bar fill from left */
        barFill: {
          from: { transform: "scaleX(0)" },
          to:   { transform: "scaleX(1)" },
        },
      },

      animation: {
        "pulse-glow": "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer:      "shimmer 1.6s ease infinite",
        "ping-ring":  "pingRing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite",
        "bar-fill":   "barFill 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
