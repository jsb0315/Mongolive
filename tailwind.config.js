/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",  // 경로 잘 확인: src 폴더 기준
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}