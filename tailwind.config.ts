import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Newsreader', 'Pretendard Variable', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      /* ── 타이포그래피 스케일 (v2, 2026-04) ──
         1,500+곳에 bespoke text-[Npx]가 퍼져 있어 위계가 흐려짐.
         아래 6단계로 수렴. 새 코드는 이 토큰만 사용하고, 기존 픽셀 클래스는 점진 마이그레이션.
           nano    10px / 14 — 스펙·타임스탬프·초소형 라벨
           caption 11px / 15 — 보조 라벨·칩·뱃지
           body    13px / 20 — 기본 본문·버튼
           subhead 15px / 22 — 섹션 소제목·강조 본문
           title   18px / 26 — 카드 타이틀·모달 헤더
           display 24px / 32 — 페이지 히어로·큰 헤드라인
      */
      fontSize: {
        nano:    ['10px', { lineHeight: '14px', letterSpacing: '0.01em' }],
        caption: ['11px', { lineHeight: '15px' }],
        body:    ['13px', { lineHeight: '20px' }],
        subhead: ['15px', { lineHeight: '22px', letterSpacing: '-0.005em' }],
        title:   ['18px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        display: ['24px', { lineHeight: '32px', letterSpacing: '-0.015em' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        expert: {
          blue: "hsl(var(--expert-blue))",
          emerald: "hsl(var(--expert-emerald))",
          red: "hsl(var(--expert-red))",
          amber: "hsl(var(--expert-amber))",
          purple: "hsl(var(--expert-purple))",
          orange: "hsl(var(--expert-orange))",
          teal: "hsl(var(--expert-teal))",
          pink: "hsl(var(--expert-pink))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // ── 빈티지 노트북·페이퍼 톤 (planner 전용, 2026-04) ──
        paper: {
          cream: "#FBF7F0",      // 페이지 배경
          page:  "#FFFCF5",      // 카드 (살짝 더 밝음)
          ruled: "#E8DFCC",      // 가는 ruled line · 보더
          rule2: "#D9CDB1",      // 진한 ruled / divider
        },
        ink: {
          DEFAULT: "#1F1A14",    // 본문 (검정 X, 잉크 갈색기)
          light:   "#4A4239",    // 부제
          muted:   "#8A8273",    // 마이크로 라벨
          faint:   "#B8AE9A",    // 흐릿한 placeholder
        },
        stamp: {
          red:  "#A03A2A",       // 빨강 도장 (완료·마감)
          blue: "#1E4A6F",       // 만년필 청 (강조 1순위)
          gold: "#C9A227",       // 머스타드 (목표·황금)
          sage: "#6B7F5C",       // 차분한 그린 (습관)
        },
      },
      boxShadow: {
        // 빈티지 페이퍼 — 한 방향 부드러운 그림자
        paper: "2px 3px 0 #E0D6BC",
        "paper-sm": "1px 2px 0 #E8DFCC",
        "paper-lg": "3px 5px 0 #D9CDB1",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "shimmer": {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "shimmer": "shimmer 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate, typography],
} satisfies Config;
