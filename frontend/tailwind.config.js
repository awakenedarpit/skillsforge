/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3f1ec",
        ink: "#1c1917",
        accent: {
          DEFAULT: "#0f5f5a",
          dark: "#0b4541",
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28, 25, 23, 0.06), 0 8px 24px rgba(28, 25, 23, 0.04)",
      },
    },
  },
  plugins: [],
};
