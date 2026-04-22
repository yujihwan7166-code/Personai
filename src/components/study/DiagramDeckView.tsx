/**
 * DiagramDeckView — 도식 덱 리스트 + 인라인 뷰어 + 뷰 전환 탭 + 노드 컨텍스트 메뉴
 */
import { useEffect, useRef, useState } from 'react';
import {
  BarChart3, Play, MoreHorizontal, RefreshCw, X, ChevronDown, Pencil, Target as TargetIcon,
  Layers, MessageSquarePlus, Check,
} from 'lucide-react';
import type { StudyNotebook, DiagramItem, DiagramKind, DiagramVariant, MindmapNodeStatus } from '@/types/study';
import { DIAGRAM_KIND_META } from '@/types/study';
import { MermaidView } from './MermaidView';
import { ComparisonTable } from './ComparisonTable';
import { cn } from '@/lib/utils';

const STATUS_META: Record<MindmapNodeStatus, { dot: string; label: string; glyph: string }> = {
  unknown: { dot: '#CBD5E1', label: '모름',   glyph: '●' },
  shaky:   { dot: '#F59E0B', label: '헷갈림', glyph: '◐' },
  'got-it':{ dot: '#10B981', label: '이해함', glyph: '✓' },
};

interface Props {
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onCreateNew: () => void;
  /** 유형 강제 + 기존 덱 교체를 위해 부모의 generate 를 그대로 호출. */
  onRegenerate: (d: DiagramItem, overrideKind?: DiagramKind) => void;
  onGenerateFromNode: (kind: 'quiz' | 'flashcard', text: string) => void;
  onJumpToPage?: (page: number) => void;
}

export function DiagramDeckView({
  notebook, onChange, onCreateNew, onRegenerate, onGenerateFromNode, onJumpToPage,
}: Props) {
  const diagrams = (notebook.diagrams ?? []).slice().sort((a, b) => b.createdAt - a.createdAt);
  const [openId, setOpenId] = useState<string | null>(diagrams[0]?.id ?? null);
  const [menuOpenKey, setMenuOpenKey] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');

  const deleteDiagram = (d: DiagramItem) => {
    if (!confirm(`"${d.title}" 도식을 삭제할까요?`)) return;
    const next = diagrams.filter((x) => x.id !== d.id);
    onChange({ ...notebook, diagrams: next });
    if (openId === d.id) setOpenId(next[0]?.id ?? null);
  };

  const renameDiagram = (id: string, next: string) => {
    const trimmed = next.trim();
    const list = notebook.diagrams ?? [];
    onChange({
      ...notebook,
      diagrams: list.map((d) => d.id === id ? { ...d, title: trimmed || d.title, updatedAt: Date.now() } : d),
    });
    setRenameId(null);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={onCreateNew}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-[12px] font-semibold text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors"
      >
        <BarChart3 className="h-3.5 w-3.5" /> 새 도식 만들기
      </button>

      {diagrams.map((d) => {
        const isOpen = openId === d.id;
        const kindMeta = DIAGRAM_KIND_META[d.kind];
        return (
          <div
            key={d.id}
            className={cn(
              'rounded-xl border bg-white dark:bg-slate-900 transition-colors',
              isOpen ? 'border-indigo-300 dark:border-indigo-700' : 'border-slate-200 dark:border-slate-800',
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 shrink-0 text-[15px]">
                {kindMeta?.emoji ?? '📊'}
              </div>
              <div className="flex-1 min-w-0">
                {renameId === d.id ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => renameDiagram(d.id, renameDraft)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); renameDiagram(d.id, renameDraft); }
                      if (e.key === 'Escape') { setRenameId(null); }
                    }}
                    className="w-full rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[12.5px] font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500"
                    aria-label="도식 이름 변경"
                  />
                ) : (
                  <button
                    onClick={() => setOpenId(isOpen ? null : d.id)}
                    onDoubleClick={(e) => { e.stopPropagation(); setRenameDraft(d.title); setRenameId(d.id); }}
                    className="w-full text-left"
                    title="더블클릭해서 이름 바꾸기"
                  >
                    <p className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 truncate">{d.title}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {d.kindLabel ?? kindMeta?.label} · {timeAgo(d.updatedAt)}
                      {d.concept && d.concept !== d.title && ` · ${truncate(d.concept, 24)}`}
                    </p>
                  </button>
                )}
              </div>

              <button
                onClick={() => setOpenId(isOpen ? null : d.id)}
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
              >
                <Play className="h-3 w-3" /> {isOpen ? '접기' : '보기'}
              </button>

              <div className="relative shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpenKey(menuOpenKey === d.id ? null : d.id); }}
                  className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900"
                  aria-label="도식 메뉴"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
                {menuOpenKey === d.id && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setMenuOpenKey(null)} />
                    <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg p-1 z-30">
                      <button
                        onClick={() => { setMenuOpenKey(null); setRenameDraft(d.title); setRenameId(d.id); }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Pencil className="h-3 w-3" /> 이름 바꾸기
                      </button>
                      <button
                        onClick={() => { setMenuOpenKey(null); onRegenerate(d); }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <RefreshCw className="h-3 w-3" /> 다시 만들기
                      </button>
                      <button
                        onClick={() => { setMenuOpenKey(null); deleteDiagram(d); }}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-[11.5px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                      >
                        <X className="h-3 w-3" /> 도식 삭제
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setOpenId(isOpen ? null : d.id)}
                className="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-900"
                aria-label={isOpen ? '접기' : '펼치기'}
              >
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
              </button>
            </div>

            {isOpen && (
              <DiagramInlineView
                diagram={d}
                notebook={notebook}
                onChange={onChange}
                onChangeKind={(k) => onRegenerate(d, k)}
                onGenerateFromNode={onGenerateFromNode}
                onJumpToPage={onJumpToPage}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── 펼친 상태의 도식 뷰 (뷰 전환 탭 + 렌더 + caption + 노드 메뉴) ── */
function DiagramInlineView({
  diagram, notebook, onChange, onChangeKind, onGenerateFromNode, onJumpToPage,
}: {
  diagram: DiagramItem;
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onChangeKind: (k: DiagramKind) => void;
  onGenerateFromNode: (kind: 'quiz' | 'flashcard', text: string) => void;
  onJumpToPage?: (page: number) => void;
}) {
  // 현재 활성 유형 (variants 중 열린 것 또는 본체)
  const [activeKind, setActiveKind] = useState<DiagramKind>(diagram.kind);
  useEffect(() => { setActiveKind(diagram.kind); }, [diagram.id, diagram.kind]);

  // 본체 + 캐시된 variants 목록
  const available: Array<{ kind: DiagramKind; variant: { mermaid?: string; table?: import('@/types/study').ComparisonTable; caption?: string } }> = [];
  available.push({ kind: diagram.kind, variant: { mermaid: diagram.userEditedMermaid || diagram.mermaid, table: diagram.table, caption: diagram.caption } });
  if (diagram.variants) {
    for (const [k, v] of Object.entries(diagram.variants) as Array<[DiagramKind, DiagramVariant]>) {
      if (k !== diagram.kind) available.push({ kind: k, variant: v });
    }
  }

  const activeEntry = available.find((a) => a.kind === activeKind) ?? available[0];
  const activeVariant = activeEntry.variant;

  const [nodeMenu, setNodeMenu] = useState<{ id: string; label: string; x: number; y: number } | null>(null);

  const updateNodeState = (nodeId: string, next: MindmapNodeStatus) => {
    const prev = diagram.nodeStates?.[nodeId] ?? 'unknown';
    const nextStates: Record<string, MindmapNodeStatus> = { ...(diagram.nodeStates ?? {}) };
    if (next === 'unknown') delete nextStates[nodeId]; else nextStates[nodeId] = next;
    const all = notebook.diagrams ?? [];
    onChange({
      ...notebook,
      diagrams: all.map((d) => d.id === diagram.id ? { ...d, nodeStates: nextStates, updatedAt: Date.now() } : d),
    });
    void prev;
  };

  return (
    <div className="px-3 pb-3 space-y-2">
      {/* 뷰 전환 탭 — 같은 개념, 다른 관점 */}
      <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="다른 유형으로 보기">
        {available.map(({ kind }) => {
          const meta = DIAGRAM_KIND_META[kind];
          const active = activeKind === kind;
          return (
            <button
              key={kind}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveKind(kind)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition-colors',
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-700',
              )}
              title={`${meta?.label} 로 보기`}
            >
              <span>{meta?.emoji}</span>
              <span>{meta?.label}</span>
            </button>
          );
        })}
        {/* 추가 유형 생성 버튼 */}
        {(['flowchart', 'timeline', 'comparison', 'cause', 'tree', 'sequence'] as DiagramKind[]).filter((k) => !available.find((a) => a.kind === k)).slice(0, 3).map((k) => {
          const meta = DIAGRAM_KIND_META[k];
          return (
            <button
              key={k}
              onClick={() => onChangeKind(k)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 dark:border-slate-700 px-2.5 py-1 text-[10.5px] text-slate-500 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-700"
              title={`${meta?.label} 로 새로 생성`}
            >
              <span>＋</span><span>{meta?.emoji}</span><span>{meta?.label}</span>
            </button>
          );
        })}
      </div>

      {/* 렌더러 */}
      <div onClick={() => setNodeMenu(null)}>
        {activeVariant.table ? (
          <ComparisonTable table={activeVariant.table} exportFilename={diagram.title} />
        ) : activeVariant.mermaid ? (
          <MermaidView
            code={activeVariant.mermaid}
            exportFilename={diagram.title}
            nodeStates={diagram.nodeStates}
            onNodeClick={(id, label, x, y) => setNodeMenu({ id, label, x, y })}
            onRetry={() => onChangeKind(activeKind)}
            onChangeKind={() => {
              const alt: DiagramKind = activeKind === 'flowchart' ? 'tree' : 'flowchart';
              onChangeKind(alt);
            }}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center text-[12px] text-slate-500">
            이 유형은 아직 생성되지 않았어요. 위 탭에서 ＋ 버튼을 눌러 만들어 보세요.
          </div>
        )}
      </div>

      {/* caption */}
      {activeVariant.caption && (
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2 text-[11.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
          <PageTaggedText text={activeVariant.caption} onJumpToPage={onJumpToPage} />
        </div>
      )}

      {/* 노드 컨텍스트 메뉴 (플로팅) */}
      {nodeMenu && (
        <NodeFloatingMenu
          nodeId={nodeMenu.id}
          label={nodeMenu.label}
          x={nodeMenu.x}
          y={nodeMenu.y}
          currentStatus={diagram.nodeStates?.[nodeMenu.id] ?? 'unknown'}
          onSetStatus={(s) => { updateNodeState(nodeMenu.id, s); setNodeMenu(null); }}
          onMakeCard={() => {
            onGenerateFromNode('flashcard', `${nodeMenu.label}${activeVariant.caption ? ' — ' + activeVariant.caption.slice(0, 80) : ''}`);
            setNodeMenu(null);
          }}
          onMakeQuiz={() => {
            onGenerateFromNode('quiz', nodeMenu.label);
            setNodeMenu(null);
          }}
          onSendToChat={() => {
            const text = `${diagram.title} 도식의 "${nodeMenu.label}" 부분을 설명해 주세요.`;
            window.dispatchEvent(new CustomEvent('study:askSelection', { detail: { text } }));
            setNodeMenu(null);
          }}
          onClose={() => setNodeMenu(null)}
        />
      )}
    </div>
  );
}

/* ── 플로팅 노드 메뉴 ── */
function NodeFloatingMenu({
  nodeId, label, x, y, currentStatus, onSetStatus, onMakeCard, onMakeQuiz, onSendToChat, onClose,
}: {
  nodeId: string;
  label: string;
  x: number;
  y: number;
  currentStatus: MindmapNodeStatus;
  onSetStatus: (s: MindmapNodeStatus) => void;
  onMakeCard: () => void;
  onMakeQuiz: () => void;
  onSendToChat: () => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [onClose]);

  // viewport 내 위치 보정
  const w = 220, h = 180;
  const pad = 8;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const left = Math.min(Math.max(pad, x - w / 2), vw - w - pad);
  const top = Math.min(Math.max(pad, y + 8), vh - h - pad);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[120] w-[220px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5"
      style={{ left, top }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 pt-1 pb-1.5 text-[11px] text-slate-500 truncate" title={label}>
        {label || nodeId}
      </div>
      <div className="px-2 py-1.5 flex items-center gap-2">
        <span className="text-[10.5px] text-slate-500 w-10">상태</span>
        {(['unknown', 'shaky', 'got-it'] as MindmapNodeStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onSetStatus(s)}
            className={cn(
              'h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] text-white',
              currentStatus === s ? 'border-slate-700' : 'border-transparent',
            )}
            style={{ background: STATUS_META[s].dot }}
            title={STATUS_META[s].label}
            aria-label={STATUS_META[s].label}
          >
            <span aria-hidden>{STATUS_META[s].glyph}</span>
          </button>
        ))}
      </div>
      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
      <MenuItem icon={<TargetIcon className="h-3.5 w-3.5" />} label="이 개념으로 퀴즈 3문항" onClick={onMakeQuiz} />
      <MenuItem icon={<Layers className="h-3.5 w-3.5" />} label="플래시카드 1장" onClick={onMakeCard} />
      <MenuItem icon={<MessageSquarePlus className="h-3.5 w-3.5" />} label="채팅에 보내기" onClick={onSendToChat} />
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <span className="text-slate-400">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

/* ── caption 내 [p.N] 클릭 점프 ── */
function PageTaggedText({ text, onJumpToPage }: { text: string; onJumpToPage?: (page: number) => void }) {
  const parts: React.ReactNode[] = [];
  const re = /\[p\.(\d+)\]/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const page = Number(m[1]);
    parts.push(
      <button
        key={`p-${k++}`}
        onClick={() => onJumpToPage?.(page)}
        className="inline-flex items-center rounded bg-slate-200 dark:bg-slate-700 hover:bg-indigo-200 hover:text-indigo-800 px-1 mx-0.5 text-[10px] font-semibold tabular-nums align-middle"
      >p.{page}</button>
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function timeAgo(ts: number): string {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  return `${Math.floor(s / 86400)}일 전`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// 미사용 import 경고 방지 (Check 아이콘 예약용)
void Check;
