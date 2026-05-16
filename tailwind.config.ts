import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        saffron: "#F47216",
        green: "#00A650",
        white: "#FFFFFF",
      },
    },
  },
  plugins: [],
};
export default config;
