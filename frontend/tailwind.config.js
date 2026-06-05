/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0f",
        panel: "#11111a",
        line: "#252538",
        text: "#e6e6ef",
        muted: "#9ca3af",
        accent: "#8b5cf6"
      }
    }
  },
  plugins: []
};
