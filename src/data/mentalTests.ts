/**
 * 심리 테스트 모음 데이터 — "멘탈 테스트" 그룹 서브 뷰의 "심리 테스트 모음" 진입 시 노출.
 * 각 테스트는 id·라벨·이모지·카테고리·소요시간·문항수 등 메타만 정의.
 * 실제 설문 데이터(문항·결과 매핑)는 추후 quiz 엔진에서 별도 관리.
 */

export type MentalTestCategory = 'trending' | 'personality' | 'relationship' | 'career' | 'selfcare';

export interface MentalTest {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  /** 한 줄 설명. 카드 본문에 노출. */
  description: string;
  /** 예상 소요 시간 (분). */
  durationMin: number;
  /** 문항 수 — 표시용. */
  questionCount: number;
  category: MentalTestCategory;
  /** true면 "곧 출시" 뱃지. 실제 설문 데이터가 아직 준비 안 됨. */
  comingSoon?: boolean;
  /** true면 카테고리 상단에 🔥 태그 표시. */
  trending?: boolean;
}

export const MENTAL_TEST_CATEGORIES: Array<{ id: MentalTestCategory; label: string; emoji: string; description: string }> = [
  { id: 'trending',    label: '지금 핫한',    emoji: '🔥', description: '요즘 SNS 바이럴' },
  { id: 'personality', label: '성격·유형',    emoji: '🎭', description: '나를 알아보기' },
  { id: 'relationship',label: '연애·관계',    emoji: '💕', description: '사람과의 관계 스타일' },
  { id: 'career',      label: '직업·재능',    emoji: '💼', description: '나에게 맞는 일' },
  { id: 'selfcare',    label: '자기이해',     emoji: '🌱', description: '마음의 습관과 신호' },
];

export const MENTAL_TESTS: MentalTest[] = [
  // ── 🔥 지금 핫한 ──
  { id: 'teto-egen',    label: '테토·에겐 테스트',  emoji: '🔥', tint: 'hsl(10 85% 58%)',  description: '2024 최대 밈 · 도파민·세로토닌 극성향',        durationMin: 3,  questionCount: 18, category: 'trending',    trending: true                  },
  { id: 'human-design', label: '휴먼디자인',        emoji: '✨', tint: 'hsl(265 60% 60%)', description: '점성·역경·차크라 혼합 4타입',                  durationMin: 2,  questionCount: 0,  category: 'trending',    trending: true,  comingSoon: true },
  { id: 'past-life-q',  label: '나의 전생 타입',    emoji: '👤', tint: 'hsl(280 40% 50%)', description: '질문 답변 → 전생 캐릭터 매칭',                 durationMin: 3,  questionCount: 15, category: 'trending',    trending: true,  comingSoon: true },
  { id: 'animal-type',  label: '나의 동물 유형',    emoji: '🦊', tint: 'hsl(30 75% 55%)',  description: '너는 여우? 늑대? 토끼?',                       durationMin: 4,  questionCount: 20, category: 'trending',    trending: true,  comingSoon: true },

  // ── 🎭 성격·유형 ──
  { id: 'mbti-16',      label: 'MBTI 16타입 상세',  emoji: '🧩', tint: 'hsl(215 65% 55%)', description: '본인 유형·강점·약점·성장 포인트',              durationMin: 8,  questionCount: 60, category: 'personality'                               },
  { id: 'enneagram',    label: '에니어그램 9타입',  emoji: '🔢', tint: 'hsl(340 55% 55%)', description: '9가지 성격 원형 · 발달 방향',                  durationMin: 10, questionCount: 72, category: 'personality', comingSoon: true },
  { id: 'big-five',     label: 'Big Five (OCEAN)',  emoji: '📊', tint: 'hsl(195 60% 50%)', description: '심리학 표준 5차원 성격',                       durationMin: 7,  questionCount: 50, category: 'personality', comingSoon: true },
  { id: 'disc',         label: 'DISC 행동 유형',    emoji: '🎯', tint: 'hsl(155 55% 45%)', description: '주도·사교·안정·신중 4축',                      durationMin: 5,  questionCount: 28, category: 'personality', comingSoon: true },
  { id: '16p-extend',   label: '16Personalities',   emoji: '🌐', tint: 'hsl(220 50% 50%)', description: 'MBTI 확장판 · 성향 강도 포함',                 durationMin: 10, questionCount: 60, category: 'personality', comingSoon: true },
  { id: 'blood-type',   label: '혈액형 성격 (재미)', emoji: '🩸', tint: 'hsl(0 70% 55%)',   description: '과학은 없지만 재미는 있음',                    durationMin: 1,  questionCount: 0,  category: 'personality'                               },

  // ── 💕 연애·관계 ──
  { id: 'love-lang',    label: '5가지 사랑의 언어', emoji: '💌', tint: 'hsl(350 65% 60%)', description: '인정·봉사·선물·접촉·시간 중 내 스타일',        durationMin: 5,  questionCount: 30, category: 'relationship'                               },
  { id: 'attachment',   label: '애착 유형',         emoji: '🔒', tint: 'hsl(205 55% 50%)', description: '안정·불안·회피 중 내 유형',                    durationMin: 6,  questionCount: 36, category: 'relationship'                               },
  { id: 'dating-style', label: '연애 스타일',       emoji: '💘', tint: 'hsl(335 70% 62%)', description: '나의 연애 패턴 진단',                          durationMin: 5,  questionCount: 25, category: 'relationship', comingSoon: true },
  { id: 'friend-role',  label: '친구 역할 테스트',  emoji: '👥', tint: 'hsl(45 70% 55%)',  description: '그룹 안에서 내 포지션',                        durationMin: 4,  questionCount: 20, category: 'relationship', comingSoon: true },

  // ── 💼 직업·재능 ──
  { id: 'holland',      label: '홀랜드 직업 적성',  emoji: '🏢', tint: 'hsl(230 50% 48%)', description: 'RIASEC 6유형 · 진로 탐색',                     durationMin: 8,  questionCount: 48, category: 'career',      comingSoon: true },
  { id: 'multi-intel',  label: '다중지능 8유형',    emoji: '🧠', tint: 'hsl(180 55% 45%)', description: '가드너의 8가지 지능',                          durationMin: 6,  questionCount: 40, category: 'career',      comingSoon: true },
  { id: 'learn-style',  label: '학습 스타일',       emoji: '📚', tint: 'hsl(100 45% 45%)', description: '시각·청각·읽기·체험 중 내 방식',               durationMin: 4,  questionCount: 20, category: 'career',      comingSoon: true },
  { id: 'leader-style', label: '리더십 스타일',     emoji: '👑', tint: 'hsl(40 80% 55%)',  description: '카리스마·서번트·변혁 등',                      durationMin: 5,  questionCount: 25, category: 'career',      comingSoon: true },

  // ── 🌱 자기이해 ──
  { id: 'self-esteem',  label: '자존감 수준',       emoji: '💎', tint: 'hsl(200 65% 55%)', description: '로젠버그 자존감 척도 기반',                    durationMin: 3,  questionCount: 10, category: 'selfcare'                                  },
  { id: 'perfection',   label: '완벽주의 정도',     emoji: '🎯', tint: 'hsl(270 50% 55%)', description: '건강한 vs 해로운 완벽주의',                    durationMin: 4,  questionCount: 20, category: 'selfcare',    comingSoon: true },
  { id: 'mindset',      label: '마인드셋 (고정·성장)', emoji: '🌱', tint: 'hsl(145 55% 45%)', description: 'Dweck 이론 기반',                            durationMin: 3,  questionCount: 15, category: 'selfcare',    comingSoon: true },
  { id: 'eq',           label: '공감·감정지능',     emoji: '❤️', tint: 'hsl(350 60% 58%)', description: '감정 인식·조절·공감 측정',                     durationMin: 6,  questionCount: 30, category: 'selfcare',    comingSoon: true },
];
