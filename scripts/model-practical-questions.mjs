const CATEGORY_QUESTIONS = {
  search: [
    '이 주장 근거 원문을 찾아줘',
    '최신 변경점만 따로 정리해줘',
    '서로 다른 보도를 대조해줘',
    '출처별 입장 차이를 나눠줘',
    '팩트체크할 항목을 뽑아줘',
    '최근 사례 세 개를 찾아줘',
    '공식 자료 기준으로 확인해줘',
    '논쟁의 쟁점을 지도처럼 정리해줘',
    '숫자가 나온 출처를 추적해줘',
    '신뢰도 낮은 근거를 표시해줘',
    '오늘 기준 동향을 압축해줘',
    '비슷한 사건과 비교해줘',
    '주장과 사실을 분리해줘',
    '검색 결과를 의사결정용으로 줄여줘',
    '인용 가능한 근거만 골라줘',
    '상반된 자료의 차이를 설명해줘',
  ],
  coding: [
    '이 에러 재현 순서를 잡아줘',
    '리팩터링 위험 구간을 찾아줘',
    '테스트가 빠진 조건을 뽑아줘',
    'API 설계 허점을 짚어줘',
    '코드 리뷰 댓글로 정리해줘',
    '성능 병목 가설을 세워줘',
    '타입 오류를 단계별로 풀어줘',
    '배포 전 확인 항목을 만들어줘',
    '예외 처리 전략을 다시 짜줘',
    '중복 로직을 줄이는 안을 내줘',
    '함수 책임을 더 작게 나눠줘',
    '로그만 보고 원인을 추려줘',
    '테스트 이름을 명확하게 바꿔줘',
    '마이그레이션 순서를 계획해줘',
    '리뷰 반영 우선순위를 정해줘',
    '실패 케이스를 먼저 찾아줘',
  ],
  reasoning: [
    '결정 기준을 점수표로 만들어줘',
    '가정이 틀릴 때를 따져줘',
    '반대편 논리를 먼저 세워줘',
    '숨은 전제와 결론을 분리해줘',
    '대안별 손익을 비교해줘',
    '우선순위 충돌을 정리해줘',
    '불확실한 변수를 골라줘',
    '논리 비약이 있는지 검토해줘',
    '다음 행동을 근거와 묶어줘',
    '최악의 경우를 가정해봐',
    '선택지를 탈락 기준으로 걸러줘',
    '논쟁을 쟁점별로 재구성해줘',
    '판단을 보류할 이유를 찾아줘',
    '리스크 대응 순서를 짜줘',
    '의사결정 회의 안건을 만들어줘',
    '복잡한 조건을 규칙으로 바꿔줘',
  ],
  vision: [
    '이 화면에서 헷갈리는 곳을 찾아줘',
    '이미지 속 문구를 정돈해줘',
    '표의 이상한 수치를 표시해줘',
    '스크린샷 오류 원인을 추정해줘',
    '차트가 말하는 결론을 뽑아줘',
    '문서 사진을 할 일로 바꿔줘',
    '레이아웃 개선점을 짚어줘',
    '영수증 항목을 분류해줘',
    '캡처 내용을 회의 메모로 바꿔줘',
    '사진 속 정보를 목록화해줘',
    '대시보드에서 위험 신호를 찾아줘',
    '이미지와 설명이 맞는지 봐줘',
    '표 내용을 보고서 문장으로 바꿔줘',
    '화면 흐름의 막힌 부분을 찾아줘',
    '문서 이미지에서 날짜만 뽑아줘',
    '시각 자료의 핵심 메시지를 써줘',
  ],
  fast: [
    '긴 답장을 세 줄로 줄여줘',
    '바로 보낼 문장으로 고쳐줘',
    '회의 메모에서 할 일만 뽑아줘',
    '제목 후보를 빠르게 뽑아줘',
    '문장을 더 짧고 자연스럽게 해줘',
    '요청사항을 즉시 분류해줘',
    '중요한 숫자만 골라줘',
    '짧은 안내문 초안을 써줘',
    '이 내용을 한 문단으로 줄여줘',
    '말투만 부드럽게 바꿔줘',
    '빠른 답변 초안을 만들어줘',
    '체크리스트만 간단히 써줘',
    '핵심 질문 세 개만 뽑아줘',
    '불필요한 표현을 덜어줘',
    '메시지를 더 공손하게 바꿔줘',
    '내용을 한 줄 제목으로 줄여줘',
  ],
  openWeight: [
    '민감한 내용을 안전하게 줄여줘',
    '내부 문서 분류 규칙을 만들어줘',
    '반복 업무 처리 순서를 짜줘',
    '사내 FAQ 초안을 작성해줘',
    '개인정보 제거 기준을 세워줘',
    '로컬 자료 검색 흐름을 설계해줘',
    '팀용 검토 체크리스트를 만들어줘',
    '업무 로그를 항목별로 나눠줘',
    '비용 낮추는 처리 방식을 제안해줘',
    '문서 처리 단계를 단순화해줘',
    '내부 정책 문장을 쉽게 바꿔줘',
    '반복 질문 답변 규칙을 정리해줘',
    '보안 검토 포인트를 뽑아줘',
    '자료 정리 템플릿을 만들어줘',
    '사내 용어집 초안을 써줘',
    '오프라인 작업 흐름을 정리해줘',
  ],
  general: [
    '기획안의 빈틈을 찾아줘',
    '보고서 결론을 더 선명하게 해줘',
    '회의 내용을 결정사항으로 바꿔줘',
    '고객 불만을 원인별로 나눠줘',
    '발표 흐름을 다시 구성해줘',
    '아이디어를 실행 계획으로 바꿔줘',
    '두 선택지를 기준별로 비교해줘',
    '초안을 더 설득력 있게 고쳐줘',
    '자료에서 핵심 숫자를 뽑아줘',
    '읽기 쉬운 구조로 다시 써줘',
    '이메일을 더 명확하게 다듬어줘',
    '면접 답변을 자연스럽게 고쳐줘',
    '학습 내용을 문제로 바꿔줘',
    '제안서의 강한 문장을 만들어줘',
    '업무 메모를 공유용으로 정리해줘',
    '다음 회의 질문을 준비해줘',
  ],
};

const SITUATION_QUESTIONS = [
  '신제품 회의 전에 쟁점을 뽑아줘',
  '고객 이탈 원인을 가설로 나눠줘',
  '면접 답변을 더 구체적으로 고쳐줘',
  '팀 회고 내용을 개선안으로 바꿔줘',
  '가격 인상 공지를 부드럽게 써줘',
  '일정 지연 사유를 깔끔하게 정리해줘',
  '경쟁사 비교표의 기준을 잡아줘',
  '사업 제안서 목차를 다시 짜줘',
  '장애 보고서를 고객용으로 바꿔줘',
  '설문 응답에서 반복 의견을 묶어줘',
  '강의 노트를 복습 문제로 바꿔줘',
  '회의록에서 결정 안건만 추려줘',
  '마케팅 문구의 과장을 줄여줘',
  '계약 전 확인 질문을 만들어줘',
  '채용 공고 문장을 더 명확히 해줘',
  '온보딩 문서를 순서대로 정리해줘',
  '사용자 불편을 원인별로 묶어줘',
  '보고서 첫 문단을 다시 써줘',
  '프로젝트 위험 신호를 골라줘',
  '상사에게 보낼 요약문을 써줘',
  '학습 계획을 주간 단위로 나눠줘',
  '공지문을 더 짧게 다듬어줘',
  '아이디어 후보를 실행 난이도로 나눠줘',
  '문서에서 빠진 근거를 찾아줘',
  '토론 주제를 찬반 질문으로 바꿔줘',
  '데이터 해석의 허점을 찾아줘',
  '업무 요청을 우선순위로 정렬해줘',
  '프로젝트 범위를 한 문단으로 줄여줘',
  '이해관계자별 걱정을 정리해줘',
  '새 기능 소개 문구를 만들어줘',
  '예산 검토 질문을 준비해줘',
  '고객 안내 메시지를 공손하게 써줘',
];

const OUTPUT_QUESTIONS = [
  '결론부터 말하는 답변으로 바꿔줘',
  '한눈에 보는 비교표로 만들어줘',
  '실행 순서만 번호로 정리해줘',
  '주의할 점을 빨간불 목록으로 써줘',
  '상대가 물을 질문을 예상해줘',
  '짧은 보고 문장 세 개로 줄여줘',
  '의사결정용 요약으로 다시 써줘',
  '누락된 확인 사항을 체크해줘',
  '초보자도 이해하게 풀어줘',
  '팀에 공유할 문장으로 다듬어줘',
  '장단점을 같은 기준으로 맞춰줘',
  '가장 먼저 할 일만 골라줘',
  '불확실한 부분을 따로 표시해줘',
  '문제 원인과 해결책을 나눠줘',
  '회의에서 바로 읽게 써줘',
  '핵심 메시지를 제목처럼 뽑아줘',
  '반박받기 쉬운 부분을 찾아줘',
  '다음 질문 세 개를 추천해줘',
  '요약과 액션아이템을 분리해줘',
  '중요도 낮은 내용은 덜어줘',
  '표현을 더 단호하게 바꿔줘',
  '상황별 답변 예시를 만들어줘',
  '확인 필요 항목만 모아줘',
  '한 줄 결론과 근거로 써줘',
  '실패 가능성을 먼저 점검해줘',
  '자료를 발표 대본으로 바꿔줘',
  '짧은 메일 제목을 붙여줘',
  '결정 전 보류할 이유를 찾아줘',
  '비전문가용 설명으로 바꿔줘',
  '읽는 사람이 할 일을 분명히 해줘',
  '중복된 문장을 합쳐줘',
  '비교 기준을 세 개로 줄여줘',
];

function hashText(value) {
  let hash = 0;
  for (const char of value) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function isSearchModel(id) {
  return /search|sonar|perplexity|deep-research|research/.test(id);
}

function isCodingModel(id) {
  return /codex|coder|codestral|devstral|code|programmer/.test(id);
}

function isReasoningModel(id) {
  return /reasoning|thinking|think|qwq|r1|o1|o3|o4|grok-4|magistral/.test(id);
}

function isFastModel(id) {
  return /mini|nano|flash|lite|small|haiku|fast|instant|8b|9b|7b|4b|3b|1b/.test(id);
}

function categoryForQuestionSource(source) {
  const id = `${source.id ?? ''} ${source.openrouterModel ?? ''} ${source.name ?? ''}`.toLowerCase();
  const inputModalities = source.modelInfo?.inputModalities ?? [];
  if (isSearchModel(id)) return 'search';
  if (isCodingModel(id)) return 'coding';
  if (isReasoningModel(id)) return 'reasoning';
  if (inputModalities.includes('image')) return 'vision';
  if (source.modelInfo?.openWeight) return 'openWeight';
  if (isFastModel(id)) return 'fast';
  return 'general';
}

function pick(pool, seed, salt) {
  return pool[(seed + salt * 17) % pool.length];
}

const SHARED_SUBJECTS = [
  '기획안',
  '회의록',
  '고객 피드백',
  '제안서',
  '발표 원고',
  '업무 메모',
  '시장 자료',
  '면접 답변',
  '공지문',
  '학습 노트',
  '설문 응답',
  '장애 보고서',
  '계약서',
  '보고서',
  '이메일',
  '프로젝트 계획',
  '제품 소개',
  '채용 공고',
  '사용자 리뷰',
  '운영 매뉴얼',
  '가격 안내',
  '팀 회고',
  '교육 자료',
  '요구사항',
];

const CATEGORY_COMBOS = {
  search: {
    subjects: ['정책 변경', '시장 동향', '경쟁사 발표', '논문 주장', '제품 이슈', '규제 소식', '보도자료', '통계 수치'],
    actions: [' 관련 원문 근거를 찾아줘', ' 최신 쟁점을 정리해줘', ' 자료를 출처별로 비교해줘', ' 관련 사실만 골라줘', ' 반대 근거를 찾아줘', ' 신뢰도를 점검해줘'],
  },
  coding: {
    subjects: ['에러 로그', 'API 설계', '테스트 코드', '배포 계획', '리팩터링안', '타입 오류', '성능 지표', '리뷰 댓글'],
    actions: [' 원인을 좁혀줘', ' 빠진 조건을 찾아줘', ' 단계별 수정안을 써줘', ' 위험 구간을 표시해줘', ' 체크리스트를 만들어줘', ' 우선순위를 정해줘'],
  },
  reasoning: {
    subjects: ['의사결정안', '투자 판단', '채용 기준', '우선순위', '리스크 목록', '대안 후보', '토론 쟁점', '협상 조건'],
    actions: [' 숨은 전제를 찾아줘', ' 기준별 비교표를 만들어줘', ' 약한 논리를 짚어줘', ' 점수표를 만들어줘', ' 최악 상황을 따져줘', ' 탈락 기준으로 걸러줘'],
  },
  vision: {
    subjects: ['화면 캡처', '대시보드', '문서 사진', '차트 이미지', '영수증', '표 이미지', '앱 화면', '슬라이드'],
    actions: [' 속 이상한 점을 찾아줘', ' 핵심 정보를 뽑아줘', ' 내용을 할 일로 바꿔줘', ' 흐름 문제를 짚어줘', ' 숫자만 정리해줘', ' 내용을 보고서 문장으로 바꿔줘'],
  },
  fast: {
    subjects: ['긴 답장', '회의 메모', '공지문', '요청사항', '짧은 안내문', '제목 후보', '업무 메시지', '요약문'],
    actions: [' 세 줄 버전으로 줄여줘', ' 할 일만 뽑아줘', ' 바로 보낼 말로 고쳐줘', ' 빠르게 분류해줘', ' 표현을 덜어줘', ' 더 공손하게 바꿔줘'],
  },
  openWeight: {
    subjects: ['내부 문서', '사내 FAQ', '업무 로그', '보안 검토', '정책 초안', '자료 템플릿', '운영 절차', '용어집'],
    actions: [' 민감정보를 줄여줘', ' 분류 규칙을 만들어줘', ' 반복 업무용으로 바꿔줘', ' 검토 항목을 뽑아줘', ' 안전 요약본을 만들어줘', ' 처리 순서를 단순화해줘'],
  },
  general: {
    subjects: SHARED_SUBJECTS,
    actions: [' 핵심을 뽑아줘', ' 빈틈을 찾아줘', ' 더 명확하게 고쳐줘', ' 실행 순서로 바꿔줘', ' 다음 질문을 만들어줘', ' 공유용으로 정리해줘'],
  },
};

const SITUATION_SUBJECTS = [
  '신제품 회의',
  '고객 이탈',
  '가격 인상',
  '일정 지연',
  '경쟁사 비교',
  '사업 제안',
  '장애 대응',
  '사용자 불편',
  '채용 검토',
  '온보딩',
  '팀 회고',
  '예산 검토',
  '기능 소개',
  '계약 협상',
  '마케팅 문구',
  '학습 계획',
  '프로젝트 범위',
  '이해관계자 의견',
  '설문 결과',
  '데이터 해석',
  '공지 작성',
  '발표 준비',
  '업무 요청',
  '토론 준비',
];

const SITUATION_ACTIONS = [
  ' 전 쟁점을 뽑아줘',
  ' 원인을 가설로 나눠줘',
  ' 문장을 부드럽게 써줘',
  ' 사유를 깔끔하게 정리해줘',
  ' 기준을 다시 잡아줘',
  ' 목차를 새로 짜줘',
  ' 내용을 고객용으로 바꿔줘',
  ' 이슈를 원인별로 묶어줘',
  ' 질문을 준비해줘',
  ' 문서를 순서대로 정리해줘',
  ' 내용을 개선안으로 바꿔줘',
  ' 체크 포인트를 만들어줘',
  ' 문구를 짧게 만들어줘',
  ' 전 확인할 것을 뽑아줘',
  ' 표현의 과장을 줄여줘',
  ' 계획을 주간 단위로 나눠줘',
  ' 내용을 한 문단으로 줄여줘',
  ' 이해관계를 정리해줘',
  ' 반복 의견을 묶어줘',
  ' 해석의 허점을 찾아줘',
  ' 내용을 더 명확하게 고쳐줘',
  ' 흐름을 자연스럽게 짜줘',
  ' 항목을 우선순위로 정렬해줘',
  ' 주제를 찬반 질문으로 바꿔줘',
];

const OUTPUT_SUBJECTS = [
  '결론',
  '비교표',
  '실행 순서',
  '주의할 점',
  '예상 질문',
  '보고 문장',
  '의사결정 요약',
  '확인 사항',
  '초보자 설명',
  '공유 문장',
  '장단점',
  '첫 행동',
  '불확실한 부분',
  '원인과 해결책',
  '회의 발언',
  '핵심 메시지',
  '반박 포인트',
  '다음 질문',
  '액션아이템',
  '낮은 중요도',
  '단호한 표현',
  '상황별 답변',
  '보류할 이유',
  '발표 대본',
];

const OUTPUT_ACTIONS = [
  ' 중심으로 다시 써줘',
  ' 형태로 한눈에 보이게 해줘',
  ' 중심으로 번호를 매겨줘',
  ' 목록으로 따로 표시해줘',
  ' 세 가지를 미리 예상해줘',
  ' 스타일로 세 줄만 써줘',
  ' 형태로 다시 써줘',
  ' 목록만 체크해줘',
  ' 방식으로 쉽게 풀어줘',
  ' 톤으로 다듬어줘',
  ' 기준을 맞춰줘',
  ' 하나만 골라줘',
  ' 구간을 따로 표시해줘',
  ' 구조로 나눠서 써줘',
  '처럼 바로 읽게 써줘',
  '를 제목처럼 뽑아줘',
  '를 먼저 찾아줘',
  ' 세 개를 추천해줘',
  '과 요약을 분리해줘',
  ' 항목은 과감히 덜어줘',
  '으로 더 단호하게 바꿔줘',
  ' 예시를 만들어줘',
  '를 찾아줘',
  ' 형식으로 바꿔줘',
];

function combine(subjects, actions, seed, salt) {
  return normalizeQuestion(`${pick(subjects, seed, salt)}${pick(actions, Math.floor(seed / 7), salt + 3)}`);
}

function normalizeQuestion(question) {
  return question
    .replaceAll('발표 대본를', '발표 대본을')
    .replaceAll('예상 질문를', '예상 질문을')
    .replaceAll('상황별 답변를', '상황별 답변을')
    .replaceAll('액션아이템를', '액션아이템을')
    .replaceAll('단호한 표현를', '단호한 표현을')
    .replaceAll('결론를', '결론을')
    .replaceAll('낮은 중요도과', '낮은 중요도와')
    .replaceAll('핵심 메시지과', '핵심 메시지와')
    .replaceAll('반박 포인트과', '반박 포인트와')
    .replaceAll('다음 질문과 요약', '다음 질문과 요약문')
    .replaceAll('액션아이템과 요약', '액션아이템과 요약문');
}

function dedupeQuestions(questions, seed, fallbackPool) {
  const out = [];
  for (const question of questions.map(normalizeQuestion)) {
    if (!out.includes(question)) out.push(question);
  }
  let salt = 11;
  while (out.length < 3) {
    const fallback = normalizeQuestion(pick(fallbackPool, seed, salt));
    if (!out.includes(fallback)) out.push(fallback);
    salt += 1;
  }
  return out.slice(0, 3);
}

export function practicalQuestionsForModel(source) {
  const seed = hashText(`${source.id ?? ''}:${source.openrouterModel ?? ''}:${source.name ?? ''}`);
  const category = categoryForQuestionSource(source);
  const combo = CATEGORY_COMBOS[category];
  const fallbackPool = CATEGORY_QUESTIONS[category];
  const categoryQuestion = combine(combo.subjects, combo.actions, seed, 1);
  const situationQuestion = combine(SITUATION_SUBJECTS, SITUATION_ACTIONS, Math.floor(seed / 3), 2);
  const outputQuestion = combine(OUTPUT_SUBJECTS, OUTPUT_ACTIONS, Math.floor(seed / 5), 3);

  const patterns = [
    [categoryQuestion, situationQuestion, outputQuestion],
    [situationQuestion, categoryQuestion, outputQuestion],
    [outputQuestion, categoryQuestion, situationQuestion],
  ];

  return dedupeQuestions(patterns[seed % patterns.length], seed, fallbackPool);
}
