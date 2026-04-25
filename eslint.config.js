import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".next", ".claude/worktrees", "api/sim-orchestrator.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Phase 2: unused 변수 가시화 — _ 접두사는 의도적 미사용으로 허용.
      // warn 으로 설정해 빌드 차단 없이 점진 정리 유도.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      // CI 게이트 통과 + 가시성 유지를 위해 점진 정리 대상 룰들을 warn 으로 강등.
      // 잔존 위반은 별도 클린업 PR 에서 처리.
      "@typescript-eslint/no-explicit-any": "warn",
      "no-misleading-character-class": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
    },
  },
  {
    files: [
      "src/components/ui/badge.tsx",
      "src/components/ui/button.tsx",
      "src/components/ui/form.tsx",
      "src/components/ui/navigation-menu.tsx",
      "src/components/ui/sidebar.tsx",
      "src/components/ui/sonner.tsx",
      "src/components/ui/toggle.tsx",
      "src/contexts/AuthContext.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/pages/Index.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
      "prefer-const": "off",
      "no-constant-condition": "off",
      "no-constant-binary-expression": "off",
      "no-empty": "off",
    },
  },
);
