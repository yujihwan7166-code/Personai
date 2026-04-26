import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  body: string;
  /** [[페이지명]] 클릭 시 호출 — 부모가 페이지 열기 처리. */
  onOpenLink: (title: string) => void;
}

/**
 * [[페이지명]] 또는 [[페이지명|표시명]] → React 컴포넌트로 변환.
 * react-markdown 가 다른 마크다운 처리를 맡고, wikilink 만 우리가 가로챈다.
 */
function transformWikiLinks(body: string): string {
  // [[X|Y]] → [Y](##wiki:X), [[X]] → [X](##wiki:X)
  // ## prefix 는 react-markdown 에서 우리가 가로채기 위한 sentinel.
  return body.replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g, (_, target, label) => {
    const t = String(target).trim();
    const l = (label ?? target).toString().trim();
    return `[${l}](##wiki:${encodeURIComponent(t)})`;
  });
}

export function WikiBody({ body, onOpenLink }: Props) {
  const transformed = useMemo(() => transformWikiLinks(body), [body]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children, ...rest }) => {
          if (typeof href === 'string' && href.startsWith('##wiki:')) {
            const title = decodeURIComponent(href.slice('##wiki:'.length));
            return (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onOpenLink(title); }}
                className="text-primary underline-offset-2 hover:underline font-medium"
              >
                {children}
              </button>
            );
          }
          return (
            <a href={href} target="_blank" rel="noreferrer" {...rest}>
              {children}
            </a>
          );
        },
      }}
    >
      {transformed}
    </ReactMarkdown>
  );
}
