import {
  Book,
  BookOpen,
  BookOpenCheck,
  Bot,
  Bookmark,
  Brain,
  Calculator,
  ClipboardList,
  Code2,
  File,
  FileText,
  FlaskConical,
  Globe2,
  GraduationCap,
  Library,
  Mic,
  PenLine,
  ScrollText,
  Sparkles,
  Youtube,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  Book,
  BookOpen,
  BookOpenCheck,
  Bot,
  Bookmark,
  Brain,
  Calculator,
  ClipboardList,
  Code2,
  File,
  FileText,
  FlaskConical,
  Globe2,
  GraduationCap,
  Library,
  Mic,
  PenLine,
  ScrollText,
  Sparkles,
  Youtube,
};

function isTextGlyph(value: string) {
  return [...value].some((ch) => ch.charCodeAt(0) > 127) || value.length <= 3;
}

export function NotebookIcon({
  icon,
  className,
  title,
}: {
  icon?: string | null;
  className?: string;
  title?: string;
}) {
  const value = (icon || 'BookOpen').trim();
  const Icon = ICONS[value];

  if (Icon) {
    return <Icon className={cn('h-4 w-4 shrink-0', className)} aria-hidden={!title} aria-label={title} strokeWidth={2} />;
  }

  if (isTextGlyph(value)) {
    return (
      <span className={cn('inline-flex h-4 w-4 shrink-0 select-none items-center justify-center text-[15px] leading-none', className)} aria-label={title}>
        {value}
      </span>
    );
  }

  return <BookOpen className={cn('h-4 w-4 shrink-0', className)} aria-hidden={!title} aria-label={title} strokeWidth={2} />;
}
