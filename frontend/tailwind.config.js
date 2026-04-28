/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0b1020",
        card: "#121a2b",
        muted: "#94a3b8",
        accent: "#4f46e5",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,.18)",
      },
      borderRadius: {
        xl2: "1rem",
      },
    },
  },
  plugins: [],
}