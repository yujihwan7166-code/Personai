/**
 * 만든 사람 — 숨겨둔 명함.
 *
 * 홈에서 GPT 를 다섯 번 연달아 고르면 열린다. 화면 어디에도 이 카드로 가는 길은
 * 없다 — 그게 이스터에그의 조건이다. 찾은 사람만 본다.
 *
 * 생김새는 어두운 판 한 장. 이 앱의 어느 방에도 속하지 않는 물건이라 방들의
 * 색을 쓰지 않는다 — 낮에 쓰는 방들 사이에서 혼자 밤이면, 찾았을 때 '다른 데로
 * 넘어왔다' 는 느낌이 난다. 사이트 이름은 적지 않는다 — 명함에 회사 이름을 크게
 * 박으면 명함이 아니라 광고가 된다.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Phone, GraduationCap, Copy } from 'lucide-react';
import { notify } from '@/lib/notify';

/**
 * 연락처는 소스에 통째로 적지 않는다.
 *
 * 이스터에그라 화면에는 안 보여도, 빌드된 파일 안에는 글자가 그대로 들어간다.
 * 주소를 긁어 가는 프로그램은 화면을 보는 게 아니라 파일을 훑기 때문에 숨겨 둔
 * 것과 상관없이 걸린다. `아이디@도메인` 이나 `010-0000-0000` 같은 **모양**을
 * 정규식으로 찾는 식이라, 값이 무엇이든 형태만 맞으면 잡힌다.
 *
 * 그래서 조각으로 나눠 두고 그릴 때 붙인다. 소스도 빌드 결과도 이어진 형태가 없다.
 * 여기 주석에도 실제 값을 예시로 적지 않는다 — 저장소가 공개되면 주석이 먼저 걸린다.
 * 화면에 보이는 것과 복사되는 것은 온전한 주소라 쓰는 사람 쪽은 달라지는 게 없다.
 * (작정하고 실행해 보는 수집기까지 막지는 못한다 — 그건 이 방식의 한계다)
 */
const EMAIL = ['ygh', '7166', String.fromCharCode(64), 'naver', '.', 'com'].join('');
const PHONE = ['010', '9335', '7166'].join('-');

export function MakerCard({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* 눌러서 베끼기 — 화면에 적힌 걸 손으로 옮겨 적게 두지 않는다.
     클립보드가 막힌 환경(비보안 컨텍스트 등)에서는 조용히 실패하므로 알려 준다. */
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(`${label} 복사했어요`);
    } catch {
      notify.info('복사가 막혀 있어요', { description: value });
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-200"
      role="dialog" aria-modal="true" aria-label="만든 사람"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-[460px] overflow-hidden rounded-[18px] duration-300 animate-in zoom-in-95 slide-in-from-bottom-2"
        style={{ background: '#14161c', boxShadow: '0 34px 80px -28px rgba(0,0,0,.8)', border: '1px solid rgba(255,255,255,.08)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 윗단 — 야광 띠. 밝은 종이 대신 어두운 판으로 간 건 이 카드가 앱의
            어느 화면과도 안 닮아야 하기 때문이다. 낮에 쓰는 방들 사이에서
            혼자 밤이면, 찾았을 때 '다른 데로 넘어왔다' 는 느낌이 난다. */}
        <div aria-hidden style={{ height: 3, background: 'linear-gradient(90deg,#5b8cff,#8f6bff 45%,#4fd1c5)' }} />

        <div className="relative px-9 pb-8 pt-9">
          <button
            ref={closeRef}
            type="button" onClick={onClose} aria-label="닫기"
            className="absolute right-4 top-4 rounded-lg p-2 text-white/35 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-[11px] font-bold tracking-[0.3em] text-white/35">제작자</p>
          <p className="mt-3 text-[42px] font-extrabold leading-none tracking-[-0.04em] text-white">YJH</p>
          <p className="mt-3.5 text-[14.5px] leading-relaxed text-white/55">
            필요한 걸 직접 만들어 씁니다.
          </p>

          <div aria-hidden className="my-6" style={{ borderTop: '1px solid rgba(255,255,255,.10)' }} />

          <ul className="flex flex-col gap-1.5">
            <Row icon={<GraduationCap className="h-[17px] w-[17px]" />} label="중앙대학교 약학대학 재학" />
            <Row
              icon={<Mail className="h-[17px] w-[17px]" />} label={EMAIL}
              onCopy={() => void copy('이메일을', EMAIL)}
            />
            <Row
              icon={<Phone className="h-[17px] w-[17px]" />} label={PHONE}
              onCopy={() => void copy('전화번호를', PHONE)}
            />
          </ul>

          <p className="mt-7 text-[12.5px] leading-relaxed text-white/28">
            다섯 번이나 눌러 보셨네요. 반갑습니다.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ icon, label, onCopy }: { icon: React.ReactNode; label: string; onCopy?: () => void }) {
  return (
    <li className="group flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 transition-colors hover:bg-white/[0.06]">
      <span className="shrink-0 text-white/35">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[15px] text-white/85">{label}</span>
      {onCopy && (
        <button
          type="button" onClick={onCopy} aria-label={`${label} 복사`}
          className="shrink-0 rounded-md p-1.5 text-white/30 opacity-0 transition-opacity hover:bg-white/10 hover:text-white/80 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Copy className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}
