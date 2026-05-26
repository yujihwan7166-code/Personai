import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, CircleHelp, Footprints, Map, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { cn } from '@/lib/utils';

/* ── 심층 요약 레이아웃 (페이지 뱃지 파싱) ── */
export function SummaryLayout({
  content,
  onPageClick,
}: {
  content: string;
  onPageClick?: (page: number) => void;
}) {
  // [p.N] 토큰을 HTML span으로 치환 → 마크다운 파서가 HTML을 허용하면 그대로, 아니면 custom split 방식
  // 가장 안전하게: 마크다운을 블록별로 쪼개지 않고, 전체 텍스트에서 [p.N]을 특수 마커 ⟦PAGE:N⟧로 치환 후
  // 파서가 끝나면 DOM 후처리로 <span>으로 변환 — 하지만 그건 복잡.
  // 대신: [p.N]을 `<sup data-page="N">p.N</sup>` 유사 커스텀 span으로 인라인 치환하고,
  // 단순 렌더는 텍스트 토큰 형태 유지. 여기서는 "직접 파서" 방식으로 처리한다.
  const segments = useMemo(() => splitByPageToken(content), [content]);

  return (
    <div className="prose prose-slate dark:prose-invert max-w-none text-[13px] leading-relaxed [&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h3]:text-[13.5px] [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100 [&_p]:my-2">
      {segments.map((seg, i) => {
        if (seg.type === 'md') {
          return <LazyMarkdown key={i} content={seg.value} />;
        }
        return (
          <PageBadge key={i} page={seg.page} onClick={onPageClick} />
        );
      })}
    </div>
  );
}

type SummarySegment = { type: 'md'; value: string } | { type: 'page'; page: number };

function splitByPageToken(content: string): SummarySegment[] {
  const re = /\[p\.(\d+)\]/g;
  const out: SummarySegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) {
      out.push({ type: 'md', value: content.slice(last, m.index) });
    }
    out.push({ type: 'page', page: parseInt(m[1], 10) });
    last = m.index + m[0].length;
  }
  if (last < content.length) out.push({ type: 'md', value: content.slice(last) });
  return out;
}

function PageBadge({ page, onClick }: { page: number; onClick?: (p: number) => void }) {
  const disabled = !onClick;
  return (
    <button
      type="button"
      onClick={() => onClick?.(page)}
      disabled={disabled}
      className={cn(
        'inline-flex items-center align-middle rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300 transition-colors -mx-0.5',
        disabled
          ? 'cursor-help opacity-70'
          : 'hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900 cursor-pointer',
      )}
      title={disabled ? `원본 p.${page}` : `원본 p.${page}로 이동`}
      aria-label={`원본 페이지 ${page}`}
    >
      p.{page}
    </button>
  );
}

export function KeypointsLayout({ content }: { content: string }) {
  const items = parseKeypoints(content);
  if (items.length === 0) return <LazyMarkdown content={content} />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map((item, i) => (
        <KeypointCard key={i} term={item.term} body={item.body} />
      ))}
    </div>
  );
}

function KeypointCard({ term, body }: { term: string; body: string }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => setFlipped(!flipped)}
      className={cn(
        'group relative text-left rounded-xl border p-3 min-h-[100px] transition-all',
        flipped
          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-100'
          : 'bg-white border-amber-200 hover:border-amber-300 hover:shadow-sm',
      )}
      aria-pressed={flipped}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">
          {flipped ? '정의' : '용어'}
        </p>
        <span className="text-[10px] text-amber-400">⇅</span>
      </div>
      {!flipped ? (
        <p className="text-[13px] font-bold text-slate-900 leading-relaxed">{term}</p>
      ) : (
        <div className="text-[12px] text-slate-700 leading-relaxed prose prose-sm max-w-none">
          <LazyMarkdown content={body} />
        </div>
      )}
    </button>
  );
}

function parseKeypoints(content: string): { term: string; body: string }[] {
  const re = /^###\s+([^\n]+)\n([\s\S]*?)(?=\n###\s|$)/gm;
  const out: { term: string; body: string }[] = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    const term = m[1].trim();
    const body = m[2].trim();
    if (term) out.push({ term, body });
  }
  return out;
}

export function MindmapLayout({ content }: { content: string }) {
  const tree = parseTree(content);
  if (tree.length === 0) return <LazyMarkdown content={content} />;
  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/50 to-white p-3 space-y-1">
      {tree.map((node, i) => (
        <TreeNode key={i} node={node} depth={0} />
      ))}
    </div>
  );
}

interface TreeNodeData {
  label: string;
  children: TreeNodeData[];
}

function TreeNode({ node, depth }: { node: TreeNodeData; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  const colors = [
    'text-violet-900 font-bold text-[13px]',
    'text-violet-700 font-semibold text-[12px]',
    'text-violet-600 text-[11.5px]',
    'text-slate-600 text-[11px]',
  ];
  const cls = colors[Math.min(depth, colors.length - 1)];

  return (
    <div style={{ paddingLeft: depth * 14 }}>
      <div className="flex items-start gap-1">
        {hasChildren ? (
          <button
            onClick={() => setOpen(!open)}
            className="text-violet-400 hover:text-violet-700 mt-0.5"
            aria-label={open ? '접기' : '펼치기'}
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', open && 'rotate-90')}
            />
          </button>
        ) : (
          <span className="w-3 h-3 mt-0.5 flex items-center justify-center text-violet-300">
            •
          </span>
        )}
        <span className={cls}>
          {stripMarkdown(node.label)}
        </span>
      </div>
      {open && hasChildren && (
        <div className="mt-0.5">
          {node.children.map((c, i) => (
            <TreeNode key={i} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function stripMarkdown(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim();
}

function parseTree(content: string): TreeNodeData[] {
  const lines = content.split('\n');
  const stack: { depth: number; node: TreeNodeData }[] = [];
  const roots: TreeNodeData[] = [];
  for (const line of lines) {
    const m = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (!m) continue;
    const depth = Math.floor(m[1].length / 2);
    const label = m[2].trim();
    const node: TreeNodeData = { label, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].node.children.push(node);
    stack.push({ depth, node });
  }
  return roots;
}

export function GuideLayout({ content }: { content: string }) {
  const sections = parseGuideSections(content);
  if (sections.length === 0) return <LazyMarkdown content={content} />;
  const icons: Record<string, LucideIcon> = {
    '학습 목표': Target,
    '선수 지식': BookOpen,
    '학습 순서': Footprints,
    '점검 질문': CircleHelp,
  };
  return (
    <div className="space-y-2">
      {sections.map((s, i) => {
        const key = Object.keys(icons).find((k) => s.title.includes(k));
        const Icon = key ? icons[key] : Map;
        return (
          <div
            key={i}
            className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/50 to-white p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/80 text-rose-700 ring-1 ring-rose-100">
                <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
              </span>
              <h4 className="text-[12.5px] font-bold text-rose-800">{s.title}</h4>
            </div>
            <div className="text-[12px] leading-relaxed prose prose-sm max-w-none">
              <LazyMarkdown content={s.body} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function parseGuideSections(content: string): { title: string; body: string }[] {
  const re = /^##\s+(?:[^\w\s]*\s*)?([^\n]+)\n([\s\S]*?)(?=\n##\s|$)/gm;
  const out: { title: string; body: string }[] = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    const title = m[1].trim().replace(/[\u{1F3AF}\u{1F4DA}\u{1FA9C}\u{2753}\u{1F4CC}]/gu, '').trim();
    const body = m[2].trim();
    if (title) out.push({ title, body });
  }
  return out;
}
