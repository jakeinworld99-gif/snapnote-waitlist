import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // 8-point dark palette from the approved design
        base: "#0b0d12",
        surface: "#161922",
        elevated: "#1c2030",
        "border-subtle": "#232838",
        "border-strong": "#2e3447",
        "border-focus": "#5eead4",
        "fg-strong": "#f5f7fa",
        "fg-default": "#e2e6ee",
        "fg-muted": "#9aa3b2",
        "fg-subtle": "#6b7385",
        accent: "#5eead4",
        "accent-hover": "#2dd4bf",
        "accent-press": "#14b8a6",
        "accent-ink": "#0b0d12",
        success: "#34d399",
        "success-soft": "#064e3b",
        warn: "#fbbf24",
        "warn-soft": "#422006",
        error: "#f87171",
        "error-soft": "#450a0a",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04) inset, 0 16px 32px -16px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(94,234,212,0.25), 0 8px 32px -8px rgba(94,234,212,0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
