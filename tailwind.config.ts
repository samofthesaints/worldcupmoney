import type { Config } from "tailwindcss";

// Colors come straight from design.md (the project's design system).
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // shadcn-style semantic names mapped onto the design.md palette
        background: "#0A0A0B", // --bg-canvas
        foreground: "#F5F5F4", // --text-primary
        card: { DEFAULT: "#141416", foreground: "#F5F5F4" }, // --bg-surface
        popover: { DEFAULT: "#1C1C1F", foreground: "#F5F5F4" }, // --bg-surface-2
        primary: { DEFAULT: "#E8501F", foreground: "#FFFFFF" }, // --accent
        secondary: { DEFAULT: "#1C1C1F", foreground: "#F5F5F4" },
        muted: { DEFAULT: "#1C1C1F", foreground: "#A1A1AA" }, // --text-secondary
        accent: { DEFAULT: "#26262A", foreground: "#F5F5F4" }, // --bg-surface-3 (hover)
        destructive: { DEFAULT: "#EF4444", foreground: "#FFFFFF" },
        border: "#26262A", // --border-subtle
        input: "#26262A",
        ring: "#E8501F",
        // raw design tokens for direct use
        surface2: "#1C1C1F",
        surface3: "#26262A",
        inverse: "#E8EAE3",
        tertiary: "#6B6B73", // --text-tertiary
        yes: { DEFAULT: "#22C55E", muted: "#0F2E1C" },
        no: { DEFAULT: "#EF4444", muted: "#34161A" },
        accentHover: "#FF6A3D",
        accentMuted: "#3A1E14",
        warning: "#EAB308",
        info: "#60A5FA",
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        flash: {
          "0%": { backgroundColor: "rgba(232,80,31,0.18)" },
          "100%": { backgroundColor: "transparent" },
        },
        "flash-up": {
          "0%": { backgroundColor: "rgba(34,197,94,0.16)" },
          "100%": { backgroundColor: "transparent" },
        },
        "flash-down": {
          "0%": { backgroundColor: "rgba(239,68,68,0.16)" },
          "100%": { backgroundColor: "transparent" },
        },
        shimmer: { "0%,100%": { opacity: "0.5" }, "50%": { opacity: "1" } },
      },
      animation: {
        flash: "flash 0.9s ease",
        "flash-up": "flash-up 0.9s ease",
        "flash-down": "flash-down 0.9s ease",
        shimmer: "shimmer 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
