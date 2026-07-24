import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#12162A",
          light: "#1B2140",
          lighter: "#262E52",
        },
        chalk: "#EDE9DD",
        coral: {
          DEFAULT: "#FF5A36",
          dark: "#D9421F",
        },
        teal: {
          DEFAULT: "#2FE6C7",
          dark: "#149C85",
        },
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
