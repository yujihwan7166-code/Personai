/**
 * /notes — 재설계된 노트(메모+보드) 1단계.
 *
 * 좌측 노트 목록 + 우측 편집(제목 + Plate 글 편집기) + 디바운스 자동저장.
 * 보드(판) 토글·위키 승격·링크·그래프는 후속 단계. 디자인은 앱 토큰으로 통일.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, NotebookPen, Home } from 'lucide-react';
import type { Value } from 'platejs';
import { cn } from '@/lib/utils';
import { NoteEditor } from '@/components/notes/NoteEditor';
import {
  useNotes, createNote, updateNote, deleteNote,
  noteDisplayTitle, notePlainText, type Note,
} from '@/lib/notes/noteStore';

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(ts).toLocaleDateString('ko-KR');
}

const Notes = () => {
  const navigate = useNavigate();
  const notes = useNotes();
  const [activeId, setActiveId] = useState<string | null>(null);

  // 첫 진입 시 최신 노트 자동 선택.
  useEffect(() => {
    if (activeId === null && notes.length > 0) setActiveId(notes[0].id);
  }, [activeId, notes]);

  const active: Note | undefined = notes.find((n) => n.id === activeId);

  // 제목 드래프트 — 활성 노트 바뀌면 동기화(타이핑 중 목록 재정렬 지터 방지).
  const [titleDraft, setTitleDraft] = useState('');
  useEffect(() => { setTitleDraft(active?.title ?? ''); }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const titleTimer = useRef<number | null>(null);
  const memoTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (titleTimer.current) window.clearTimeout(titleTimer.current);
    if (memoTimer.current) window.clearTimeout(memoTimer.current);
  }, []);

  const onTitleChange = (v: string) => {
    setTitleDraft(v);
    if (!active) return;
    const id = active.id;
    if (titleTimer.current) window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(() => updateNote(id, { title: v }), 400);
  };

  const onMemoChange = (value: Value) => {
    if (!active) return;
    const id = active.id;
    if (memoTimer.current) window.clearTimeout(memoTimer.current);
    memoTimer.current = window.setTimeout(() => updateNote(id, { memo: value }), 500);
  };

  const handleNew = () => {
    const note = createNote();
    setActiveId(note.id);
  };

  const handleDelete = (id: string) => {
    deleteNote(id);
    if (activeId === id) setActiveId(null);
  };

  return (
    <div className="flex h-dvh bg-background text-foreground">
      {/* 좌측 목록 */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-[hsl(var(--hairline))] bg-[hsl(var(--sidebar-background))]">
        <div className="flex items-center gap-1 px-3 pt-3 pb-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="홈으로"
            aria-label="홈으로"
          >
            <Home className="h-4 w-4" strokeWidth={1.9} />
          </button>
          <h1 className="flex-1 truncate text-[16px] font-semibold tracking-tight">노트</h1>
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary/15"
            title="새 노트"
          >
            <Plus className="h-4 w-4" strokeWidth={2.2} />
            새 노트
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {notes.length === 0 ? (
            <p className="px-2 py-8 text-center text-[12.5px] text-muted-foreground">
              아직 노트가 없어요.<br />“새 노트”로 시작하세요.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {notes.map((note) => {
                const activeRow = note.id === activeId;
                const preview = notePlainText(note.memo);
                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(note.id)}
                      className={cn(
                        'group flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                        activeRow ? 'bg-primary/10' : 'hover:bg-accent',
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={cn('min-w-0 flex-1 truncate text-[13px] font-medium', activeRow ? 'text-primary' : 'text-foreground')}>
                          {noteDisplayTitle(note)}
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleDelete(note.id); } }}
                          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          title="삭제"
                          aria-label="노트 삭제"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </span>
                      </span>
                      {preview && (
                        <span className="truncate text-[11.5px] text-muted-foreground">{preview}</span>
                      )}
                      <span className="text-[10.5px] tabular-nums text-muted-foreground/70">{relativeTime(note.updatedAt)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* 우측 편집 */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {active ? (
          <div className="mx-auto w-full max-w-[760px] px-6 py-10 sm:px-10">
            <input
              value={titleDraft}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="제목 없음"
              className="mb-4 w-full bg-transparent text-[30px] font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <NoteEditor
              key={active.id}
              initialValue={active.memo}
              onChange={onMemoChange}
              className="min-h-[60vh]"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <NotebookPen className="h-8 w-8 text-muted-foreground/60" strokeWidth={1.6} />
            <p className="text-[14px] text-muted-foreground">노트를 선택하거나 새로 만들어 시작하세요.</p>
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              새 노트
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Notes;
