/**
 * 메인 모드 네비 — "Eyebrow Pill" 패턴.
 *
 * 페이지 헤더 메타로서의 모드 표시. 작은 pill + 드롭다운 패널.
 * 드롭다운은 주요 모드를 노출하고, AI 라운드테이블은 하위(찬반/자유/심층/브레인) 인라인 표시.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  MessageCircle, GitMerge, Shield, Sparkles, Swords, Wrench,
  FlaskConical, BookOpen, ChevronDown, ChevronRight, MessagesSquare, Telescope,
  Globe, Presentation, Mic, ArrowRight, Users, Wand2, Files,
  Languages, PenLine, BookText, FileSpreadsheet, Music, FileText,
  BarChart3, StickyNote, BookMarked, Ticket, ShoppingBag, Plane,
  Gamepad2, PiggyBank, PartyPopper, Contact, Gem, Bot, LayoutGrid,
  Calculator, Timer, Settings, LogIn, LogOut, User as UserIcon,
  Home, Star, History, Bell, HeartPulse, ReceiptText, Banknote, Building2, BriefcaseBusiness,
  Archive,
  LayoutDashboard,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { MainMode, DebateSubMode, PremiumDomainId } from '@/types/expert';
import { cn } from '@/lib/utils';
import { QuickSearchBar } from './QuickSearchBar';
import { getTodayUsage, summarizeUsage, USAGE_CHANGED_EVENT, type UsageSummary } from '@/services/usageTracker';
import { useFavoriteModes, MAX_FAVS, type FavEntry } from '@/hooks/useFavoriteModes';
import { toast } from 'sonner';
import { useSelectedBrand } from '@/hooks/useSelectedBrand';
import { useSelectedModel } from '@/hooks/useSelectedModel';
import { BRAND_BY_ID } from '@/lib/aiBrands';
import { useUpcomingEvent } from '@/hooks/planner/useUpcomingEvent';
import { useTodayTasks } from '@/hooks/planner/useTodayTasks';
import { taskStore } from '@/services/planner/taskStore';

interface MainModeTabsProps {
  modes: MainMode[];
  labels: Record<MainMode, string>;
  currentMode: MainMode;
  pendingMode: MainMode | null;
  isDiscussing: boolean;
  transitionPhase: number;
  showPlayerBg: boolean;
  onChange: (mode: MainMode) => void;
  /** 현재 debate 서브 모드 (toggle 표시용). */
  currentDebateSub?: DebateSubMode;
  /** AI 라운드테이블 하위 (찬반/자유/심층/브레인) 선택 콜백. */
  onSelectDebateSub?: (sub: DebateSubMode) => void;
  /** 현재 어시스턴트 카드 id (toggle 표시용). */
  currentAssistantCard?: string | null;
  /** 어시스턴트 도구 (번역/문서/PPT/음성) 빠른 선택 콜백. */
  onSelectAssistantCard?: (cardId: string) => void;
  /** 라이프·재미 도구 (사주/타로/연애/운동 등) 선택 콜백. 없으면 일반 채팅으로 폴백. */
  onSelectLifeTool?: (toolId: string) => void;
  /** 멘탈 테스트 모음 페이지 트리거 — 드롭다운 mental 그룹 서브 뷰에서 호출. */
  onOpenMentalTests?: () => void;
  /** 북마크 그리드 모달 트리거 — 노트 컬럼 '북마크' 칩에서 호출. */
  onOpenBookmarks?: () => void;
  /** 플레이어 도구 (캐릭터챗/게임/롤플레이 등) 선택 콜백. */
  onSelectPlayerTool?: (toolId: string) => void;
  /** 프리미엄 AI 세부 도메인 선택 콜백. */
  onSelectPremiumDomain?: (domainId: PremiumDomainId) => void;
  /** 현재 프리미엄 AI 세부 도메인 (toggle 표시용). */
  currentPremiumDomain?: PremiumDomainId | null;
  /** 외부 트리거 핸들 (예: 사이드바 LayoutGrid 버튼). 마운트 후 .current 에 open()/close() 메서드 주입. */
  apiRef?: React.MutableRefObject<{ open: () => void; close: () => void } | null>;
  /** 외부 트리거의 aria-controls 와 연결할 포털 메뉴 id. */
  menuId?: string;
  /** 외부 트리거가 열린 상태를 함께 표시할 수 있도록 변경을 알린다. */
  onOpenChange?: (open: boolean) => void;
}

export interface MainModeTabsApi {
  open: () => void;
  close: () => void;
}

/** 라이프 서브 그룹 — 드롭다운에서 여러 도구를 한 칩으로 묶는 단위. */
export type LifeSubgroupId = 'fortune' | 'mental' | 'health' | 'money' | 'enjoy' | 'aiplay';

export const LIFE_SUBGROUPS: Record<LifeSubgroupId, { emoji: string; label: string; description: string; tint: string; icon?: LucideIcon }> = {
  fortune: { emoji: '🔮', label: '사주·타로·심리',     description: '사주·타로·꿈·토정·MBTI·테스트',     tint: 'hsl(262 70% 55%)', icon: Sparkles },
  mental:  { emoji: '🧠', label: '멘탈 테스트',       description: 'MBTI·자가체크·심리 테스트',         tint: 'hsl(210 60% 55%)' },
  health:  { emoji: '🩺', label: '건강 도우미',       description: '운동·영양제·수면·식단',              tint: 'hsl(170 60% 42%)', icon: HeartPulse },
  money:   { emoji: '💰', label: '머니·투자·재테크', description: '가계부·세금·투자·대출·부동산·노후', tint: 'hsl(130 55% 40%)', icon: PiggyBank },
  enjoy:   { emoji: '🎉', label: '놀고·먹고·즐기고',    description: '여행·맛집·놀거리·볼거리·데이트',    tint: 'hsl(25 85% 55%)', icon: PartyPopper },
  aiplay:  { emoji: '🎮', label: 'AI Play',           description: '캐릭터챗·게임·롤플레이',            tint: 'hsl(280 70% 55%)', icon: Gamepad2 },
};

/** 라이프 그룹 도구 정의 — 엔터테인먼트·건강·생활 통합. */
export const LIFE_TOOLS: Array<{
  id: string;
  label: string;
  desc?: string;
  emoji: string;
  /** 라인 아이콘 — 드롭다운 직행 노출용 (있으면 이모지 대신). */
  icon?: LucideIcon;
  tint: string;
  /** 드롭다운 직행 노출 여부. false 면 "라이프 더 보기" 또는 서브 그룹에서만 노출. */
  featured: boolean;
  /** 소속 서브 그룹. 지정하면 드롭다운에서 해당 그룹 칩 하위로 들어감. */
  group?: LifeSubgroupId;
}> = [
  { id: 'saju',       label: 'AI 사주',       desc: '생년월일 + MBTI 풀이',      emoji: '🔮', tint: 'hsl(262 83% 58%)', featured: false, group: 'fortune'   },
  { id: 'tarot',      label: '타로 카드',     desc: '카드 뽑기 · 메시지 해석',   emoji: '🎴', tint: 'hsl(320 70% 55%)', featured: false, group: 'fortune'   },
  { id: 'dream',      label: '꿈 해몽',       desc: '꿈 내용 → 상징 해석',       emoji: '🌙', tint: 'hsl(240 60% 58%)', featured: false, group: 'fortune'   },
  { id: 'tojeong',    label: '토정비결',      desc: '올해 운세 · 월별 흐름',     emoji: '📜', tint: 'hsl(35 75% 48%)',  featured: false, group: 'fortune'   },
  // ── 2026-04 추가 (fortune 그룹 확장) ──
  { id: 'daily',      label: '일일운세',      desc: '오늘의 종합·애정·재물',     emoji: '🌟', tint: 'hsl(50 90% 55%)',  featured: false, group: 'fortune'   },
  { id: 'dating',     label: '연애 코치',     desc: '썸·데이트·이별 조언',       emoji: '💌', tint: 'hsl(350 80% 62%)', featured: true                       },
  // ── 건강 도우미 그룹 ──
  { id: 'workout',    label: '운동 코치',     desc: '홈트·헬스·요가 루틴',       emoji: '💪', tint: 'hsl(155 65% 45%)', featured: false, group: 'health'    },
  { id: 'supplement', label: '영양제 추천',   desc: '증상·목표별 영양제 조합',   emoji: '💊', tint: 'hsl(100 55% 42%)', featured: false, group: 'health'    },
  { id: 'sleep',      label: '수면 코치',     desc: '불면·취침 루틴·수면 일지',  emoji: '💤', tint: 'hsl(225 55% 55%)', featured: false, group: 'health'    },
  { id: 'meal-plan',  label: '식단 관리',     desc: '목표별 식단·칼로리·알러지', emoji: '🥗', tint: 'hsl(95 60% 42%)',  featured: false, group: 'health'    },
  { id: 'stretching', label: '자세·스트레칭', desc: '거북목·허리·하체 루틴',     emoji: '🧎', tint: 'hsl(180 55% 42%)', featured: false, group: 'health'    },
  // ── 머니·투자·재테크 그룹 ──
  { id: 'budget',     label: '가계부·지출',   desc: '카테고리 분석 · 절약 포인트',   emoji: '💳', tint: 'hsl(200 72% 50%)', featured: false, group: 'money'     },
  { id: 'tax',        label: '연말정산·세금', desc: '예상 환급 · 놓친 공제 체크',    emoji: '🧾', tint: 'hsl(28 72% 48%)',  featured: false, group: 'money'     },
  { id: 'stock',      label: '주식 리서치',   desc: '종목 분석 · 이슈 · 재무',       emoji: '📈', tint: 'hsl(0 75% 52%)',   featured: false, group: 'money'     },
  { id: 'etf',        label: 'ETF·배당 리서치', desc: 'ETF 비교 · 배당주 탐색',      emoji: '🧺', tint: 'hsl(130 55% 38%)', featured: false, group: 'money'     },
  { id: 'loan',       label: '대출·신용',     desc: '주담대·전세·신용점수',          emoji: '🏦', tint: 'hsl(310 55% 48%)', featured: false, group: 'money'     },
  { id: 'realestate', label: '부동산 체크',   desc: '계약 위험 조항 · 시세 분석',     emoji: '🏠', tint: 'hsl(230 45% 45%)', featured: false, group: 'money'     },
  { id: 'pension',    label: '연금·노후',     desc: '국민·IRP·은퇴 시뮬',            emoji: '🏖️', tint: 'hsl(55 65% 45%)',  featured: false, group: 'money'     },
  { id: 'recipe',     label: '레시피',        desc: '냉장고 재료로 요리',        emoji: '🍳', tint: 'hsl(18 80% 55%)',  featured: true                        },
  // ── 놀고·먹고·즐기고 그룹 ──
  { id: 'travel',            label: '여행 플래너',  desc: '일정·예산·동선 설계',              emoji: '✈️', tint: 'hsl(195 80% 50%)', featured: false, group: 'enjoy'    },
  { id: 'travel-recommend',  label: '여행지 찾기',  desc: '취향·계절·예산으로 목적지 추천',   emoji: '🗺️', tint: 'hsl(175 65% 45%)', featured: false, group: 'enjoy'    },
  { id: 'restaurant',        label: '맛집 찾기',    desc: '지역·분위기·가격대로 맛집',        emoji: '🍜', tint: 'hsl(352 75% 55%)', featured: false, group: 'enjoy'    },
  { id: 'things-to-do',      label: '놀거리',       desc: '지역·날씨·예산별 액티비티·전시',   emoji: '🎯', tint: 'hsl(285 65% 58%)', featured: false, group: 'enjoy'    },
  { id: 'date-course',       label: '데이트 플래너', desc: '지역·예산·테마로 코스',            emoji: '🍽️', tint: 'hsl(8 80% 60%)',   featured: false, group: 'enjoy'    },
  { id: 'content',           label: '볼거리 추천',  desc: '책·영화·드라마 취향 맞춤',         emoji: '🎬', tint: 'hsl(210 75% 55%)', featured: false, group: 'enjoy'    },
  { id: 'color',      label: '퍼스널 컬러',   desc: '웜톤·쿨톤 진단 + 팔레트',   emoji: '🎨', tint: 'hsl(295 70% 58%)', featured: true                       },
  // ── "라이프 더 보기" 모달 전용 (드롭다운 비노출) ──
  { id: 'style',      label: '스타일 코디',   desc: '체형·상황·계절별 코디',     emoji: '👗', tint: 'hsl(335 75% 60%)', featured: false                     },
  { id: 'gift',       label: '선물 추천',     desc: '관계·기념일·예산별 제안',   emoji: '🎁', tint: 'hsl(145 60% 45%)', featured: false                     },
  { id: 'interior',   label: '인테리어',      desc: '방 배치·컬러·가구 제안',    emoji: '🛋️', tint: 'hsl(40 55% 50%)',  featured: false                     },
  { id: 'apology',    label: '사과문 생성',   desc: '관계·사안별 사과문 3단',    emoji: '🙇', tint: 'hsl(220 40% 50%)', featured: false                     },
  // ── 멘탈·심리 그룹 ──
  { id: 'mbti-match', label: 'MBTI 궁합',     desc: '관계별 강점·갈등 분석',     emoji: '🤝', tint: 'hsl(205 60% 50%)', featured: false, group: 'mental'    },
  { id: 'mood-check', label: '우울·불안 체크', desc: 'PHQ-9·GAD-7 자가 스크리닝', emoji: '🌧️', tint: 'hsl(250 55% 58%)', featured: false, group: 'mental'    },
  { id: 'adhd-check', label: 'ADHD 자가 체크', desc: 'ASRS-v1.1 성인 ADHD 체크',  emoji: '🎯', tint: 'hsl(285 55% 55%)', featured: false, group: 'mental'    },
  // ── 기존 비공개 (그룹 미지정) ──
  { id: 'journal',    label: '감정 일기',     desc: '오늘 기분 정리·공감',       emoji: '📔', tint: 'hsl(32 80% 55%)',  featured: false                     },
  { id: 'meditation', label: '명상',          desc: '불안·집중·잠들기',          emoji: '🧘', tint: 'hsl(175 55% 45%)', featured: false                     },
  { id: 'shopping',   label: '쇼핑 도우미',   desc: '가격 비교 · 리뷰 요약 · 추천', emoji: '🛍️', icon: ShoppingBag, tint: 'hsl(340 75% 58%)', featured: false                    },
];

/**
 * 드롭다운 라이프 컬럼 렌더용 — 직행 도구 + 서브 그룹 칩을 한 줄씩 나열.
 * 순서: 사주(대표) → 🔮 다른 운세(그룹) → 직행 도구들 → 🧠 멘탈·심리(그룹)
 */
export const LIFE_DROPDOWN_ENTRIES: Array<
  | { kind: 'tool'; toolId: string }
  | { kind: 'group'; groupId: LifeSubgroupId }
  | { kind: 'mental-tests' }  // 심리 테스트 모음 페이지 바로가기
> = [
  { kind: 'tool', toolId: 'shopping' },    // 🛍️ 쇼핑 도우미
  { kind: 'group', groupId: 'fortune' },   // 🔮 사주·타로·심리
  { kind: 'group', groupId: 'aiplay' },    // 🎮 AI Play (캐릭터챗·게임)
  { kind: 'group', groupId: 'health' },    // 🩺 건강 도우미
  { kind: 'group', groupId: 'money' },     // 💰 머니·투자·재테크
  { kind: 'group', groupId: 'enjoy' },     // 🎉 놀고·먹고·즐기고
];

/** 드롭다운 노출용 featured 서브셋. */
export const LIFE_TOOLS_FEATURED = LIFE_TOOLS.filter((t) => t.featured);

/** 단일 라이프 그룹 (재미·건강·생활 통합). 드롭다운과 모달에서 header 에 사용. */
export const LIFE_GROUP = {
  label: '라이프스타일',
  description: '운세·감정·건강·생활',
};

/** 플레이어 그룹 도구 — 놀이·가상·게임·캐릭터. */
export const PLAYER_TOOLS: Array<{
  id: string;
  label: string;
  desc?: string;
  emoji: string;
  tint: string;
  featured: boolean;
}> = [
  { id: 'character-chat', label: '캐릭터 챗',    desc: '가상 캐릭터와 몰입 대화',    emoji: '🎭', tint: 'hsl(280 70% 55%)', featured: true  },
  { id: 'ai-game',        label: 'AI 게임',      desc: '끝말잇기·스무고개·진실',      emoji: '🎮', tint: 'hsl(142 70% 42%)', featured: true  },
  { id: 'story-rpg',      label: '스토리 RPG',   desc: 'AI 가 DM, 선택형 모험',       emoji: '📖', tint: 'hsl(25 80% 50%)',  featured: true  },
  { id: 'detective',      label: '추리 게임',    desc: '용의자 심문 · 범인 찾기',     emoji: '🕵️', tint: 'hsl(215 60% 40%)', featured: true  },
  // ── 2026-04 추가: 국내 밈·바이럴 상위 2종 ──
  { id: 'worldcup',       label: '이상형 월드컵', desc: '양자택일 토너먼트 · 공유',   emoji: '🏆', tint: 'hsl(45 95% 55%)',  featured: true  },
  { id: 'balance-game',   label: '밸런스 게임',  desc: '양자택일 시리즈 · 프로파일', emoji: '⚖️', tint: 'hsl(200 75% 50%)', featured: true  },
  // 더 보기 전용
  { id: 'roleplay',       label: '롤플레이',     desc: '면접·카페·데이트 상황극',     emoji: '🎪', tint: 'hsl(340 65% 55%)', featured: false },
  { id: 'ai-friend',      label: 'AI 친구',      desc: '일상 컴패니언 · 반말 대화',   emoji: '🌐', tint: 'hsl(190 60% 48%)', featured: false },
  { id: 'board-game',     label: 'AI 보드게임',  desc: '체스·바둑·보드 상대',         emoji: '🃏', tint: 'hsl(260 55% 50%)', featured: false },
];

export const PLAYER_TOOLS_FEATURED = PLAYER_TOOLS.filter((t) => t.featured);

export const PLAYER_GROUP = {
  label: '플레이어',
  description: '캐릭터·게임·롤플레이',
};

/** 노트(허브) 컬럼 도구 — 2축(행동·성장). 행동=오늘 무엇을, 성장=깊이·자기관리. */
export type HubAxis = '정리' | '기록';
export interface HubTool {
  id: string;
  label: string;
  desc: string;
  emoji: string;
  /** 라인 아이콘 — 있으면 이모지 대신 렌더 (메뉴 아이콘 통일, 2026-07-12). */
  icon?: LucideIcon;
  tint: string;
  axis: HubAxis;
  /** 지정하면 라우팅 대신 해당 모드로 전환 (스터디룸·회의록 이사분). */
  mode?: MainMode;
  /** true 면 자리만 예약 — 클릭 불가, 흐리게 표시 (이름·설계 미정 신규 방). */
  pending?: boolean;
}

export const HUB_TOOLS: HubTool[] = [
  // ── 정리 (도구·자동) — 준비중(pending)은 맨 아래로 모음 ─────────────────
  { id: 'today',      label: '오늘의 나',          desc: '오늘 챙길 것·할 일·기록 한눈에',  emoji: '🌅', icon: LayoutDashboard, tint: 'hsl(200 65% 48%)', axis: '정리' },
  { id: 'planner',    label: '통합 플래너',        desc: '캘린더·할일·습관·목표 한 화면에', emoji: '📊', icon: BarChart3,  tint: 'hsl(220 70% 55%)', axis: '정리' },
  { id: 'archive',    label: '아카이브',           desc: '서류·링크·사진 보관·정리',        emoji: '🗄️', icon: Archive,    tint: 'hsl(28 48% 40%)',  axis: '정리' },
  { id: 'studyroom',  label: 'AI 스터디룸',        desc: '자료 분석 · 퀴즈 · 팟캐스트',     emoji: '📚', icon: BookOpen,   tint: 'hsl(38 90% 48%)',  axis: '정리', mode: 'study_main' },
  { id: 'meeting',    label: '회의록',             desc: '녹음 → 전사 · 요약 · 할 일',      emoji: '🎙️', icon: Mic,        tint: 'hsl(330 65% 52%)', axis: '정리', mode: 'voice_main' },
  { id: 'people',     label: '인맥노트',           desc: '사람 카드 · 경조사 · 관계 흐름',  emoji: '📇', icon: Contact,    tint: 'hsl(16 62% 48%)',  axis: '정리' },
  // ── 기록 (직접 쓰기) ──────────────
  { id: 'notes',      label: '올인원 노트',        desc: '노트·화이트보드·시트 한 곳에',    emoji: '🗒️', icon: StickyNote, tint: 'hsl(150 55% 45%)', axis: '기록' },
  { id: 'journal',    label: '데일리 로그',        desc: '일기 · 먹은 것 · 간 곳 · 여행',   emoji: '📖', icon: BookMarked, tint: 'hsl(146 27% 39%)', axis: '기록' },
  { id: 'career',     label: '마이커리어',         desc: '이룬 것을 이력서로 정리',         emoji: '📄', icon: FileText,   tint: 'hsl(6 70% 51%)',  axis: '기록' },
  { id: 'health',     label: '건강기록',           desc: '수치·복약·진료·증상 기록실',      emoji: '🩺', icon: HeartPulse, tint: 'hsl(152 58% 37%)', axis: '기록' },
  { id: 'travel',     label: '트래블 로그',        desc: '데일리 로그 속 여행 — 계획·지도', emoji: '✈️', icon: Plane,      tint: 'hsl(183 58% 32%)', axis: '기록' },
  { id: 'ticketbook', label: '티켓북 (이름미정)',   desc: '영화 · 책 · 게임 감상 기록',      emoji: '🎟️', icon: Ticket,     tint: 'hsl(215 70% 50%)', axis: '기록', pending: true },
];

export const MODE_ICON: Record<MainMode, LucideIcon> = {
  general:          MessageCircle,
  multi:            GitMerge,
  brainstorm_main:  Sparkles,
  stakeholder_main: Users,
  premium_main:     Gem,
  debate:           Swords,
  assistant:        Wrench,
  player:           Sparkles,
  research_main:    FlaskConical,
  translate_main:   Globe,
  convert_main:     Sparkles,
  study_main:       BookOpen,
  voice_main:       Mic,
  media_main:       Wand2,
};

export const MODE_TINT: Record<MainMode, string> = {
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
  voice_main:       'hsl(var(--mode-assistant))',
  media_main:       'hsl(var(--mode-assistant))',
};

/* 모드창 순수화 — 좌측 TODAY 위젯(시계·달력·검색) 컬럼 숨김 (2026-07-05
 * 유저 요청). 대신 계정·사용량 정보 컬럼이 그 자리를 채움. 코드는 보존. */
const SHOW_TODAY_COL = false;

/** 플랜별 일일 토큰 소프트 예산 — 게이지 기준선 (하드 리밋 아님). */
const PLAN_DAILY_TOKEN_BUDGET: Record<string, number> = {
  free: 200_000,
  pro: 2_000_000,
  premium: 10_000_000,
};

function fmtTokens(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
}

function fmtUsd(n: number): string {
  if (n < 0.01) return '$0';
  if (n < 1) return `$${n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`;
  return `$${n.toFixed(2)}`;
}

/** 사용자 요청 목록에 맞춘 그룹핑 (2026-07-12 개편).
 * 대화 = 일반·멀티·(나만의 AI 자리)·프리미엄. 심층 리서치는 프리미엄 서브메뉴로 이동.
 * 시뮬레이션 = 리허설·라운드테이블·(나만의 AI 컴퍼니 자리). 스터디룸·녹음은 노트 컬럼으로 이사. */
export const MODE_GROUPS: Array<{ label: string; description: string; tint: string; modes: MainMode[] }> = [
  { label: '대화',       description: '질문하고 답받기', tint: 'hsl(217 91% 55%)', modes: ['general', 'multi', 'premium_main'] },
  { label: '시뮬레이션', description: '여럿이 굴리기',   tint: 'hsl(262 70% 55%)', modes: ['stakeholder_main', 'debate'] },
];

export const MODE_DESCRIPTION: Partial<Record<MainMode, string>> = {
  general:          'AI 를 골라 1:1 대화',
  multi:            '여러 AI 답변 비교',
  debate:           '찬반·자유·심층·브레인스토밍',
  stakeholder_main: '이해관계자 역할극 시뮬레이션',
  research_main:    '멀티 AI 교차 검증 리포트',
  premium_main:     '법률·건강·세무·투자 자문',
  study_main:       '자료 분석·퀴즈·팟캐스트',
  voice_main:       '전사·요약·챕터·할 일 추출',
  assistant:        '전체 도구 브라우즈',
};

/** 하단 독 6번째 칸 — 추천 스포트라이트 후보 (NEW/HOT). 즐겨찾기에 이미 꽂힌 건 제외하고 랜덤 노출.
 *  id 는 즐겨찾기 id 규약(mode-x, hub-x)과 동일 — 중복 판정·라우팅 재사용. */
export const SPOTLIGHT_ITEMS: Array<{
  id: string;
  badge: 'NEW' | 'HOT';
  label: string;
  tint: string;
  target: FavEntry['target'];
}> = [
  { id: 'hub-archive',        badge: 'NEW', label: '아카이브',    tint: 'hsl(28 48% 40%)',           target: { kind: 'hub', hubId: 'archive' } },
  { id: 'hub-health',         badge: 'NEW', label: '건강기록',    tint: 'hsl(152 58% 37%)',          target: { kind: 'hub', hubId: 'health' } },
  { id: 'mode-research_main', badge: 'HOT', label: '심층 리서치',  tint: 'hsl(var(--mode-research))', target: { kind: 'mode', mode: 'research_main' } },
  { id: 'mode-multi',         badge: 'NEW', label: '멀티 채팅',    tint: 'hsl(var(--mode-multi))',    target: { kind: 'mode', mode: 'multi' } },
  { id: 'hub-career',         badge: 'NEW', label: '이력서 PDF',   tint: 'hsl(6 70% 51%)',            target: { kind: 'hub', hubId: 'career' } },
  { id: 'mode-study_main',    badge: 'HOT', label: 'AI 스터디룸',  tint: 'hsl(var(--mode-study))',    target: { kind: 'mode', mode: 'study_main' } },
  { id: 'mode-voice_main',    badge: 'NEW', label: '회의록',       tint: 'hsl(330 65% 52%)',          target: { kind: 'mode', mode: 'voice_main' } },
];

/** 어시스턴트 드롭다운 직행 도구 3개. 파일 변환 등 나머지는 "도구 더 보기" 에서만 노출. */
export const ASSISTANT_FEATURED_TOOLS: Array<{
  cardId: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  tint: string;
}> = [
  { cardId: 'image-gen',      label: '이미지·동영상', desc: '프롬프트로 생성',      icon: Wand2,        tint: 'hsl(32 95% 50%)' },
  { cardId: 'voice-analysis', label: 'AI 녹음 분석',  desc: '녹음→텍스트·요약',     icon: Mic,          tint: 'hsl(330 65% 52%)' },
  { cardId: 'ppt',            label: 'PPT 생성',      desc: '프레젠테이션 자동',     icon: Presentation, tint: 'hsl(160 60% 40%)' },
];

/** 스카이워크 타일 (좌측 컬럼 하단 2x4 = 8개) — 실무 도구 즉석 진입.
 *  placeholder:true 인 타일은 임시 cardId (아직 ASSISTANT_CARDS 미등록 상태) — dim 처리로 "준비 중" 시그널. */
export const ASSISTANT_TILES: Array<{
  cardId: string;
  label: string;
  desc?: string;
  icon: LucideIcon;
  tint: string;
  placeholder?: boolean;
}> = [
  { cardId: 'ppt',            label: 'PPT',         desc: '주제 → 슬라이드 자동',      icon: Presentation,    tint: 'hsl(28 80% 55%)'  },
  { cardId: 'image-gen',      label: '영상',        desc: '프롬프트로 이미지·영상',     icon: Wand2,           tint: 'hsl(340 70% 55%)' },
  { cardId: 'music-gen',      label: '노래',        desc: '가사·분위기로 작곡',        icon: Music,           tint: 'hsl(265 65% 58%)', placeholder: true },
  { cardId: 'file-convert',   label: '파일 변환',   desc: 'PDF·이미지·문서 변환',      icon: Files,           tint: 'hsl(280 60% 55%)' },
  { cardId: 'translate',      label: '번역',        desc: '맥락 살린 다국어 번역',     icon: Languages,       tint: 'hsl(170 65% 45%)' },
  { cardId: 'cover-letter',   label: 'AI 자소서',   desc: '경험 → 자기소개서 초안',    icon: FileText,        tint: 'hsl(6 70% 51%)',   placeholder: true },
  { cardId: 'writing',        label: '글쓰기',      icon: PenLine,         tint: 'hsl(45 80% 50%)',  placeholder: true },
  { cardId: 'summarize',      label: '요약',        icon: BookText,        tint: 'hsl(200 55% 50%)', placeholder: true },
  { cardId: 'spreadsheet',    label: '엑셀·표',     icon: FileSpreadsheet, tint: 'hsl(135 55% 42%)', placeholder: true },
];

/** 시간대별 컨텍스트 인사 — Ambient Dashboard 감성. */
export function getGreeting(hour: number): { emoji: string; text: string } {
  if (hour < 6)  return { emoji: '🌙', text: '늦은 시간이네요' };
  if (hour < 11) return { emoji: '☀️', text: '좋은 아침입니다' };
  if (hour < 14) return { emoji: '🍱', text: '점심 드셨나요?' };
  if (hour < 18) return { emoji: '✨', text: '좋은 오후입니다' };
  if (hour < 22) return { emoji: '🌆', text: '수고하셨어요' };
  return { emoji: '🌙', text: '편안한 밤 되세요' };
}

/** 시간대별 TODAY 카드 그라디언트 — 새벽/아침/점심/오후/저녁/밤. */
export function getTimeGradient(hour: number): string {
  if (hour < 6)  return 'from-indigo-500/15 to-purple-500/10';
  if (hour < 11) return 'from-amber-300/20 to-orange-300/10';
  if (hour < 14) return 'from-sky-400/15 to-blue-400/10';
  if (hour < 18) return 'from-sky-500/12 to-blue-500/8';
  if (hour < 22) return 'from-pink-400/15 to-orange-400/10';
  return 'from-indigo-700/15 to-slate-700/10';
}

/** 좌측 하단 Bento 도구 — 4개 아이콘 타일. */
export const TOOL_TILES: Array<{
  id: string;
  label: string;
  icon: LucideIcon;
  /** Tailwind 그라디언트 배경 (light + dark). */
  bgClass: string;
  /** 아이콘/라벨 컬러 */
  iconClass: string;
  labelClass: string;
  /** hover 시 컬러 섀도우 */
  shadowClass: string;
  borderClass: string;
  /** 실제 동작 — 번역은 기존 assistant 재사용, 나머지는 일반 채팅 폴백. */
  action: 'translate' | 'chat';
  prompt?: string;
}> = [
  {
    id: 'calculator',
    label: '계산',
    icon: Calculator,
    bgClass: 'from-blue-50 to-blue-100/60 dark:from-blue-950/30 dark:to-blue-900/20',
    iconClass: 'text-blue-500',
    labelClass: 'text-blue-700 dark:text-blue-300',
    shadowClass: 'hover:shadow-blue-500/25',
    borderClass: 'border-blue-200/50 dark:border-blue-800/40',
    action: 'chat',
    prompt: '계산해줘',
  },
  {
    id: 'translate',
    label: '번역',
    icon: Languages,
    bgClass: 'from-emerald-50 to-emerald-100/60 dark:from-emerald-950/30 dark:to-emerald-900/20',
    iconClass: 'text-emerald-500',
    labelClass: 'text-emerald-700 dark:text-emerald-300',
    shadowClass: 'hover:shadow-emerald-500/25',
    borderClass: 'border-emerald-200/50 dark:border-emerald-800/40',
    action: 'translate',
  },
  {
    id: 'timer',
    label: '타이머',
    icon: Timer,
    bgClass: 'from-orange-50 to-orange-100/60 dark:from-orange-950/30 dark:to-orange-900/20',
    iconClass: 'text-orange-500',
    labelClass: 'text-orange-700 dark:text-orange-300',
    shadowClass: 'hover:shadow-orange-500/25',
    borderClass: 'border-orange-200/50 dark:border-orange-800/40',
    action: 'chat',
    prompt: '타이머',
  },
  {
    id: 'memo',
    label: '메모',
    icon: PenLine,
    bgClass: 'from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-900/20',
    iconClass: 'text-amber-500',
    labelClass: 'text-amber-700 dark:text-amber-300',
    shadowClass: 'hover:shadow-amber-500/25',
    borderClass: 'border-amber-200/50 dark:border-amber-800/40',
    action: 'chat',
    prompt: '메모 정리',
  },
];

/** 좌측 컬럼 — 알림 피드 (v1 하드코드 · 플랫폼 업데이트/공지). */
export const SYSTEM_NOTIFICATIONS: Array<{
  id: string;
  title: string;
  desc: string;
  emoji: string;
  date: string;  // YYYY-MM-DD
  tint: string;
}> = [
  { id: 'n-tabs',      title: '좌측 사이드바 탭',    desc: '오늘·대화·즐겨찾기·알림 4탭',      emoji: '🎉', date: '2026-04-25', tint: 'hsl(340 70% 55%)' },
  { id: 'n-dashboard', title: 'Ambient 대시보드',    desc: '시간대별 그라디언트 · 미세먼지 게이지', emoji: '✨', date: '2026-04-24', tint: 'hsl(262 70% 55%)' },
  { id: 'n-enjoy',     title: '놀고·먹고·즐기고 신설', desc: '여행·맛집·놀거리 6개 도구',         emoji: '🎊', date: '2026-04-23', tint: 'hsl(25 85% 55%)' },
  { id: 'n-fun-tab',   title: '플레이어 탭 분리',     desc: '캐릭터챗·AI 게임·추리 독립',        emoji: '🎮', date: '2026-04-20', tint: 'hsl(280 70% 55%)' },
];

/** 좌측 컬럼 — 빠른 이동 핀 (플랫폼 내부 + 외부 사이트 믹스). */
export const QUICK_PINS: Array<{
  id: string;
  label: string;
  emoji: string;
  tint: string;
  section: 'platform' | 'external';
  target:
    | { type: 'life'; toolId: string }
    | { type: 'assistant'; cardId: string }
    | { type: 'player'; toolId: string }
    | { type: 'external'; url: string };
}> = [
  // 내 기능 3개
  { id: 'saju',      label: 'AI 사주',   emoji: '🔮', tint: 'hsl(262 70% 55%)', section: 'platform', target: { type: 'life',      toolId: 'saju' } },
  { id: 'character', label: '캐릭터 챗', emoji: '🎭', tint: 'hsl(280 70% 55%)', section: 'platform', target: { type: 'player',    toolId: 'character-chat' } },
  { id: 'image',     label: '이미지',    emoji: '🖼️', tint: 'hsl(340 70% 55%)', section: 'platform', target: { type: 'assistant', cardId: 'image-gen' } },
  // 외부 3개
  { id: 'google',    label: 'Google',    emoji: '🌐', tint: 'hsl(210 70% 55%)', section: 'external', target: { type: 'external',  url: 'https://google.com' } },
  { id: 'youtube',   label: 'YouTube',   emoji: '▶️', tint: 'hsl(0 75% 55%)',   section: 'external', target: { type: 'external',  url: 'https://youtube.com' } },
  { id: 'chatgpt',   label: 'ChatGPT',   emoji: '💬', tint: 'hsl(145 55% 45%)', section: 'external', target: { type: 'external',  url: 'https://chatgpt.com' } },
];

/** 좌측 컬럼 — 다가오는 공휴일/이벤트 (v1 하드코드 2026년, v2 다년도). */
export const UPCOMING_EVENTS: Array<{
  name: string;
  date: string; // YYYY-MM-DD
  emoji: string;
}> = [
  { name: '어린이날',   date: '2026-05-05', emoji: '🎏' },
  { name: '부처님오신날', date: '2026-05-24', emoji: '🪷' },
  { name: '현충일',     date: '2026-06-06', emoji: '🇰🇷' },
  { name: '광복절',     date: '2026-08-15', emoji: '🇰🇷' },
  { name: '추석',       date: '2026-09-25', emoji: '🌕' },
  { name: '개천절',     date: '2026-10-03', emoji: '🇰🇷' },
  { name: '한글날',     date: '2026-10-09', emoji: '🇰🇷' },
  { name: '크리스마스', date: '2026-12-25', emoji: '🎄' },
  { name: '새해',       date: '2027-01-01', emoji: '🎊' },
];

/** 토론 서브모드 정의 — 각자 독립 항목으로 논의 그룹에 직접 노출. 각자 고유 색. */
export const DEBATE_SUBS: Array<{
  key: DebateSubMode;
  label: string;
  desc: string;
  icon: LucideIcon;
  tint: string;
}> = [
  { key: 'procon',     label: '찬반토론',     desc: '찬성 · 반대 구조',    icon: Swords,         tint: 'hsl(var(--mode-debate-b))' },     // red — 대립
  { key: 'freetalk',   label: '자유토론',     desc: '정해진 형식 없이',    icon: MessagesSquare, tint: 'hsl(188 85% 40%)' },               // cyan — 자유로움
  { key: 'standard',   label: '심층토론',     desc: '다각도 분석',         icon: Telescope,      tint: 'hsl(var(--mode-research))' },      // navy — 깊이
  { key: 'brainstorm', label: '브레인스토밍', desc: '아이디어 발산',       icon: Sparkles,       tint: 'hsl(var(--mode-study))' },         // amber — 번뜩임
];

export const PREMIUM_AI_TOOLS: Array<{
  key: PremiumDomainId;
  label: string;
  desc: string;
  icon: LucideIcon;
  tint: string;
}> = [
  { key: 'law',        label: 'AI 법률 자문',       desc: '판례·계약·민사·형사 가이드', icon: Shield,            tint: 'hsl(var(--mode-premium))' },
  { key: 'drug',       label: '맞춤형 건강 도우미', desc: '증상·약·상호작용 체크',       icon: HeartPulse,        tint: 'hsl(160 62% 38%)' },
  { key: 'tax',        label: 'AI 세무·연말정산',   desc: '공제·절세·신고 체크',         icon: ReceiptText,       tint: 'hsl(188 70% 36%)' },
  { key: 'finance',    label: 'AI 투자·재무 상담', desc: '리스크·포트폴리오·상품 비교', icon: Banknote,          tint: 'hsl(215 70% 45%)' },
  { key: 'realestate', label: '부동산 계약 체크',   desc: '권리관계·계약 위험 점검',     icon: Building2,         tint: 'hsl(262 58% 52%)' },
  { key: 'labor',      label: '노무·근로 상담',     desc: '임금·퇴직금·근로계약',        icon: BriefcaseBusiness, tint: 'hsl(28 76% 47%)' },
];

export function MainModeTabs({
  labels,
  currentMode,
  pendingMode,
  isDiscussing,
  transitionPhase,
  showPlayerBg,
  onChange,
  currentDebateSub,
  onSelectDebateSub,
  currentAssistantCard,
  onSelectAssistantCard,
  onSelectLifeTool,
  onOpenMentalTests,
  onOpenBookmarks,
  onSelectPlayerTool,
  onSelectPremiumDomain,
  currentPremiumDomain,
  apiRef,
  menuId,
  onOpenChange,
}: MainModeTabsProps) {
  const [open, setOpen] = useState(false);
  // 외부에서 패널 열기/닫기 (사이드바 LayoutGrid 버튼 등)
  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = { open: () => setOpen(true), close: () => setOpen(false) };
    return () => { if (apiRef) apiRef.current = null; };
  }, [apiRef]);
  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);
  /** 라이프 컬럼에서 열려 있는 서브 그룹 (null 이면 메인 뷰). */
  const [openLifeSubgroup, setOpenLifeSubgroup] = useState<LifeSubgroupId | null>(null);
  /** AI 라운드테이블 세부 뷰 — 전문 그룹 자체가 드릴다운 전환(라이프 서브그룹 패턴). */
  const [debateOpen, setDebateOpen] = useState(false);
  /** 프리미엄 AI 세부 뷰 — 대화 그룹 안에서 드릴다운 전환. */
  const [premiumOpen, setPremiumOpen] = useState(false);
  /** 로그인 상태 — 좌측 컬럼 로그인 줄에 사용. */
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  /** 좌측 정보 컬럼 — 오늘 사용량 (usageTracker). 열려 있을 때만 구독. */
  const [todayUsage, setTodayUsage] = useState<UsageSummary>(() => summarizeUsage([]));
  useEffect(() => {
    if (!open) return;
    const refresh = () => setTodayUsage(summarizeUsage(getTodayUsage()));
    refresh();
    window.addEventListener(USAGE_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(USAGE_CHANGED_EVENT, refresh);
  }, [open]);
  /** 현재 선택된 AI 브랜드·모델 — "지금" 카드. */
  const { brand: currentBrandId } = useSelectedBrand();
  const { model: currentModel } = useSelectedModel(currentBrandId);
  /** 즐겨찾기 — 별 토글 → 하단 독 + 히어로 칩 (FavoriteChips 연동). */
  const { favs, isFav, toggleFav: toggleFavRaw, removeFav } = useFavoriteModes();
  /** 스포트라이트 시드 — 메뉴 열 때마다 다른 추천이 뜨게. */
  const [spotSeed, setSpotSeed] = useState(0.37);
  useEffect(() => {
    if (open) setSpotSeed(Math.random());
  }, [open]);
  const spotlightPick = useMemo(() => {
    const pool = SPOTLIGHT_ITEMS.filter((s) => !favs.some((f) => f.id === s.id));
    if (pool.length === 0) return null;
    return pool[Math.floor(spotSeed * pool.length) % pool.length];
  }, [favs, spotSeed]);
  /** 패널 왼쪽 변 — 여는 트리거(모드 pill)의 왼쪽과 세로 정렬 (2026-07-05).
   * 자체 트리거가 화면에 보이면 그것, 아니면 [data-mode-anchor] (히어로 pill). */
  const [anchorLeft, setAnchorLeft] = useState(16);
  useEffect(() => {
    if (!open) return;
    const own = rootRef.current?.getBoundingClientRect();
    const ownVisible = own && own.width > 0 && own.left > -100;
    const anchorEl = ownVisible ? null : document.querySelector('[data-mode-anchor]');
    const left = ownVisible ? own.left : anchorEl?.getBoundingClientRect().left ?? 16;
    // 패널(최대 1040px)이 화면 밖으로 안 나가게 클램프.
    setAnchorLeft(Math.max(8, Math.min(Math.round(left), window.innerWidth - Math.min(1350, window.innerWidth - 32) - 8)));
  }, [open]);
  /** 좌측 사이드바 탭 — 오늘 / 대화 / 즐겨찾기 / 알림. */
  const [leftTab, setLeftTab] = useState<'today' | 'recent' | 'pins' | 'notifications'>('today');
  /** 읽은 알림 id 세트 — localStorage 유지. */
  const [readNotifications, setReadNotifications] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('personai.read_notifications') : null;
      return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set<string>(); }
  });
  const unreadCount = SYSTEM_NOTIFICATIONS.filter((n) => !readNotifications.has(n.id)).length;
  const markAllRead = () => {
    const all = new Set(SYSTEM_NOTIFICATIONS.map((n) => n.id));
    setReadNotifications(all);
    try { window.localStorage.setItem('personai.read_notifications', JSON.stringify([...all])); } catch { /* noop */ }
  };
  /** 최근 모드 사용 이력 (localStorage 기반). */
  const [recentModes, setRecentModes] = useState<Array<{ id: string; label: string; emoji: string; tint: string; at: number; target: { kind: 'mode'; mode: MainMode } | { kind: 'life'; toolId: string } | { kind: 'assistant'; cardId: string } | { kind: 'player'; toolId: string } }>>(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('personai.recent_modes') : null;
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  /** 좌측 컬럼 시계 — 분 단위 업데이트. */
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!open) return;
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [open]);
  /** 통합 플래너 데이터 — 다음 일정 + 오늘 미완료 할일. */
  const upcomingEvent = useUpcomingEvent();
  const todayTasks = useTodayTasks();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const disabled = isDiscussing || transitionPhase !== 0;
  const effective = pendingMode ?? currentMode;
  const CurrentIcon = MODE_ICON[effective];
  const currentTint = MODE_TINT[effective];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // 세부창 > 서브 그룹 > 드롭다운 순서로 한 단계씩 닫기
        if (premiumOpen) setPremiumOpen(false);
        else if (debateOpen) setDebateOpen(false);
        else if (openLifeSubgroup) setOpenLifeSubgroup(null);
        else setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, debateOpen, premiumOpen, openLifeSubgroup]);

  // 드롭다운 닫힐 때 서브 그룹 상태도 초기화
  useEffect(() => {
    if (!open && openLifeSubgroup) setOpenLifeSubgroup(null);
  }, [open, openLifeSubgroup]);

  // 드롭다운 닫힐 때 AI 라운드테이블 아코디언도 접기
  useEffect(() => {
    if (!open && debateOpen) setDebateOpen(false);
  }, [open, debateOpen]);

  // 드롭다운 닫힐 때 프리미엄 AI 아코디언도 접기
  useEffect(() => {
    if (!open && premiumOpen) setPremiumOpen(false);
  }, [open, premiumOpen]);

  const handleSelect = (m: MainMode) => {
    setOpen(false);
    if (m !== currentMode) setTimeout(() => onChange(m), 40);
  };

  const handleSelectSub = (sub: DebateSubMode) => {
    setOpen(false);
    setTimeout(() => onSelectDebateSub?.(sub), 40);
  };

  const handleSelectPremium = (domainId: PremiumDomainId) => {
    setOpen(false);
    if (onSelectPremiumDomain) {
      setTimeout(() => onSelectPremiumDomain(domainId), 40);
    } else {
      setTimeout(() => onChange('premium_main'), 40);
    }
  };

  const closeFloatingSubmenus = () => {
    setPremiumOpen(false);
    setDebateOpen(false);
    setOpenLifeSubgroup(null);
  };

  const handlePanelClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!premiumOpen && !debateOpen && !openLifeSubgroup) return;

    const target = event.target as HTMLElement;
    const isInteractive = target.closest(
      'button,a,input,textarea,select,[role="menuitem"],[data-floating-submenu="true"]',
    );
    if (isInteractive) return;

    closeFloatingSubmenus();
  };

  const handleSelectAssistantTool = (cardId: string) => {
    setOpen(false);
    setTimeout(() => onSelectAssistantCard?.(cardId), 40);
  };

  const handleSelectLifeTool = (toolId: string) => {
    setOpen(false);
    if (onSelectLifeTool) {
      setTimeout(() => onSelectLifeTool(toolId), 40);
    } else {
      // 폴백: 일반 채팅으로 이동 (핸들러 미연결 시)
      if (currentMode !== 'general') setTimeout(() => onChange('general'), 40);
    }
  };

  const handleSelectPlayerTool = (toolId: string) => {
    setOpen(false);
    if (onSelectPlayerTool) {
      setTimeout(() => onSelectPlayerTool(toolId), 40);
    } else {
      if (currentMode !== 'general') setTimeout(() => onChange('general'), 40);
    }
  };

  /* ── 즐겨찾기 별 — 아이템 hover 시 우상단 노출, 켜면 히어로 좌상단 칩으로
   * (useFavoriteModes, FavoriteChips 와 동일 id 계약. 2026-07-05). ── */
  const handleToggleFav = (entry: FavEntry) => {
    const result = toggleFavRaw(entry);
    if (result === 'full') {
      toast(`즐겨찾기 칩은 ${MAX_FAVS}개까지예요`, {
        description: '기존 칩을 하나 해제하고 다시 시도해주세요.',
      });
    } else if (result === 'added') {
      toast(`'${entry.label}' — 아래 즐겨찾기 독에 꽂았어요`, {
        description: '메인 화면 좌측 상단 칩에도 함께 떠요.',
      });
    }
  };

  const withFavStar = (entry: FavEntry, node: ReactNode) => {
    const faved = isFav(entry.id);
    return (
      <div key={entry.id} className="group/fav relative">
        {node}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleToggleFav(entry); }}
          aria-label={faved ? `${entry.label} 즐겨찾기 해제` : `${entry.label} 즐겨찾기 등록`}
          className={cn(
            'absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-100',
            faved
              ? 'opacity-100 text-amber-400'
              : 'opacity-0 group-hover/fav:opacity-100 bg-[hsl(var(--card))] text-muted-foreground shadow-sm ring-1 ring-[hsl(var(--hairline))] hover:text-amber-400 hover:ring-amber-300',
          )}
        >
          <Star size={14} className={faved ? 'fill-amber-400' : undefined} />
        </button>
      </div>
    );
  };

  const renderModeItem = (m: MainMode) => {
    const Icon = MODE_ICON[m];
    const tint = MODE_TINT[m];
    const isActive = m === currentMode;
    return withFavStar(
      { id: `mode-${m}`, label: labels[m] ?? m, desc: MODE_DESCRIPTION[m], tint, target: { kind: 'mode', mode: m } },
      <button
        type="button"
        onClick={() => handleSelect(m)}
        role="menuitem"
        style={{ '--row-tint': tint } as CSSProperties}
        className={cn(
          'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
          'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
          isActive && 'bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
        )}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
          style={{
            backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
            color: tint,
          }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.1 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {labels[m]}
          </span>
          {MODE_DESCRIPTION[m] && (
            <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
              {MODE_DESCRIPTION[m]}
            </span>
          )}
        </span>
      </button>,
    );
  };

  /** 플레이어 도구 아이템 — 라이프와 동일한 이모지 기반 포맷. */
  const renderPlayerToolItem = (tool: typeof PLAYER_TOOLS[number]) => withFavStar(
    { id: `player-${tool.id}`, label: tool.label, desc: tool.desc, tint: tool.tint, target: { kind: 'player', toolId: tool.id } },
    <button
      type="button"
      onClick={() => handleSelectPlayerTool(tool.id)}
      role="menuitem"
      style={{ '--row-tint': tool.tint } as CSSProperties}
      className="group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]"
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
        style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)` }}
      >
        <span className="text-[16px] leading-none select-none">{tool.emoji}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">{tool.label}</span>
        {tool.desc && <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">{tool.desc}</span>}
      </span>
    </button>,
  );

  /** 어시스턴트 개별 도구를 mode 아이템과 동일한 형태로 렌더. */
  /** 라이프·재미 도구 아이템 — 이모지 기반 아이콘 + 각자 고유 tint. */
  const renderLifeToolItem = (tool: typeof LIFE_TOOLS[number]) => withFavStar(
    { id: `life-${tool.id}`, label: tool.label, desc: tool.desc, tint: tool.tint, target: { kind: 'life', toolId: tool.id } },
    <button
      type="button"
      onClick={() => handleSelectLifeTool(tool.id)}
      role="menuitem"
      style={{ '--row-tint': tool.tint } as CSSProperties}
      className={cn(
        'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
        'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
      )}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
        style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)`, color: tool.tint }}
      >
        {tool.icon
          ? (() => { const ToolIcon = tool.icon; return <ToolIcon className="h-[18px] w-[18px]" strokeWidth={1.9} />; })()
          : <span className="text-[16px] leading-none select-none">{tool.emoji}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">
          {tool.label}
        </span>
        {tool.desc && (
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {tool.desc}
          </span>
        )}
      </span>
    </button>,
  );

  const renderFloatingSubmenu = ({
    side = 'right',
    tint,
    ariaLabel,
    children,
  }: {
    /** bottom — 칩 바로 아래로 (라이프처럼 오른쪽 가장자리 컬럼에서 좌우가 잘릴 때). */
    side?: 'left' | 'right' | 'bottom';
    tint: string;
    ariaLabel: string;
    children: ReactNode;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ transformOrigin: side === 'bottom' ? 'top center' : side === 'right' ? 'top left' : 'top right' }}
      className={cn(
        'absolute z-50 rounded-xl border border-[hsl(var(--hairline))]',
        'bg-[hsl(var(--card))] p-1.5 shadow-[0_18px_48px_-28px_hsl(var(--foreground)/0.42)]',
        'ring-1 ring-black/[0.03] dark:ring-white/[0.05]',
        side === 'bottom'
          ? 'left-0 top-[calc(100%+6px)] w-full min-w-[260px]'
          : side === 'right'
            ? 'top-0 w-[272px] left-[calc(100%+8px)]'
            : 'top-0 w-[272px] right-[calc(100%+8px)]',
      )}
      role="menu"
      data-floating-submenu="true"
      aria-label={ariaLabel}
    >
      <span
        className={cn(
          'absolute rounded-full',
          side === 'bottom'
            ? '-top-[5px] left-4 h-1 w-8'
            : side === 'right'
              ? 'top-3 h-8 w-1 -left-[5px]'
              : 'top-3 h-8 w-1 -right-[5px]',
        )}
        style={{ backgroundColor: tint }}
        aria-hidden
      />
      <div className="space-y-0.5">
        {children}
      </div>
    </motion.div>
  );

  /** 라이프 서브 그룹 칩 — 클릭 시 오른쪽 컬럼을 유지한 채 옆 미니 패널을 띄움. */
  const renderLifeGroupChip = (groupId: LifeSubgroupId) => {
    const group = LIFE_SUBGROUPS[groupId];
    // aiplay 는 PLAYER_TOOLS 사용, 그 외는 LIFE_TOOLS
    const count = groupId === 'aiplay'
      ? PLAYER_TOOLS.length
      : LIFE_TOOLS.filter((t) => t.group === groupId).length;
    // 그룹 소속 도구가 0개면 칩 자체를 숨김 (데이터 정합성)
    if (count === 0) return null;
    const isOpen = openLifeSubgroup === groupId;
    return (
      <div key={`life-group-${groupId}`} className="relative">
        <button
          type="button"
          onClick={() => {
            setPremiumOpen(false);
            setDebateOpen(false);
            setOpenLifeSubgroup((current) => current === groupId ? null : groupId);
          }}
          role="menuitem"
          style={{ '--row-tint': group.tint } as CSSProperties}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className={cn(
            'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
            'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
            isOpen && 'bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
          )}
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
            style={{ backgroundColor: `color-mix(in oklab, ${group.tint} 12%, transparent)`, color: group.tint }}
          >
            {group.icon
              ? (() => { const GroupIcon = group.icon; return <GroupIcon className="h-[18px] w-[18px]" strokeWidth={1.9} />; })()
              : <span className="text-[16px] leading-none select-none">{group.emoji}</span>}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn('block text-[12.5px] leading-tight truncate', isOpen ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
              {group.label}
            </span>
            <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
              {group.description}
            </span>
          </span>
          <ChevronRight className={cn('h-3.5 w-3.5 text-muted-foreground/70 shrink-0 transition-transform duration-200', isOpen && 'rotate-90 text-foreground')} />
        </button>

        <AnimatePresence>
          {isOpen && renderFloatingSubmenu({
            side: 'bottom',
            tint: group.tint,
            ariaLabel: `${group.label} 세부 선택`,
            children: (
              <>
                {groupId === 'aiplay'
                  ? PLAYER_TOOLS.map(renderPlayerToolItem)
                  : LIFE_TOOLS.filter((t) => t.group === groupId).map(renderLifeToolItem)}
                {groupId === 'fortune' && onOpenMentalTests && (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setTimeout(() => onOpenMentalTests(), 40); }}
                    role="menuitem"
                    className="group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]"
                  >
                    <span
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
                      style={{ backgroundColor: `color-mix(in oklab, hsl(45 90% 55%) 14%, transparent)` }}
                    >
                      <span className="text-[16px] leading-none select-none">✨</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">
                        심리 테스트 모음
                      </span>
                      <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
                        테토·에겐·에니어그램·휴먼디자인…
                      </span>
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                  </button>
                )}
              </>
            ),
          })}
        </AnimatePresence>
      </div>
    );
  };

  /** 독 칩 아이콘 — FavEntry.target 에서 원본 아이템의 아이콘/이모지를 복원. */
  const favVisual = (entry: FavEntry): ReactNode => {
    const t = entry.target;
    if (t.kind === 'mode') { const Icon = MODE_ICON[t.mode] as LucideIcon | undefined; return Icon ? <Icon className="h-[17px] w-[17px]" strokeWidth={2} /> : <Star size={16} />; }
    if (t.kind === 'debate') { const d = DEBATE_SUBS.find((s) => s.key === t.sub); const Icon = d?.icon; return Icon ? <Icon className="h-[17px] w-[17px]" strokeWidth={2} /> : <Star size={16} />; }
    if (t.kind === 'premium') { const p = PREMIUM_AI_TOOLS.find((x) => x.key === t.domainId); const Icon = p?.icon; return Icon ? <Icon className="h-[17px] w-[17px]" strokeWidth={2} /> : <Star size={16} />; }
    if (t.kind === 'assistant') { const a = ASSISTANT_TILES.find((x) => x.cardId === t.cardId); const Icon = a?.icon; return Icon ? <Icon className="h-[17px] w-[17px]" strokeWidth={2} /> : <Star size={16} />; }
    if (t.kind === 'life') {
      const l = LIFE_TOOLS.find((x) => x.id === t.toolId);
      if (l?.icon) { const LifeIcon = l.icon; return <LifeIcon className="h-[17px] w-[17px]" strokeWidth={2} />; }
      return <span className="select-none text-[17px] leading-none">{l?.emoji ?? '✨'}</span>;
    }
    if (t.kind === 'player') { const p = PLAYER_TOOLS.find((x) => x.id === t.toolId); return <span className="select-none text-[17px] leading-none">{p?.emoji ?? '🎮'}</span>; }
    const h = HUB_TOOLS.find((x) => x.id === t.hubId);
    if (h?.icon) { const HubIcon = h.icon; return <HubIcon className="h-[17px] w-[17px]" strokeWidth={2} />; }
    return <span className="select-none text-[17px] leading-none">{h?.emoji ?? '📄'}</span>;
  };

  /** 독 칩 클릭 — 원본 아이템과 같은 동작으로 라우팅. */
  const openFav = (entry: FavEntry) => {
    const t = entry.target;
    if (t.kind === 'mode') { handleSelect(t.mode); return; }
    if (t.kind === 'debate') { handleSelectSub(t.sub); return; }
    if (t.kind === 'premium') { handleSelectPremium(t.domainId); return; }
    if (t.kind === 'assistant') { handleSelectAssistantTool(t.cardId); return; }
    if (t.kind === 'life') { handleSelectLifeTool(t.toolId); return; }
    if (t.kind === 'player') { handleSelectPlayerTool(t.toolId); return; }
    const route: Record<string, string> = { today: '/today', notes: '/notes', planner: '/planner', journal: '/journal', career: '/career', travel: '/journal?view=travel', people: '/people', archive: '/archive', health: '/health', cloud: '/cloud' };
    const r = route[t.hubId];
    if (r) { setOpen(false); navigate(r); return; }
    // 연결이 없어진 레거시 즐겨찾기(준비중 방 등) — 클릭 시 자동 정리.
    removeFav(entry.id);
    toast('연결이 없어진 즐겨찾기를 정리했어요');
  };

  /* renderAssistantTile 제거 (2026-07-12) — 하단 밴드가 즐겨찾기 독으로 바뀌며 미사용. */

  const renderAssistantToolItem = (tool: typeof ASSISTANT_FEATURED_TOOLS[number]) => {
    const Icon = tool.icon;
    const isActive = currentMode === 'assistant' && currentAssistantCard === tool.cardId;
    return (
      <button
        key={`tool-${tool.cardId}`}
        type="button"
        onClick={() => handleSelectAssistantTool(tool.cardId)}
        role="menuitem"
        className={cn(
          'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
          'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
          isActive && 'bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
        )}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
          style={{
            backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)`,
            color: tool.tint,
          }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.1 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {tool.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {tool.desc}
          </span>
        </span>
      </button>
    );
  };

  /** 토론 서브 항목을 일반 모드 아이템과 동일한 형태로 렌더. */
  const renderDebateSubItem = (sub: typeof DEBATE_SUBS[number]) => {
    const tint = sub.tint;
    const Icon = sub.icon;
    const isActive = currentMode === 'debate' && currentDebateSub === sub.key;
    return withFavStar(
      { id: `debate-${sub.key}`, label: sub.label, desc: sub.desc, tint, target: { kind: 'debate', sub: sub.key } },
      <button
        type="button"
        onClick={() => handleSelectSub(sub.key)}
        role="menuitem"
        style={{ '--row-tint': sub.tint } as CSSProperties}
        className={cn(
          'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
          'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
          isActive && 'bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
        )}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
          style={{
            backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
            color: tint,
          }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.1 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {sub.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {sub.desc}
          </span>
        </span>
      </button>,
    );
  };

  const renderPremiumToolItem = (tool: typeof PREMIUM_AI_TOOLS[number]) => {
    const Icon = tool.icon;
    const isActive = currentMode === 'premium_main' && currentPremiumDomain === tool.key;
    return withFavStar(
      { id: `premium-${tool.key}`, label: tool.label, desc: tool.desc, tint: tool.tint, target: { kind: 'premium', domainId: tool.key } },
      <button
        type="button"
        onClick={() => handleSelectPremium(tool.key)}
        role="menuitem"
        style={{ '--row-tint': tool.tint } as CSSProperties}
        className={cn(
          'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
          'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
          isActive && 'bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
        )}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
          style={{
            backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)`,
            color: tool.tint,
          }}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.1 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {tool.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {tool.desc}
          </span>
        </span>
      </button>,
    );
  };

  const pillClass = cn(
    'group flex items-center gap-1.5 h-7 pl-2 pr-2 rounded-full transition-[background-color,border-color,color] duration-200',
    'text-[11.5px] font-medium tracking-tight',
    'border',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    showPlayerBg
      ? 'bg-slate-900/70 border-slate-700 text-white hover:bg-slate-900/90'
      : 'bg-[hsl(var(--card))] border-[hsl(var(--hairline))] hover:border-[hsl(var(--border))]',
  );

  return (
    <div ref={rootRef} className="relative">
      {/* Pill — 제자리에 유지, 여닫기 토글만 수행 */}
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className={pillClass}
        style={!showPlayerBg ? { color: currentTint } : undefined}
      >
        <CurrentIcon className="h-3 w-3 shrink-0" strokeWidth={2.2} />
        <span className="whitespace-nowrap font-semibold">{labels[effective]}</span>
        <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
        {open && (
          <>
            {/* 바깥 클릭 캐치 — dim·블러 없이 투명 (2026-07-05: 뒤가 흐려지지
             * 않는 평범한 드롭다운 느낌). */}
            <motion.div
              key="backdrop"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[115]"
              aria-hidden
            />

            {/* 드롭다운 — 뷰포트 상단 고정, max-h 로 항상 한 화면.
                방향 없는 fade + 미세 scale 로 전체가 같이 등장하는 느낌. */}
            <motion.div
              key="dropdown"
              id={menuId}
              ref={panelRef}
              onClick={handlePanelClick}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              role="menu"
              aria-label="모드 전환"
              style={{
                // 좌상단 고정 — 여는 pill 의 왼쪽 변과 세로 정렬 (2026-07-05).
                position: 'fixed',
                top: 56,
                left: anchorLeft,
                transformOrigin: 'top left',
                maxHeight: 'calc(100vh - 72px)',
                // 히어로 글래스 문법 — 반투명 + blur (칩 캡슐·입력창과 동일 재질).
                backgroundColor: 'hsl(var(--card) / 0.92)',
                backdropFilter: 'blur(20px) saturate(160%)',
                WebkitBackdropFilter: 'blur(20px) saturate(160%)',
              }}
              className={cn(
                'z-[120]',
                // dim 이 없어진 만큼 패널 스스로 경계가 서야 함 — 보더 강화 + 사이즈 업.
                'w-[1350px] max-w-[calc(100vw-32px)] rounded-2xl overflow-y-auto overflow-x-hidden',
                'border border-slate-300/80 dark:border-slate-600/80',
                'ring-1 ring-black/[0.04] dark:ring-white/[0.06]',
                'shadow-[0_24px_70px_-18px_hsl(220_20%_5%_/_0.35),0_4px_18px_-8px_hsl(220_20%_5%_/_0.18)]',
              )}
            >
            {/* 5 컬럼 그리드 (2026-07-12 확장):
                  Col 1: 계정·사용량 (row-span-2)
                  Col 2: 대화        →  Col 3: 시뮬레이션
                       └ 노트 (col2-3 col-span-2 row-2)
                  Col 4-5: 라이프 (col-span-2 row-span-2, 각 칸 3개씩 풀 카드) */}
            {/* 좌측 계정 칸은 고정 290px — 균등 5분할 시 홀쭉해지는 문제 방지. 나머지 4칸 균등. */}
            {/* 좌측 258px + 콘텐츠 4칸 ~243px — 좌측 살짝 줄이고 카드 살짝 넓힘 (2026-07-12) */}
            <div className="grid grid-cols-[258px_repeat(4,minmax(0,1fr))] grid-rows-[auto_1fr] gap-x-5 px-5 pt-5 pb-1">
              {/* 좌측 컬럼 (TODAY): row-span-2 — 우측 노트 영역까지 풀 높이 */}
              {SHOW_TODAY_COL && (
              <div className="row-span-2 min-w-0 flex flex-col space-y-2">
                <div className="px-1 -mt-1">
                  <QuickSearchBar variant="inline" />
                </div>
                {/* 좌측 사이드바 탭 바 — iOS Segmented Control 스타일 */}
                <div className="flex gap-0 px-1 py-0.5 bg-muted/40 rounded-full">
                  {[
                    { id: 'today'         as const, icon: Home,     label: '오늘' },
                    { id: 'recent'        as const, icon: History,  label: '대화' },
                    { id: 'pins'          as const, icon: Star,     label: '즐겨찾기' },
                    { id: 'notifications' as const, icon: Bell,     label: '알림', badge: unreadCount },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isActive = leftTab === t.id;
                    const badgeCount = 'badge' in t ? t.badge : 0;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        title={t.label}
                        onClick={() => {
                          setLeftTab(t.id);
                          if (t.id === 'notifications' && badgeCount > 0) {
                            setTimeout(() => markAllRead(), 500);
                          }
                        }}
                        className={cn(
                          'group relative flex-1 flex items-center justify-center h-5 rounded-full transition-colors z-10',
                          isActive
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground/80',
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 relative z-10" strokeWidth={isActive ? 2.2 : 1.8} />
                        {badgeCount > 0 && (
                          <span className="absolute top-0.5 right-1 flex h-3 min-w-[12px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8.5px] font-bold text-white leading-none z-20">
                            {badgeCount > 9 ? '9+' : badgeCount}
                          </span>
                        )}
                        {isActive && (
                          <span
                            className="absolute inset-0 rounded-full bg-[hsl(var(--card))] shadow-sm ring-1 ring-[hsl(var(--hairline))]"
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* 탭 콘텐츠 — AnimatePresence 로 전환 */}
                <div className="flex-1 min-h-0 relative">
                  <AnimatePresence mode="wait" initial={false}>
                {leftTab === 'today' && (<motion.div
                  key="tab-today"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  className="p-2.5 rounded-xl space-y-2 h-full"
                >
                  {/* 시계 hero (좌) + 요일/날짜 (우, 우측 정렬) — 한 줄 가로 분할.
                      transform translate-y 로 시각적으로만 위로 이동 (달력 등 다른 요소 위치 영향 X). */}
                  <div className="-translate-y-1 flex items-start justify-between gap-2">
                    <div className="text-[28px] font-semibold tracking-tighter leading-none text-foreground tabular-nums">
                      {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </div>
                    <div className="mt-0 text-right leading-tight">
                      <div className="text-[11px] font-mono uppercase tracking-[0.14em] font-semibold text-foreground/80">
                        {['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}요일
                      </div>
                      <div className="mt-0.5 text-[9.5px] font-mono uppercase tracking-[0.1em] text-muted-foreground tabular-nums whitespace-nowrap">
                        {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일
                      </div>
                    </div>
                  </div>
                  {/* 월간 달력 — hairline 만 시각적으로 위로 (달력 본체 위치는 그대로). */}
                  <div className="border-t border-[hsl(var(--hairline))] -translate-y-1" aria-hidden />
                  <div className="pt-px">
                    <div className="grid grid-cols-7 gap-0.5 text-center">
                      {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                        <div
                          key={`mh-${d}`}
                          className={cn(
                            'text-[8.5px] font-mono uppercase tracking-[0.08em]',
                            i === 0 && 'text-rose-500/70',
                            i === 6 && 'text-blue-500/70',
                            i !== 0 && i !== 6 && 'text-muted-foreground/60',
                          )}
                        >
                          {d}
                        </div>
                      ))}
                      {(() => {
                        const year = now.getFullYear();
                        const month = now.getMonth();
                        const firstOfMonth = new Date(year, month, 1);
                        const startOffset = firstOfMonth.getDay();
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
                        return Array.from({ length: totalCells }, (_, i) => {
                          const dayNum = i - startOffset + 1;
                          const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                          if (!isValid) {
                            return <div key={`md-${i}`} className="h-5" aria-hidden />;
                          }
                          const date = new Date(year, month, dayNum);
                          const isToday = date.toDateString() === now.toDateString();
                          const dow = date.getDay();
                          return (
                            <div
                              key={`md-${i}`}
                              className={cn(
                                'flex items-center justify-center h-5 text-[10px] tabular-nums rounded-full',
                                isToday && 'font-semibold text-foreground',
                                !isToday && dow === 0 && 'text-rose-500/80',
                                !isToday && dow === 6 && 'text-blue-500/80',
                                !isToday && dow !== 0 && dow !== 6 && 'text-foreground/70',
                              )}
                              style={isToday ? { backgroundColor: `color-mix(in oklab, hsl(262 70% 55%) 22%, transparent)` } : undefined}
                            >
                              {dayNum}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                  {/* 다음 일정 + 오늘 할 일 — 통합 플래너 실시간 데이터 (Phase 5) */}
                  <div className="pt-2 border-t border-[hsl(var(--hairline))] space-y-2.5">
                    {/* 다음 일정 — 한 줄 컴팩트 */}
                    {upcomingEvent ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          navigate('/planner');
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]/40 transition-colors"
                      >
                        <span className="text-[10px] shrink-0" aria-hidden>🔔</span>
                        <span className="text-[10px] font-mono font-semibold tabular-nums text-blue-600 dark:text-blue-400 leading-none shrink-0">
                          {new Date(upcomingEvent.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <span className="text-[11.5px] font-medium text-foreground truncate leading-none flex-1 text-left">
                          {upcomingEvent.title}
                        </span>
                        <span className="text-[9.5px] text-muted-foreground leading-none shrink-0 font-medium">
                          {(() => {
                            const diff = Math.round((new Date(upcomingEvent.startAt).getTime() - Date.now()) / 60_000);
                            if (diff < 60) return `${diff}분 후`;
                            if (diff < 60 * 24) return `${Math.round(diff / 60)}시간 후`;
                            return `${Math.round(diff / 60 / 24)}일 후`;
                          })()}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          navigate('/planner');
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]/40 transition-colors text-left"
                      >
                        <span className="text-[10px] shrink-0" aria-hidden>🔔</span>
                        <span className="text-[11px] text-muted-foreground leading-tight flex-1">
                          다음 일정 없음
                        </span>
                        <span className="text-[9.5px] text-muted-foreground/80 leading-none shrink-0">
                          + 추가
                        </span>
                      </button>
                    )}

                    {/* 오늘 할 일 */}
                    <div>
                      <div className="mb-1 flex items-center justify-between pl-0.5 pr-2">
                        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground font-semibold">
                          ✓ 오늘 할 일
                          {todayTasks.length > 0 && (
                            <span className="ml-1.5 text-muted-foreground/80 tabular-nums">
                              {todayTasks.length}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            navigate('/planner');
                          }}
                          className="text-[9.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 transition-colors font-medium"
                        >
                          + 추가
                        </button>
                      </div>
                      <div className="space-y-0.5 max-h-[96px] overflow-y-auto pr-0.5">
                        {todayTasks.length === 0 ? (
                          <p className="text-[10.5px] text-muted-foreground text-center py-3">
                            오늘 할 일이 없어요
                          </p>
                        ) : (
                          todayTasks.slice(0, 5).map((task) => (
                            <button
                              key={task.id}
                              type="button"
                              onClick={() => taskStore.toggleDone(task.id)}
                              className="w-full flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]/40 cursor-pointer transition-colors text-left"
                              aria-label={`${task.title} 완료`}
                            >
                              <span
                                className="h-3 w-3 rounded border border-[hsl(var(--hairline))] shrink-0 transition-colors"
                                aria-hidden
                              />
                              {task.startAt && (
                                <span className="text-[9.5px] font-mono tabular-nums text-muted-foreground shrink-0 font-semibold">
                                  {new Date(task.startAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </span>
                              )}
                              <span className="text-[11px] leading-tight flex-1 truncate text-foreground">
                                {task.title}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>)}

                {leftTab === 'recent' && (<motion.div
                  key="tab-recent"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  className="space-y-1"
                >
                  <div className="mb-1.5 px-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      최근 사용
                    </span>
                  </div>
                  {recentModes.length === 0 ? (
                    <div className="px-3 py-6 rounded-xl bg-muted/30 text-center">
                      <History className="h-5 w-5 mx-auto mb-2 text-muted-foreground/50" strokeWidth={1.5} />
                      <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                        아직 사용 기록이 없어요.<br />
                        모드를 선택하면 여기에 기록돼요.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5 px-1">
                      {recentModes.slice(0, 5).map((m) => {
                        const ago = (() => {
                          const d = Math.floor((Date.now() - m.at) / 60_000);
                          if (d < 1) return '방금';
                          if (d < 60) return `${d}분 전`;
                          if (d < 1440) return `${Math.floor(d / 60)}시간 전`;
                          return `${Math.floor(d / 1440)}일 전`;
                        })();
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => {
                              setOpen(false);
                              setTimeout(() => {
                                if (m.target.kind === 'mode') {
                                  if (currentMode !== m.target.mode) onChange(m.target.mode);
                                } else if (m.target.kind === 'life') {
                                  if (currentMode !== 'general') onChange('general');
                                  onSelectLifeTool?.(m.target.toolId);
                                } else if (m.target.kind === 'assistant') {
                                  if (currentMode !== 'assistant') onChange('assistant');
                                  onSelectAssistantCard?.(m.target.cardId);
                                } else if (m.target.kind === 'player') {
                                  onSelectPlayerTool?.(m.target.toolId);
                                }
                              }, 40);
                            }}
                            className="group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]"
                          >
                            <span
                              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
                              style={{ backgroundColor: `color-mix(in oklab, ${m.tint} 12%, transparent)` }}
                            >
                              <span className="text-[14px] leading-none select-none">{m.emoji}</span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12px] leading-tight truncate font-medium text-foreground/90">
                                {m.label}
                              </span>
                              <span className="block text-[9.5px] text-muted-foreground truncate mt-0.5">
                                {ago}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>)}

                {leftTab === 'pins' && (<motion.div
                  key="tab-pins"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  className="space-y-2.5"
                >
                  {(['platform', 'external'] as const).map((sec) => {
                    const items = QUICK_PINS.filter((p) => p.section === sec);
                    if (items.length === 0) return null;
                    return (
                      <div key={sec}>
                        <div className="mb-1 px-1">
                          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                            {sec === 'platform' ? '⭐ 내 기능' : '🔗 사이트'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5 px-1">
                          {items.map((pin) => (
                            <button
                              key={pin.id}
                              type="button"
                              title={pin.label}
                              aria-label={pin.label}
                              onClick={() => {
                                if (pin.target.type === 'external') {
                                  window.open(pin.target.url, '_blank', 'noopener,noreferrer');
                                } else if (pin.target.type === 'assistant') {
                                  setOpen(false);
                                  setTimeout(() => {
                                    if (pin.target.type === 'assistant') onSelectAssistantCard?.(pin.target.cardId);
                                    if (currentMode !== 'assistant') onChange('assistant');
                                  }, 40);
                                } else if (pin.target.type === 'player') {
                                  setOpen(false);
                                  setTimeout(() => {
                                    if (pin.target.type === 'player') onSelectPlayerTool?.(pin.target.toolId);
                                  }, 40);
                                } else if (pin.target.type === 'life') {
                                  setOpen(false);
                                  setTimeout(() => {
                                    if (currentMode !== 'general') onChange('general');
                                    if (pin.target.type === 'life') onSelectLifeTool?.(pin.target.toolId);
                                  }, 40);
                                }
                              }}
                              className={cn(
                                'group relative flex flex-col items-center justify-center gap-1 aspect-[2/1] rounded-xl p-1',
                                'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                              )}
                              style={{ backgroundColor: `color-mix(in oklab, ${pin.tint} 10%, transparent)` }}
                            >
                              <span className="text-[18px] leading-none select-none group-hover:scale-110 transition-transform">
                                {pin.emoji}
                              </span>
                              <span className="text-[9px] font-medium text-foreground/70 truncate max-w-full">
                                {pin.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>)}

                {leftTab === 'notifications' && (<motion.div
                  key="tab-notifications"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  className="space-y-1"
                >
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      🔔 알림
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllRead()}
                        className="text-[9.5px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        모두 읽음
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5 px-1">
                    {SYSTEM_NOTIFICATIONS.map((n) => {
                      const isRead = readNotifications.has(n.id);
                      const ago = (() => {
                        const [y, m, d] = n.date.split('-').map(Number);
                        const diff = Math.floor((Date.now() - new Date(y, m - 1, d).getTime()) / 86_400_000);
                        if (diff < 1) return '오늘';
                        if (diff < 7) return `${diff}일 전`;
                        if (diff < 30) return `${Math.floor(diff / 7)}주 전`;
                        return `${Math.floor(diff / 30)}달 전`;
                      })();
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!isRead) {
                              const next = new Set(readNotifications);
                              next.add(n.id);
                              setReadNotifications(next);
                              try { window.localStorage.setItem('personai.read_notifications', JSON.stringify([...next])); } catch { /* noop */ }
                            }
                          }}
                          className={cn(
                            'flex w-full items-start gap-2 px-2 py-1.5 rounded-lg text-left transition-colors',
                            'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                          )}
                        >
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-md shrink-0 mt-0.5 relative"
                            style={{ backgroundColor: `color-mix(in oklab, ${n.tint} 14%, transparent)` }}
                          >
                            <span className="text-[13px] leading-none select-none">{n.emoji}</span>
                            {!isRead && (
                              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cn('block text-[11.5px] leading-tight truncate', isRead ? 'font-medium text-foreground/70' : 'font-semibold text-foreground')}>
                              {n.title}
                            </span>
                            <span className="block text-[9.5px] text-muted-foreground/80 truncate mt-0.5">
                              {n.desc}
                            </span>
                            <span className="block text-[9px] text-muted-foreground/60 mt-0.5 font-mono uppercase tracking-wider">
                              {ago}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>)}
                  </AnimatePresence>
                </div>
                {/* 로그인 줄 — 프로필 (TODAY 카드 바로 아래, 자연 배치).
                    ※ Supabase 미연동 환경에서도 UI 가 보이도록 실 유저 없으면 '데모 사용자' 로 대체. */}
                <div className="py-1 border-t border-[hsl(var(--hairline))]">
                  {(() => {
                    const isReal = !!user;
                    const displayEmail = user?.email ?? 'demo@personai.kr';
                    const displayName = displayEmail.split('@')[0];
                    const displayPlan = profile?.plan ?? 'free';
                    const initialChar = displayEmail[0]?.toUpperCase() ?? 'U';
                    const hueA = (displayEmail.charCodeAt(0) ?? 65) * 7 % 360;
                    const hueB = (displayEmail.charCodeAt(1) ?? 66) * 11 % 360;
                    return (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)] transition-colors"
                          >
                            <span
                              className="flex h-6 w-6 items-center justify-center rounded-full shrink-0 text-[10px] font-semibold text-white"
                              style={{
                                background: `linear-gradient(135deg, hsl(${hueA} 70% 55%), hsl(${hueB} 70% 50%))`,
                              }}
                            >
                              {initialChar}
                            </span>
                            <span className="min-w-0 flex-1 flex items-center gap-1.5">
                              <span className="text-[11.5px] font-medium text-foreground/90 truncate">
                                {displayName}
                              </span>
                              <span className={cn(
                                'text-[9px] font-semibold uppercase tracking-wider px-1 py-0.5 rounded-full leading-none shrink-0',
                                displayPlan === 'pro'     && 'bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-600 dark:text-indigo-300',
                                displayPlan === 'premium' && 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-300',
                                displayPlan === 'free'    && 'bg-muted text-muted-foreground',
                              )}>
                                {displayPlan}
                              </span>
                            </span>
                            <Settings className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="top" className="w-56 z-[125]">
                          <DropdownMenuLabel className="flex flex-col gap-0.5 pb-2">
                            <span className="text-[12px] font-semibold truncate">{displayEmail}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {displayPlan} 플랜 {!isReal && '· 데모'}
                            </span>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {isReal ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => { setOpen(false); setTimeout(() => navigate('/admin'), 40); }}
                                className="cursor-pointer"
                              >
                                <UserIcon className="h-3.5 w-3.5 mr-2" />
                                <span className="text-[12px]">계정 관리</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={async () => { setOpen(false); await signOut(); }}
                                className="cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-700"
                              >
                                <LogOut className="h-3.5 w-3.5 mr-2" />
                                <span className="text-[12px]">로그아웃</span>
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => { setOpen(false); setTimeout(() => navigate('/auth'), 40); }}
                              className="cursor-pointer"
                            >
                              <LogIn className="h-3.5 w-3.5 mr-2" />
                              <span className="text-[12px]">실제 로그인 / 가입</span>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    );
                  })()}
                </div>
              </div>
              )}
              {/* 좌측 정보 컬럼 — 계정 · 오늘 사용량 · 지금 컨텍스트 (2026-07-05). */}
              {!SHOW_TODAY_COL && (() => {
                const isReal = !!user;
                const displayEmail = user?.email ?? 'demo@personai.kr';
                const displayName = displayEmail.split('@')[0];
                const displayPlan = profile?.plan ?? 'free';
                const initialChar = displayEmail[0]?.toUpperCase() ?? 'U';
                const hueA = (displayEmail.charCodeAt(0) ?? 65) * 7 % 360;
                const hueB = (displayEmail.charCodeAt(1) ?? 66) * 11 % 360;
                const budget = PLAN_DAILY_TOKEN_BUDGET[displayPlan] ?? PLAN_DAILY_TOKEN_BUDGET.free;
                const usedRatio = Math.min(1, todayUsage.totalTokens / budget);
                const topModels = Object.entries(todayUsage.byModel)
                  .map(([name, v]) => ({ name, tokens: v.inputTokens + v.outputTokens }))
                  .sort((a, b) => b.tokens - a.tokens)
                  .slice(0, 3);
                const maxModelTokens = topModels[0]?.tokens || 1;
                const currentBrand = BRAND_BY_ID[currentBrandId as keyof typeof BRAND_BY_ID];
                return (
                  <div className="row-span-2 min-w-0 flex flex-col gap-2">
                    {/* 계정 카드 — 아바타 + 플랜 뱃지 + 관리 드롭다운. */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ring-1 ring-[hsl(var(--hairline))] transition-colors hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]"
                        >
                          <span
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                            style={{ background: `linear-gradient(135deg, hsl(${hueA} 70% 55%), hsl(${hueB} 70% 45%))` }}
                          >
                            {initialChar}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-semibold text-foreground">{displayName}</span>
                            <span className="block truncate text-[10px] text-muted-foreground">{displayEmail}</span>
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
                              displayPlan === 'pro' && 'bg-gradient-to-r from-indigo-500/15 to-purple-500/15 text-indigo-600 dark:text-indigo-300',
                              displayPlan === 'premium' && 'bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-300',
                              displayPlan === 'free' && 'bg-muted text-muted-foreground',
                            )}
                          >
                            {displayPlan}
                          </span>
                          <Settings className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" side="bottom" className="w-56 z-[125]">
                        <DropdownMenuLabel className="flex flex-col gap-0.5 pb-2">
                          <span className="text-[12px] font-semibold truncate">{displayEmail}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {displayPlan} 플랜 {!isReal && '· 데모'}
                          </span>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {isReal ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => { setOpen(false); setTimeout(() => navigate('/admin'), 40); }}
                              className="cursor-pointer"
                            >
                              <UserIcon className="h-3.5 w-3.5 mr-2" />
                              <span className="text-[12px]">계정 관리</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={async () => { setOpen(false); await signOut(); }}
                              className="cursor-pointer text-rose-600 dark:text-rose-400 focus:text-rose-700"
                            >
                              <LogOut className="h-3.5 w-3.5 mr-2" />
                              <span className="text-[12px]">로그아웃</span>
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => { setOpen(false); setTimeout(() => navigate('/auth'), 40); }}
                            className="cursor-pointer"
                          >
                            <LogIn className="h-3.5 w-3.5 mr-2" />
                            <span className="text-[12px]">실제 로그인 / 가입</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* 북마크 위젯 제거 (2026-07-12) — 하단 ★ 즐겨찾기 독으로 통합. */}

                    {/* 오늘 사용량 — 호출·비용 + 토큰/일일 예산 게이지 + 모델 TOP3. */}
                    <div className="rounded-xl px-2.5 py-2.5 ring-1 ring-[hsl(var(--hairline))]">
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-[12px] font-bold tracking-[-0.01em] text-foreground/85">오늘 사용량</span>
                        <span className="text-[10px] tabular-nums text-muted-foreground">{todayUsage.entries}회 · {fmtUsd(todayUsage.costUsd)}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-[20px] font-semibold leading-none tabular-nums text-foreground">{fmtTokens(todayUsage.totalTokens)}</span>
                        <span className="text-[10px] text-muted-foreground">/ {fmtTokens(budget)} 토큰</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(2, usedRatio * 100)}%`,
                            backgroundColor: usedRatio > 0.85 ? 'hsl(0 72% 55%)' : usedRatio > 0.6 ? 'hsl(35 90% 50%)' : 'hsl(160 60% 42%)',
                          }}
                        />
                      </div>
                      <div className="mt-1 text-[9px] text-muted-foreground/70">플랜 기준 일일 예산 · 초과해도 차단되지 않아요</div>
                      {topModels.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {topModels.map((m) => (
                            <div key={m.name} className="flex items-center gap-1.5">
                              <span className="w-[76px] shrink-0 truncate text-[9.5px] text-muted-foreground">{m.name}</span>
                              <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                                <span
                                  className="block h-full rounded-full bg-foreground/30"
                                  style={{ width: `${(m.tokens / maxModelTokens) * 100}%` }}
                                />
                              </span>
                              <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/80">{fmtTokens(m.tokens)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 지금 — 현재 모드 · 선택된 AI (모드창 맥락 확인용). */}
                    <div className="rounded-xl px-2.5 py-2.5 ring-1 ring-[hsl(var(--hairline))]">
                      <div className="mb-1.5 text-[12px] font-bold tracking-[-0.01em] text-foreground/85">지금</div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11.5px] text-foreground/90">
                          <span className="w-[30px] shrink-0 text-[10px] text-muted-foreground">모드</span>
                          <span className="truncate font-medium">{labels[currentMode] ?? currentMode}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11.5px] text-foreground/90">
                          <span className="w-[30px] shrink-0 text-[10px] text-muted-foreground">AI</span>
                          <span className="truncate font-medium">
                            {currentBrand ? `${currentBrand.name} · ${currentModel?.name ?? ''}` : String(currentBrandId)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* Col 2 = 대화, Col 3 = 시뮬레이션 — 각자 독립 컬럼 (row-start-1 row 1 고정) */}
              {[0, 1].map((idx) => {
                    const group = MODE_GROUPS[idx];
                    const isExpert = group.label === '시뮬레이션';
                    const isConversation = group.label === '대화';
                    const isAssistant = false;
                    const colClass = idx === 0 ? 'col-start-2' : 'col-start-3';
                    return (
                      <div key={group.label} className={cn(colClass, 'row-start-1 min-w-0 flex flex-col')}>
                        {/* 헤더 — 색 바 + 15px 제목 + 밑괘선 (커리어 보드 섹션 문법) */}
                        <div className="mb-2.5 flex items-center gap-2 border-b border-[hsl(var(--foreground)/0.18)] px-2 pb-2">
                          <span aria-hidden className="h-[14px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: group.tint }} />
                          <span className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
                            {group.label}
                          </span>
                        </div>

                        {/* 대화 그룹: 프리미엄 AI는 레이아웃을 밀지 않는 옆 미니 패널로 확장 */}
                        {isConversation ? (
                          <div className="relative overflow-visible">
                            <motion.div
                              key="conversation-main"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                              className="space-y-0.5"
                            >
                              {group.modes.flatMap((m) => {
                                if (m === 'premium_main') {
                                  const isPremiumActive = currentMode === 'premium_main';
                                  return [
                                    /* 나만의 AI — 자리 예약 (봇 스튜디오, 준비 중) */
                                    <div key="my-ai-placeholder" className="relative">
                                      <button
                                        type="button"
                                        role="menuitem"
                                        aria-disabled="true"
                                        className="flex w-full cursor-default items-center gap-2.5 rounded-lg px-2 py-2 text-left opacity-50"
                                      >
                                        <span
                                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110"
                                          style={{ backgroundColor: 'color-mix(in oklab, hsl(262 70% 55%) 12%, transparent)' }}
                                        >
                                          <Bot className="h-[18px] w-[18px]" strokeWidth={1.9} style={{ color: 'hsl(262 70% 55%)' }} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-[12.5px] font-medium leading-tight text-foreground/90">나만의 AI</span>
                                          <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">내 전문가를 만들어 대화 · 준비 중</span>
                                        </span>
                                      </button>
                                    </div>,
                                    <div key="premium-drill-trigger" className="relative">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDebateOpen(false);
                                          setOpenLifeSubgroup(null);
                                          setPremiumOpen((v) => !v);
                                        }}
                                        role="menuitem"
                                        style={{ '--row-tint': MODE_TINT.premium_main } as CSSProperties}
                                        aria-haspopup="menu"
                                        aria-expanded={premiumOpen}
                                        className={cn(
                                          'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
                                          'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                                          (isPremiumActive || premiumOpen) && 'bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                                        )}
                                      >
                                        <span
                                          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
                                          style={{
                                            backgroundColor: `color-mix(in oklab, ${MODE_TINT.premium_main} 12%, transparent)`,
                                            color: MODE_TINT.premium_main,
                                          }}
                                        >
                                          <Gem className="h-[18px] w-[18px]" strokeWidth={isPremiumActive ? 2.1 : 1.8} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className={cn('block text-[12.5px] leading-tight truncate', isPremiumActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                                            프리미엄 AI
                                          </span>
                                          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
                                            법률 · 세무 · 투자 · 심층 리서치
                                          </span>
                                        </span>
                                        <ChevronRight className={cn('h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-200', premiumOpen && 'rotate-90 text-foreground')} aria-hidden />
                                      </button>

                                      <AnimatePresence>
                                        {premiumOpen && renderFloatingSubmenu({
                                          side: 'bottom',
                                          tint: MODE_TINT.premium_main,
                                          ariaLabel: '프리미엄 AI 세부 선택',
                                          children: [
                                            ...PREMIUM_AI_TOOLS.map(renderPremiumToolItem),
                                            /* 심층 리서치 — 대화 컬럼 최상위에서 프리미엄 안으로 이동 (2026-07-12) */
                                            <div key="premium-research-sep" className="mx-2 my-1 border-t border-[hsl(var(--hairline))]" aria-hidden />,
                                            <button
                                              key="premium-research"
                                              type="button"
                                              onClick={() => handleSelect('research_main')}
                                              role="menuitem"
                                              style={{ '--row-tint': MODE_TINT.research_main } as CSSProperties}
                                              className={cn(
                                                'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                                                currentMode === 'research_main' && 'bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                                              )}
                                            >
                                              <span
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110"
                                                style={{
                                                  backgroundColor: `color-mix(in oklab, ${MODE_TINT.research_main} 12%, transparent)`,
                                                  color: MODE_TINT.research_main,
                                                }}
                                              >
                                                <FlaskConical className="h-3.5 w-3.5" strokeWidth={currentMode === 'research_main' ? 2.2 : 1.8} />
                                              </span>
                                              <span className="min-w-0 flex-1">
                                                <span className={cn('block truncate text-[12.5px] leading-tight', currentMode === 'research_main' ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                                                  심층 리서치
                                                </span>
                                                <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                                                  멀티 AI 교차 검증 리포트
                                                </span>
                                              </span>
                                            </button>,
                                          ],
                                        })}
                                      </AnimatePresence>
                                    </div>,
                                  ];
                                }
                                return [renderModeItem(m)];
                              })}
                            </motion.div>
                          </div>
                        ) : isExpert ? (
                          <div className="relative overflow-visible">
                            <motion.div
                              key="expert-main"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                              className="space-y-0.5"
                            >
                              {/* 전문 그룹 메인 뷰 — 하위 선택은 옆 미니 패널로 통일 */}
                              {group.modes.flatMap((m) => {
                                if (m === 'debate') {
                                  const isDebateActive = currentMode === 'debate';
                                  return [
                                    <div key="debate-drill-trigger" className="relative">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPremiumOpen(false);
                                          setOpenLifeSubgroup(null);
                                          setDebateOpen((v) => !v);
                                        }}
                                        role="menuitem"
                                        style={{ '--row-tint': MODE_TINT.debate } as CSSProperties}
                                        aria-haspopup="menu"
                                        aria-expanded={debateOpen}
                                        className={cn(
                                          'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
                                          'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                                          (isDebateActive || debateOpen) && 'bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                                        )}
                                      >
                                        <span
                                          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
                                          style={{
                                            backgroundColor: `color-mix(in oklab, ${MODE_TINT.debate} 12%, transparent)`,
                                            color: MODE_TINT.debate,
                                          }}
                                        >
                                          <Swords className="h-[18px] w-[18px]" strokeWidth={isDebateActive ? 2.1 : 1.8} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className={cn('block text-[12.5px] leading-tight truncate', isDebateActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                                            AI 라운드테이블
                                          </span>
                                          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
                                            찬반 · 자유 · 심층 · 브레인스토밍
                                          </span>
                                        </span>
                                        <ChevronRight className={cn('h-3 w-3 text-muted-foreground shrink-0 transition-transform duration-200', debateOpen && 'rotate-90 text-foreground')} aria-hidden />
                                      </button>

                                      <AnimatePresence>
                                        {debateOpen && renderFloatingSubmenu({
                                          side: 'bottom',
                                          tint: MODE_TINT.debate,
                                          ariaLabel: 'AI 라운드테이블 세부 선택',
                                          children: DEBATE_SUBS.map(renderDebateSubItem),
                                        })}
                                      </AnimatePresence>
                                    </div>,
                                    /* 나만의 AI 컴퍼니 — 자리 예약 (봇 팀 프로젝트, 준비 중) */
                                    <div key="ai-company-placeholder" className="relative">
                                      <button
                                        type="button"
                                        role="menuitem"
                                        aria-disabled="true"
                                        className="flex w-full cursor-default items-center gap-2.5 rounded-lg px-2 py-2 text-left opacity-50"
                                      >
                                        <span
                                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110"
                                          style={{ backgroundColor: 'color-mix(in oklab, hsl(215 70% 45%) 12%, transparent)' }}
                                        >
                                          <Building2 className="h-[18px] w-[18px]" strokeWidth={1.9} style={{ color: 'hsl(215 70% 45%)' }} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                          <span className="block truncate text-[12.5px] font-medium leading-tight text-foreground/90">나만의 AI 컴퍼니</span>
                                          <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">봇 팀을 꾸려 프로젝트 위임 · 준비 중</span>
                                        </span>
                                      </button>
                                    </div>,
                                  ];
                                }
                                return [renderModeItem(m)];
                              })}
                            </motion.div>
                          </div>
                        ) : isAssistant ? (
                          <div className="space-y-0.5">
                            {ASSISTANT_FEATURED_TOOLS.map(renderAssistantToolItem)}
                            <div className="my-1 mx-2 border-t border-[hsl(var(--hairline))]" aria-hidden />
                            <button
                              type="button"
                              onClick={() => handleSelect('assistant')}
                              role="menuitem"
                              className="group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)] text-muted-foreground hover:text-foreground"
                            >
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110 bg-[hsl(var(--surface-2))] text-muted-foreground">
                                <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                              </span>
                              <span className="min-w-0 flex-1 flex items-center gap-1.5">
                                <span className="text-[12px] font-medium">도구 더 보기</span>
                                <span className="text-[10px] font-mono text-muted-foreground/80 bg-[hsl(var(--surface-2))] px-1.5 py-0.5 rounded-full">
                                  +11
                                </span>
                              </span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            {group.modes.flatMap((m) => [renderModeItem(m)])}
                          </div>
                        )}
                      </div>
                    );
                  })}
              {/* 노트 (Col 2-3, Row 2): 계획 / 기록 2 sub-col 좌우 분할.
                  단일 헤더가 두 컬럼 위에 spans. */}
              <div className="col-start-2 col-span-2 row-start-2 min-w-0 flex flex-col mt-6">
                <div className="mb-2.5 flex items-center gap-2 border-b border-[hsl(var(--foreground)/0.18)] px-2 pb-2">
                  <span aria-hidden className="h-[14px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: 'hsl(150 55% 42%)' }} />
                  <span className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
                    마이스페이스
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3">
                  {(['정리', '기록'] as HubAxis[]).map((axis) => (
                    <div key={axis} className="space-y-0.5">
                      {HUB_TOOLS.filter((t) => t.axis === axis).map((item) => {
                        const node = (
                        <button
                          type="button"
                          aria-disabled={item.pending || undefined}
                          style={{ '--row-tint': item.tint } as CSSProperties}
                          onClick={() => {
                            if (item.pending) return; // 자리만 예약 — 이름·설계 미정
                            if (item.mode) { handleSelect(item.mode); return; } // 스터디룸·회의록 — 모드 전환
                            // v1 라우팅 = notes / wiki / planner / journal / career / cloud. 다른 도구는 아직 no-op.
                            if (item.id === 'notes') {
                              setOpen(false);
                              navigate('/notes');
                            } else if (item.id === 'planner') {
                              setOpen(false);
                              navigate('/planner');
                            } else if (item.id === 'journal') {
                              setOpen(false);
                              navigate('/journal');
                            } else if (item.id === 'career') {
                              setOpen(false);
                              navigate('/career');
                            } else if (item.id === 'travel') {
                              setOpen(false);
                              navigate('/journal?view=travel');
                            } else if (item.id === 'people') {
                              setOpen(false);
                              navigate('/people');
                            } else if (item.id === 'archive') {
                              setOpen(false);
                              navigate('/archive');
                            } else if (item.id === 'health') {
                              setOpen(false);
                              navigate('/health');
                            } else if (item.id === 'today') {
                              setOpen(false);
                              navigate('/today');
                            }
                          }}
                          role="menuitem"
                          className={cn(
                            'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
                            item.pending ? 'cursor-default opacity-50' : 'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                          )}
                        >
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-150 group-hover:scale-110"
                            style={{ backgroundColor: `color-mix(in oklab, ${item.tint} 12%, transparent)`, color: item.tint }}
                          >
                            {item.icon
                              ? (() => { const ItemIcon = item.icon; return <ItemIcon className="h-[18px] w-[18px]" strokeWidth={1.9} />; })()
                              : <span className="text-[16px] leading-none select-none">{item.emoji}</span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">
                              {item.label}
                            </span>
                            <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
                              {item.desc}
                            </span>
                          </span>
                        </button>
                        );
                        // 준비중(pending) 자리는 ★ 없이 — 즐겨찾기에 못 꽂게
                        if (item.pending) return <div key={`hub-${item.id}`}>{node}</div>;
                        return withFavStar(
                          item.mode
                            ? { id: `mode-${item.mode}`, label: item.label, desc: item.desc, tint: item.tint, target: { kind: 'mode', mode: item.mode } }
                            : { id: `hub-${item.id}`, label: item.label, desc: item.desc, tint: item.tint, target: { kind: 'hub', hubId: item.id } },
                          node,
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* 라이프 (Col 4): row-span-2 풀 높이 — 재미·건강·생활 + featured 캐릭터/게임 */}
              <div className="col-start-4 col-span-2 row-start-1 min-w-0 flex flex-col">
                <div>
                  <div className="mb-2.5 flex items-center gap-2 border-b border-[hsl(var(--foreground)/0.18)] px-2 pb-2">
                    <span aria-hidden className="h-[14px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: 'hsl(25 85% 55%)' }} />
                    <span className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
                      {LIFE_GROUP.label}
                    </span>
                  </div>
                  <div className="relative overflow-visible">
                    <motion.div
                      key="life-main"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                      className="grid grid-cols-2 gap-x-3"
                    >
                      {/* 4·5번째 칸에 풀 카드 3개씩 — 도구(쇼핑)는 직행, 그룹은 옆 미니 패널 */}
                      {LIFE_DROPDOWN_ENTRIES.map((entry) => {
                        if (entry.kind === 'tool') {
                          const tool = LIFE_TOOLS.find((t) => t.id === entry.toolId);
                          return tool ? renderLifeToolItem(tool) : null;
                        }
                        if (entry.kind === 'group') {
                          return renderLifeGroupChip(entry.groupId);
                        }
                        return null; // 'mental-tests' — 드롭다운 그리드에는 미노출
                      })}
                    </motion.div>
                  </div>
                </div>

              </div>

              {/* ── 어시스턴트 — 실무 도구 (col 4-5 · 2행 — 노트와 표제선 수평 정렬) ── */}
              <div className="col-start-4 col-span-2 row-start-2 mt-6 min-w-0 flex flex-col">
                  <div className="mb-2.5 flex items-center gap-2 border-b border-[hsl(var(--foreground)/0.18)] px-2 pb-2">
                    <span aria-hidden className="h-[14px] w-[3px] shrink-0 rounded-full" style={{ backgroundColor: 'hsl(330 65% 52%)' }} />
                    <span className="text-[15px] font-bold tracking-[-0.01em] text-foreground">AI 스튜디오 · 어시스턴트</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3">
                    {ASSISTANT_TILES.slice(0, 5).map((tile) => {
                      const Icon = tile.icon;
                      const inner = (
                        <button
                          type="button"
                          aria-disabled={tile.placeholder || undefined}
                          onClick={() => { if (!tile.placeholder) handleSelectAssistantTool(tile.cardId); }}
                          role="menuitem"
                          style={{ '--row-tint': tile.tint } as CSSProperties}
                          className={cn(
                            'group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
                            tile.placeholder ? 'cursor-default opacity-50' : 'hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]',
                          )}
                        >
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110"
                            style={{ backgroundColor: `color-mix(in oklab, ${tile.tint} 12%, transparent)`, color: tile.tint }}
                          >
                            <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[12.5px] font-medium leading-tight text-foreground/90">{tile.label}</span>
                            <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                              {tile.placeholder ? `${tile.desc} · 준비 중` : tile.desc}
                            </span>
                          </span>
                        </button>
                      );
                      if (tile.placeholder) return <div key={`ac-${tile.cardId}`}>{inner}</div>;
                      return withFavStar(
                        { id: `assistant-${tile.cardId}`, label: tile.label, desc: tile.desc, tint: tile.tint, target: { kind: 'assistant', cardId: tile.cardId } },
                        inner,
                      );
                    })}
                    {/* 6번째 칸 — 모든 도구 (어시스턴트 브라우즈 진입, 구 "도구 더 보기") */}
                    {withFavStar(
                      { id: 'mode-assistant', label: '모든 도구', desc: '요약·글쓰기·엑셀 등 전부', tint: 'hsl(220 10% 46%)', target: { kind: 'mode', mode: 'assistant' } },
                      <button
                        type="button"
                        onClick={() => handleSelect('assistant')}
                        role="menuitem"
                        style={{ '--row-tint': 'hsl(220 10% 46%)' } as CSSProperties}
                        className="group flex w-full items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-[color-mix(in_oklab,var(--row-tint,hsl(var(--foreground)/0.55))_12%,transparent)]"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform duration-150 group-hover:scale-110"
                          style={{ backgroundColor: 'color-mix(in oklab, hsl(220 10% 46%) 12%, transparent)', color: 'hsl(220 10% 46%)' }}
                        >
                          <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={1.9} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium leading-tight text-foreground/90">모든 도구</span>
                          <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">요약·글쓰기·엑셀 등 전부</span>
                        </span>
                        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden />
                      </button>,
                    )}
                  </div>
              </div>
            </div>

            {/* ── 바텀 독 — ★ 즐겨찾기 (개인 바로가기. 북마크 위젯 통합, 2026-07-12) ── */}
            <div className="border-t border-[hsl(var(--hairline))]" aria-hidden />
            <div className="px-5 py-3.5">
              <div className="mb-2.5 flex items-center gap-2 px-1">
                <Star size={15} className="shrink-0 fill-amber-400 text-amber-400" aria-hidden />
                <span className="text-[15px] font-bold tracking-[-0.01em] text-foreground">
                  즐겨찾기
                </span>
                {onOpenBookmarks && (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setTimeout(() => onOpenBookmarks(), 40); }}
                    className="ml-auto text-[10.5px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    북마크 관리
                  </button>
                )}
              </div>
              <div className="grid grid-cols-6 gap-2">
                  {favs.length === 0 && (
                    <div className="col-span-5 flex h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[hsl(var(--hairline))] text-[11.5px] text-muted-foreground/60">
                      <Star size={12} />
                      메뉴 항목 위의 별을 누르면 여기에 꽂혀요 (최대 {MAX_FAVS}개)
                    </div>
                  )}
                  {favs.map((f) => (
                    <div key={f.id} className="group/dock relative">
                      <button
                        type="button"
                        onClick={() => openFav(f)}
                        role="menuitem"
                        title={f.desc ?? f.label}
                        className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left transition-all duration-150 hover:-translate-y-0.5"
                        style={{ backgroundColor: `color-mix(in oklab, ${f.tint} 10%, transparent)` }}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center" style={{ color: f.tint }}>
                          {favVisual(f)}
                        </span>
                        <span className="min-w-0 truncate text-[12.5px] font-semibold text-foreground/85">{f.label}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFav(f.id); }}
                        aria-label={`${f.label} 즐겨찾기 해제`}
                        className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--card))] text-[9px] leading-none text-muted-foreground opacity-0 ring-1 ring-[hsl(var(--hairline))] transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/dock:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {favs.length > 0 && Array.from({ length: Math.max(0, MAX_FAVS - favs.length) }).map((_, i) => (
                    <div
                      key={`dock-ghost-${i}`}
                      className="flex h-11 items-center justify-center rounded-xl border border-dashed border-[hsl(var(--hairline))] text-muted-foreground/35"
                      aria-hidden
                    >
                      <Star size={12} />
                    </div>
                  ))}
                  {/* 6번째 칸 — 추천 스포트라이트 (NEW/HOT). 즐겨찾기와 같은 칩 문법 + 배지. */}
                  {spotlightPick ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openFav({ id: spotlightPick.id, label: spotlightPick.label, tint: spotlightPick.tint, target: spotlightPick.target })}
                        role="menuitem"
                        title={`추천 — ${spotlightPick.label}`}
                        className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-left transition-all duration-150 hover:-translate-y-0.5"
                        style={{ backgroundColor: `color-mix(in oklab, ${spotlightPick.tint} 10%, transparent)` }}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center" style={{ color: spotlightPick.tint }}>
                          {favVisual({ id: spotlightPick.id, label: spotlightPick.label, tint: spotlightPick.tint, target: spotlightPick.target })}
                        </span>
                        <span className="min-w-0 truncate text-[12.5px] font-semibold text-foreground/85">{spotlightPick.label}</span>
                      </button>
                      <span
                        className={cn(
                          'pointer-events-none absolute -top-1.5 right-2 rounded-full px-1.5 py-px text-[8px] font-bold tracking-wide text-white',
                          spotlightPick.badge === 'HOT' ? 'bg-[hsl(8_85%_55%)]' : 'bg-[hsl(217_91%_55%)]',
                        )}
                      >
                        {spotlightPick.badge}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="flex h-11 items-center justify-center rounded-xl border border-dashed border-[hsl(var(--hairline))] text-muted-foreground/35"
                      aria-hidden
                    >
                      <Star size={12} />
                    </div>
                  )}
                </div>
            </div>
          </motion.div>
          </>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
