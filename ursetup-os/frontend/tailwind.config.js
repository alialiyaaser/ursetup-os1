/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}", "./public/index.html"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', '"Inter"', "system-ui", "sans-serif"],
        sans: ['"IBM Plex Sans"', '"Manrope"', "system-ui", "sans-serif"],
        arabic: ['"IBM Plex Sans Arabic"', '"Tajawal"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        bg: {
          DEFAULT: "#0A0A0A",
          soft: "#121212",
          surface: "#1C1C1E",
        },
        line: "rgba(255,255,255,0.08)",
        muted: "#A3A3A3",
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-rtl": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(24px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        marquee: "marquee 40s linear infinite",
        "marquee-rtl": "marquee-rtl 40s linear infinite",
        shimmer: "shimmer 3s linear infinite",
        fadeUp: "fadeUp 0.9s ease-out both",
      },
    },
  },
  plugins: [],
};
