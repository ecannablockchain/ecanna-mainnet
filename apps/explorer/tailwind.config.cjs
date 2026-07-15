/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /** Etherscan-style primary / links / search CTA */
        brand: {
          50: "#e8f4fc",
          100: "#d1e9f8",
          400: "#4db3e0",
          500: "#0784c3",
          600: "#0670a3",
          700: "#055a87",
          900: "#0a2540",
        },
        /** Dark hero / footer (Etherscan v2 navy) */
        scan: {
          navy: "#06162d",
          navyMid: "#0a2540",
          navyLight: "#0f3460",
          line: "rgba(148, 163, 184, 0.12)",
        },
        ink: "#212529",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
