import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const DEFAULT_FONT_SIZE = 14;
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '40', '48', '60', '72'];

const FONT_FAMILIES: Array<{ label: string; value: string; preview?: string }> = [
  { label: '기본', value: '' },
  { label: '맑은 고딕', value: '"Malgun Gothic", "Apple SD Gothic Neo", sans-serif', preview: '가나다' },
  { label: '나눔고딕', value: '"Nanum Gothic", "Malgun Gothic", sans-serif', preview: '가나다' },
  { label: '나눔명조', value: '"Nanum Myeongjo", "Batang", serif', preview: '가나다' },
  { label: 'Noto Sans KR', value: '"Noto Sans CJK KR", "Noto Sans KR", "Malgun Gothic", sans-serif', preview: '가나다' },
  { label: 'Noto Serif KR', value: '"Noto Serif CJK KR", "Noto Serif KR", "Batang", serif', preview: '가나다' },
  { label: '바탕', value: 'Batang, "Apple Myungjo", serif', preview: '가나다' },
  { label: '굴림', value: 'Gulim, "Malgun Gothic", sans-serif', preview: '가나다' },
  { label: 'Arial', value: 'Arial, sans-serif', preview: 'Arial' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif', preview: 'Serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace', preview: 'Mono' },
];

export function FontSizeSelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? '';
  const numeric = normalizeFontSize(current) ?? DEFAULT_FONT_SIZE;
  const [draft, setDraft] = useState(String(numeric));

  useEffect(() => {
    setDraft(String(numeric));
  }, [numeric]);

  const apply = (value: string | number | null) => {
    const normalized = value == null ? null : normalizeFontSize(String(value));
    if (!normalized) {
      editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
      setDraft(String(DEFAULT_FONT_SIZE));
      return;
    }
    editor.chain().focus().setMark('textStyle', { fontSize: `${normalized}px` }).run();
    setDraft(String(normalized));
  };

  const step = (delta: number) => {
    const base = normalizeFontSize(draft) ?? numeric;
    apply(base + delta);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (event.key === 'Enter') {
      event.preventDefault();
      apply(draft);
      event.currentTarget.blur();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      step(event.shiftKey ? 4 : 1);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      step(event.shiftKey ? -4 : -1);
    }
  };

  return (
    <div className="flex h-7 items-center rounded-md border border-border bg-background text-xs">
      <button
        type="button"
        className="flex h-full w-7 items-center justify-center rounded-l-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="글자 크기 줄이기"
        aria-label="글자 크기 줄이기"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => step(-1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        value={draft}
        inputMode="numeric"
        className="h-full w-10 border-x border-border bg-transparent px-1 text-center outline-none focus:bg-muted/50"
        title="글자 크기"
        aria-label="글자 크기"
        onChange={(event) => setDraft(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
        onBlur={() => apply(draft)}
        onKeyDown={onInputKeyDown}
      />
      <button
        type="button"
        className="flex h-full w-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        title="글자 크기 키우기"
        aria-label="글자 크기 키우기"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => step(1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex h-full w-6 items-center justify-center rounded-r-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="글자 크기 목록"
          aria-label="글자 크기 목록"
          onMouseDown={(event) => event.preventDefault()}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          collisionPadding={8}
          className="max-h-72 w-28 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg"
        >
          <ToolbarDropdownItem selected={!current} onSelect={() => apply(null)}>
            기본
          </ToolbarDropdownItem>
          {FONT_SIZES.map((size) => (
            <ToolbarDropdownItem key={size} selected={String(numeric) === size} onSelect={() => apply(size)}>
              {size}px
            </ToolbarDropdownItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function FontFamilySelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes('textStyle').fontFamily as string | undefined) ?? '';
  const selected = useMemo(
    () => FONT_FAMILIES.find((font) => font.value === current) ?? FONT_FAMILIES[0],
    [current],
  );

  const apply = (value: string) => {
    if (!value) {
      editor.chain().focus().setMark('textStyle', { fontFamily: null }).run();
      return;
    }
    editor.chain().focus().setMark('textStyle', { fontFamily: value }).run();
  };

  return (
    <ToolbarDropdown label={selected.label} title="글꼴" widthClass="w-[124px]" contentClassName="w-56">
      {FONT_FAMILIES.map((font) => (
        <ToolbarDropdownItem
          key={font.label}
          selected={selected.value === font.value}
          onSelect={() => apply(font.value)}
        >
          <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate">{font.label}</span>
            {font.preview && (
              <span className="text-[11px] text-muted-foreground" style={{ fontFamily: font.value }}>
                {font.preview}
              </span>
            )}
          </span>
        </ToolbarDropdownItem>
      ))}
    </ToolbarDropdown>
  );
}

function normalizeFontSize(value: string): number | null {
  const numeric = Number(value.replace(/px$/i, '').trim());
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.max(1, Math.min(400, Math.round(numeric)));
}

function ToolbarDropdown({
  label,
  title,
  widthClass,
  contentClassName,
  children,
}: {
  label: string;
  title: string;
  widthClass: string;
  contentClassName: string;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'h-7 rounded-md border border-border bg-background px-2 text-xs',
          'flex items-center justify-between gap-1.5',
          'hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          widthClass,
        )}
        title={title}
        aria-label={title}
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        collisionPadding={8}
        className={cn(
          'max-h-72 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg',
          contentClassName,
        )}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ToolbarDropdownItem({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className={cn(
        'h-8 cursor-pointer gap-2 rounded-sm px-2 text-xs',
        selected && 'bg-accent text-accent-foreground',
      )}
    >
      <Check className={cn('h-3.5 w-3.5 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
      {children}
    </DropdownMenuItem>
  );
}
