/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: "#FFFFFF", dark: "#F8F9FA", border: "#E5E7EB" },
        brand: {
          text: "#1F2937",
          sub: "#6B7280",
          accent: "#10B981",
          accentSoft: "#D1FAE5",
          pink: "#EC4899",
          purple: "#8B5CF6",
        },
        gacha: {
          red: "#EF4444",
          yellow: "#F59E0B",
          blue: "#3B82F6",
          green: "#10B981",
        },
      },
      fontFamily: {
        sans: ["'Noto Sans JP'", "'Inter'", "sans-serif"],
      },
      maxWidth: {
        site: "1536px",
      },
      screens: {
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};
