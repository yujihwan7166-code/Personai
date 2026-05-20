import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.tsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary.tsx";
import "./index.css";

// Sentry — VITE_SENTRY_DSN 미설정 시 init 자체 skip (no-op).
// dev / VITE_BYPASS_AUTH=1 환경 이벤트는 beforeSend 에서 drop — Sentry 노이즈 차단.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (import.meta.env.MODE === 'development') return null;
      if (import.meta.env.VITE_BYPASS_AUTH === '1') return null;
      return event;
    },
  });
}

// Dark mode initialization
if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
