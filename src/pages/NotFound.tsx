import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, Search } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: 존재하지 않는 경로 접근:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="text-center max-w-md">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-7 w-7 text-muted-foreground" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-foreground">404</h1>
        <p className="mb-1 text-base text-foreground">찾으시는 페이지가 없어요</p>
        <p className="mb-8 text-[13px] text-muted-foreground">
          주소가 바뀌었거나 삭제됐을 수 있어요.<br />
          홈에서 다시 시작해보세요.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
