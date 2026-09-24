import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        asphalt: "#1C1F26",
        asphalt2: "#262A33",
        amber: "#F5A623",
        amberDim: "#B87A12",
        lane: "#F7F7F5",
        steel: "#6B7280",
        steelLine: "#DADCE0",
        go: "#2E8B57",
        stop: "#C1443C",
      },
      fontFamily: {
        sign: ["var(--font-oswald)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
