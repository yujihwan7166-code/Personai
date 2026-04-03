import { Suspense, lazy } from 'react';

const MarkdownRenderer = lazy(() => import('react-markdown'));

interface LazyMarkdownProps {
  content: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function LazyMarkdown({ content, className, fallback }: LazyMarkdownProps) {
  if (!content) return null;

  return (
    <Suspense fallback={fallback ?? <div className={className}>{content}</div>}>
      <MarkdownRenderer className={className}>{content}</MarkdownRenderer>
    </Suspense>
  );
}
