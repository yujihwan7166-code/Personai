/** 슬라이드 테마 선택 모달 — 8개 테마 미리보기 그리드. */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SLIDE_THEMES, type SlideTheme } from './themes';

interface ThemePickerModalProps {
  open: boolean;
  currentThemeId: string;
  onClose: () => void;
  onSelect: (themeId: string) => void;
}

export function ThemePickerModal({ open, currentThemeId, onClose, onSelect }: ThemePickerModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogTitle className="text-base">슬라이드 테마</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          모든 슬라이드의 기본 배경·텍스트 색·폰트가 한꺼번에 바뀝니다. 슬라이드별로 따로 지정한 색은 그대로 유지돼요.
        </DialogDescription>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
          {SLIDE_THEMES.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              selected={t.id === currentThemeId}
              onClick={() => { onSelect(t.id); onClose(); }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThemeCard({ theme, selected, onClick }: { theme: SlideTheme; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-md border-2 overflow-hidden transition-all text-left',
        selected
          ? 'border-foreground shadow-md'
          : 'border-border hover:border-foreground/40 hover:shadow-sm',
      )}
      aria-pressed={selected}
      title={theme.description ?? theme.name}
    >
      {/* 16:9 미리보기 */}
      <div
        className="w-full relative"
        style={{
          aspectRatio: '16 / 9',
          background: theme.bgColor,
          fontFamily: theme.bodyFontFamily,
        }}
      >
        <div
          className="absolute left-3 top-2 right-3 font-semibold truncate"
          style={{ color: theme.textColor, fontSize: '14px', fontFamily: theme.headingFontFamily }}
        >
          제목 텍스트
        </div>
        <div
          className="absolute left-3 top-8 right-3 truncate"
          style={{ color: theme.textColor, fontSize: '10px', opacity: 0.75 }}
        >
          본문 — 가나다라 ABC 123
        </div>
        <div
          className="absolute left-3 bottom-2 h-1 rounded-full"
          style={{ background: theme.accentColor, width: '32%' }}
          aria-hidden
        />
        {selected && (
          <div className="absolute top-1.5 right-1.5 bg-foreground text-background rounded-full p-0.5 shadow">
            <Check className="w-3 h-3" />
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 bg-background border-t border-border">
        <div className="text-xs font-medium truncate">{theme.name}</div>
        {theme.description && (
          <div className="text-[10px] text-muted-foreground truncate">{theme.description}</div>
        )}
      </div>
    </button>
  );
}
