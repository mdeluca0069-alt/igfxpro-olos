/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./main.tsx",
    "./App.tsx",
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
    "./routes/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
