import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#14231F",
        paper: "#F6F4EE",
        moss: "#2F5545",
        mossLight: "#4C7A63",
        clay: "#B5563C",
        gold: "#C9A24B",
        line: "#DAD5C6",
        danger: "#B3402A",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
