import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./emails/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        // Marca (océano)
        abyss: "hsl(var(--bw-abyss))",
        deep: "hsl(var(--bw-deep))",
        sea: "hsl(var(--bw-sea))",
        aqua: "hsl(var(--bw-aqua))",
        "aqua-2": "hsl(var(--bw-aqua-2))",
        foam: "hsl(var(--bw-foam))",
        // Estados
        success: "hsl(var(--success))",
        "success-bg": "hsl(var(--success-bg))",
        warning: "hsl(var(--warning))",
        "warning-bg": "hsl(var(--warning-bg))",
        danger: "hsl(var(--danger))",
        "danger-bg": "hsl(var(--danger-bg))",
        info: "hsl(var(--info))",
        "info-bg": "hsl(var(--info-bg))",
        course: "hsl(var(--course))",
        "course-bg": "hsl(var(--course-bg))"
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "system-ui", "-apple-system", "sans-serif"]
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 3px)",
        sm: "calc(var(--radius) - 6px)"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        btn: "var(--shadow-btn)"
      }
    }
  },
  plugins: []
};

export default config;
