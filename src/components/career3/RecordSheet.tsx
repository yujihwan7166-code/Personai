/**
 * 기록 편집 — 오른쪽에서 밀려 나오는 시트. 기둥을 가리지 않아서 어디를 고치는지 계속 보인다.
 */
import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { careerStore } from '@/services/careerStore';
import type { SpecCategory, SpecItem } from '@/types/career';

const FIELD = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[14px] text-foreground outline-none focus:border-[hsl(var(--c3-glow)/0.7)]';
const LABEL = 'mb-1.5 block text-[11.5px] text-muted-foreground';

interface Props {
  item: SpecItem | null;
  categories: SpecCategory[];
  onClose: () => void;
}

export function RecordSheet({ item, categories, onClose }: Props) {
  const [refined, setRefined] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ongoing, setOngoing] = useState(false);
  const [org, setOrg] = useState('');
  const [link, setLink] = useState('');
  const [detail, setDetail] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEscapeKey(onClose, { enabled: item !== null, evenInInput: true });

  useEffect(() => {
    if (!item) return;
    setRefined(item.refined); setDate(item.date); setEndDate(item.endDate ?? '');
    setOngoing(item.ongoing === true); setOrg(item.org ?? ''); setLink(item.link ?? '');
    setDetail(item.detail ?? ''); setCategoryId(item.categoryId); setConfirming(false);
  }, [item]);

  if (!item) return null;

  const valid = refined.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const save = () => {
    if (!valid) return;
    careerStore.updateItem(item.id, {
      refined: refined.trim(),
      date,
      endDate: !ongoing && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : undefined,
      ongoing: ongoing || undefined,
      org: org.trim() || undefined,
      link: link.trim() || undefined,
      detail: detail.trim() || undefined,
      categoryId,
    });
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <aside
        role="dialog" aria-modal="true" aria-label="기록 편집"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]"
      >
        <header className="flex items-center justify-between border-b border-[hsl(var(--hairline))] px-5 py-3.5">
          <h2 className="text-[14.5px] font-semibold">기록 고치기</h2>
          <button type="button" aria-label="닫기" onClick={onClose}
            className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground"><X className="h-4 w-4" /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <p className="mb-1 text-[11.5px] text-muted-foreground">적었던 그대로</p>
          <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground/85">{item.raw}</p>

          <label className="mb-4 block">
            <span className={LABEL}>이력서에 실릴 문장</span>
            <textarea value={refined} onChange={(e) => setRefined(e.target.value)} rows={3} className={cn(FIELD, 'resize-none leading-relaxed')} />
          </label>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className={LABEL}>날짜</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(FIELD, 'tabular-nums')} aria-label="시작일" />
            </label>
            <label className="block">
              <span className={LABEL}>{ongoing ? '진행 중' : '끝난 날 (선택)'}</span>
              <input type="date" value={endDate} disabled={ongoing} onChange={(e) => setEndDate(e.target.value)}
                className={cn(FIELD, 'tabular-nums', ongoing && 'opacity-40')} aria-label="종료일" />
            </label>
          </div>

          <label className="mb-4 flex w-fit select-none items-center gap-2 text-[13px] text-muted-foreground">
            <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} className="h-[15px] w-[15px] accent-[hsl(var(--c3-glow))]" />
            지금도 하고 있어요
          </label>

          <label className="mb-4 block">
            <span className={LABEL}>칸</span>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={FIELD}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="mb-4 block">
            <span className={LABEL}>어디서 (선택)</span>
            <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="기관·회사·주최" className={cn(FIELD, 'placeholder:text-muted-foreground/50')} />
          </label>

          <label className="mb-4 block">
            <span className={LABEL}>증빙 링크 (선택)</span>
            <span className="flex items-center gap-2">
              <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" className={FIELD} />
              {link.trim() && (
                <a href={link} target="_blank" rel="noreferrer" aria-label="링크 열기"
                  className="shrink-0 rounded p-2 text-muted-foreground transition-colors hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>
              )}
            </span>
          </label>

          <label className="block">
            <span className={LABEL}>더 적어둘 것 (선택)</span>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={4}
              placeholder="어떤 상황이었고, 무엇을 맡았고, 결과가 어땠는지. 문서 만들 때 이 내용이 재료가 돼요."
              className={cn(FIELD, 'resize-none leading-relaxed placeholder:text-muted-foreground/50')} />
          </label>
        </div>

        <footer className="flex items-center justify-between border-t border-[hsl(var(--hairline))] px-5 py-3.5">
          {confirming ? (
            <span className="flex items-center gap-3 text-[12.5px]">
              <span className="text-muted-foreground">지울까요?</span>
              <button type="button" onClick={() => { careerStore.removeItem(item.id); careerStore.pruneEmptyCategories(); onClose(); }}
                className="font-semibold text-[hsl(4_70%_62%)] underline-offset-4 hover:underline">지우기</button>
              <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground underline-offset-4 hover:underline">그대로 두기</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}
              className="text-[12.5px] text-muted-foreground underline-offset-4 transition-colors hover:text-[hsl(4_70%_62%)] hover:underline">
              이 기록 지우기
            </button>
          )}
          <button type="button" onClick={save} disabled={!valid}
            className={cn('h-9 rounded-full bg-[hsl(var(--c3-glow))] px-5 text-[13px] font-semibold text-[hsl(220_16%_8%)]', !valid && 'opacity-30')}>
            저장
          </button>
        </footer>
      </aside>
    </>
  );
}
