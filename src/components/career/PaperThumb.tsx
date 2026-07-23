/**
 * 종이 축소판 — 만들어질 문서의 생김새를 선으로만 그린 미리보기.
 * 이미지 없이 CSS 줄로만 그리며, 강조 줄에는 그 문서 종류의 색을 쓴다(사이드바 점·타일과 같은 부호).
 * sm = 도크 타일 위, lg = 문서 뷰 빈 상태.
 */
import { cn } from '@/lib/utils';

export type ThumbKind = 'resume' | 'letter' | 'grid' | 'report' | 'note' | 'spark';

/** 문서 종류 → 축소판 구성. 라벨이 아니라 지면 구조가 종류를 말한다. */
export const THUMB_BY_PURPOSE: Record<string, ThumbKind> = {
  '이력서': 'resume',
  '자기소개서 초안': 'letter',
  '포트폴리오 요약': 'grid',
  '경력기술서': 'report',
  '커버레터': 'note',
};

interface Props {
  kind: ThumbKind;
  /** 강조 줄 색 (HSL 트리플렛 — 타일·사이드바와 동일 값). */
  hsl: string;
  size?: 'sm' | 'lg';
  className?: string;
}

export function PaperThumb({ kind, hsl, size = 'sm', className }: Props) {
  const lg = size === 'lg';
  const gap = lg ? 'gap-[7px]' : 'gap-[3px]';
  const h = lg ? 'h-[3px]' : 'h-[2px]';
  const ink = 'hsl(var(--foreground) / 0.14)';
  const accent = `hsl(${hsl} / 0.6)`;

  /** 한 줄. dark 면 잉크가 진해지고, tint 면 그 종류 색으로 칠한다. */
  const line = (w: string, tone: 'ink' | 'dark' | 'tint' = 'ink', key?: string) => (
    <span
      key={key}
      className={cn('block rounded-[1px]', h)}
      style={{
        width: w,
        backgroundColor: tone === 'tint' ? accent : tone === 'dark' ? 'hsl(var(--foreground) / 0.34)' : ink,
      }}
    />
  );

  return (
    <div
      aria-hidden
      className={cn(
        'flex items-start justify-center overflow-hidden rounded-md border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))]',
        lg ? 'h-[132px] w-[104px] p-3.5' : 'h-[38px] w-full p-2',
        className,
      )}
    >
      <div className={cn('flex w-full flex-col', gap)}>
        {kind === 'resume' && (
          <>
            {line(lg ? '62%' : '52%', 'dark')}
            {line('30%')}
            {line('100%', 'tint')}
            {line('88%')}
            {line('96%')}
            {lg && line('72%')}
            {lg && line('84%')}
          </>
        )}
        {kind === 'letter' && (
          <>
            {line('38%', 'dark')}
            {line('100%')}
            {line('92%')}
            {line('97%')}
            {lg && line('88%')}
            {lg && line('94%')}
            {line('46%', 'tint')}
          </>
        )}
        {kind === 'grid' && (
          <>
            {line('44%', 'dark')}
            <span className={cn('grid grid-cols-2', lg ? 'mt-1 gap-2' : 'mt-[3px] gap-[3px]')}>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn('block rounded-[2px]', lg ? 'h-[26px]' : 'h-[9px]')}
                  style={{ backgroundColor: i === 0 ? accent : ink }}
                />
              ))}
            </span>
          </>
        )}
        {kind === 'report' && (
          <>
            {line('48%', 'dark')}
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn('flex items-center', lg ? 'gap-2' : 'gap-1')}>
                <span className={cn('block rounded-[1px]', h)} style={{ width: '26%', backgroundColor: accent }} />
                <span className={cn('block rounded-[1px]', h)} style={{ width: `${58 - i * 8}%`, backgroundColor: ink }} />
              </span>
            ))}
            {lg && line('66%')}
          </>
        )}
        {kind === 'note' && (
          <>
            {line('28%')}
            <span className={lg ? 'mt-1.5' : 'mt-[2px]'} />
            {line('100%')}
            {line('90%')}
            {lg && line('95%')}
            {line('54%')}
            <span className={lg ? 'mt-1.5' : 'mt-[2px]'} />
            {line('34%', 'tint')}
          </>
        )}
        {kind === 'spark' && (
          <>
            {line('40%', 'dark')}
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn('flex items-center', lg ? 'gap-2' : 'gap-1')}>
                <span
                  className={cn('block shrink-0 rotate-45 rounded-[1px]', lg ? 'h-[7px] w-[7px]' : 'h-[4px] w-[4px]')}
                  style={{ backgroundColor: accent }}
                />
                <span className={cn('block rounded-[1px]', h)} style={{ width: `${72 - i * 12}%`, backgroundColor: ink }} />
              </span>
            ))}
            {lg && line('58%')}
          </>
        )}
      </div>
    </div>
  );
}
