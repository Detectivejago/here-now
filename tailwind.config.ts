import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F8E7C6",
        navy: "#173F72",
        coral: "#FF6B61",
        ink: "#102F55",
        paper: "#FFF9EF"
      },
      boxShadow: {
        soft: "0 16px 35px rgba(23, 63, 114, 0.16)",
        coral: "0 12px 24px rgba(255, 107, 97, 0.28)"
      },
      borderRadius: {
        pill: "999px",
        map: "34px"
      }
    }
  },
  plugins: []
};

export default config;
