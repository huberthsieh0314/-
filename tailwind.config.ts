import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#08111f",
          900: "#0e1726",
          800: "#162238",
          700: "#21324d",
          600: "#31486b"
        },
        paper: {
          50: "#f8f6ef",
          100: "#f1ede3",
          200: "#e4dcc8"
        },
        accent: {
          50: "#fff8e6",
          100: "#fff0bf",
          200: "#ffe08a",
          300: "#f5c84c",
          400: "#ddb024"
        }
      },
      boxShadow: {
        soft: "0 12px 30px rgba(8, 17, 31, 0.08)"
      },
      backgroundImage: {
        "soft-grid":
          "linear-gradient(to right, rgba(8, 17, 31, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(8, 17, 31, 0.06) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
