/**
 * 메인 모드 탭 — "청크 탭" 패턴.
 *
 * 12 모드를 4 그룹 × 3 으로 청크. 각 그룹은 수직 divider 로 분리.
 * Miller's Law + Gestalt Proximity 활용 — 뇌는 12개가 아닌 4 그룹으로 인지.
 *
 * 스타일:
 *  - 박스·pill·ring·fill·underline 전부 없음. 플레인 텍스트만.
 *  - 비활성: 작고 muted
 *  - 활성: font-semibold + 모드 컬러 텍스트 (컬러는 딱 이 한 줄에만)
 *  - 호버: 텍스트 진해짐
 *  - 그룹 간 얇은 수직 구분선 (h-3, border 색)
 */
import type { MainMode } from '@/types/expert';
import { cn } from '@/lib/utils';

interface MainModeTabsProps {
  /** modes 는 더 이상 사용하지 않음 — MODE_GROUPS 가 순서를 결정. 호출부 호환 유지. */
  modes?: MainMode[];
  labels: Record<MainMode, string>;
  currentMode: MainMode;
  pendingMode: MainMode | null;
  isDiscussing: boolean;
  transitionPhase: number;
  showPlayerBg: boolean;
  onChange: (mode: MainMode) => void;
}

/** 모드별 시그니처 컬러. */
const MODE_TINT: Record<MainMode, string> = {
  general:          'hsl(var(--mode-general))',
  multi:            'hsl(var(--mode-multi))',
  brainstorm_main:  'hsl(var(--mode-debate-a))',
  stakeholder_main: 'hsl(var(--mode-simulation))',
  premium_main:     'hsl(var(--mode-premium))',
  debate:           'hsl(var(--mode-debate-a))',
  assistant:        'hsl(var(--mode-assistant))',
  player:           'hsl(var(--mode-multi))',
  research_main:    'hsl(var(--mode-research))',
  translate_main:   'hsl(var(--mode-assistant))',
  convert_main:     'hsl(var(--mode-general))',
  study_main:       'hsl(var(--mode-study))',
};

/** 4 그룹 × 3 모드 청킹. 순서는 유저 빈도 + 의미 기반. */
const MODE_GROUPS: MainMode[][] = [
  ['general', 'multi', 'translate_main'],           // 대화
  ['debate', 'brainstorm_main', 'stakeholder_main'], // 논의
  ['research_main', 'premium_main', 'study_main'],  // 전문
  ['assistant', 'convert_main', 'player'],           // 도구
];

/** 짧은 라벨 (한 줄에 12개 담기 위한 압축). 없으면 원본 label 사용. */
const SHORT_LABEL: Partial<Record<MainMode, string>> = {
  stakeholder_main: '시뮬',
  brainstorm_main:  '브레인',
  premium_main:     '자문',
  research_main:    '리서치',
  study_main:       '공부',
  translate_main:   '번역',
  convert_main:     '변환',
  assistant:        '어시',
  player:           '게임',
  general:          '일반',
  multi:            '멀티',
  debate:           '토론',
};

export function MainModeTabs({
  labels,
  currentMode,
  pendingMode,
  isDiscussing,
  transitionPhase,
  showPlayerBg,
  onChange,
}: MainModeTabsProps) {
  const disabled = isDiscussing || transitionPhase !== 0;

  const renderTab = (mode: MainMode) => {
    const isActive = currentMode === mode || pendingMode === mode;
    const tint = MODE_TINT[mode];
    const short = SHORT_LABEL[mode] ?? labels[mode];
    return (
      <button
        key={mode}
        onClick={() => !disabled && onChange(mode)}
        disabled={disabled}
        title={labels[mode]}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'relative px-1.5 py-1.5 text-[12.5px] tracking-tight whitespace-nowrap transition-colors duration-150',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          isActive
            ? showPlayerBg
              ? 'text-white font-semibold'
              : 'font-semibold'
            : showPlayerBg
              ? 'text-slate-500 font-medium hover:text-slate-200'
              : 'text-muted-foreground font-medium hover:text-foreground',
        )}
        style={isActive && !showPlayerBg ? { color: tint } : undefined}
      >
        {short}
      </button>
    );
  };

  return (
    <>
      {MODE_GROUPS.map((group, groupIdx) => (
        <div key={groupIdx} className="flex items-center">
          {/* 그룹 간 수직 구분자 */}
          {groupIdx > 0 && (
            <span
              aria-hidden
              className={cn(
                'mx-2 h-3 w-px',
                showPlayerBg ? 'bg-slate-700' : 'bg-[hsl(var(--hairline))]',
              )}
            />
          )}
          <div className="flex items-center gap-0.5">
            {group.map(renderTab)}
          </div>
        </div>
      ))}
    </>
  );
}
