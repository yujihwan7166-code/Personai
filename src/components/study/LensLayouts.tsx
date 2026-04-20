import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { LazyMarkdown } from '@/components/LazyMarkdown';
import { cn } from '@/lib/utils';

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
  const icons: Record<string, string> = {
    '학습 목표': '🎯',
    '선수 지식': '📚',
    '학습 순서': '🪜',
    '점검 질문': '❓',
  };
  return (
    <div className="space-y-2">
      {sections.map((s, i) => {
        const key = Object.keys(icons).find((k) => s.title.includes(k));
        const icon = key ? icons[key] : '🗺️';
        return (
          <div
            key={i}
            className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50/50 to-white p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{icon}</span>
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
    const title = m[1].trim().replace(/[🎯📚🪜❓📌]/g, '').trim();
    const body = m[2].trim();
    if (title) out.push({ title, body });
  }
  return out;
}
