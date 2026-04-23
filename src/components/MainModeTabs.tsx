/**
 * 메인 모드 네비 — "Eyebrow Pill" 패턴.
 *
 * 페이지 헤더 메타로서의 모드 표시. 작은 pill + 드롭다운 패널.
 * 드롭다운은 8개 주요 모드만 노출, AI 토론은 하위(찬반/자유/심층/브레인) 인라인 표시.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageCircle, GitMerge, Shield, Sparkles, Swords, Wrench,
  FlaskConical, BookOpen, ChevronDown, ChevronRight, ChevronLeft, MessagesSquare, Telescope,
  Globe, Presentation, Mic, ArrowRight, Users, Wand2, Files,
  Languages, PenLine, BookText, FileSpreadsheet,
} from 'lucide-react';

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

/** 좌측 컬럼 — 환율 위젯 (v1 하드코드, v2 API 연동). */
export const EXCHANGE_RATES: Array<{
  code: string;
  label: string;
  rate: string;
  change: number; // 양수=상승, 음수=하락
  flag: string;
}> = [
  { code: 'USD', label: '달러', rate: '1,342', change: 0.3,  flag: '🇺🇸' },
  { code: 'JPY', label: '엔',   rate: '9.12',  change: -0.1, flag: '🇯🇵' },
  { code: 'EUR', label: '유로', rate: '1,451', change: 0.5,  flag: '🇪🇺' },
];

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
            {/* 4 컬럼 — 유틸리티(검색·날씨·타일) / 대화+전문 / 라이프 / 플레이어 */}
            <div className="grid grid-cols-4 gap-x-3 p-4">
              {/* 좌측 컬럼: 빠른검색 + 일일 정보 대시보드 (시계·날씨·환율) */}
              <div className="min-w-0 flex flex-col space-y-3">
                <div className="px-1 -mt-1">
                  <QuickSearchBar />
                </div>
                <div className="border-t border-[hsl(var(--hairline))]" aria-hidden />
                {/* 시계 + 날짜 */}
                <div className="px-1">
                  <div className="text-[26px] font-semibold tracking-tight leading-none text-foreground tabular-nums">
                    {now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {now.getMonth() + 1}월 {now.getDate()}일 {['일', '월', '화', '수', '목', '금', '토'][now.getDay()]}요일
                  </div>
                </div>
                {/* 날씨 카드 */}
                <div
                  className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ backgroundColor: `color-mix(in oklab, ${WEATHER_WIDGET.tint} 10%, transparent)` }}
                >
                  <span className="text-[24px] leading-none select-none">{WEATHER_WIDGET.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      {WEATHER_WIDGET.city}
                    </div>
                    <div className="text-[14px] font-semibold text-foreground/90 leading-tight mt-0.5">
                      {WEATHER_WIDGET.temp}° · {WEATHER_WIDGET.condition}
                    </div>
                  </div>
                </div>
                {/* 환율 */}
                <div>
                  <div className="mb-1.5 flex items-baseline gap-2 px-1 min-h-[16px]">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                      💱 환율
                    </span>
                    <span className="text-[10.5px] text-muted-foreground/70 truncate">
                      실시간 시세
                    </span>
                  </div>
                  <div className="space-y-1 px-1">
                    {EXCHANGE_RATES.map((fx) => {
                      const isUp = fx.change > 0;
                      const isFlat = fx.change === 0;
                      return (
                        <div
                          key={fx.code}
                          className="flex items-center gap-2 py-1 text-[11.5px] tabular-nums"
                        >
                          <span className="text-[13px] leading-none">{fx.flag}</span>
                          <span className="font-mono text-muted-foreground/80 w-8 shrink-0">{fx.code}</span>
                          <span className="font-semibold text-foreground/90 flex-1">{fx.rate}</span>
                          <span
                            className={cn(
                              'font-mono text-[10.5px] shrink-0',
                              isFlat ? 'text-muted-foreground' : isUp ? 'text-rose-500' : 'text-blue-500',
                            )}
                          >
                            {isUp ? '▲' : isFlat ? '—' : '▼'} {Math.abs(fx.change).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
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
              {/* 맨 오른쪽 컬럼: 플레이어 — 캐릭터·게임·롤플레이 */}
              <div className="min-w-0 flex flex-col">
                <div className="mb-1.5 flex items-baseline gap-2 px-1">
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
                    {PLAYER_GROUP.label}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground/70 truncate">
                    {PLAYER_GROUP.description}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {PLAYER_TOOLS_FEATURED.map(renderPlayerToolItem)}
                </div>
              </div>
            </div>

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
