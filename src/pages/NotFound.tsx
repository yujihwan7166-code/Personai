import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass, Home, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))] px-6 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/40">
          <Compass className="h-8 w-8 text-indigo-600 dark:text-indigo-400" strokeWidth={1.8} />
        </div>

        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
          404 · NOT FOUND
        </p>
        <h1 className="mt-2 font-display text-[24px] font-semibold text-[hsl(var(--foreground))] tracking-tight">
          이 페이지를 찾을 수 없어요
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-[hsl(var(--muted-foreground))]">
          요청하신 주소가 바뀌었거나 삭제되었을 수 있습니다.<br />
          홈으로 돌아가 계속 사용해 주세요.
        </p>
        {location.pathname && (
          <div className="mt-4 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-2))] px-3 py-1.5 font-mono text-[11px] text-[hsl(var(--muted-foreground))] inline-block">
            {location.pathname}
          </div>
        )}

        <div className="mt-7 flex flex-col sm:flex-row gap-2 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-[13px] font-semibold text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" />
            홈으로
          </a>
          <button
            type="button"
            onClick={() => {
              const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true, bubbles: true });
              window.dispatchEvent(ev);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-4 py-2 text-[13px] font-semibold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface-2))] transition-colors"
          >
            <Search className="h-4 w-4" />
            검색 ⌘K
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
