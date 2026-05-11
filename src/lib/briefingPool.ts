/**
 * 데일리 브리핑 정적 풀 — 외부 API 없이 가벼운 위젯 컨텐츠.
 *
 * 매일 다른 항목 보이려고 날짜 기반 결정 (날짜 → index).
 */

const QUOTES: Array<{ text: string; author?: string }> = [
  { text: '시작하는 것이 가장 어렵다. 그 다음은 그저 계속하기만 하면 된다.', author: '마크 트웨인' },
  { text: '완벽함이란 더 이상 더할 것이 없을 때가 아니라, 더 이상 뺄 것이 없을 때다.', author: '생텍쥐페리' },
  { text: '오늘 걷지 않으면 내일 뛰어야 한다.' },
  { text: '늦었다고 생각할 때가 가장 빠를 때다.', author: '박명수의 역설 (실은 "현실은 늦었을 뿐")' },
  { text: '작은 것에 충실해야 큰 것이 따라온다.' },
  { text: '계획 없는 목표는 그저 소망일 뿐이다.', author: '생텍쥐페리' },
  { text: '내일 죽을 것처럼 살고, 영원히 살 것처럼 배워라.', author: '간디' },
  { text: '행복은 습관이다. 그것을 몸에 지녀라.', author: '허버드' },
  { text: '나는 실패하지 않았다. 그저 효과 없는 만 가지 방법을 발견했을 뿐이다.', author: '에디슨' },
  { text: '인생에서 가장 큰 영광은 절대 넘어지지 않는 것이 아니라, 넘어질 때마다 일어서는 데 있다.', author: '넬슨 만델라' },
  { text: '꿈을 날짜와 함께 적으면 목표가 된다. 목표를 잘게 나누면 계획이 된다. 계획을 실행하면 꿈이 된다.', author: '그레그 S. 리드' },
  { text: '오늘 할 수 있는 일을 내일로 미루지 마라.', author: '벤자민 프랭클린' },
  { text: '책상 정리부터 시작하면 인생이 정리되더라.' },
  { text: '집중하는 것은 “예”라고 말하는 것이 아니라, 100가지의 다른 좋은 아이디어에 “아니오”라고 말하는 것이다.', author: '스티브 잡스' },
  { text: '시간이 없다는 것은 우선순위가 없다는 뜻이다.', author: '팀 페리스' },
  { text: '하루는 길고 십 년은 짧다.' },
  { text: '진짜 자유는 책임을 받아들이는 데서 온다.' },
  { text: '읽지 않은 책은 책장에 있지만, 읽은 책은 머리에 있다.' },
  { text: '겨울이 오면 봄도 멀지 않으리.', author: '셸리' },
  { text: '돌이켜보면 점들이 이어진다 — 지금은 모르지만.', author: '스티브 잡스' },
];

const WORDS: Array<{ word: string; meaning: string; sample?: string }> = [
  { word: 'serendipity',  meaning: '우연한 행운, 뜻밖의 발견', sample: 'Our meeting was pure serendipity.' },
  { word: 'ephemeral',    meaning: '덧없는, 잠시뿐인',         sample: 'Fame is ephemeral.' },
  { word: 'resilience',   meaning: '회복탄력성',                sample: 'She showed remarkable resilience.' },
  { word: 'ubiquitous',   meaning: '어디에나 있는',             sample: 'Smartphones are now ubiquitous.' },
  { word: 'pragmatic',    meaning: '실용적인, 현실적인',        sample: 'a pragmatic approach to the problem' },
  { word: 'meticulous',   meaning: '꼼꼼한, 세심한',            sample: 'meticulous attention to detail' },
  { word: 'mundane',      meaning: '평범한, 일상적인',          sample: 'the mundane routine of daily life' },
  { word: 'eloquent',     meaning: '유창한, 설득력 있는',       sample: 'an eloquent speech' },
  { word: 'tenacious',    meaning: '집요한, 끈질긴',            sample: 'a tenacious negotiator' },
  { word: 'lucid',        meaning: '명료한, 또렷한',            sample: 'a lucid explanation' },
  { word: 'pivotal',      meaning: '중심이 되는, 결정적인',     sample: 'a pivotal moment in history' },
  { word: 'austere',      meaning: '소박한, 엄격한',            sample: 'an austere lifestyle' },
  { word: 'profound',     meaning: '깊은, 심오한',              sample: 'a profound insight' },
  { word: 'ambiguous',    meaning: '모호한, 이중적인',          sample: 'an ambiguous message' },
  { word: 'candid',       meaning: '솔직한, 가식 없는',         sample: 'a candid conversation' },
  { word: 'frugal',       meaning: '검소한, 절약하는',          sample: 'frugal with money' },
  { word: 'gregarious',   meaning: '사교적인',                  sample: 'a gregarious personality' },
  { word: 'paradigm',     meaning: '패러다임, 사고의 틀',       sample: 'a paradigm shift' },
  { word: 'quintessential', meaning: '전형적인, 정수의',        sample: 'the quintessential American novel' },
  { word: 'voracious',    meaning: '게걸스러운, 욕심 많은',     sample: 'a voracious reader' },
];

/** 날짜 → 풀 안 인덱스. 같은 날엔 같은 항목, 다른 날엔 다른 항목 (주기적 순환). */
const dayIndex = (modulo: number): number => {
  const d = new Date();
  // Y * 12 + M*32 + Day — 분포 균등 + 결정적
  const seed = d.getFullYear() * 384 + d.getMonth() * 32 + d.getDate();
  return ((seed % modulo) + modulo) % modulo;
};

export const todaysQuote = (): { text: string; author?: string } => QUOTES[dayIndex(QUOTES.length)];
export const todaysWord = (): { word: string; meaning: string; sample?: string } => WORDS[dayIndex(WORDS.length)];
