import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import '@/styles/agent-rich-markdown.css';
import { cn } from '@/lib/utils';

interface AgentRichMarkdownProps {
  content: string;
  className?: string;
}

function extractLanguageLabel(children: ReactNode) {
  const child = Array.isArray(children) ? children[0] : children;
  if (!isValidElement(child)) {
    return 'text';
  }

  const props = child.props as { className?: string };
  const className = typeof props.className === 'string' ? props.className : '';
  const match = className.match(/language-([\w-]+)/);
  return match?.[1] ?? 'text';
}

const markdownComponents = {
  table: ({ children }: any) => (
    <div className="agent-md-table-wrap">
      <table className="agent-md-table">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="agent-md-thead">{children}</thead>,
  th: ({ children }: any) => <th className="agent-md-th">{children}</th>,
  td: ({ children }: any) => <td className="agent-md-td">{children}</td>,
  tr: ({ children }: any) => <tr className="agent-md-tr">{children}</tr>,
  strong: ({ children }: any) => <strong className="agent-md-strong">{children}</strong>,
  h1: ({ children }: any) => <h3 className="agent-md-h1">{children}</h3>,
  h2: ({ children }: any) => <h4 className="agent-md-h2">{children}</h4>,
  h3: ({ children }: any) => <h5 className="agent-md-h3">{children}</h5>,
  ul: ({ children }: any) => <ul className="agent-md-list">{children}</ul>,
  ol: ({ children }: any) => <ol className="agent-md-list">{children}</ol>,
  li: ({ children }: any) => <li className="agent-md-item">{children}</li>,
  blockquote: ({ children }: any) => <blockquote className="agent-md-blockquote">{children}</blockquote>,
  hr: () => <hr className="agent-md-hr" />,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noreferrer noopener" className="agent-md-link">
      {children}
    </a>
  ),
  p: ({ children }: any) => <p className="agent-md-p">{children}</p>,
  pre: ({ children }: any) => (
    <div className="agent-md-codeblock">
      <div className="agent-md-codeblock__lang">{extractLanguageLabel(children)}</div>
      <pre className="agent-md-codeblock__pre">{children}</pre>
    </div>
  ),
  code: ({ className, children }: any) => {
    const content = String(children ?? '').replace(/\n$/, '');
    const isBlock = Boolean(className?.includes('language-') || content.includes('\n'));

    if (isBlock) {
      return (
        <code className={cn('agent-md-codeblock__code', className)}>
          {content}
        </code>
      );
    }

    return <code className="agent-md-inline-code">{children}</code>;
  },
} satisfies Components;

export function AgentRichMarkdown({ content, className }: AgentRichMarkdownProps) {
  if (!content) return null;

  return (
    <div className={cn('agent-rich-markdown', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
