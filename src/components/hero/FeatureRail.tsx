/**
 * 기능 레일 — 일반 채팅 히어로 입력창 아래 카테고리 아이콘 줄 (Genspark 4.0 각색).
 *
 * "이 앱으로 뭘 할 수 있는지"를 랜딩에서 바로 펼쳐 보여주는 발견성 장치.
 * 위 브랜드 칩 스트립(누구랑 대화)과 축이 다름 (무엇을 할까) — 시각 무게는
 * 고스트 아이콘 + 작은 라벨 + 흐린 그룹 헤더 + 세로 헤어라인으로 확실히 낮춤.
 *
 * 구성 절제: 4그룹 11개 (메뉴의 예고편). 마지막 "모든 기능" 이 모드 메뉴
 * 진입점을 겸함. 실행은 FavoriteChips 와 동일한 콜백 계약.
 * 일반 AI 히어로 · 대화 시작 전에만 렌더 (HeroSection 이 armed/비서 제외).
 */
import { LayoutGrid, Sparkles, Moon, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import type { ItemTarget } from '@/hooks/useFavoriteModes';
import { MODE_ICON, MODE_TINT, ASSISTANT_TILES, PREMIUM_AI_TOOLS, HUB_TOOLS, LIFE_TOOLS } from '@/components/MainModeTabs';
import { HUB_ICONS } from './ModeMenu';

interface RailItem {
  id: string;
  label: string;
  icon: LucideIcon;
  tint: string;
  target: ItemTarget | 'menu';
}

interface RailGroup {
  label: string;
  items: RailItem[];
}

interface Props {
  onOpenMenu: () => void;
  onSelectMode: (m: MainMode) => void;
  onSelectDebateSub: (sub: DebateSubMode) => void;
  onSelectPremiumDomain: (id: PremiumDomainId) => void;
  onSelectAssistantCard: (cardId: string) => void;
  onSelectTool: (kind: 'life' | 'player', toolId: string, label: string) => void;
}

/* 그룹 데이터 — 렌더마다 재계산할 필요 없는 정적 카탈로그. (2026-07-05: 5그룹) */
function buildGroups(): RailGroup[] {
  const hubTint = (id: string) => HUB_TOOLS.find((h) => h.id === id)?.tint ?? 'hsl(220 70% 55%)';
  const tileTint = (id: string) => ASSISTANT_TILES.find((t) => t.cardId === id)?.tint ?? 'hsl(280 60% 55%)';
  const tileIcon = (id: string) => ASSISTANT_TILES.find((t) => t.cardId === id)?.icon ?? LayoutGrid;
  const premium = (key: string) => PREMIUM_AI_TOOLS.find((p) => p.key === key);
  const lifeTint = (id: string) => LIFE_TOOLS.find((t) => t.id === id)?.tint ?? 'hsl(262 70% 55%)';

  return [
    {
      label: '대화',
      items: [
        { id: 'multi', label: '멀티 채팅', icon: MODE_ICON.multi, tint: MODE_TINT.multi, target: { kind: 'mode', mode: 'multi' } },
        { id: 'research', label: '심층 리서치', icon: MODE_ICON.research_main, tint: MODE_TINT.research_main, target: { kind: 'mode', mode: 'research_main' } },
      ],
    },
    {
      label: '노트',
      items: [
        { id: 'planner', label: '플래너', icon: HUB_ICONS.planner, tint: hubTint('planner'), target: { kind: 'hub', hubId: 'planner' } },
        { id: 'wiki', label: '마이위키', icon: HUB_ICONS.wiki, tint: hubTint('wiki'), target: { kind: 'hub', hubId: 'wiki' } },
        { id: 'cloud', label: '클라우드', icon: HUB_ICONS.cloud, tint: hubTint('cloud'), target: { kind: 'hub', hubId: 'cloud' } },
      ],
    },
    {
      label: '어시스턴트',
      items: [
        { id: 'study', label: '스터디룸', icon: MODE_ICON.study_main, tint: MODE_TINT.study_main, target: { kind: 'mode', mode: 'study_main' } },
        { id: 'image-gen', label: '이미지·영상', icon: tileIcon('image-gen'), tint: tileTint('image-gen'), target: { kind: 'assistant', cardId: 'image-gen' } },
        { id: 'ppt', label: 'PPT', icon: tileIcon('ppt'), tint: tileTint('ppt'), target: { kind: 'assistant', cardId: 'ppt' } },
      ],
    },
    {
      label: '전문',
      items: (['law', 'drug', 'tax'] as const).map((key): RailItem => {
        const p = premium(key)!;
        const label = key === 'law' ? 'AI 법률' : key === 'drug' ? '건강 도우미' : 'AI 세무';
        return { id: `premium-${key}`, label, icon: p.icon, tint: p.tint, target: { kind: 'premium', domainId: p.key } };
      }),
    },
    {
      label: '라이프',
      items: [
        { id: 'saju', label: 'AI 사주', icon: Sparkles, tint: lifeTint('saju'), target: { kind: 'life', toolId: 'saju' } },
        { id: 'dream', label: '꿈 해몽', icon: Moon, tint: lifeTint('dream'), target: { kind: 'life', toolId: 'dream' } },
        { id: 'all', label: '모든 기능', icon: LayoutGrid, tint: 'currentColor', target: 'menu' },
      ],
    },
  ];
}

const GROUPS = buildGroups();

export function FeatureRail({
  onOpenMenu,
  onSelectMode,
  onSelectDebateSub,
  onSelectPremiumDomain,
  onSelectAssistantCard,
  onSelectTool,
}: Props) {
  const navigate = useNavigate();

  const run = (item: RailItem) => {
    if (item.target === 'menu') {
      onOpenMenu();
      return;
    }
    const target = item.target;
    switch (target.kind) {
      case 'mode': onSelectMode(target.mode); break;
      case 'debate': onSelectDebateSub(target.sub); break;
      case 'premium': onSelectPremiumDomain(target.domainId); break;
      case 'assistant': onSelectAssistantCard(target.cardId); break;
      case 'life': onSelectTool('life', target.toolId, item.label); break;
      case 'player': onSelectTool('player', target.toolId, item.label); break;
      case 'hub': {
        const route =
          target.hubId === 'planner' ? '/planner' :
          target.hubId === 'wiki' ? '/wiki' :
          target.hubId === 'cloud' ? '/cloud' : null;
        if (route) navigate(route);
        break;
      }
    }
  };

  return (
    <div
      className="mt-7 hidden items-start justify-center md:flex animate-in fade-in slide-in-from-bottom-2 duration-500"
      role="navigation"
      aria-label="주요 기능 바로가기"
    >
      {GROUPS.map((group, gi) => (
        <div key={group.label} className="flex items-start">
          {gi > 0 && (
            <span aria-hidden className="mx-4 mt-2 h-12 w-px" style={{ backgroundColor: 'var(--hero-hairline)' }} />
          )}
          <div className="flex flex-col items-center gap-2.5">
            <span
              className="text-[10.5px] font-bold tracking-[0.02em]"
              style={{ color: 'var(--hero-fg)', opacity: 0.62 }}
            >
              {group.label}
            </span>
            <div className="flex items-start gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isMenu = item.target === 'menu';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => run(item)}
                    title={item.label}
                    className="group/rail flex w-[68px] flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 transition-all duration-150 hover:-translate-y-0.5"
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150"
                      style={{
                        // 평소에도 옅은 틴트 배경으로 가시성 ↑ (2026-07-05).
                        backgroundColor: isMenu
                          ? 'var(--hero-accent-soft)'
                          : `color-mix(in oklab, ${item.tint} 8%, transparent)`,
                        color: isMenu ? 'var(--hero-fg)' : item.tint,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isMenu
                          ? 'var(--hero-accent-soft)'
                          : `color-mix(in oklab, ${item.tint} 16%, transparent)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isMenu
                          ? 'var(--hero-accent-soft)'
                          : `color-mix(in oklab, ${item.tint} 8%, transparent)`;
                      }}
                    >
                      <Icon size={21} strokeWidth={2} />
                    </span>
                    <span
                      className="max-w-full truncate text-[11.5px] font-medium leading-none tracking-tight"
                      style={{ color: 'var(--hero-fg)', opacity: 0.92 }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
