/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Mendaftarkan pembolehubah fon lalai dan fon khas angka di sini
      fontFamily: {
        // 'sans' akan digunakan secara automatik untuk semua teks UI (Inter)
        sans: ['var(--font-inter)', 'sans-serif'],
        // 'roboto' didaftarkan khas untuk memaparkan angka metrik yang tegas
        roboto: ['var(--font-roboto)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}