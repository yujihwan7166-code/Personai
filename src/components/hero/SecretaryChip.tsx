/**
 * 비서 칩 — 브라우저·AI 사이 고정 위치.
 *
 * 항상 표시(토글 안 됨), 클릭 시 사이트 내부 자료 (메모·위키·일정 등) 를
 * 시트로 열어 참조·삽입 가능.
 *
 * 시각적 정체성: 앰버·바이올렛 그라디언트 + Bot 아이콘 → 다른 칩들과 구별.
 */
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onClick: () => void;
  active?: boolean;
}

export function SecretaryChip({ onClick, active = false }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="비서 · 사이트 자료 참조"
      title="비서 · 메모·위키·일정에서 참조"
      className={cn(
        'relative flex items-center justify-center rounded-full shrink-0',
        'transition-all duration-300 ease-out',
        active ? 'h-[42px] w-[42px]' : 'h-[32px] w-[32px] hover:scale-110',
      )}
      style={{
        // 앰버 → 바이올렛 그라디언트 — 다른 칩과 즉시 구별.
        background: 'linear-gradient(135deg, #F59E0B 0%, #8B5CF6 100%)',
        color: '#FFFFFF',
        boxShadow: active
          ? '0 0 0 3px var(--hero-bg, #0d0d0d), 0 0 0 4.5px #A78BFA, 0 6px 24px -6px #A78BFA'
          : '0 0 0 3px var(--hero-bg, #0d0d0d), inset 0 0 0 1px rgba(255,255,255,0.20)',
      }}
    >
      <Bot size={active ? 21 : 17} strokeWidth={2.2} />
    </button>
  );
}
