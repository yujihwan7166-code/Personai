/**
 * 가계부 플로팅 AI 채팅바 — 방 전체 상주.
 * 한 줄 입력(로컬 파서 우선 → LLM 폴백) + 자연어 질의. 저장 직후 결과 칩 탭 → 수정.
 */
import { useCallback, useRef, useState } from 'react';
import { ArrowUp, Loader2, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseInput, type ParsedEntry } from '@/lib/ledger/parse';
import { InlineEntryForm } from '@/components/ledger/InlineEntryForm';
import { aiParseEntries, aiQuery } from '@/lib/ledger/ai';
import { ledgerStore, todayKey } from '@/services/ledgerStore';
import { TYPE_META, type LedgerCategory, type LedgerEntry } from '@/types/ledger';

const QUESTION_RE = /[?？]|얼마|알려|비교|많이 쓴|줄었|늘었/;

interface ChatBarProps {
  categories: LedgerCategory[];
  entries: LedgerEntry[];
  quickChips: Array<{ label: string; input: string }>; // 원탭 칩 (자주 쓰는 지출)
  onEdit: (id: string) => void;                         // 결과 칩 탭 → 수정 다이얼로그
  onSuggestRecurring: (e: ParsedEntry) => void;         // '매달' 감지 → 고정지출 등록 제안
}

export function ChatBar({ categories, entries, quickChips, onEdit, onSuggestRecurring }: ChatBarProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<LedgerEntry[]>([]); // 방금 저장한 건들 (칩)
  const [answer, setAnswer] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);   // 상세 패널 — 채팅바 위로 떠오름
  const inputRef = useRef<HTMLInputElement>(null);

  const catMeta = useCallback(
    (id: string) => categories.find((c) => c.id === id) ?? { label: id, emoji: '🏷️' },
    [categories],
  );

  const saveParsed = useCallback((parsed: ParsedEntry[]) => {
    const recurringOnes = parsed.filter((p) => p.recurring);
    const saved = ledgerStore.addEntries(parsed.map((p) => ({
      type: p.type, amount: p.amount, date: p.date, categoryId: p.categoryId, memo: p.memo, method: p.method,
    })));
    setAdded(saved);
    recurringOnes.forEach(onSuggestRecurring);
  }, [onSuggestRecurring]);

  const submit = useCallback(async (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    setAnswer(null); setNotice(null); setAdded([]);
    const local = parseInput(q, { today: new Date(), keywordDict: ledgerStore.getKeywordDict() });

    if (local.length > 0 && !QUESTION_RE.test(q)) {
      saveParsed(local);
      setText('');
      inputRef.current?.focus(); // 연속 입력 흐름 유지
      return;
    }

    setBusy(true);
    try {
      if (QUESTION_RE.test(q)) {
        setAnswer(await aiQuery(q, entries, categories, todayKey()));
      } else {
        const ai = await aiParseEntries(q, todayKey(), categories);
        if (ai.length > 0) saveParsed(ai);
        else setNotice('금액을 못 찾았어요 — "점심 김밥 4500"처럼 금액과 함께 적어주세요');
      }
      setText('');
    } catch {
      setNotice('AI 연결에 실패했어요 — "점심 김밥 4500" 형식이면 AI 없이 바로 저장돼요');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [text, busy, entries, categories, saveParsed]);

  return (
    // sticky — 스크롤과 무관하게 화면 하단부에 상주 (main 은 flex-col, 이 래퍼는 mt-auto)
    <div className="pointer-events-none sticky bottom-9 z-30 mt-auto flex w-full justify-center px-4">
      <div className="pointer-events-auto w-full max-w-[780px]">
        {/* 상세 패널 — AI 없이 필드 그대로 저장 */}
        {detailOpen && (
          <InlineEntryForm
            categories={categories}
            onClose={() => setDetailOpen(false)}
            onSaved={(saved) => { setAdded(saved); setAnswer(null); setNotice(null); }}
          />
        )}
        {/* 답변 카드 */}
        {answer && (
          <div className="ledger-rise mb-2 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-4 py-3 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed">{answer}</p>
              <button type="button" aria-label="닫기" onClick={() => setAnswer(null)} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-[hsl(var(--muted))]"><X className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        )}
        {notice && (
          <div className="ledger-rise mb-2 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] px-4 py-2.5 text-[13px] text-muted-foreground shadow-lg">{notice}</div>
        )}
        {/* 저장 결과 칩 — 탭하면 수정 */}
        {added.length > 0 && (
          <div className="ledger-rise mb-2 flex flex-wrap justify-center gap-1.5">
            {added.map((e) => (
              <button
                key={e.id} type="button" onClick={() => onEdit(e.id)}
                className="flex items-center gap-1.5 rounded-full border border-[hsl(var(--ledger-navy)/0.3)] bg-[hsl(var(--ledger-navy)/0.08)] px-3 py-1.5 text-[12.5px] shadow-sm transition-colors hover:bg-[hsl(var(--ledger-navy)/0.15)]"
              >
                <span>{catMeta(e.categoryId).emoji}</span>
                <span className="font-medium">{e.memo || catMeta(e.categoryId).label}</span>
                <span className="tabular-nums">{TYPE_META[e.type].sign}{e.amount.toLocaleString('ko-KR')}원</span>
                <span className="text-muted-foreground">{e.date.slice(5).replace('-', '/')}</span>
              </button>
            ))}
            <span className="self-center text-[11.5px] text-muted-foreground">탭하면 수정</span>
          </div>
        )}
        {/* 원탭 칩 */}
        {quickChips.length > 0 && added.length === 0 && !answer && (
          <div className="mb-2 flex flex-wrap justify-center gap-1.5">
            {quickChips.map((c) => (
              <button key={c.label} type="button" onClick={() => void submit(c.input)}
                className="rounded-full border border-[hsl(var(--hairline))] bg-[hsl(var(--card)/0.9)] px-3 py-1 text-[12px] text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground">
                {c.label}
              </button>
            ))}
          </div>
        )}
        {/* 입력바 */}
        <form
          onSubmit={(ev) => { ev.preventDefault(); void submit(); }}
          className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))] py-2.5 pl-5 pr-2.5 shadow-xl"
        >
          <input
            ref={inputRef} value={text} onChange={(ev) => setText(ev.target.value)}
            placeholder='"점심 김밥 4500" 처럼 적거나, "이번 달 카페 얼마?" 라고 물어보세요'
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/70"
            aria-label="가계부 입력"
          />
          <button
            type="button" onClick={() => setDetailOpen((o) => !o)} title="상세 입력 (AI 없이 정확하게)" aria-expanded={detailOpen}
            className={cn(
              'flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[13px] transition-colors',
              detailOpen
                ? 'border-[hsl(var(--ledger-navy)/0.4)] bg-[hsl(var(--ledger-navy)/0.1)] font-medium text-[hsl(var(--ledger-navy))]'
                : 'border-[hsl(var(--input))] text-muted-foreground hover:border-[hsl(var(--ledger-navy)/0.5)] hover:text-foreground',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" /> 상세
          </button>
          <button
            type="submit" disabled={busy || !text.trim()} aria-label="입력"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--ledger-navy))] text-white transition-opacity',
              (busy || !text.trim()) && 'opacity-40',
            )}
          >
            {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <ArrowUp className="h-[18px] w-[18px]" />}
          </button>
        </form>
      </div>
    </div>
  );
}
