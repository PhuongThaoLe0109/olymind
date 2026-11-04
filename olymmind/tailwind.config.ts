import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Xanh đậm chủ đạo — Trí tuệ
        navy: {
          DEFAULT: "#0F172A",
          800: "#1E293B",
          700: "#334155",
        },
        // Vàng huy chương — Chiến thắng
        gold: {
          DEFAULT: "#F2BE48",
          light: "#FFE9A8",
          dark: "#B7791F",
        },
        // Đỏ năng lượng — Tốc độ / Chuông
        bell: {
          DEFAULT: "#EF4444",
          dark: "#B91C1C",
        },
        // Nền
        ink: "#1E0826", // Nền sân khấu tím đậm
        paper: "#FFF4D6", // Chữ kem
      },
      fontFamily: {
        sans: [
          "var(--font-ui)",
          '"Source Sans 3"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 32px rgba(245, 158, 11, 0.35)",
        bell: "0 0 40px rgba(239, 68, 68, 0.45)",
      },
      keyframes: {
        pulseBell: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.04)" },
        },
      },
      animation: {
        "pulse-bell": "pulseBell 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
