/**
 * 만든 사람 — 숨겨둔 명함.
 *
 * 홈에서 GPT 를 다섯 번 연달아 고르면 열린다. 화면 어디에도 이 카드로 가는 길은
 * 없다 — 그게 이스터에그의 조건이다. 찾은 사람만 본다.
 *
 * 생김새는 실물 명함을 따랐다. 이 앱의 어느 방에도 속하지 않는 물건이라 방들의
 * 색을 쓰지 않고, 종이 한 장과 잉크 한 색으로만 만든다. 화려하게 만들면 기능처럼
 * 보이고, 기능처럼 보이면 이스터에그가 아니게 된다.
 */
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Phone, GraduationCap, Copy } from 'lucide-react';
import { notify } from '@/lib/notify';

const EMAIL = 'ygh7166@naver.com';
const PHONE = '010-9335-7166';

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
        className="w-full max-w-[360px] overflow-hidden rounded-[14px] bg-[#fdfbf7] shadow-[0_28px_60px_-24px_rgba(20,16,10,0.6)] duration-300 animate-in zoom-in-95 slide-in-from-bottom-2"
        style={{ border: '1px solid rgba(40,32,22,.16)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 명함 윗단 — 잉크 띠 하나 */}
        <div aria-hidden style={{ height: 4, background: 'linear-gradient(90deg,#2c2a26,#5a5348)' }} />

        <div className="relative px-7 pb-6 pt-7">
          <button
            ref={closeRef}
            type="button" onClick={onClose} aria-label="닫기"
            className="absolute right-3 top-3 rounded-md p-1.5 text-[#9b9384] transition-colors hover:bg-[rgba(40,32,22,.06)] hover:text-[#2c2a26]"
          >
            <X className="h-4 w-4" />
          </button>

          <p className="text-[10.5px] font-bold tracking-[0.22em] text-[#a3998a]">MADE BY</p>
          <p className="mt-2 text-[30px] font-extrabold leading-none tracking-[-0.03em] text-[#1e1b16]">YJH</p>
          <p className="mt-2.5 text-[13px] text-[#6d6558]">Personai 를 혼자 만들고 있습니다</p>

          <div aria-hidden className="my-5" style={{ borderTop: '1px solid rgba(40,32,22,.12)' }} />

          <ul className="flex flex-col gap-1">
            <Row icon={<GraduationCap className="h-[15px] w-[15px]" />} label="중앙대학교 약학대학 재학" />
            <Row
              icon={<Mail className="h-[15px] w-[15px]" />} label={EMAIL}
              onCopy={() => void copy('이메일을', EMAIL)}
            />
            <Row
              icon={<Phone className="h-[15px] w-[15px]" />} label={PHONE}
              onCopy={() => void copy('전화번호를', PHONE)}
            />
          </ul>

          <p className="mt-5 text-[11.5px] leading-relaxed text-[#a3998a]">
            여기까지 찾아오셨네요. GPT 를 다섯 번 눌렀군요.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ icon, label, onCopy }: { icon: React.ReactNode; label: string; onCopy?: () => void }) {
  return (
    <li className="group flex items-center gap-2.5 rounded-lg px-2 py-[7px] transition-colors hover:bg-[rgba(40,32,22,.04)]">
      <span className="shrink-0 text-[#9b9384]">{icon}</span>
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#38342c]">{label}</span>
      {onCopy && (
        <button
          type="button" onClick={onCopy} aria-label={`${label} 복사`}
          className="shrink-0 rounded p-1 text-[#b4ab9c] opacity-0 transition-opacity hover:text-[#2c2a26] focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}
