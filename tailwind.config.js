/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#ffaa00',
        'primary-dark': '#f3980a',
        secondary: "#5f6368",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        'material-symbols': ['Material Symbols Outlined'],
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(to bottom, #ffaa00, #f3980a)',
        'primary-gradient-hover': 'linear-gradient(to bottom, #f3980a, #e68a00)',
      },
    },
  },
  plugins: [],
}

