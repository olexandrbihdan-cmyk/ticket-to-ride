/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'train-red': '#DC2626',
        'train-blue': '#2563EB',
        'train-green': '#16A34A',
        'train-yellow': '#EAB308',
        'train-black': '#1F2937',
        'train-white': '#F3F4F6',
        'train-orange': '#EA580C',
        'train-pink': '#EC4899',
        'train-wild': '#8B5CF6',
      }
    },
  },
  plugins: [],
}
