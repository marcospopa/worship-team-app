/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4CAF50', // Green
        secondary: '#4FC3F7' // Light Blue
      }
    }
  },
  plugins: []
}