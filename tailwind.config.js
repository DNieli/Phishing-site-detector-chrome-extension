/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./popup.html",
    "./popup-local.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./chrome-extension/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};