/**
 * 단축키 도움말 — '?' 키로 열림 (Linear / GitHub 패턴).
 *
 * 사용자가 키보드 단축키 학습 비용을 0 으로 만드는 핵심 UX.
 * Linear·GitHub·Slack 모두 동일 패턴.
 */
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface ShortcutHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  label: string;
  items: Array<{ keys: string[]; desc: string }>;
}

const GROUPS: ShortcutGroup[] = [
  {
    label: '뷰 전환',
    items: [
      { keys: ['D'], desc: '일' },
      { keys: ['W'], desc: '주' },
      { keys: ['M'], desc: '월' },
      { keys: ['Y'], desc: '년' },
      { keys: ['H'], desc: '습관' },
    ],
  },
  {
    label: '시간 이동',
    items: [
      { keys: ['←'], desc: '이전 (일/주/월/년)' },
      { keys: ['→'], desc: '다음' },
      { keys: ['T'], desc: '오늘로' },
    ],
  },
  {
    label: '입력',
    items: [
      { keys: ['N'], desc: '빠른 추가 포커스' },
      { keys: ['Ctrl', 'K'], desc: '명령 팔레트' },
      { keys: ['/'], desc: '명령 팔레트 (보조)' },
      { keys: ['?'], desc: '이 도움말' },
    ],
  },
  {
    label: '카드 액션 (우클릭)',
    items: [
      { keys: ['우클릭'], desc: '시간 배정 / 완료 / 미루기 / 분류' },
      { keys: ['더블클릭'], desc: '시간 블록 — 빠른 완료 토글' },
      { keys: ['드래그'], desc: '대기함 → 시간표 (배정), 시간표 ↔ 대기함 (해제)' },
    ],
  },
  {
    label: '자연어 입력',
    items: [
      { keys: ['예'], desc: '"내일 오후 3시 회의 1시간"' },
      { keys: ['예'], desc: '"매주 월요일 운동 #건강 !2"' },
      { keys: ['#tag'], desc: '태그 자동 추출' },
      { keys: ['!1', '!2', '!3'], desc: '우선순위 (낮음/보통/높음)' },
    ],
  },
];

const Key = ({ children }: { children: React.ReactNode }) => (
  <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md bg-card border hairline shadow-[0_1px_0_hsl(30_15%_8%/0.06)] text-[11px] font-mono font-semibold text-foreground">
    {children}
  </kbd>
);

export const ShortcutHelpDialog = ({ open, onClose }: ShortcutHelpDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold">단축키</DialogTitle>
          <DialogDescription className="sr-only">
            플래너에서 사용할 수 있는 뷰 전환, 시간 이동, 입력, 카드 액션, 자연어 입력 단축키를 확인합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {GROUPS.map((group) => (
            <section key={group.label} className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-mono uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                {group.label}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12.5px]">
                    <span className="flex items-center gap-0.5">
                      {item.keys.map((k, j) => (
                        <span key={j} className="flex items-center gap-0.5">
                          {j > 0 && <span className="text-muted-foreground/60">+</span>}
                          <Key>{k}</Key>
                        </span>
                      ))}
                    </span>
                    <span className="text-foreground/80 flex-1 leading-tight">{item.desc}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-3 text-[10.5px] text-muted-foreground tabular-nums">
          입력 필드 안에서는 단축키가 작동하지 않습니다 (텍스트 입력 우선).
        </p>
      </DialogContent>
    </Dialog>
  );
};
