/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'selector',
  theme: {
    extend: {
      colors: {
        background_light: 'rgba(255, 255, 255, 1)',
        background_dark: '#121212',
        text_light: '#5C5C5C',
        text_dark: '#DADADA',
        primary_light: '#f5f5f5',
        primary_dark: '#222222',
        secondary_light: '#f1f3f4',
        secondary_dark: '#2e2e2e',
        accent_light: '#A262D0',
        accent_dark: '#A262D0',
      },
      fontFamily: {
        poppins: ['Poppins'],
        opensans: ['Open Sans'],
        roboto: ['Roboto'],
      },
    },
  },
  plugins: [],
};
