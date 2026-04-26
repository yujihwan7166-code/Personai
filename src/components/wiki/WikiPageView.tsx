import { useState, useEffect } from 'react';
import { Pencil, Trash2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type WikiPage, type WikiPageType, type WikiPageStatus,
  WIKI_TYPE_META, WIKI_STATUS_META,
} from '@/types/wiki';
import { WikiBody } from './WikiBody';

interface Props {
  page: WikiPage;
  editing: boolean;
  backlinks: WikiPage[];
  onChange: (next: WikiPage) => void;
  onDelete: () => void;
  onToggleEdit: () => void;
  /** 본문 [[link]] 클릭 또는 백링크 클릭 시 호출. */
  onOpenLink: (titleOrId: string) => void;
}

export function WikiPageView({ page, editing, backlinks, onChange, onDelete, onToggleEdit, onOpenLink }: Props) {
  // 편집 중에만 로컬 draft 사용 (cancel 시 폐기). 저장 시 onChange.
  const [draft, setDraft] = useState<WikiPage>(page);

  useEffect(() => {
    if (!editing) setDraft(page);
  }, [page, editing]);

  const typeMeta = WIKI_TYPE_META[page.type];
  const statusMeta = WIKI_STATUS_META[page.status];

  const save = () => {
    onChange(draft);
    onToggleEdit();
  };
  const cancel = () => {
    setDraft(page);
    onToggleEdit();
  };

  return (
    <article className="max-w-3xl mx-auto px-8 py-8">
      {/* 헤더 */}
      <header className="mb-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="text-3xl shrink-0 leading-none mt-0.5" aria-hidden>{typeMeta.icon}</span>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full text-2xl font-bold bg-transparent outline-none border-b border-transparent focus:border-primary/30 py-0.5"
                placeholder="페이지 제목"
              />
            ) : (
              <h1 className="text-2xl font-bold text-foreground">{page.title}</h1>
            )}
            {page.aliases.length > 0 && !editing && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                별칭: {page.aliases.join(' · ')}
              </p>
            )}
          </div>

          {/* 액션 */}
          <div className="flex items-center gap-1 shrink-0">
            {editing ? (
              <>
                <button onClick={cancel} className="px-2.5 h-8 rounded-md text-[12px] text-muted-foreground hover:bg-accent transition-colors flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> 취소
                </button>
                <button onClick={save} className="px-2.5 h-8 rounded-md bg-primary text-primary-foreground text-[12px] font-semibold hover:opacity-90 transition-opacity flex items-center gap-1">
                  <Save className="w-3.5 h-3.5" /> 저장
                </button>
              </>
            ) : (
              <>
                <button onClick={onToggleEdit} className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" title="편집" aria-label="편집">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={onDelete} className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="삭제" aria-label="삭제">
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 메타 칩 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* type */}
          {editing ? (
            <select
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as WikiPageType })}
              className="text-[11px] px-2 h-6 rounded-md border border-[hsl(var(--hairline))] bg-background"
            >
              {Object.entries(WIKI_TYPE_META).map(([k, m]) => (
                <option key={k} value={k}>{m.icon} {m.label}</option>
              ))}
            </select>
          ) : (
            <span className="text-[10.5px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: `${typeMeta.tint}1A`, color: typeMeta.tint }}>
              {typeMeta.label}
            </span>
          )}

          {/* status */}
          {editing ? (
            <select
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as WikiPageStatus })}
              className="text-[11px] px-2 h-6 rounded-md border border-[hsl(var(--hairline))] bg-background"
            >
              {Object.entries(WIKI_STATUS_META).map(([k, m]) => (
                <option key={k} value={k}>{m.label}</option>
              ))}
            </select>
          ) : (
            <span className="text-[10.5px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: `${statusMeta.tint}1A`, color: statusMeta.tint }}>
              {statusMeta.label}
            </span>
          )}

          {/* tags */}
          {editing ? (
            <input
              value={draft.tags.join(', ')}
              onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              placeholder="태그, 쉼표로 구분"
              className="text-[11px] px-2 h-6 rounded-md border border-[hsl(var(--hairline))] bg-background min-w-[160px]"
            />
          ) : (
            page.tags.map((t) => (
              <span key={t} className="text-[10.5px] px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                #{t}
              </span>
            ))
          )}

          {editing && (
            <input
              value={draft.aliases.join(', ')}
              onChange={(e) => setDraft({ ...draft, aliases: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              placeholder="별칭, 쉼표"
              className="text-[11px] px-2 h-6 rounded-md border border-[hsl(var(--hairline))] bg-background min-w-[140px]"
            />
          )}
        </div>
      </header>

      {/* 본문 */}
      <section className={cn('min-h-[200px]', editing ? '' : 'prose prose-sm max-w-none')}>
        {editing ? (
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="마크다운 본문… [[다른 페이지]] 로 위키링크 만들기"
            className="w-full min-h-[420px] bg-background border border-[hsl(var(--hairline))] rounded-lg p-4 text-[13.5px] leading-7 font-mono outline-none focus:border-primary/40 transition-colors resize-y"
            autoFocus
          />
        ) : page.body.trim() === '' ? (
          <p className="text-muted-foreground text-[13px] italic">
            본문이 비어있어요. 우측 상단 ✏️ 로 편집을 시작하세요.
          </p>
        ) : (
          <WikiBody body={page.body} onOpenLink={onOpenLink} />
        )}
      </section>

      {/* 백링크 */}
      {!editing && backlinks.length > 0 && (
        <section className="mt-10 pt-5 border-t border-[hsl(var(--hairline))]">
          <h2 className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground mb-2">
            이 페이지를 인용한 곳 · {backlinks.length}
          </h2>
          <ul className="space-y-1">
            {backlinks.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => onOpenLink(b.id)}
                  className="text-[12.5px] text-primary hover:underline"
                >
                  {WIKI_TYPE_META[b.type].icon} {b.title}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
