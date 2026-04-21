import { isValidElement, useState, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { Check, Copy } from 'lucide-react';
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

/** 코드 블록 텍스트만 추출 (<code> 요소의 children 을 string 으로). */
function extractCodeText(children: ReactNode): string {
  const child = Array.isArray(children) ? children[0] : children;
  if (!isValidElement(child)) return String(children ?? '');
  const props = child.props as { children?: ReactNode };
  const raw = props.children;
  if (typeof raw === 'string') return raw.replace(/\n$/, '');
  if (Array.isArray(raw)) return raw.map((r) => typeof r === 'string' ? r : '').join('').replace(/\n$/, '');
  return String(raw ?? '');
}

/** 코드 블록 래퍼 — 언어 라벨 + 복사 버튼. */
function CodeBlock({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = extractLanguageLabel(children);
  const handleCopy = async () => {
    const text = extractCodeText(children);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* noop */ }
  };
  return (
    <div className="agent-md-codeblock">
      <div className="agent-md-codeblock__header">
        <span className="agent-md-codeblock__lang">{lang}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="agent-md-codeblock__copy"
          aria-label={copied ? '복사됨' : '코드 복사'}
          title={copied ? '복사됨' : '코드 복사'}
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? '복사됨' : '복사'}</span>
        </button>
      </div>
      <pre className="agent-md-codeblock__pre">{children}</pre>
    </div>
  );
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
  // 페이지 h1 은 이미 앱 쉘에 있으므로 여기선 h2 부터 시작 — 스크린리더 계층 유지.
  h1: ({ children }: any) => <h2 className="agent-md-h1">{children}</h2>,
  h2: ({ children }: any) => <h3 className="agent-md-h2">{children}</h3>,
  h3: ({ children }: any) => <h4 className="agent-md-h3">{children}</h4>,
  h4: ({ children }: any) => <h5 className="agent-md-h4">{children}</h5>,
  h5: ({ children }: any) => <h6 className="agent-md-h5">{children}</h6>,
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
  pre: ({ children }: any) => <CodeBlock>{children}</CodeBlock>,
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
