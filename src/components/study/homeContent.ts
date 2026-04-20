export interface DailyTip {
  title: string;
  body: string;
}

export const DAILY_TIPS: DailyTip[] = [
  { title: '간격 반복', body: '같은 개념을 1시간 · 1일 · 1주 간격으로 복습하면 망각 곡선을 이긴다.' },
  { title: '느낌표보다 물음표', body: '읽은 걸 문제로 바꿔 자문하면 이해도가 두 배로 뛴다.' },
  { title: '파인만 기법', body: '초등학생에게 설명하듯 말로 풀어보면 구멍이 즉시 드러난다.' },
  { title: '쪼개서 시작', body: '15분만 하기로 정하면 뇌가 저항을 줄인다. 타이머를 걸어보자.' },
  { title: '한 번에 하나', body: '여러 과목을 동시에 돌리면 맥락 전환 비용이 크다. 45분은 한 주제.' },
  { title: '필기는 직접', body: '타이핑보다 손으로 쓴 필기가 개념 이해에 더 효과적이다.' },
  { title: '수면이 곧 학습', body: '암기한 내용은 자는 동안 장기 기억으로 넘어간다. 수면 부족 = 학습 손실.' },
  { title: '소리 내어 읽기', body: '눈으로만 읽지 말고 입으로 말해보면 집중력이 돌아온다.' },
  { title: '50/10 리듬', body: '50분 집중 후 10분 휴식. 짧은 산책·스트레칭이 가장 효과적.' },
  { title: '첫 문장 규칙', body: '막힐 땐 "첫 문장만 쓰기". 시작이 곧 진행이다.' },
  { title: '질문 3개 노트', body: '배운 뒤 내가 궁금한 것 3개를 적어두면 다음 학습의 시드가 된다.' },
  { title: '가르쳐 보기', body: '친구에게 설명하거나 녹음으로 말해보면 내 이해 구멍이 가장 빨리 드러난다.' },
  { title: '노이즈보다 단서', body: '백색 소음·ASMR는 배경음. 가사 있는 음악은 언어 처리를 방해한다.' },
  { title: '테스트 효과', body: '단순 재읽기보다 문제를 풀어보는 쪽이 기억에 2~3배 남는다.' },
  { title: '한 줄 요약', body: '공부 세션을 끝낼 때 배운 내용을 한 줄로 요약해 적자. 검색용 색인이 된다.' },
  { title: '오답이 금', body: '틀린 문제만 따로 모은 오답 노트가 가장 빠른 실력 성장 경로.' },
  { title: '학습 전 5분', body: '이전 내용을 5분만 훑고 시작하면 연결이 배로 선명해진다.' },
  { title: '불쾌한 구간', body: '이해가 잘 안 되는 구간이 실력이 가장 많이 늘어나는 구간이다.' },
  { title: '카페인의 함정', body: '각성이 아니라 집중의 선명도를 높이려면 정확한 시간대 섭취가 중요.' },
  { title: '기억의 청크', body: '긴 정보는 3~5개 덩어리로 쪼개면 외워진다. 전화번호 규칙.' },
  { title: '시각화의 힘', body: '추상 개념을 그림·도표로 바꾸면 기억이 달라붙는다.' },
  { title: '출력 먼저', body: '인풋 전에 "내가 이미 아는 것"을 꺼내놓으면 새 내용이 붙을 고리가 생긴다.' },
  { title: '시작 마찰', body: '책상 위를 치우고 첫 페이지를 펴놓고 자는 것만으로 다음 날이 쉬워진다.' },
  { title: '스스로 설명', body: '"왜?"를 세 번 연쇄 질문하면 표면 이해가 깊은 이해로 바뀐다.' },
  { title: '친숙함 ≠ 이해', body: '"들어본 적 있어"와 "설명할 수 있어"는 다르다. 말로 풀어봐야 진짜.' },
  { title: '의도된 연습', body: '지루한 기본기 연습이 지름길이다. 흥미로운 것만 쫓으면 제자리.' },
  { title: '짝 공부', body: '누군가와 함께 공부하면 책임감 + 서로 설명 = 이중 효과.' },
  { title: '수분과 뇌', body: '2% 탈수만 돼도 집중력이 급감한다. 물 한 컵이 커피보다 나을 때.' },
  { title: '초록색 환경', body: '5분만 식물·창밖을 봐도 정신 피로가 회복된다.' },
  { title: '끝맺기 효과', body: '세션 끝에 "내일 여기서 이어서"를 한 줄 남기면 진입 비용이 0에 가까워진다.' },
];

export interface SampleLink {
  title: string;
  source: string;
  url: string;
  icon: string;
}

export const CURATED_SAMPLES: SampleLink[] = [
  {
    title: '동기부여의 과학 — TED 강연',
    source: 'YouTube · Dan Pink',
    url: 'https://www.youtube.com/watch?v=rrkrvAUbU9Y',
    icon: '🎬',
  },
  {
    title: '기회비용 (경제학)',
    source: 'Wikipedia',
    url: 'https://ko.wikipedia.org/wiki/%EA%B8%B0%ED%9A%8C%EB%B9%84%EC%9A%A9',
    icon: '📚',
  },
  {
    title: '피드백 루프의 힘',
    source: 'YouTube · Veritasium',
    url: 'https://www.youtube.com/watch?v=JQAyoTwvgsg',
    icon: '🎬',
  },
  {
    title: '시스템 사고 입문',
    source: 'Wikipedia',
    url: 'https://ko.wikipedia.org/wiki/%EC%8B%9C%EC%8A%A4%ED%85%9C_%EC%82%AC%EA%B3%A0',
    icon: '📚',
  },
  {
    title: '파인만의 배움의 방법',
    source: 'YouTube',
    url: 'https://www.youtube.com/watch?v=tlTKTTt47WE',
    icon: '🎬',
  },
  {
    title: '행동경제학 — 앵커링 효과',
    source: 'Wikipedia',
    url: 'https://en.wikipedia.org/wiki/Anchoring_effect',
    icon: '📚',
  },
];

export function pickDailyTip(date = new Date()): DailyTip {
  const daySeed = Number(`${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`);
  const idx = daySeed % DAILY_TIPS.length;
  return DAILY_TIPS[idx];
}
