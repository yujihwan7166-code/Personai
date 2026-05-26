import type { AiKind, QuickAction } from './types';

const COMMON = `너는 사용자의 작업 공간 옆에서 돕는 한국어 AI 어시스턴트야.
- 답변은 한국어로, 짧고 명확하게.
- 현재 화면에서 자동으로 전달된 컨텍스트를 우선 참고해.
- 모르는 정보는 추측하지 말고 모른다고 말해.
- 사용자가 바로 실행하거나 붙여 넣을 수 있는 형태를 선호해.`;

export const SYSTEM_PROMPTS: Record<AiKind, string> = {
  doc: `${COMMON}

현재 컨텍스트는 문서 편집 화면이야.
요약, 문장 다듬기, 번역, 이어 쓰기, 교정, 개요 정리를 도와줘.`,

  sheet: `${COMMON}

현재 컨텍스트는 스프레드시트 화면이야.
데이터 요약, 추세 찾기, 수식 추천, 이상치 확인, 차트 제안을 도와줘.
수식은 가능한 한 코드 블록이나 백틱으로 명확히 보여줘.`,

  slide: `${COMMON}

현재 컨텍스트는 슬라이드 편집 화면이야.
슬라이드 개선, 다음 슬라이드 제안, 발표자 노트, 전체 개요 정리를 도와줘.`,

  drive: `${COMMON}

현재 컨텍스트는 파일 브라우저 화면이야.
파일 내용은 직접 보지 못하고 메타데이터만 볼 수 있어.
폴더 정리, 파일 분류, 비슷한 파일 찾기, 이름 규칙 제안을 도와줘.`,

  memo: `${COMMON}

현재 컨텍스트는 메모 작업 공간이야.
흩어진 메모 묶기, 제목 붙이기, 체크리스트 변환, 태그 추천, 실행 항목 뽑기,
짧은 초안 정리, 위키 문서로 옮기기 좋은 구조 제안을 도와줘.
메모의 원래 말투를 과하게 바꾸지 말고 실용적으로 답해.`,

  journal: `${COMMON}

현재 컨텍스트는 일기 공간이야.
오늘을 돌아보는 질문 만들기, 감정 흐름 요약, 반복되는 패턴 찾기, 제목 추천,
과거 일기와의 연결점 찾기를 도와줘.
판단하거나 진단하지 말고, 부드럽고 조심스럽게 표현해.`,
};

export const QUICK_ACTIONS: Record<AiKind, QuickAction[]> = {
  doc: [
    { id: 'summarize', label: '요약', prompt: '문서를 3~5문장으로 요약해줘.' },
    { id: 'shorten', label: '짧게', prompt: '선택한 부분이 있으면 그 부분을, 없으면 전체를 더 짧게 다듬어줘.' },
    { id: 'softer', label: '부드럽게', prompt: '문장을 더 부드럽고 자연스럽게 바꿔줘.' },
    { id: 'translate', label: '영어 번역', prompt: '자연스러운 영어로 번역해줘.' },
    { id: 'continue', label: '이어쓰기', prompt: '문서의 흐름에 맞게 다음 1~2문단을 이어 써줘.' },
  ],
  sheet: [
    { id: 'summarize', label: '데이터 요약', prompt: '선택 영역 데이터의 핵심을 3~5줄로 요약해줘.' },
    { id: 'formula', label: '수식 추천', prompt: '이 데이터에 어울리는 실용적인 수식 3개를 추천해줘.' },
    { id: 'trend', label: '추세 분석', prompt: '데이터에서 보이는 추세나 이상치를 짚어줘.' },
    { id: 'chart', label: '차트 제안', prompt: '이 데이터를 시각화한다면 어떤 차트가 좋을지 추천해줘.' },
  ],
  slide: [
    { id: 'improve', label: '슬라이드 개선', prompt: '현재 슬라이드의 제목과 본문을 더 선명하게 개선해줘.' },
    { id: 'next', label: '다음 슬라이드', prompt: '전체 흐름을 보고 다음 슬라이드 내용을 제안해줘.' },
    { id: 'notes', label: '발표 노트', prompt: '현재 슬라이드의 발표자 노트를 1~2문장으로 써줘.' },
    { id: 'outline', label: '전체 개요', prompt: '지금까지의 슬라이드를 발표 개요로 정리해줘.' },
  ],
  drive: [
    { id: 'summarize', label: '파일 요약', prompt: '선택한 파일의 이름과 메타데이터를 보고 용도를 추정해줘.' },
    { id: 'organize', label: '폴더 정리', prompt: '현재 파일들을 카테고리별로 정리하는 방법을 제안해줘.' },
    { id: 'similar', label: '비슷한 파일', prompt: '선택한 파일과 비슷한 파일이 있는지 짚어줘.' },
  ],
  memo: [
    { id: 'summarize', label: '요약', description: '핵심만 짧게 정리', prompt: '현재 메모의 핵심을 3줄로 요약해줘.' },
    { id: 'tasks', label: '할 일 뽑기', description: '바로 실행할 항목 추출', prompt: '메모에서 실행할 일을 체크리스트로 뽑아줘.' },
    { id: 'title', label: '제목 추천', description: '나중에 찾기 쉬운 이름', prompt: '이 메모에 어울리는 짧은 제목 5개를 추천해줘.' },
    { id: 'tags', label: '태그 추천', description: '묶어둘 주제 제안', prompt: '이 메모에 붙이면 좋은 태그를 5개 이하로 추천해줘.' },
  ],
  journal: [
    { id: 'reflect', label: '오늘 돌아보기', description: '감정과 사건의 흐름', prompt: '오늘 일기에서 감정과 사건의 흐름을 부드럽게 정리해줘.' },
    { id: 'question', label: '질문 하나', description: '조금 더 이어 쓰기', prompt: '이 기록을 더 깊게 이어 쓰기 위한 질문을 3개 제안해줘.' },
    { id: 'title', label: '제목 추천', description: '오늘에 어울리는 이름', prompt: '오늘 일기에 어울리는 제목 5개를 추천해줘.' },
    { id: 'pattern', label: '패턴 찾기', description: '최근 흐름 조심스럽게 보기', prompt: '최근 일기에서 반복되는 감정이나 생활 패턴이 있는지 조심스럽게 짚어줘.' },
  ],
};
