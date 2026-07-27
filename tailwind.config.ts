import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0E141B",
        panel: "#18212C",
        paper: "#FFFFFF",
        purple: {
          DEFAULT: "#7C4DE8",
          dim: "#B9A2F4",
          wash: "#EFE9FD",
        },
        orange: "#FF9900",
        grey: "#9AA3AE",
        muted: "#667180",
        hairline: "#DDE2E8",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Black", "sans-serif"],
        sans: ["var(--font-sans)", "Arial", "sans-serif"],
        mono: ["var(--font-mono)", "Consolas", "monospace"],
      },
      boxShadow: {
        brut: "6px 6px 0 0 #0E141B",
        "brut-sm": "4px 4px 0 0 #0E141B",
        "brut-lg": "10px 10px 0 0 #0E141B",
        "brut-purple": "6px 6px 0 0 #7C4DE8",
        "brut-paper": "6px 6px 0 0 #FFFFFF",
      },
    },
  },
  plugins: [],
};

export default config;
