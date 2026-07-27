/**
 * 인포박스 — 문서 옆에 서는 요약 상자. 사진(선택) + 항목/값 표.
 *
 * 읽을 때는 조용한 표, 고칠 때는 그 자리에서 바로 고치는 표다. 별도 편집 창을 띄우지
 * 않는다 — 두 줄 고치자고 창을 열고 닫으면 그게 더 일이다.
 *
 * 자리는 종이 안, 본문 오른쪽 위. float 라 본문이 상자 왼쪽으로 흘러 내려간다 —
 * 위키가 예부터 쓰던 방식이고, 상자 아래 오른쪽이 빈 채로 남지 않는다.
 *
 * 생김새는 '종이에 인쇄된 표' 다. 카드가 아니다 — 그림자와 흰 면을 두르면 종이 위에
 * 붙인 스티커가 되어 본문과 겉돈다. 위키백과의 회색 상자를 그대로 가져와도 마찬가지로
 * 서재 한가운데 브라우저 창이 하나 열린 꼴이 된다.
 */
import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { compressInfoboxPhoto } from '@/lib/wiki3/infoboxPhoto';
import type { WikiInfobox } from '@/lib/wiki3/store';

const C = {
  ink: '#2b2620',
  sub: '#6f6350',
  muted: '#8d8271',
  line: 'rgba(60,47,24,.18)',
  lineSoft: 'rgba(60,47,24,.10)',
  paper: '#faf6ee',
  head: 'rgba(60,47,24,.06)',
  green: '#305f4c',
};

interface Props {
  value: WikiInfobox;
  /** 문서 제목 — 화면에는 안 쓴다. 읽어주는 기계에게 이 상자가 무엇의 요약인지 알린다. */
  title: string;
  /** 소속 책의 색 — 상자 윗머리 띠. */
  tint?: string;
  editing: boolean;
  onChange: (next: WikiInfobox | undefined) => void;
}

export function WikiInfoboxCard({ value, title, tint, editing, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const rows = value.rows ?? [];

  const setRow = (i: number, patch: Partial<{ k: string; v: string }>) => {
    onChange({ ...value, rows: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  };
  const addRow = () => onChange({ ...value, rows: [...rows, { k: '', v: '' }] });
  const delRow = (i: number) => onChange({ ...value, rows: rows.filter((_, j) => j !== i) });

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onChange({ ...value, photo: await compressInfoboxPhoto(file) });
    } catch (err) {
      notify.error(err instanceof Error ? err.message : '사진을 넣지 못했어요');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* 읽기 모드에서 아무 내용도 없으면 아예 그리지 않는다 — 빈 상자가 서 있으면
     '뭔가 로딩 중인가' 로 읽힌다. 고치는 중에는 채울 자리가 보여야 하니 남긴다. */
  const empty = !value.photo && rows.every((r) => !r.k.trim() && !r.v.trim());
  if (!editing && empty) return null;

  /* 종이에 인쇄된 표처럼 — 카드가 아니다.
     그림자와 흰 면을 두르면 종이 위에 붙인 스티커가 되어 본문과 겉돈다.
     그림자를 걷고, 바탕은 종이보다 아주 조금만 눌러(3%) 인쇄된 자리처럼 두고,
     테두리는 실선 한 겹만 남긴다. 위쪽 책 색 띠는 2px 로 얇게 — 뚜껑 노릇만 하고
     스스로 눈에 띄지는 않게. */
  return (
    <aside
      className="overflow-hidden rounded-[8px]"
      style={{ background: 'rgba(60,47,24,.032)', border: `1px solid ${C.line}` }}
      aria-label={`${title} 요약`}
    >
      {/* 머리엔 문서 제목을 적지 않는다 — 종이 맨 위에 이미 크게 있고,
          두 제목이 나란히 서면 둘 중 하나가 잘못 놓인 것처럼 보인다.
          어느 책의 문서인지는 색으로 남긴다. */}
      <div aria-hidden style={{ height: 2, background: tint || C.green, opacity: 0.75 }} />

      {/* 사진 */}
      {value.photo ? (
        /* 사진은 상자 폭을 꽉 채운다 — 안쪽에 여백을 두고 다시 테두리를 두르면
           액자 속 액자가 되어 상자가 두꺼워 보인다. */
        <div className="relative">
          <img src={value.photo} alt="" className="block w-full object-cover" style={{ borderBottom: `1px solid ${C.lineSoft}` }} />
          {editing && (
            <button
              type="button" onClick={() => onChange({ ...value, photo: undefined })}
              aria-label="사진 빼기"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors"
              style={{ background: 'rgba(30,24,16,.6)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : editing ? (
        <div className="p-2.5">
          <button
            type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-[8px] py-4 text-[12.5px] font-semibold transition-colors"
            style={{ border: `1px dashed ${C.line}`, color: C.sub, background: 'transparent' }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {busy ? '넣는 중…' : '사진 넣기'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        </div>
      ) : null}

      {/* 항목/값 */}
      <div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid items-start gap-2 px-3.5 py-2"
            style={{ gridTemplateColumns: '72px minmax(0,1fr)', borderTop: i === 0 ? 'none' : `1px solid ${C.lineSoft}` }}
          >
            {editing ? (
              <>
                <input
                  value={r.k} onChange={(e) => setRow(i, { k: e.target.value })}
                  placeholder="항목" aria-label={`${i + 1}번째 항목 이름`}
                  className="w-full bg-transparent text-[12px] font-bold outline-none"
                  style={{ color: C.sub }}
                />
                <div className="flex items-start gap-1">
                  <textarea
                    value={r.v} onChange={(e) => setRow(i, { v: e.target.value })}
                    placeholder="값" aria-label={`${i + 1}번째 값`} rows={1}
                    className="min-h-[20px] w-full resize-none bg-transparent text-[12.5px] leading-[1.5] outline-none"
                    style={{ color: C.ink }}
                    onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                  />
                  <button
                    type="button" onClick={() => delRow(i)} aria-label={`${r.k || '이 줄'} 빼기`}
                    className="mt-[1px] shrink-0 rounded p-0.5 transition-colors hover:bg-[rgba(60,47,24,.08)]"
                    style={{ color: C.muted }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-[12px] font-bold leading-[1.5]" style={{ color: C.sub }}>{r.k}</span>
                <span className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.5]" style={{ color: C.ink }}>{r.v}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="flex items-center gap-1 px-2.5 py-2" style={{ borderTop: `1px solid ${C.lineSoft}` }}>
          <button
            type="button" onClick={addRow}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold transition-colors hover:bg-[rgba(48,95,76,.08)]"
            style={{ color: C.green }}
          >
            <Plus className="h-3.5 w-3.5" /> 항목 추가
          </button>
          <span className="flex-1" />
          <button
            type="button"
            onClick={() => {
              /* 내용이 있을 때만 묻는다 — 빈 상자를 지우는 데 확인을 받으면
                 '잘못 눌렀나' 하고 한 번 더 생각하게 만들 뿐이다. */
              if (!empty && !window.confirm('인포박스를 지울까요?\n적어둔 항목과 사진이 함께 사라집니다.')) return;
              onChange(undefined);
            }}
            className={cn('flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-semibold transition-colors hover:bg-rose-50')}
            style={{ color: '#a2503f' }}
          >
            <Trash2 className="h-3.5 w-3.5" /> 상자 지우기
          </button>
        </div>
      )}
    </aside>
  );
}
