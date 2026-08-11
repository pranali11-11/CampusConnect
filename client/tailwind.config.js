/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563EB',
        secondary: '#06B6D4',
        accent: '#8B5CF6',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
