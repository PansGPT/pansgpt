/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        pans: {
          50: "oklch(0.98 0.02 240)",
          100: "oklch(0.95 0.05 240)",
          500: "oklch(0.55 0.22 240)",
          600: "oklch(0.48 0.22 240)",
          900: "oklch(0.20 0.15 240)",
        },
      },
    },
  },
  plugins: [],
};
