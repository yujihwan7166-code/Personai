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
import { ImagePlus, Loader2, Plus, X } from 'lucide-react';
import { notify } from '@/lib/notify';
import { compressInfoboxPhoto } from '@/lib/wiki3/infoboxPhoto';
import type { WikiInfobox } from '@/lib/wiki3/store';

const C = {
  ink: '#2b2620',
  sub: '#6f6350',
  muted: '#8d8271',
  lineSoft: 'rgba(60,47,24,.10)',
  paper: '#fdfaf2',
  green: '#305f4c',
};
/** 본문 제목과 같은 명조 — 항목 이름을 표 머리가 아니라 '적어둔 말'로 보이게 한다. */
const SERIF = "'Nanum Myeongjo', 'Noto Serif KR', 'Gowun Batang', serif";

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

  /* 겉모습 — 상자를 두르지 않는다.
     테두리·모서리·바탕을 가지면 종이 위에 붙인 위젯이 되어, 이 방에서 유일하게
     '앱 부품' 처럼 생긴 물건이 됐다. 종이 자체를 바탕으로 쓰고, 위아래를 이 방이
     이미 쓰는 선으로 닫는다 — 문서 머리 아래에 그어진 그 겹줄(3px double)이다.
     같은 선을 쓰면 설명하지 않아도 같은 종이의 물건으로 읽힌다.
     항목 이름은 본문 제목과 같은 명조 — 표가 아니라 '적어둔 것' 으로 보이게. */
  return (
    /* 바탕은 종이색으로 채운다. 투명하면 밑을 지나가는 본문 블록이 비쳐 겹쳐 보인다
       — 종이와 같은 색이라 눈에는 여전히 '아무 바탕도 없는' 것으로 보인다. */
    <aside aria-label={`${title} 요약`} style={{ background: C.paper }}>
      {/* 위 겹줄 — 책 색은 아주 옅게만 섞는다(어느 책인지 남기되 띠로 튀지 않게) */}
      <div aria-hidden style={{ borderTop: `3px double ${tint ? `${tint}55` : 'rgba(60,47,24,.3)'}` }} />

      {/* 사진 자리는 늘 맨 위 — 없을 때도 자리를 지킨다.
          예전엔 사진이 없으면 아래 '＋사진' 글자만 있어서, 넣는 순간 상자 생김새가
          통째로 바뀌고 아래 항목들이 밀려 내려갔다. 자리를 미리 잡아두면
          '여기 사진이 온다' 가 보이고, 넣어도 흔들리지 않는다. */}
      {value.photo ? (
        <div className="relative pt-3">
          <img src={value.photo} alt="" className="block w-full" />
          {editing && (
            <button
              type="button" onClick={() => onChange({ ...value, photo: undefined })}
              aria-label="사진 빼기"
              className="absolute right-1.5 top-4 flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors"
              style={{ background: 'rgba(30,24,16,.55)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : editing ? (
        <button
          type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="mt-3 flex w-full items-center justify-center gap-1.5 py-5 text-[12px] font-semibold transition-colors hover:bg-[rgba(60,47,24,.05)]"
          style={{ background: 'rgba(60,47,24,.035)', color: C.muted }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? '넣는 중…' : '사진 넣기'}
        </button>
      ) : null}

      {/* 항목/값 — 줄 사이 실선 하나. 칸을 그리지 않는다. */}
      <div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid items-start gap-2.5 py-[7px]"
            style={{ gridTemplateColumns: '62px minmax(0,1fr)', borderTop: i === 0 ? 'none' : `1px solid ${C.lineSoft}` }}
          >
            {editing ? (
              <>
                <input
                  value={r.k} onChange={(e) => setRow(i, { k: e.target.value })}
                  placeholder="항목" aria-label={`${i + 1}번째 항목 이름`}
                  className="w-full bg-transparent text-[12px] outline-none"
                  style={{ color: C.sub, fontFamily: SERIF, fontWeight: 700 }}
                />
                <div className="flex items-start gap-1">
                  <textarea
                    value={r.v} onChange={(e) => setRow(i, { v: e.target.value })}
                    placeholder="값" aria-label={`${i + 1}번째 값`} rows={1}
                    className="min-h-[20px] w-full resize-none bg-transparent text-[12.5px] leading-[1.55] outline-none"
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
                <span className="text-[12px] leading-[1.55]" style={{ color: C.sub, fontFamily: SERIF, fontWeight: 700 }}>{r.k}</span>
                <span className="whitespace-pre-wrap break-words text-[12.5px] leading-[1.55]" style={{ color: C.ink }}>{r.v}</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 아래 겹줄 — 위와 짝을 맞춰 상자를 닫는다 */}
      <div aria-hidden style={{ borderTop: `3px double ${tint ? `${tint}55` : 'rgba(60,47,24,.3)'}` }} />

      {/* 고칠 때만 뜨는 줄. 점선 버튼과 '상자 지우기' 는 걷었다 —
          점선은 이 방 어디에도 없는 무늬였고, 지우기는 편집 도구줄의 '인포박스'
          버튼이 이미 하는 일이라 같은 일이 두 군데 있었다. */}
      {editing && (
        <div className="flex items-center pt-1.5" style={{ fontSize: 12 }}>
          <button
            type="button" onClick={addRow}
            className="flex items-center gap-1 font-semibold transition-opacity hover:opacity-70"
            style={{ color: C.green }}
          >
            <Plus className="h-3.5 w-3.5" /> 항목
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
        </div>
      )}
    </aside>
  );
}
