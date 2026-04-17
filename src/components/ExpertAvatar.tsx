import {
  type LucideIcon,
  Atom,
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  Cpu,
  Dna,
  Dumbbell,
  Fingerprint,
  FlaskConical,
  Globe,
  GraduationCap,
  Landmark,
  Leaf,
  Megaphone,
  Scale,
  ScrollText,
  Shield,
  Star,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';
import { parse } from 'twemoji-parser';
import { type Expert, type ExpertColor } from '@/types/expert';
import { cn } from '@/lib/utils';

interface ExpertAvatarProps {
  expert: Expert;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
}

const logoSizeClasses = {
  xxs: 'w-2.5 h-2.5',
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-11 h-11',
};

const containerClasses = {
  xxs: 'w-3.5 h-3.5 text-[10px]',
  xs: 'w-6 h-6 text-[14px]',
  sm: 'w-7 h-7 text-[16px]',
  md: 'w-10 h-10 text-[22px]',
  lg: 'w-14 h-14 text-[32px]',
  xl: 'w-16 h-16 text-[36px]',
};

const specialistIconSizeClasses = {
  xxs: 'w-2.5 h-2.5',
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-8 h-8',
};

const compactLogoSizeClasses = {
  xxs: 'w-2 h-2',
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-10 h-10',
};

const specialistIconMap: Record<string, LucideIcon> = {
  medical: Stethoscope,
  psychology: Brain,
  legal: Scale,
  finance: TrendingUp,
  history: ScrollText,
  philosophy: BookOpen,
  education: GraduationCap,
  economics: BarChart3,
  sociology: Users,
  political: Landmark,
  sports: Dumbbell,
  marketing: Megaphone,
  criminology: Fingerprint,
  physics: Atom,
  chemistry: FlaskConical,
  biology: Dna,
  earthscience: Globe,
  envscience: Leaf,
  theology: BookOpen,
  compsci: Cpu,
  pubadmin: Building2,
  military: Shield,
  intlrelations: Globe,
  astronomy: Star,
};

const specialistPaletteMap: Record<ExpertColor, {
  base: string;
  active: string;
  icon: string;
}> = {
  blue: {
    base: 'bg-slate-100',
    active: 'bg-slate-200 shadow-md scale-105',
    icon: 'text-slate-600',
  },
  emerald: {
    base: 'bg-slate-100',
    active: 'bg-slate-200 shadow-md scale-105',
    icon: 'text-slate-600',
  },
  red: {
    base: 'bg-slate-100',
    active: 'bg-slate-200 shadow-md scale-105',
    icon: 'text-slate-600',
  },
  amber: {
    base: 'bg-slate-100',
    active: 'bg-slate-200 shadow-md scale-105',
    icon: 'text-slate-600',
  },
  purple: {
    base: 'bg-slate-100',
    active: 'bg-slate-200 shadow-md scale-105',
    icon: 'text-slate-600',
  },
  orange: {
    base: 'bg-slate-100',
    active: 'bg-slate-200 shadow-md scale-105',
    icon: 'text-slate-600',
  },
  teal: {
    base: 'bg-slate-100',
    active: 'bg-slate-200 shadow-md scale-105',
    icon: 'text-slate-600',
  },
  pink: {
    base: 'bg-slate-100',
    active: 'bg-slate-200 shadow-md scale-105',
    icon: 'text-slate-600',
  },
};

const philosophyIds = new Set([
  'stoicism',
  'existentialism',
  'nihilism',
  'hedonism',
  'skepticism',
  'rationalism',
  'empiricism',
  'pessimism-phil',
  'relativism',
  'determinism',
  'idealism-phil',
  'materialism-phil',
  'cynicism',
  'postmodernism',
  'asceticism',
]);

const religionSymbolMap: Record<string, { text: string; className?: string; sizeClasses?: Partial<typeof religionSymbolSizeClasses> }> = {
  stoicism: { text: 'Π' },
  existentialism: { text: '∃' },
  nihilism: { text: '∅' },
  hedonism: { text: '☼' },
  skepticism: { text: '?' },
  rationalism: { text: '∴' },
  empiricism: { text: '◉' },
  'pessimism-phil': { text: '☾' },
  relativism: { text: '≈' },
  determinism: { text: '⛓' },
  'idealism-phil': { text: '✧' },
  'materialism-phil': { text: '▣' },
  cynicism: { text: '☀' },
  postmodernism: { text: '⌗' },
  asceticism: { text: '∥' },
  buddhist: { text: '🪷' },
  christian: { text: '\u2627\uFE0E' },
  catholic: {
    text: 'IHS',
    className: 'font-serif font-bold tracking-[-0.08em]',
    sizeClasses: {
      xxs: 'text-[8px]',
      xs: 'text-[10px]',
      sm: 'text-[12px]',
      md: 'text-[14px]',
      lg: 'text-[17px]',
      xl: 'text-[20px]',
    },
  },
  islamic: { text: '\u262A\uFE0E' },
  confucian: { text: '仁', className: 'font-serif font-semibold' },
  atheist: { text: '∄' },
  agnostic: { text: '?' },
  hindu: { text: 'ॐ', className: 'font-serif' },
  jewish: { text: '\u2721\uFE0E' },
  protestant: { text: '\u271D\uFE0E' },
  orthodox: { text: '\u2626\uFE0E' },
  sikh: { text: '☬' },
  taoist: { text: '☯' },
  shinto: { text: '⛩' },
};

const religionSymbolSizeClasses = {
  xxs: 'text-[11px]',
  xs: 'text-[16px]',
  sm: 'text-[18px]',
  md: 'text-[28px]',
  lg: 'text-[34px]',
  xl: 'text-[40px]',
};

const religionColorClasses: Record<ExpertColor, string> = {
  blue: 'text-blue-500',
  emerald: 'text-emerald-500',
  red: 'text-red-500',
  amber: 'text-amber-600',
  purple: 'text-violet-500',
  orange: 'text-orange-500',
  teal: 'text-teal-500',
  pink: 'text-pink-500',
};

const ideologySymbolMap: Record<string, { text: string; className?: string; sizeClasses?: Partial<typeof religionSymbolSizeClasses> }> = {
  socialist: { text: '✊' },
  communist: { text: '\u262D\uFE0E' },
  nationalist: { text: '\u2691\uFE0E' },
  totalitarian: { text: '\u26D3\uFE0E' },
  utilitarian: { text: '\u2696\uFE0E' },
  populist: { text: '🗣' },
  pacifist: { text: '\u262E\uFE0E' },
};

function getCategoryFrame(category: Expert['category']) {
  switch (category) {
    case 'ai':
      return 'bg-slate-100';
    default:
      return 'bg-slate-100';
  }
}

function getTwemojiUrl(emoji: string): string | null {
  const parsed = parse(emoji);
  return parsed.length > 0 ? parsed[0].url : null;
}

function getFluentEmojiUrl(emoji: string): string | null {
  try {
    const codePoints = [...emoji]
      .map((character) => character.codePointAt(0)?.toString(16))
      .filter(Boolean)
      .join('_');

    if (!codePoints) return null;
    return `https://cdn.jsdelivr.net/npm/fluentui-emoji-js@latest/art/${encodeURIComponent(emoji)}/3D/${codePoints}_3d.png`;
  } catch {
    return null;
  }
}

function getTwemojiImageClass(expert: Expert, size: keyof typeof logoSizeClasses) {
  if (expert.id === 'medical' && expert.icon === '⚕️') {
    return compactLogoSizeClasses[size];
  }

  return logoSizeClasses[size];
}

export function ExpertAvatar({ expert, size = 'md', active }: ExpertAvatarProps) {
  const isCompact = size === 'xxs' || size === 'xs' || size === 'sm';
  const roundedClass = isCompact ? 'rounded-lg' : 'rounded-xl';
  const frameClass = getCategoryFrame(expert.category);
  const specialistIcon = specialistIconMap[expert.id];
  const useNeutralFrame = expert.category !== 'ai';
  const inactiveFrameClass = useNeutralFrame ? frameClass : 'bg-transparent';
  const activeFrameClass = useNeutralFrame ? 'bg-white shadow-md scale-105' : 'shadow-md scale-105';

  if (expert.category === 'religion') {
    if (philosophyIds.has(expert.id) && expert.icon) {
      const twemojiUrl = getTwemojiUrl(expert.icon);

      if (twemojiUrl) {
        return (
          <div
            className={cn(
              'flex items-center justify-center shrink-0 transition-all duration-200 select-none',
              roundedClass,
              containerClasses[size],
              active ? 'bg-white shadow-md scale-105' : frameClass
            )}
          >
            <img
              src={twemojiUrl}
              alt={expert.nameKo}
              className={cn('object-contain', logoSizeClasses[size])}
              draggable={false}
            />
          </div>
        );
      }
    }

    const symbol = religionSymbolMap[expert.id];

    if (symbol) {
      return (
        <div
          className={cn(
            'flex items-center justify-center shrink-0 transition-all duration-200 select-none',
            roundedClass,
            containerClasses[size],
            active ? activeFrameClass : inactiveFrameClass
          )}
        >
          <span
            className={cn(
              'leading-none',
              symbol.sizeClasses?.[size] ?? religionSymbolSizeClasses[size],
              religionColorClasses[expert.color] ?? religionColorClasses.blue,
              symbol.className
            )}
          >
            {symbol.text}
          </span>
        </div>
      );
    }
  }

  if (expert.category === 'ideology') {
    const symbol = ideologySymbolMap[expert.id];

    if (symbol) {
      return (
        <div
          className={cn(
            'flex items-center justify-center shrink-0 transition-all duration-200 select-none',
            roundedClass,
            containerClasses[size],
            active ? activeFrameClass : inactiveFrameClass
          )}
        >
          <span
            className={cn(
              'leading-none',
              symbol.sizeClasses?.[size] ?? religionSymbolSizeClasses[size],
              religionColorClasses[expert.color] ?? religionColorClasses.blue,
              symbol.className
            )}
          >
            {symbol.text}
          </span>
        </div>
      );
    }
  }

  // 전문가 & 직업: Twemoji 렌더링
  if ((expert.category === 'specialist' || expert.category === 'occupation') && expert.icon) {
    const twemojiUrl = getTwemojiUrl(expert.icon);
    if (twemojiUrl) {
      const palette = specialistPaletteMap[expert.color] ?? specialistPaletteMap.blue;
      return (
        <div
          className={cn(
            'flex items-center justify-center shrink-0 transition-all duration-200 select-none',
            roundedClass,
            containerClasses[size],
            active ? palette.active : palette.base
          )}
        >
          <img
            src={twemojiUrl}
            alt={expert.nameKo}
            className={cn('object-contain', getTwemojiImageClass(expert, size))}
            draggable={false}
          />
        </div>
      );
    }
  }

  const isAncano = expert.id.startsWith('ancano') || expert.id === 'auto-ai';
  const isGemini = expert.avatarUrl?.includes('gemini');
  const isDeepseek = expert.avatarUrl?.includes('deepseek');

  if (expert.avatarUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center shrink-0 transition-all duration-200',
          roundedClass,
          containerClasses[size],
          active ? activeFrameClass : inactiveFrameClass
        )}
      >
        <img
          src={expert.avatarUrl}
          alt={expert.nameKo}
          className={cn(
            'object-contain',
            isAncano ? 'w-[85%] h-[85%]' : isGemini ? 'w-[95%] h-[95%]' : isDeepseek ? 'w-[95%] h-[95%]' : logoSizeClasses[size],
          )}
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  if (expert.icon && expert.category === 'perspective') {
    const twemojiUrl = getTwemojiUrl(expert.icon);

    if (twemojiUrl) {
      return (
        <div
          className={cn(
            'flex items-center justify-center shrink-0 transition-all duration-200 select-none',
            roundedClass,
            containerClasses[size],
            active ? 'bg-white shadow-md scale-105' : frameClass
          )}
        >
          <img
            src={twemojiUrl}
            alt={expert.nameKo}
            className={cn('object-contain', logoSizeClasses[size])}
            draggable={false}
          />
        </div>
      );
    }
  }

  if (expert.icon && expert.category === 'ideology') {
    const fluentUrl = getFluentEmojiUrl(expert.icon);

    if (fluentUrl) {
      return (
        <div
          className={cn(
            'flex items-center justify-center shrink-0 transition-all duration-200 select-none',
            roundedClass,
            containerClasses[size],
            active ? 'bg-white shadow-md scale-105' : frameClass
          )}
        >
          <img
            src={fluentUrl}
            alt={expert.nameKo}
            className={cn('object-contain', logoSizeClasses[size])}
            draggable={false}
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = 'none';
              (event.target as HTMLImageElement).parentElement!.textContent = expert.icon;
            }}
          />
        </div>
      );
    }
  }

  if (expert.icon) {
    return (
      <div
        className={cn(
          'flex items-center justify-center shrink-0 transition-all duration-200 select-none',
          roundedClass,
          containerClasses[size],
          active ? 'bg-white shadow-md scale-105' : frameClass
        )}
      >
        {expert.icon}
      </div>
    );
  }

  const words = expert.nameKo.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : expert.nameKo.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center justify-center shrink-0 select-none font-semibold text-slate-500 transition-all duration-200',
        roundedClass,
        containerClasses[size],
        active ? 'bg-white shadow-md scale-105' : frameClass
      )}
    >
      {initials}
    </div>
  );
}
