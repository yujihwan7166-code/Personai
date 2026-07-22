/**
 * 등재 내용 수정 — 문장·기간·기관·링크·세부사항, 부(部) 이동, 등재 말소.
 * 증서 문법: 이중 괘선 프레임 + 밑줄 필드, 라운드·그림자 없음.
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

  const field = 'w-full border-b border-[hsl(var(--input))] bg-transparent pb-1.5 text-[13.5px] outline-none focus:border-[hsl(var(--career2-blue))]';
  const labelCls = 'mb-1 block text-[10.5px] font-semibold tracking-[0.08em] text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="c2-doc w-full max-w-[480px] bg-[hsl(var(--card))] p-6" onClick={(ev) => ev.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[15.5px] font-bold">등재 내용 수정</h3>
          <button type="button" aria-label="닫기 (Esc)" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="c2-mono mb-4 truncate text-[11px] text-muted-foreground" title={item.raw}>접수 원문 — {item.raw}</p>

        <div className="space-y-4">
          <label className="block">
            <span className={labelCls}>기재 문장</span>
            <textarea value={refined} onChange={(e) => setRefined(e.target.value)} rows={2}
              className={cn(field, 'resize-none leading-relaxed')} aria-label="기재 문장" />
          </label>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            <label className="block">
              <span className={labelCls}>기간</span>
              <span className="flex items-center gap-2">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(field, 'c2-mono w-auto')} aria-label="시작일" />
                {!ongoing && <>
                  <span className="text-[12px] text-muted-foreground">–</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={cn(field, 'c2-mono w-auto')} aria-label="종료일 (선택)" />
                </>}
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 pb-2 text-[12.5px] text-muted-foreground">
              <input type="checkbox" checked={ongoing} onChange={(e) => setOngoing(e.target.checked)} className="h-3.5 w-3.5 accent-[hsl(var(--career2-blue))]" />
              진행 중
            </label>
          </div>

          <div className="flex gap-3">
            <label className="block flex-1">
              <span className={labelCls}>기관·주최</span>
              <input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="(선택)" className={field} aria-label="기관" />
            </label>
            <label className="block flex-1">
              <span className={labelCls}>부(部)</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={cn(field, 'cursor-pointer')} aria-label="부 이동">
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>증빙 링크</span>
            <span className="flex items-center gap-2">
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="(선택)" className={field} aria-label="링크" />
              {link.trim() && (
                <a href={link} target="_blank" rel="noreferrer" aria-label="링크 열기"
                  className="shrink-0 pb-1 text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>
              )}
            </span>
          </label>

          <label className="block">
            <span className={labelCls}>세부사항 — 문서 발급 AI의 재료</span>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3}
              placeholder="상황·역할·결과 (선택)"
              className={cn(field, 'resize-none leading-relaxed')} aria-label="세부사항" />
          </label>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button type="button" onClick={remove} className="text-[12.5px] text-[hsl(var(--career2-seal))] underline-offset-2 hover:underline">
            등재 말소
          </button>
          <button type="button" onClick={save} className="border border-[hsl(var(--career2-blue))] bg-[hsl(var(--career2-blue))] px-4 py-1.5 text-[13px] font-semibold text-white">저장</button>
        </div>
      </div>
    </div>
  );
}
