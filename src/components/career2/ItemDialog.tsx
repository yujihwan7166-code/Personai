/**
 * 기록 편집 — Swiss: 사각 모서리, 밑줄 필드, 라벨은 항상 보이게(placeholder-only 금지).
 */
import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { careerStore } from '@/services/careerStore';
import type { SpecCategory, SpecItem } from '@/types/career';

interface Props {
  item: SpecItem | null;
  categories: SpecCategory[];
  onClose: () => void;
}

const FIELD = 'w-full border-b border-[hsl(var(--input))] bg-transparent pb-1.5 text-[14px] outline-none focus:border-[hsl(var(--c2-laurel))]';
const LABEL = 'c2-eyebrow mb-1.5 block text-[10px] text-muted-foreground';

export function ItemDialog({ item, categories, onClose }: Props) {
  const [refined, setRefined] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ongoing, setOngoing] = useState(false);
  const [org, setOrg] = useState('');
  const [link, setLink] = useState('');
  const [detail, setDetail] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEscapeKey(onClose, { enabled: item !== null, evenInInput: true });

  useEffect(() => {
    if (!item) return;
    setRefined(item.refined); setDate(item.date); setEndDate(item.endDate ?? '');
    setOngoing(item.ongoing === true); setOrg(item.org ?? ''); setLink(item.link ?? '');
    setDetail(item.detail ?? ''); setCategoryId(item.categoryId); setConfirmDelete(false);
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

  const remove = () => { careerStore.removeItem(item.id); careerStore.pruneEmptyCategories(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="기록 편집" onClick={onClose}>
      <div className="w-full max-w-[520px] border border-[hsl(var(--foreground))] bg-[hsl(var(--card))]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b-2 border-[hsl(var(--foreground))] px-6 py-3">
          <h2 className="text-[15px] font-bold">기록 편집</h2>
          <button type="button" aria-label="닫기" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <div className="px-6 py-5">
          <p className="c2-eyebrow mb-1 text-[10px] text-muted-foreground">적은 그대로</p>
          <p className="mb-5 truncate text-[12.5px] text-muted-foreground" title={item.raw}>{item.raw}</p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={LABEL}>이력서 문장</span>
              <textarea value={refined} onChange={(e) => setRefined(e.target.value)} rows={2} className={cn(FIELD, 'resize-none leading-relaxed')} />
            </label>

            <div>
              <span className={LABEL}>기간</span>
              <div className="flex items-center gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="시작일" className={cn(FIELD, 'c2-num')} />
                {!ongoing && (
                  <>
                    <span className="text-muted-foreground">–</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="종료일" className={cn(FIELD, 'c2-num')} />
                  </>
                )}
              </div>
              <label className="mt-2 flex w-fit cursor-pointer select-none items-center gap-2 text-[12.5px] text-muted-foreground">
                <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} className="h-[15px] w-[15px] accent-[hsl(var(--c2-laurel))]" />
                지금도 진행 중
              </label>
            </div>

            <label className="block">
              <span className={LABEL}>칸</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cn(FIELD, 'cursor-pointer')}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <label className="block">
              <span className={LABEL}>기관·주최</span>
              <input value={org} onChange={(e) => setOrg(e.target.value)} className={FIELD} />
            </label>

            <label className="block">
              <span className={LABEL}>증빙 링크</span>
              <span className="flex items-center gap-2">
                <input value={link} onChange={(e) => setLink(e.target.value)} className={FIELD} inputMode="url" />
                {link.trim() && (
                  <a href={link} target="_blank" rel="noreferrer" aria-label="링크 열기" className="shrink-0 pb-1 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </span>
            </label>

            <label className="block sm:col-span-2">
              <span className={LABEL}>세부 내용</span>
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3}
                placeholder="상황·역할·결과를 적어두면 문서 만들 때 재료로 쓰여요"
                className={cn(FIELD, 'resize-none leading-relaxed placeholder:text-muted-foreground/50')} />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[hsl(var(--hairline))] px-6 py-3">
          {confirmDelete ? (
            <span className="flex items-center gap-3 text-[12.5px]">
              <span className="text-muted-foreground">이 기록을 지울까요?</span>
              <button type="button" onClick={remove} className="font-semibold text-red-600 underline-offset-4 hover:underline">지우기</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-muted-foreground underline-offset-4 hover:underline">취소</button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-[12.5px] text-muted-foreground underline-offset-4 hover:text-red-600 hover:underline">
              기록 지우기
            </button>
          )}
          <button
            type="button" onClick={save} disabled={!valid}
            className={cn('h-9 bg-[hsl(var(--c2-laurel))] px-5 text-[13px] font-semibold text-white', !valid && 'cursor-not-allowed opacity-35')}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
