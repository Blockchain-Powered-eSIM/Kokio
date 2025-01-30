/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
      "./app/**/*.{js,jsx,ts,tsx}",
      "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
      extend: {
        fontFamily: {
          Lexend: ["Lexend", "sans"],
          LexendLight: ["Lexend-Light", "sans"],
          LexendMedium: ["Lexend-Medium", "sans"],
          LexendSemiBold: ["Lexend-SemiBold", "sans"],
          LexendBold: ["Lexend-Bold", "sans"],
          LexendBlack: ["Lexend-Black", "sans"],
      },
      },
  },
  plugins: [],
};
