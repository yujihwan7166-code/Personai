/**
 * 오늘의 한 줄 — 좌측 컬럼 감성 위젯용 명언 풀.
 *
 * 날짜 기반 인덱싱으로 매일 같은 인용구가 선택됨 (시간대 영향 최소).
 * 공공 영역(20세기 이전 저자) 중심 + 한국어 번역/고전.
 */

export interface DailyQuote {
  text: string;
  author: string;
}

/** 초기 30개 인용구 풀 — 추후 점진 확장. */
export const DAILY_QUOTES: DailyQuote[] = [
  { text: '인생은 자전거를 타는 것과 같다. 균형을 잡으려면 계속 움직여야 한다.', author: '알베르트 아인슈타인' },
  { text: '시작하는 방법은 말하는 것을 멈추고 행동하는 것이다.', author: '월트 디즈니' },
  { text: '작은 일에 충실한 자는 큰 일에도 충실할 것이다.', author: '공자' },
  { text: '오늘 할 일을 내일로 미루지 말라.', author: '벤저민 프랭클린' },
  { text: '성공은 열정을 잃지 않고 실패에서 실패로 걸어가는 것이다.', author: '윈스턴 처칠' },
  { text: '자신을 믿어라. 그대는 생각보다 용감하고 능력 있는 사람이다.', author: '크리스토퍼 로빈' },
  { text: '하루하루가 인생의 축소판이다.', author: '쇼펜하우어' },
  { text: '길을 잃는다는 것은 곧 길을 아는 것의 시작이다.', author: '아프리카 속담' },
  { text: '배움에는 끝이 없다. 오늘도 어제보다 한 걸음.', author: '레오나르도 다빈치' },
  { text: '행복은 습관이다. 그것을 몸에 지니라.', author: '허버트 스펜서' },
  { text: '나를 죽이지 못하는 고통은 나를 더 강하게 만든다.', author: '니체' },
  { text: '천재는 1%의 영감과 99%의 노력이다.', author: '토머스 에디슨' },
  { text: '어제는 역사, 내일은 미스터리, 오늘은 선물이다.', author: '엘리너 루즈벨트' },
  { text: '가장 큰 위험은 아무 위험도 감수하지 않는 것이다.', author: '마크 저커버그' },
  { text: '당신이 할 수 있다고 생각하면 할 수 있고, 할 수 없다고 생각하면 할 수 없다.', author: '헨리 포드' },
  { text: '세상에서 가장 강한 사람은 홀로 설 줄 아는 사람이다.', author: '헨리크 입센' },
  { text: '할 수 있다고 믿는 자가 해낸다.', author: '베르길리우스' },
  { text: '우물쭈물하다 내 이럴 줄 알았지.', author: '버나드 쇼' },
  { text: '책은 가장 조용하고 변함없는 친구이다.', author: '찰스 W. 엘리엇' },
  { text: '아는 것이 힘이다.', author: '프랜시스 베이컨' },
  { text: '인내는 쓰나 그 열매는 달다.', author: '장 자크 루소' },
  { text: '너 자신을 알라.', author: '소크라테스' },
  { text: '과거를 잊는 자는 그것을 반복하게 된다.', author: '조지 산타야나' },
  { text: '모든 것은 변한다. 변하지 않는다는 것 외에는.', author: '헤라클레이토스' },
  { text: '여행은 정신을 다시 젊게 만든다.', author: '한스 크리스티안 안데르센' },
  { text: '친구 없이 사는 것보다 더 황량한 황야는 없다.', author: '프랜시스 베이컨' },
  { text: '자유는 책임을 동반한다. 그래서 많은 사람이 두려워한다.', author: '버나드 쇼' },
  { text: '느리게 가는 것을 두려워 말고 멈춰 있는 것을 두려워하라.', author: '중국 속담' },
  { text: '현명한 사람은 자신이 모른다는 것을 안다.', author: '소크라테스' },
  { text: '삶이 있는 한 희망은 있다.', author: '키케로' },
];

/**
 * 오늘 날짜 기준 인용구 선택.
 * 매일 자정에 자동 변경, 같은 해 같은 날짜면 같은 인용구.
 */
export function getQuoteOfDay(now: Date = new Date()): DailyQuote {
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / 86_400_000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}
