import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '40', '48'];

const FONT_FAMILIES: Array<{ label: string; value: string; preview?: string }> = [
  { label: '기본', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif', preview: 'Arial' },
  { label: 'Sans', value: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif', preview: 'Sans' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif', preview: 'Serif' },
  { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', preview: 'Mono' },
  { label: '고딕', value: '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif', preview: '가나다' },
  { label: '명조', value: '"Apple Myungjo", "Batang", serif', preview: '가나다' },
];

export function FontSizeSelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? '';
  const numeric = current ? current.replace('px', '') : '';
  const label = numeric ? `${numeric}px` : '크기';

  const apply = (value: string) => {
    if (!value) {
      editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
      return;
    }
    editor.chain().focus().setMark('textStyle', { fontSize: `${value}px` }).run();
  };

  return (
    <ToolbarDropdown label={label} title="글자 크기" widthClass="w-[76px]" contentClassName="w-24">
      <ToolbarDropdownItem selected={!numeric} onSelect={() => apply('')}>
        크기
      </ToolbarDropdownItem>
      {FONT_SIZES.map((size) => (
        <ToolbarDropdownItem key={size} selected={numeric === size} onSelect={() => apply(size)}>
          {size}px
        </ToolbarDropdownItem>
      ))}
    </ToolbarDropdown>
  );
}

export function FontFamilySelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes('textStyle').fontFamily as string | undefined) ?? '';
  const selected = FONT_FAMILIES.find((font) => font.value === current) ?? FONT_FAMILIES[0];

  const apply = (value: string) => {
    if (!value) {
      editor.chain().focus().setMark('textStyle', { fontFamily: null }).run();
      return;
    }
    editor.chain().focus().setMark('textStyle', { fontFamily: value }).run();
  };

  return (
    <ToolbarDropdown label={selected.label} title="글꼴" widthClass="w-[84px]" contentClassName="w-44">
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
