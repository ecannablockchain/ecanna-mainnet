/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f4fc",
          100: "#d1e9f8",
          400: "#4db3e0",
          500: "#0784c3",
          600: "#0670a3",
          700: "#055a87",
          900: "#0a2540",
        },
        scan: {
          navy: "#06162d",
          navyMid: "#0a2540",
          navyLight: "#0f3460",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
