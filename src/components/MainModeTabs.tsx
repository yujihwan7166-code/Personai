/**
 * 메인 모드 네비 — "Eyebrow Pill" 패턴.
 *
 * 페이지 헤더 메타로서의 모드 표시. 작은 pill + 드롭다운 패널.
 * 드롭다운은 8개 주요 모드만 노출, AI 토론은 하위(찬반/자유/심층/브레인) 인라인 표시.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle, GitMerge, Shield, Sparkles, Swords, Wrench,
  FlaskConical, BookOpen, ChevronDown, ChevronRight, ChevronLeft, MessagesSquare, Telescope,
  Globe, Presentation, Mic, ArrowRight, Users, Wand2, Files,
  Languages, PenLine, BookText, FileSpreadsheet,
  Calculator, Timer, Settings, LogIn, LogOut, User as UserIcon,
  Home, Star, History, Bell,
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

import type { MainMode, DebateSubMode } from '@/types/expert';
import { cn } from '@/lib/utils';
import { QuickSearchBar } from './QuickSearchBar';

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
  /** AI 토론 하위 (찬반/자유/심층/브레인) 선택 콜백. */
  onSelectDebateSub?: (sub: DebateSubMode) => void;
  /** 현재 어시스턴트 카드 id (toggle 표시용). */
  currentAssistantCard?: string | null;
  /** 어시스턴트 도구 (번역/문서/PPT/음성) 빠른 선택 콜백. */
  onSelectAssistantCard?: (cardId: string) => void;
  /** 라이프·재미 도구 (사주/타로/연애/운동 등) 선택 콜백. 없으면 일반 채팅으로 폴백. */
  onSelectLifeTool?: (toolId: string) => void;
  /** 멘탈 테스트 모음 페이지 트리거 — 드롭다운 mental 그룹 서브 뷰에서 호출. */
  onOpenMentalTests?: () => void;
  /** 플레이어 도구 (캐릭터챗/게임/롤플레이 등) 선택 콜백. */
  onSelectPlayerTool?: (toolId: string) => void;
}

/** 라이프 서브 그룹 — 드롭다운에서 여러 도구를 한 칩으로 묶는 단위. */
export type LifeSubgroupId = 'fortune' | 'mental' | 'health' | 'money' | 'enjoy';

export const LIFE_SUBGROUPS: Record<LifeSubgroupId, { emoji: string; label: string; description: string; tint: string }> = {
  fortune: { emoji: '🔮', label: '사주·타로',         description: '사주·타로·꿈·토정 등',              tint: 'hsl(262 70% 55%)' },
  mental:  { emoji: '🧠', label: '멘탈 테스트',       description: 'MBTI·자가체크·심리 테스트',         tint: 'hsl(210 60% 55%)' },
  health:  { emoji: '🩺', label: '건강 도우미',       description: '운동·영양제·수면·식단',              tint: 'hsl(170 60% 42%)' },
  money:   { emoji: '💰', label: '머니·투자·재테크', description: '가계부·세금·투자·대출·부동산·노후', tint: 'hsl(130 55% 40%)' },
  enjoy:   { emoji: '🎉', label: '놀고·먹고·즐기고',    description: '여행·맛집·놀거리·볼거리·데이트',    tint: 'hsl(25 85% 55%)' },
};

/** 라이프 그룹 도구 정의 — 엔터테인먼트·건강·생활 통합. */
export const LIFE_TOOLS: Array<{
  id: string;
  label: string;
  desc?: string;
  emoji: string;
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
  { id: 'naming',     label: '이름 풀이·작명', desc: '사람·아기·반려·브랜드',     emoji: '✍️', tint: 'hsl(160 45% 45%)', featured: false, group: 'fortune'   },
  { id: 'past-life',  label: '나의 전생',     desc: '전생 직업·시대·이야기',     emoji: '👤', tint: 'hsl(280 40% 48%)', featured: false, group: 'fortune'   },
  { id: 'dating',     label: '연애 코치',     desc: '썸·데이트·이별 조언',       emoji: '💌', tint: 'hsl(350 80% 62%)', featured: true                       },
  // ── 건강 도우미 그룹 ──
  { id: 'workout',    label: '운동 코치',     desc: '홈트·헬스·요가 루틴',       emoji: '💪', tint: 'hsl(155 65% 45%)', featured: false, group: 'health'    },
  { id: 'supplement', label: '영양제 추천',   desc: '증상·목표별 영양제 조합',   emoji: '💊', tint: 'hsl(100 55% 42%)', featured: false, group: 'health'    },
  { id: 'sleep',      label: '수면 코치',     desc: '불면·취침 루틴·수면 일지',  emoji: '💤', tint: 'hsl(225 55% 55%)', featured: false, group: 'health'    },
  { id: 'meal-plan',  label: '식단 관리',     desc: '목표별 식단·칼로리·알러지', emoji: '🥗', tint: 'hsl(95 60% 42%)',  featured: false, group: 'health'    },
  { id: 'stretching', label: '자세·스트레칭', desc: '거북목·허리·하체 루틴',     emoji: '🧎', tint: 'hsl(180 55% 42%)', featured: false, group: 'health'    },
  { id: 'checkup',    label: '건강검진 해석', desc: '수치·소견 쉬운 해설',       emoji: '🩺', tint: 'hsl(170 60% 38%)', featured: false, group: 'health'    },
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
  { kind: 'group', groupId: 'fortune' },   // 🔮 사주·타로
  { kind: 'group', groupId: 'mental' },    // 🧠 멘탈 테스트
  { kind: 'mental-tests' },                // ✨ 심리 테스트 모음
  { kind: 'group', groupId: 'health' },    // 🩺 건강 도우미
  { kind: 'group', groupId: 'money' },     // 💰 머니·투자·재테크
  { kind: 'group', groupId: 'enjoy' },     // 🎉 놀고·먹고·즐기고
];

/** 드롭다운 노출용 featured 서브셋. */
export const LIFE_TOOLS_FEATURED = LIFE_TOOLS.filter((t) => t.featured);

/** 단일 라이프 그룹 (재미·건강·생활 통합). 드롭다운과 모달에서 header 에 사용. */
export const LIFE_GROUP = {
  label: '라이프',
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

export const MODE_ICON: Record<MainMode, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  general:          MessageCircle,
  multi:            GitMerge,
  brainstorm_main:  Sparkles,
  stakeholder_main: Users,
  premium_main:     Shield,
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

/** 사용자 요청 목록에 맞춘 그룹핑. 'debate' 는 전문 그룹 내부에서 드릴다운으로 노출. */
export const MODE_GROUPS: Array<{ label: string; description: string; modes: MainMode[] }> = [
  { label: '대화',  description: '질문하고 답받기',       modes: ['general', 'multi', 'research_main'] },
  { label: '전문',  description: '자문 · 학습 · 토론',    modes: ['study_main', 'premium_main', 'stakeholder_main', 'debate'] },
];

export const MODE_DESCRIPTION: Partial<Record<MainMode, string>> = {
  general:          'AI 를 골라 1:1 대화',
  multi:            '여러 AI 답변 비교',
  debate:           '찬반·자유·심층·브레인스토밍',
  stakeholder_main: '이해관계자 역할극 시뮬레이션',
  research_main:    '멀티 AI 교차 검증 리포트',
  premium_main:     '법률·의료·금융 자문',
  study_main:       '공부 노트북·퀴즈·팟캐스트',
  assistant:        '전체 도구 브라우즈',
};

/** 어시스턴트 드롭다운 직행 도구 3개. 파일 변환 등 나머지는 "도구 더 보기" 에서만 노출. */
export const ASSISTANT_FEATURED_TOOLS: Array<{
  cardId: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: string;
}> = [
  { cardId: 'image-gen',      label: '이미지·동영상', desc: '프롬프트로 생성',      icon: Wand2,        tint: 'hsl(32 95% 50%)' },
  { cardId: 'voice-analysis', label: '음성 분석',     desc: '음성→텍스트·요약',     icon: Mic,          tint: 'hsl(330 65% 52%)' },
  { cardId: 'ppt',            label: 'PPT 생성',      desc: '프레젠테이션 자동',     icon: Presentation, tint: 'hsl(160 60% 40%)' },
];

/** 스카이워크 타일 (좌측 컬럼 하단 2x4 = 8개) — 실무 도구 즉석 진입.
 *  placeholder:true 인 타일은 임시 cardId (아직 ASSISTANT_CARDS 미등록 상태) — dim 처리로 "준비 중" 시그널. */
export const ASSISTANT_TILES: Array<{
  cardId: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: string;
  placeholder?: boolean;
}> = [
  { cardId: 'image-gen',      label: '이미지·영상', icon: Wand2,           tint: 'hsl(340 70% 55%)' },
  { cardId: 'voice-analysis', label: '음성',        icon: Mic,             tint: 'hsl(210 70% 55%)' },
  { cardId: 'ppt',            label: 'PPT',         icon: Presentation,    tint: 'hsl(28 80% 55%)'  },
  { cardId: 'file-convert',   label: '파일 변환',   icon: Files,           tint: 'hsl(280 60% 55%)' },
  { cardId: 'translate',      label: '번역',        icon: Languages,       tint: 'hsl(170 65% 45%)' },
  { cardId: 'writing',        label: '글쓰기',      icon: PenLine,         tint: 'hsl(45 80% 50%)',  placeholder: true },
  { cardId: 'summarize',      label: '요약',        icon: BookText,        tint: 'hsl(200 55% 50%)', placeholder: true },
  { cardId: 'spreadsheet',    label: '엑셀·표',     icon: FileSpreadsheet, tint: 'hsl(135 55% 42%)', placeholder: true },
];

/** 좌측 컬럼 — 날씨 위젯 (v1 하드코드, v2 API 연동). */
export const WEATHER_WIDGET = {
  city: '서울',
  temp: 13,
  condition: '맑음',
  emoji: '☀️',
  tint: 'hsl(210 70% 55%)',
};

/** 좌측 컬럼 — 미세먼지 위젯 (v1 하드코드, v2 에어코리아 API). */
type DustGrade = '좋음' | '보통' | '나쁨' | '매우나쁨';
export const DUST_WIDGET: {
  pm10: number;
  pm10Grade: DustGrade;
  pm25: number;
  pm25Grade: DustGrade;
} = {
  pm10: 33,
  pm10Grade: '좋음',
  pm25: 18,
  pm25Grade: '보통',
};
export const DUST_GRADE_COLOR: Record<DustGrade, string> = {
  '좋음':     'text-blue-500',
  '보통':     'text-emerald-500',
  '나쁨':     'text-amber-500',
  '매우나쁨': 'text-rose-500',
};

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
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
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

/** 하위 호환 — 기존 import 유지 (사용 중단 예정). */
export const MARKET_TICKERS: Array<never> = [];
export const EXCHANGE_RATES: Array<never> = [];

/** 토론 서브모드 정의 — 각자 독립 항목으로 논의 그룹에 직접 노출. 각자 고유 색. */
export const DEBATE_SUBS: Array<{
  key: DebateSubMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  tint: string;
}> = [
  { key: 'procon',     label: '찬반토론',     desc: '찬성 · 반대 구조',    icon: Swords,         tint: 'hsl(var(--mode-debate-b))' },     // red — 대립
  { key: 'freetalk',   label: '자유토론',     desc: '정해진 형식 없이',    icon: MessagesSquare, tint: 'hsl(188 85% 40%)' },               // cyan — 자유로움
  { key: 'standard',   label: '심층토론',     desc: '다각도 분석',         icon: Telescope,      tint: 'hsl(var(--mode-research))' },      // navy — 깊이
  { key: 'brainstorm', label: '브레인스토밍', desc: '아이디어 발산',       icon: Sparkles,       tint: 'hsl(var(--mode-study))' },         // amber — 번뜩임
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
  onSelectPlayerTool,
}: MainModeTabsProps) {
  const [open, setOpen] = useState(false);
  /** 라이프 컬럼에서 열려 있는 서브 그룹 (null 이면 메인 뷰). */
  const [openLifeSubgroup, setOpenLifeSubgroup] = useState<LifeSubgroupId | null>(null);
  /** AI 토론 세부 뷰 — 전문 그룹 자체가 드릴다운 전환(라이프 서브그룹 패턴). */
  const [debateOpen, setDebateOpen] = useState(false);
  /** 로그인 상태 — 좌측 컬럼 로그인 줄에 사용. */
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
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
        if (debateOpen) setDebateOpen(false);
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
  }, [open, openLifeSubgroup]);

  // 드롭다운 닫힐 때 서브 그룹 상태도 초기화
  useEffect(() => {
    if (!open && openLifeSubgroup) setOpenLifeSubgroup(null);
  }, [open, openLifeSubgroup]);

  // 드롭다운 닫힐 때 AI 토론 아코디언도 접기
  useEffect(() => {
    if (!open && debateOpen) setDebateOpen(false);
  }, [open, debateOpen]);

  const handleSelect = (m: MainMode) => {
    setOpen(false);
    if (m !== currentMode) setTimeout(() => onChange(m), 40);
  };

  const handleSelectSub = (sub: DebateSubMode) => {
    setOpen(false);
    setTimeout(() => onSelectDebateSub?.(sub), 40);
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

  const renderModeItem = (m: MainMode) => {
    const Icon = MODE_ICON[m];
    const tint = MODE_TINT[m];
    const isActive = m === currentMode;
    return (
      <button
        key={m}
        type="button"
        onClick={() => handleSelect(m)}
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
          'hover:bg-[hsl(var(--accent))]',
          isActive && 'bg-[hsl(var(--accent))]',
        )}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{
            backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
            color: tint,
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
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
      </button>
    );
  };

  /** 플레이어 도구 아이템 — 라이프와 동일한 이모지 기반 포맷. */
  const renderPlayerToolItem = (tool: typeof PLAYER_TOOLS[number]) => (
    <button
      key={`player-${tool.id}`}
      type="button"
      onClick={() => handleSelectPlayerTool(tool.id)}
      role="menuitem"
      className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))]"
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
        style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)` }}
      >
        <span className="text-[15px] leading-none select-none">{tool.emoji}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">{tool.label}</span>
        {tool.desc && <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">{tool.desc}</span>}
      </span>
    </button>
  );

  /** 어시스턴트 개별 도구를 mode 아이템과 동일한 형태로 렌더. */
  /** 라이프·재미 도구 아이템 — 이모지 기반 아이콘 + 각자 고유 tint. */
  const renderLifeToolItem = (tool: typeof LIFE_TOOLS[number]) => (
    <button
      key={`life-${tool.id}`}
      type="button"
      onClick={() => handleSelectLifeTool(tool.id)}
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
        'hover:bg-[hsl(var(--accent))]',
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
        style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)` }}
      >
        <span className="text-[15px] leading-none select-none">{tool.emoji}</span>
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
    </button>
  );

  /** 라이프 서브 그룹 칩 — 클릭 시 드롭다운 라이프 컬럼이 해당 그룹 전용 뷰로 전환. */
  const renderLifeGroupChip = (groupId: LifeSubgroupId) => {
    const group = LIFE_SUBGROUPS[groupId];
    const count = LIFE_TOOLS.filter((t) => t.group === groupId).length;
    // 그룹 소속 도구가 0개면 칩 자체를 숨김 (데이터 정합성)
    if (count === 0) return null;
    return (
      <button
        key={`life-group-${groupId}`}
        type="button"
        onClick={() => setOpenLifeSubgroup(groupId)}
        role="menuitem"
        aria-haspopup="menu"
        aria-expanded={openLifeSubgroup === groupId}
        className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))]"
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{ backgroundColor: `color-mix(in oklab, ${group.tint} 12%, transparent)` }}
        >
          <span className="text-[15px] leading-none select-none">{group.emoji}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] leading-tight truncate font-medium text-foreground/90">
            {group.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {group.description}
          </span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
      </button>
    );
  };

  /** 스카이워크 타일 — 2x2 그리드, 컴팩트(세로 ~56px). 컬러 배경, 아이콘+라벨. */
  const renderAssistantTile = (tile: typeof ASSISTANT_TILES[number]) => {
    const Icon = tile.icon;
    const isActive = currentMode === 'assistant' && currentAssistantCard === tile.cardId;
    return (
      <button
        key={`tile-${tile.cardId}`}
        type="button"
        onClick={() => handleSelectAssistantTool(tile.cardId)}
        role="menuitem"
        className={cn(
          'group relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl',
          'transition-all duration-200 hover:-translate-y-0.5',
          'border border-transparent',
          tile.placeholder && 'opacity-85',
          isActive && 'ring-2 ring-offset-1 ring-[hsl(var(--ring))]',
        )}
        style={{ backgroundColor: `color-mix(in oklab, ${tile.tint} 10%, transparent)` }}
      >
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md transition-transform duration-200 group-hover:scale-110"
          style={{ color: tile.tint }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <span className="text-[10.5px] font-semibold leading-none truncate max-w-full text-foreground/85">
          {tile.label}
        </span>
      </button>
    );
  };

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
          'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
          'hover:bg-[hsl(var(--accent))]',
          isActive && 'bg-[hsl(var(--accent))]',
        )}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{
            backgroundColor: `color-mix(in oklab, ${tool.tint} 12%, transparent)`,
            color: tool.tint,
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
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

  /** 토론 서브 항목을 일반 모드 아이템과 동일한 형태로 렌더 — parent 'AI 토론' 없이 평면 구조. */
  const renderDebateSubItem = (sub: typeof DEBATE_SUBS[number]) => {
    const tint = sub.tint;
    const Icon = sub.icon;
    const isActive = currentMode === 'debate' && currentDebateSub === sub.key;
    return (
      <button
        key={sub.key}
        type="button"
        onClick={() => handleSelectSub(sub.key)}
        role="menuitem"
        className={cn(
          'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
          'hover:bg-[hsl(var(--accent))]',
          isActive && 'bg-[hsl(var(--accent))]',
        )}
      >
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
          style={{
            backgroundColor: `color-mix(in oklab, ${tint} 12%, transparent)`,
            color: tint,
          }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.2 : 1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[12.5px] leading-tight truncate', isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
            {sub.label}
          </span>
          <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
            {sub.desc}
          </span>
        </span>
      </button>
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
            {/* 배경 dim + 블러 — 클릭 시 닫힘 */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[115] bg-black/15 backdrop-blur-[2px]"
              aria-hidden
            />

            {/* 드롭다운 — 뷰포트 상단 고정, max-h 로 항상 한 화면 */}
            <motion.div
              key="dropdown"
              ref={panelRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              role="menu"
              style={{
                position: 'fixed',
                top: 56,
                left: '50%',
                translateX: '-50%',
                maxHeight: 'calc(100vh - 72px)',
              }}
              className={cn(
                'z-[120]',
                'w-[960px] max-w-[calc(100vw-32px)] rounded-2xl overflow-y-auto overflow-x-hidden',
                'bg-[hsl(var(--card))] border border-[hsl(var(--hairline))]',
                'shadow-[0_18px_60px_hsl(220_20%_5%_/_0.25)]',
              )}
            >
            {/* 4 컬럼 — 유틸리티 / 대화+전문 / 📝 노트(NEW) / 라이프 (플레이어는 하단 band 로 격하) */}
            <div className="grid grid-cols-4 gap-x-3 px-4 pt-4">
              {/* 좌측 컬럼: 빠른검색 + 일일 정보 대시보드 (시계·달력·날씨+미세·시세) */}
              <div className="min-w-0 flex flex-col space-y-2">
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
                          'group relative flex-1 flex items-center justify-center h-7 rounded-full transition-colors z-10',
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
                          <motion.span
                            layoutId="left-tab-indicator"
                            className="absolute inset-0 rounded-full bg-[hsl(var(--card))] shadow-sm ring-1 ring-[hsl(var(--hairline))]"
                            aria-hidden
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* 탭 콘텐츠 — AnimatePresence 로 전환 */}
                <div className="flex-1 min-h-0 relative">
                  <AnimatePresence mode="wait">
                {leftTab === 'today' && (<motion.div
                  key="tab-today"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  className={cn(
                    'p-2.5 rounded-xl space-y-2 bg-gradient-to-br h-full',
                    getTimeGradient(now.getHours()),
                  )}
                >
                  {/* 시계 hero (좌) + 요일/날짜 (우, 우측 정렬) — 한 줄 가로 분할 */}
                  <div className="flex items-start justify-between gap-2">
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
                  {/* 월간 달력 */}
                  <div className="pt-2 border-t border-[hsl(var(--hairline))]">
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
                            return <div key={`md-${i}`} className="h-4" aria-hidden />;
                          }
                          const date = new Date(year, month, dayNum);
                          const isToday = date.toDateString() === now.toDateString();
                          const dow = date.getDay();
                          return (
                            <div
                              key={`md-${i}`}
                              className={cn(
                                'flex items-center justify-center h-4 text-[10px] tabular-nums rounded-full',
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
                  {/* 날씨 + 미세먼지 progress bar */}
                  <div className="pt-2 border-t border-[hsl(var(--hairline))]">
                    <div className="flex items-center gap-2.5">
                      <motion.span
                        animate={{ y: [0, -2, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                        className="text-[26px] leading-none select-none inline-block"
                      >
                        {WEATHER_WIDGET.emoji}
                      </motion.span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                          {WEATHER_WIDGET.city}
                        </div>
                        <div className="text-[14px] font-semibold text-foreground/90 leading-tight mt-0.5">
                          {WEATHER_WIDGET.temp}° · {WEATHER_WIDGET.condition}
                        </div>
                      </div>
                    </div>
                    {/* 미세먼지 progress bars */}
                    <div className="mt-2 space-y-1.5">
                      {[
                        { label: '미세', value: DUST_WIDGET.pm10, max: 150, grade: DUST_WIDGET.pm10Grade },
                        { label: '초미', value: DUST_WIDGET.pm25, max: 75,  grade: DUST_WIDGET.pm25Grade },
                      ].map((d) => {
                        const pct = Math.min(100, (d.value / d.max) * 100);
                        const colorClass = DUST_GRADE_COLOR[d.grade];
                        return (
                          <div key={d.label} className="flex items-center gap-2 text-[10px]">
                            <span className="w-7 text-muted-foreground/80 font-mono uppercase tracking-[0.1em]">{d.label}</span>
                            <div className="flex-1 h-1 bg-muted/70 rounded-full overflow-hidden">
                              <motion.div
                                className={cn('h-full rounded-full', colorClass.replace('text-', 'bg-'))}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                            <span className="font-mono font-semibold text-foreground/90 tabular-nums w-6 text-right">{d.value}</span>
                            <span className={cn('text-[9px] font-medium w-10 text-right', colorClass)}>{d.grade}</span>
                          </div>
                        );
                      })}
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
                            className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))]"
                          >
                            <span
                              className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
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
                                'group relative flex flex-col items-center justify-center gap-1 aspect-square rounded-xl p-1',
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
                            'hover:bg-[hsl(var(--accent))]',
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
                <div className="pt-2 border-t border-[hsl(var(--hairline))]">
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
                            className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[hsl(var(--accent))] transition-colors"
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
              {/* 가운데 컬럼: 대화 + 전문 그룹 스택 */}
              {[[0, 1]].map((indices, colIdx) => (
                <div key={colIdx} className="min-w-0 flex flex-col space-y-3">
                  {indices.map((i) => MODE_GROUPS[i]).map((group, groupIdx) => {
                    const isExpert = group.label === '전문';
                    const isAssistant = false;
                    return (
                      <div key={group.label}>
                        {groupIdx > 0 && (
                          <div className="-mt-1 mb-2 mx-1 border-t border-[hsl(var(--hairline))]" aria-hidden />
                        )}
                        {/* 헤더 — 전문 그룹은 debateOpen 시 뒤로가기 버튼으로 전환 */}
                        <div className="mb-1.5 flex items-baseline gap-2 px-1 min-h-[16px]">
                          {isExpert && debateOpen ? (
                            <button
                              type="button"
                              onClick={() => setDebateOpen(false)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
                              aria-label="전문 메인으로"
                            >
                              <ChevronLeft className="h-3 w-3" />
                              <span>AI 토론</span>
                            </button>
                          ) : (
                            <>
                              <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                                {group.label}
                              </span>
                              <span className="text-[10.5px] text-muted-foreground/70 truncate">
                                {group.description}
                              </span>
                            </>
                          )}
                        </div>

                        {/* 전문 그룹: 드릴다운 전환 (AnimatePresence) */}
                        {isExpert ? (
                          <div className="relative overflow-hidden">
                            <AnimatePresence mode="wait" initial={false}>
                              {debateOpen ? (
                                <motion.div
                                  key="expert-debate-subs"
                                  initial={{ opacity: 0, x: 16 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 16 }}
                                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                                  className="space-y-0.5"
                                >
                                  {DEBATE_SUBS.map(renderDebateSubItem)}
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="expert-main"
                                  initial={{ opacity: 0, x: -16 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -16 }}
                                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                                  className="space-y-0.5"
                                >
                                  {/* 전문 그룹 메인 뷰 — AI 어시스턴트 컬럼 분리 이후 스페이서 불필요 */}
                                  {group.modes.flatMap((m) => {
                                    if (m === 'debate') {
                                      const isDebateActive = currentMode === 'debate';
                                      return [
                                        <button
                                          key="debate-drill-trigger"
                                          type="button"
                                          onClick={() => setDebateOpen(true)}
                                          role="menuitem"
                                          aria-haspopup="menu"
                                          aria-expanded={debateOpen}
                                          className={cn(
                                            'flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors',
                                            'hover:bg-[hsl(var(--accent))]',
                                            isDebateActive && 'bg-[hsl(var(--accent))]',
                                          )}
                                        >
                                          <span
                                            className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                                            style={{
                                              backgroundColor: `color-mix(in oklab, ${MODE_TINT.debate} 12%, transparent)`,
                                              color: MODE_TINT.debate,
                                            }}
                                          >
                                            <Swords className="h-3.5 w-3.5" strokeWidth={isDebateActive ? 2.2 : 1.8} />
                                          </span>
                                          <span className="min-w-0 flex-1">
                                            <span className={cn('block text-[12.5px] leading-tight truncate', isDebateActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90')}>
                                              AI 토론
                                            </span>
                                            <span className="block text-[10.5px] text-muted-foreground truncate mt-0.5">
                                              찬반 · 자유 · 심층 · 브레인스토밍
                                            </span>
                                          </span>
                                          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" aria-hidden />
                                        </button>,
                                      ];
                                    }
                                    return [renderModeItem(m)];
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : isAssistant ? (
                          <div className="space-y-0.5">
                            {ASSISTANT_FEATURED_TOOLS.map(renderAssistantToolItem)}
                            <div className="my-1 mx-2 border-t border-[hsl(var(--hairline))]" aria-hidden />
                            <button
                              type="button"
                              onClick={() => handleSelect('assistant')}
                              role="menuitem"
                              className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))] text-muted-foreground hover:text-foreground"
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-[hsl(var(--surface-2))] text-muted-foreground">
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
                </div>
              ))}
              {/* 3번째 컬럼: 📝 노트 — 라이프처럼 단순 메뉴 목록 (일정·할일·메모·북마크 등) */}
              <div className="min-w-0 flex flex-col space-y-3">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-2 px-1 min-h-[16px]">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      노트
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70 truncate">
                      기록 · 정리
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {([
                      { id: 'schedule', label: '일정',       desc: '오늘·이번 주 약속',       emoji: '📅', tint: 'hsl(210 70% 55%)' },
                      { id: 'todo',     label: '할 일',      desc: '오늘의 체크리스트',        emoji: '✅', tint: 'hsl(145 55% 45%)' },
                      { id: 'note',     label: '메모',       desc: '빠른 노트 · 생각 정리',    emoji: '🗒️', tint: 'hsl(45 85% 55%)'  },
                      { id: 'bookmark', label: '북마크',     desc: '저장한 링크',             emoji: '📌', tint: 'hsl(0 75% 55%)'   },
                      { id: 'saved',    label: '대화 저장',  desc: 'AI 대화 · 프롬프트',      emoji: '💾', tint: 'hsl(262 70% 55%)' },
                      { id: 'journal',  label: '일기',       desc: '오늘의 기록',             emoji: '📖', tint: 'hsl(25 85% 55%)'  },
                    ] as const).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          // v1: 드롭다운 닫고 일반 채팅 폴백. v2 에서 각자 전용 페이지·패널 연결.
                          setOpen(false);
                          setTimeout(() => {
                            if (currentMode !== 'general') onChange('general');
                          }, 40);
                        }}
                        role="menuitem"
                        className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))]"
                      >
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                          style={{ backgroundColor: `color-mix(in oklab, ${item.tint} 12%, transparent)` }}
                        >
                          <span className="text-[15px] leading-none select-none">{item.emoji}</span>
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
                    ))}
                  </div>
                </div>
              </div>
              {/* 오른쪽 컬럼: 라이프 (재미·건강·생활 통합) + 더보기 */}
              <div className="min-w-0 flex flex-col space-y-3">
                <div>
                  <div className="mb-1.5 flex items-baseline gap-2 px-1 min-h-[16px]">
                    {openLifeSubgroup ? (
                      <button
                        type="button"
                        onClick={() => setOpenLifeSubgroup(null)}
                        className="inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="라이프 메인으로"
                      >
                        <ChevronLeft className="h-3 w-3" />
                        <span>{LIFE_SUBGROUPS[openLifeSubgroup].label}</span>
                      </button>
                    ) : (
                      <>
                        <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                          {LIFE_GROUP.label}
                        </span>
                        <span className="text-[10.5px] text-muted-foreground/70 truncate">
                          {LIFE_GROUP.description}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="relative overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      {openLifeSubgroup ? (
                        <motion.div
                          key={`sub-${openLifeSubgroup}`}
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16 }}
                          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                          className="space-y-0.5"
                        >
                          {LIFE_TOOLS.filter((t) => t.group === openLifeSubgroup).map(renderLifeToolItem)}
                        </motion.div>
                      ) : (
                        <motion.div
                          key="main"
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -16 }}
                          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                          className="space-y-0.5"
                        >
                          {LIFE_DROPDOWN_ENTRIES.map((entry, idx) => {
                            if (entry.kind === 'tool') {
                              const tool = LIFE_TOOLS.find((t) => t.id === entry.toolId);
                              return tool ? renderLifeToolItem(tool) : null;
                            }
                            if (entry.kind === 'group') {
                              return renderLifeGroupChip(entry.groupId);
                            }
                            // kind === 'mental-tests' — 심리 테스트 모음 페이지 바로가기
                            if (!onOpenMentalTests) return null;
                            return (
                              <button
                                key={`life-mental-tests-${idx}`}
                                type="button"
                                onClick={() => { setOpen(false); setTimeout(() => onOpenMentalTests(), 40); }}
                                role="menuitem"
                                className="flex w-full items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors hover:bg-[hsl(var(--accent))]"
                              >
                                <span
                                  className="flex h-7 w-7 items-center justify-center rounded-md shrink-0"
                                  style={{ backgroundColor: `color-mix(in oklab, hsl(45 90% 55%) 14%, transparent)` }}
                                >
                                  <span className="text-[15px] leading-none select-none">✨</span>
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
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 플레이어 featured 2 큰 카드 — col 3-4 하단 영역 (노란색 박스) ── */}
            <div className="px-4 pb-3 grid grid-cols-4 gap-x-3">
              <div className="col-span-2" aria-hidden />
              <div className="col-span-2">
                <div className="grid grid-cols-2 gap-3">
                  {PLAYER_TOOLS.filter((t) => t.id === 'character-chat' || t.id === 'ai-game').map((tool) => (
                    <button
                      key={`player-feat-${tool.id}`}
                      type="button"
                      onClick={() => handleSelectPlayerTool(tool.id)}
                      role="menuitem"
                      className={cn(
                        'group flex flex-col items-center justify-center gap-1.5 py-5 px-3 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                      )}
                      style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 13%, transparent)` }}
                    >
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110"
                        style={{ backgroundColor: `color-mix(in oklab, ${tool.tint} 25%, transparent)` }}
                      >
                        <span className="text-[24px] leading-none select-none">{tool.emoji}</span>
                      </span>
                      <span className="text-[13px] font-semibold leading-none truncate max-w-full text-foreground mt-1">
                        {tool.label}
                      </span>
                      {tool.desc && (
                        <span className="text-[10.5px] text-muted-foreground truncate max-w-full">
                          {tool.desc}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t border-[hsl(var(--hairline))]" aria-hidden />

            {/* ── 바텀 Hero 밴드 — AI 어시스턴트 6카드 (실무 도구 일렬) ── */}
            <div className="border-t border-[hsl(var(--hairline))]" aria-hidden />
            <div className="px-4 py-3">
              <div className="mb-1.5 flex items-baseline gap-2 px-1">
                <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                  AI 어시스턴트
                </span>
                <span className="text-[10.5px] text-muted-foreground/70 truncate flex-1">
                  실무 도구
                </span>
                <button
                  type="button"
                  onClick={() => handleSelect('assistant')}
                  className="text-[10.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 transition-colors"
                >
                  도구 더 보기
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-6 gap-2">
                {ASSISTANT_TILES.slice(0, 6).map((tile) => {
                  const Icon = tile.icon;
                  const isActive = currentMode === 'assistant' && currentAssistantCard === tile.cardId;
                  return (
                    <button
                      key={`hero-${tile.cardId}`}
                      type="button"
                      onClick={() => handleSelectAssistantTool(tile.cardId)}
                      role="menuitem"
                      className={cn(
                        'group flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl text-left transition-all duration-200 hover:-translate-y-0.5',
                        tile.placeholder && 'opacity-85',
                        isActive && 'ring-2 ring-offset-1 ring-[hsl(var(--ring))]',
                      )}
                      style={{ backgroundColor: `color-mix(in oklab, ${tile.tint} 10%, transparent)` }}
                    >
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110"
                        style={{ color: tile.tint }}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <span className="text-[11px] font-semibold leading-none truncate max-w-full text-foreground/85">
                        {tile.label}
                      </span>
                    </button>
                  );
                })}
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
