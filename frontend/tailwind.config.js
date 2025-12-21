/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light theme colors
        background: '#f8f9fa', // Light gray background
        surface: '#ffffff',    // White surface
        primary: '#0078d4',    // Microsoft Blue
        secondary: '#605e5c',  // Gray text
        border: '#e1dfdd',     // Light border
      },
      borderRadius: {
        'xl': '12px', // Microsoft style rounded corners often 8px or 12px
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
