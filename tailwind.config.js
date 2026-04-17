/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: "#FFF8F0", dark: "#FFF2E3", border: "#F0E6D6" },
        brand: { text: "#4A3728", sub: "#9B8978", accent: "#E8756D", accentSoft: "#FDECEA", mint: "#7ECEC1", purple: "#B48ECC" },
        gacha: {
          red: "#E8756D",
          yellow: "#F5B82E",
          blue: "#6DB4C8",
          green: "#9BC471",
        },
      },
      fontFamily: {
        pixel: ["'Press Start 2P'", "'DotGothic16'", "monospace"],
      },
    },
  },
  plugins: [],
};
