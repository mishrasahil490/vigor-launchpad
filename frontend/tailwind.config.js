/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f1f0fe",
          100: "#e3e1fd",
          200: "#c2bdfa",
          300: "#a098f6",
          400: "#7d70f0",
          500: "#5d4ce8",
          600: "#4734d4",
          700: "#3826ab",
          800: "#2c1d85",
          900: "#211566",
        },
        ink: {
          50: "#f7f7f9",
          100: "#eceef2",
          200: "#d7dbe3",
          300: "#b2b9c8",
          400: "#8a93a6",
          500: "#677088",
          600: "#4f5870",
          700: "#3a4256",
          800: "#252b3a",
          900: "#161a24",
        },
        accent: {
          coral: "#ff6b5e",
          gold: "#f0a83a",
          mint: "#21b894",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(22, 26, 36, 0.04), 0 1px 3px 0 rgba(22, 26, 36, 0.06)",
        popover: "0 4px 16px -2px rgba(22, 26, 36, 0.12), 0 2px 6px -2px rgba(22,26,36,0.08)",
      },
    },
  },
  plugins: [],
};
