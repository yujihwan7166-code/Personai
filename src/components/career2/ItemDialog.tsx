/**
 * v2 항목 상세 다이얼로그 — 문장·기간·기관·링크·세부사항 수정, 카테고리 이동, 삭제.
 */
import { useEffect, useState } from 'react';
import { ExternalLink, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { careerStore } from '@/services/careerStore';
import type { SpecCategory, SpecItem } from '@/types/career';

interface Props {
  item: SpecItem | null;
  categories: SpecCategory[];
  onClose: () => void;
}

export function ItemDialog({ item, categories, onClose }: Props) {
  const [refined, setRefined] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ongoing, setOngoing] = useState(false);
  const [org, setOrg] = useState('');
  const [link, setLink] = useState('');
  const [detail, setDetail] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEscapeKey(onClose, { enabled: item !== null, evenInInput: true });

  useEffect(() => {
    if (!item) return;
    setRefined(item.refined); setDate(item.date); setEndDate(item.endDate ?? '');
    setOngoing(item.ongoing === true); setOrg(item.org ?? ''); setLink(item.link ?? '');
    setDetail(item.detail ?? ''); setCategoryId(item.categoryId);
  }, [item]);

  if (!item) return null;

  const save = () => {
    if (!refined.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
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

  const field = 'w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--surface-2))] px-3 py-2 text-[13.5px] outline-none focus:border-[hsl(var(--career2-blue))]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-[460px] rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--background))] p-5 shadow-2xl" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[16px] font-bold">스펙 수정</h3>
          <button type="button" aria-label="닫기 (Esc)" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 truncate text-[11.5px] text-muted-foreground" title={item.raw}>원문: {item.raw}</p>

        <div className="space-y-2.5">
          <textarea value={refined} onChange={(e) => setRefined(e.target.value)} rows={2}
            className={cn(field, 'resize-none leading-relaxed')} aria-label="문장" />
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(field, 'w-auto')} aria-label="시작일" />
            {!ongoing && <>
              <span className="text-[12px] text-muted-foreground">~</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={cn(field, 'w-auto')} aria-label="종료일 (선택)" />
            </>}
            <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} className="h-3.5 w-3.5 accent-[hsl(var(--career2-blue))]" />
              진행 중
            </label>
          </div>
          <div className="flex gap-2">
            <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="기관·주최 (선택)" className={field} aria-label="기관" />
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field} aria-label="카테고리">
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="증빙 링크 (선택)" className={field} aria-label="링크" />
            {link.trim() && (
              <a href={link} target="_blank" rel="noreferrer" aria-label="링크 열기"
                className="shrink-0 rounded-lg border border-[hsl(var(--input))] p-2 text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>
            )}
          </div>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3}
            placeholder="세부사항 — 상황·역할·결과 (문서 생성 AI의 재료가 돼요)"
            className={cn(field, 'resize-none leading-relaxed')} aria-label="세부사항" />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={remove} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] text-red-500 hover:bg-red-500/10">
            <Trash2 className="h-3.5 w-3.5" /> 삭제
          </button>
          <button type="button" onClick={save} className="rounded-xl bg-[hsl(var(--career2-blue))] px-5 py-2 text-[13.5px] font-semibold text-white">저장</button>
        </div>
      </div>
    </div>
  );
}
