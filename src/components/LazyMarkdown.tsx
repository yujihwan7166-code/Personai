import { Suspense, lazy } from 'react';
import remarkGfm from 'remark-gfm';

const MarkdownRenderer = lazy(async () => {
  const { default: ReactMarkdown } = await import('react-markdown');
  return {
    default: (props: { children: string }) => (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{props.children}</ReactMarkdown>
    ),
  };
});

interface LazyMarkdownProps {
  content: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function LazyMarkdown({ content, className, fallback }: LazyMarkdownProps) {
  if (!content) return null;

  return (
    <Suspense fallback={fallback ?? <div className={className}>{content}</div>}>
      {className ? (
        <div className={className}>
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </div>
      ) : (
        <MarkdownRenderer>{content}</MarkdownRenderer>
      )}
    </Suspense>
  );
}
