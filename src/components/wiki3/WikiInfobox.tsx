/**
 * 인포박스 — 문서 옆에 서는 요약 상자. 사진(선택) + 항목/값 표.
 *
 * 읽을 때는 조용한 표, 고칠 때는 그 자리에서 바로 고치는 표다. 별도 편집 창을 띄우지
 * 않는다 — 두 줄 고치자고 창을 열고 닫으면 그게 더 일이다.
 *
 * 자리는 종이 안, 본문 오른쪽 위. float 라 본문이 상자 왼쪽으로 흘러 내려간다 —
 * 위키가 예부터 쓰던 방식이고, 상자 아래 오른쪽이 빈 채로 남지 않는다.
 *
 * 생김새 — 종이색 바탕에 실선 테두리 한 겹, 항목 칸에만 옅은 띠.
 * 위키백과의 회색 상자를 그대로 가져오면 서재 한가운데 브라우저 창이 열린 꼴이 되므로,
 * 색과 선 굵기만 이 방 것으로 바꿔 입혔다. 테두리 색은 소속 책의 색을 아주 옅게(27%)
 * 섞어, 어느 책의 문서인지가 상자 둘레에 남는다.
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
  /** 항목 칸에 까는 띠 — 종이를 4%만 누른 것. 선을 안 긋고도 표로 읽히게 한다. */
  band: 'rgba(60,47,24,.042)',
  line: 'rgba(60,47,24,.2)',
  green: '#305f4c',
};
/** 본문 제목과 같은 명조 — 항목 이름을 표 머리가 아니라 '적어둔 말'로 보이게 한다. */
const SERIF = "'Nanum Myeongjo', 'Noto Serif KR', 'Gowun Batang', serif";

interface Props {
  value: WikiInfobox;
  /** 문서 제목 — 화면에는 안 쓴다. 읽어주는 기계에게 이 상자가 무엇의 요약인지 알린다. */
  title: string;
  /** 소속 책의 색 — 상자 테두리에 옅게 섞는다. */
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

  /* 위아래 겹줄만 두는 안도 해 봤는데, 좌우가 열려 있으니 옆으로 흐르는 본문과
     상자가 어디서 갈리는지 눈이 매번 다시 재야 했다. 네 변을 다 닫는 편이 낫다.
     바탕을 종이색으로 채우는 건 밑을 지나가는 본문 블록이 비치지 않게 하려는 것 —
     종이와 같은 색이라 눈에는 여전히 '아무 바탕도 없는' 것으로 보인다.
     항목 이름은 본문 제목과 같은 명조 — 표가 아니라 '적어둔 것' 으로 보이게. */
  return (
    <aside
      aria-label={`${title} 요약`}
      className="overflow-hidden rounded-[6px]"
      style={{ background: C.paper, border: `1px solid ${tint ? `${tint}44` : C.line}` }}
    >
      {/* 사진 자리는 늘 맨 위, 정사각. 없을 때도 그 자리를 그대로 지킨다.
          예전엔 사진이 없으면 얇은 띠 하나였다가 넣는 순간 상자가 통째로 커졌다.
          처음부터 들어갈 크기로 비워 두면 '여기 사진이 온다' 가 보이고, 넣어도
          아래 항목들이 밀려 내려가지 않는다. */}
      {value.photo ? (
        <div className="relative">
          <img src={value.photo} alt="" className="block w-full" style={{ borderBottom: `1px solid ${C.lineSoft}` }} />
          {editing && (
            <button
              type="button" onClick={() => onChange({ ...value, photo: undefined })}
              aria-label="사진 빼기"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-white transition-colors"
              style={{ background: 'rgba(30,24,16,.55)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : editing ? (
        <button
          type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="flex aspect-square w-full flex-col items-center justify-center gap-2 text-[12.5px] font-semibold transition-colors hover:bg-[rgba(60,47,24,.06)]"
          style={{ background: C.band, color: C.muted, borderBottom: `1px solid ${C.lineSoft}` }}
        >
          {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" strokeWidth={1.6} />}
          {busy ? '넣는 중…' : '사진 넣기'}
        </button>
      ) : null}

      {/* 항목/값.
          위키백과 인포박스가 '표'로 읽히는 건 테두리가 아니라 항목 칸에 깔린 옅은 띠
          덕분이다. 그건 가져오고, 회색 상자·제목 머리·굵은 격자는 버린다 — 이 종이엔
          안 맞는다. 띠는 종이를 4% 만 누른 것이라 인쇄된 음영처럼 보인다. */}
      <div>
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid items-stretch"
            style={{ gridTemplateColumns: '88px minmax(0,1fr)', borderTop: i === 0 ? 'none' : `1px solid ${C.lineSoft}` }}
          >
            <div className="px-3 py-[10px]" style={{ background: C.band }}>
              {editing ? (
                <input
                  value={r.k} onChange={(e) => setRow(i, { k: e.target.value })}
                  placeholder="항목" aria-label={`${i + 1}번째 항목 이름`}
                  className="w-full bg-transparent text-[13px] leading-[1.5] outline-none"
                  style={{ color: C.sub, fontFamily: SERIF, fontWeight: 700 }}
                />
              ) : (
                <span className="block break-words text-[13px] leading-[1.5]" style={{ color: C.sub, fontFamily: SERIF, fontWeight: 700 }}>{r.k}</span>
              )}
            </div>
            <div className="flex items-start gap-1 px-3 py-[10px]">
              {editing ? (
                <>
                  <textarea
                    value={r.v} onChange={(e) => setRow(i, { v: e.target.value })}
                    placeholder="값" aria-label={`${i + 1}번째 값`} rows={1}
                    className="min-h-[20px] w-full resize-none bg-transparent text-[14px] leading-[1.55] outline-none"
                    style={{ color: C.ink }}
                    onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                  />
                  <button
                    type="button" onClick={() => delRow(i)} aria-label={`${r.k || '이 줄'} 빼기`}
                    className="mt-[2px] shrink-0 rounded p-0.5 transition-colors hover:bg-[rgba(60,47,24,.08)]"
                    style={{ color: C.muted }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <span className="whitespace-pre-wrap break-words text-[14px] leading-[1.55]" style={{ color: C.ink }}>{r.v}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 고칠 때만 뜨는 줄. 점선 버튼과 '상자 지우기' 는 걷었다 —
          점선은 이 방 어디에도 없는 무늬였고, 지우기는 편집 도구줄의 '인포박스'
          버튼이 이미 하는 일이라 같은 일이 두 군데 있었다. */}
      {editing && (
        <div className="flex items-center px-3 py-2" style={{ fontSize: 12, borderTop: `1px solid ${C.lineSoft}` }}>
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
