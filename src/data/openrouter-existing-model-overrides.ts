import type { Expert } from '@/types/expert';

type OpenRouterExistingModelOverride = Partial<Pick<Expert, 'name' | 'nameKo' | 'description' | 'tags' | 'sampleQuestions' | 'modelInfo'>>;

export const OPENROUTER_EXISTING_MODEL_OVERRIDES = {
  "developer-yjh": {
    "description": "복잡한 개발 맥락과 긴 코드 흐름을 함께 보며 구현 방향을 잡는 Anthropic 개발 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-02-17",
      "openWeight": false
    },
    "sampleQuestions": [
      "학습 계획 내용을 개선안으로 바꿔줘",
      "대시보드 속 이상한 점을 찾아줘",
      "첫 행동처럼 바로 읽게 써줘"
    ]
  },
  "ancano-pro": {
    "description": "질문 성격에 맞춰 비용과 품질 균형이 좋은 경로를 고르는 ANCA 자동 선택 모델",
    "tags": [
      "자동선택",
      "장문맥",
      "저비용",
      "범용"
    ],
    "modelInfo": {
      "provider": "Openrouter",
      "contextLength": 2000000,
      "inputModalities": [
        "text",
        "image",
        "audio",
        "file",
        "video"
      ],
      "outputModalities": [
        "text",
        "image"
      ],
      "priceTier": "low",
      "createdAt": "2023-11-08",
      "openWeight": false
    },
    "sampleQuestions": [
      "표 이미지 내용을 보고서 문장으로 바꿔줘",
      "마케팅 문구 내용을 개선안으로 바꿔줘",
      "낮은 중요도와 요약을 분리해줘"
    ]
  },
  "auto-gpt": {
    "description": "일반 대화와 개발 보조를 상황에 맞게 이어 주는 Anthropic 기반 자동 선택 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-02-17",
      "openWeight": false
    },
    "sampleQuestions": [
      "발표 대본 스타일로 세 줄만 써줘",
      "앱 화면 내용을 보고서 문장으로 바꿔줘",
      "데이터 해석 기준을 다시 잡아줘"
    ]
  },
  "gpt": {
    "name": "GPT-4.1",
    "nameKo": "GPT-4.1",
    "description": "긴 문서와 이미지 자료를 함께 보며 글쓰기와 코드 작업을 안정적으로 돕는 OpenAI 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 1047576,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-04-14",
      "openWeight": false
    },
    "sampleQuestions": [
      "설문 결과 전 쟁점을 뽑아줘",
      "문서 사진 속 이상한 점을 찾아줘",
      "초보자 설명 목록으로 따로 표시해줘"
    ]
  },
  "gpt-mini": {
    "name": "GPT-4.1 Mini",
    "nameKo": "GPT-4.1 Mini",
    "description": "문서 요약과 화면 이해를 빠르게 처리하며 비용 부담을 낮춘 OpenAI 모델",
    "tags": [
      "시각입력",
      "장문맥",
      "고속",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 1047576,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-04-14",
      "openWeight": false
    },
    "sampleQuestions": [
      "고객 이탈 체크 포인트를 만들어줘",
      "슬라이드 숫자만 정리해줘",
      "불확실한 부분 중심으로 다시 써줘"
    ]
  },
  "gpt-nano": {
    "name": "GPT-4.1 Nano",
    "nameKo": "GPT-4.1 Nano",
    "description": "짧은 답변, 분류, 간단한 자동화 작업을 빠르게 처리하는 OpenAI 경량 모델",
    "tags": [
      "시각입력",
      "장문맥",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 1047576,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-04-14",
      "openWeight": false
    },
    "sampleQuestions": [
      "화면 캡처 핵심 정보를 뽑아줘",
      "토론 준비 표현의 과장을 줄여줘",
      "단호한 표현 하나만 골라줘"
    ]
  },
  "claude": {
    "name": "Claude Opus 4.6",
    "nameKo": "Claude Opus 4.6",
    "description": "긴 문서와 까다로운 판단을 차분하게 풀어내는 Anthropic 고성능 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-02-04",
      "openWeight": false
    },
    "sampleQuestions": [
      "회의 발언 중심으로 다시 써줘",
      "영수증 속 이상한 점을 찾아줘",
      "사업 제안 문구를 짧게 만들어줘"
    ]
  },
  "claude-sonnet": {
    "name": "Claude Sonnet 4.5",
    "nameKo": "Claude Sonnet 4.5",
    "description": "코딩, 문서 작성, 분석 업무를 균형 있게 이어 가는 Anthropic 주력 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-09-29",
      "openWeight": false
    },
    "sampleQuestions": [
      "발표 대본을 찾아줘",
      "대시보드 핵심 정보를 뽑아줘",
      "공지 작성 전 쟁점을 뽑아줘"
    ]
  },
  "claude-sonnet-4.6": {
    "name": "Claude Sonnet 4.6",
    "nameKo": "Claude Sonnet 4.6",
    "description": "에이전트형 코딩과 긴 작업 흐름을 안정적으로 다루는 Anthropic Sonnet 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-02-17",
      "openWeight": false
    },
    "sampleQuestions": [
      "화면 캡처 속 이상한 점을 찾아줘",
      "학습 계획 내용을 더 명확하게 고쳐줘",
      "비교표 스타일로 세 줄만 써줘"
    ]
  },
  "claude-haiku": {
    "name": "Claude Haiku 4.5",
    "nameKo": "Claude Haiku 4.5",
    "description": "시각 입력이 섞인 자료를 빠르게 읽고 실행 항목으로 정리하는 Anthropic 모델",
    "tags": [
      "시각입력",
      "고속",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-10-15",
      "openWeight": false
    },
    "sampleQuestions": [
      "업무 요청 이슈를 원인별로 묶어줘",
      "앱 화면 숫자만 정리해줘",
      "핵심 메시지 목록만 체크해줘"
    ]
  },
  "gemini": {
    "name": "Gemini 2.5 Flash",
    "nameKo": "Gemini 2.5 Flash",
    "description": "텍스트와 멀티모달 자료를 빠르게 읽고 요약과 비교를 돕는 Google 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 1048576,
      "inputModalities": [
        "file",
        "image",
        "text",
        "audio",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-06-17",
      "openWeight": false
    },
    "sampleQuestions": [
      "슬라이드 숫자만 정리해줘",
      "기능 소개 문서를 순서대로 정리해줘",
      "예상 질문 형식으로 바꿔줘"
    ]
  },
  "gemini-3-flash": {
    "name": "Gemini 3 Flash Preview",
    "nameKo": "Gemini 3 Flash Preview",
    "description": "빠른 응답과 추론 균형을 살려 대화와 문서 작업을 처리하는 Google 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 1048576,
      "inputModalities": [
        "text",
        "image",
        "file",
        "audio",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-12-17",
      "openWeight": false
    },
    "sampleQuestions": [
      "낮은 중요도를 제목처럼 뽑아줘",
      "대시보드 내용을 보고서 문장으로 바꿔줘",
      "공지 작성 기준을 다시 잡아줘"
    ]
  },
  "gemini-3.1": {
    "name": "Gemini 3.1 Flash Lite Preview",
    "nameKo": "Gemini 3.1 Flash Lite Preview",
    "description": "가벼운 비용으로 긴 자료 요약과 일상 업무 처리를 돕는 Google 모델",
    "tags": [
      "시각입력",
      "장문맥",
      "고속",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 1048576,
      "inputModalities": [
        "text",
        "image",
        "video",
        "file",
        "audio"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-03-03",
      "openWeight": false
    },
    "sampleQuestions": [
      "장애 대응 항목을 우선순위로 정렬해줘",
      "앱 화면 핵심 정보를 뽑아줘",
      "장단점 목록만 체크해줘"
    ]
  },
  "gemini-pro": {
    "name": "Gemini 3.1 Pro Preview",
    "nameKo": "Gemini 3.1 Pro Preview",
    "description": "복잡한 분석과 멀티모달 이해를 함께 다루는 Google 상위 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 1048576,
      "inputModalities": [
        "audio",
        "file",
        "image",
        "text",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-02-19",
      "openWeight": false
    },
    "sampleQuestions": [
      "토론 준비 반복 의견을 묶어줘",
      "대시보드 속 이상한 점을 찾아줘",
      "비교표 톤으로 다듬어줘"
    ]
  },
  "gemini-flash-lite": {
    "name": "Gemini 2.5 Flash Lite",
    "nameKo": "Gemini 2.5 Flash Lite",
    "description": "일상 대화와 대량 요약을 빠르게 처리하는 Google 경량 모델",
    "tags": [
      "시각입력",
      "장문맥",
      "저비용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 1048576,
      "inputModalities": [
        "text",
        "image",
        "file",
        "audio",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-07-22",
      "openWeight": false
    },
    "sampleQuestions": [
      "슬라이드 내용을 할 일로 바꿔줘",
      "경쟁사 비교 목차를 새로 짜줘",
      "발표 대본을 제목처럼 뽑아줘"
    ]
  },
  "perplexity": {
    "name": "Sonar",
    "nameKo": "Sonar",
    "description": "최신 자료 확인과 출처 기반 요약을 빠르게 돕는 Perplexity 검색 모델",
    "tags": [
      "검색",
      "시각입력",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Perplexity",
      "contextLength": 127072,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-01-27",
      "openWeight": false
    },
    "sampleQuestions": [
      "결론 중심으로 번호를 매겨줘",
      "제품 이슈 최신 쟁점을 정리해줘",
      "사업 제안 항목을 우선순위로 정렬해줘"
    ]
  },
  "perplexity-pro": {
    "name": "Sonar Pro",
    "nameKo": "Sonar Pro",
    "description": "깊은 리서치와 출처 비교가 필요한 질문에 맞춘 Perplexity 상위 모델",
    "tags": [
      "검색",
      "시각입력",
      "문맥처리",
      "업무"
    ],
    "modelInfo": {
      "provider": "Perplexity",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-03-07",
      "openWeight": false
    },
    "sampleQuestions": [
      "예상 질문 중심으로 번호를 매겨줘",
      "시장 동향 반대 근거를 찾아줘",
      "공지 작성 이슈를 원인별로 묶어줘"
    ]
  },
  "grok": {
    "name": "Grok 4.3",
    "nameKo": "Grok 4.3",
    "description": "직설적인 요약과 분위기 파악이 필요한 대화에 강한 xAI 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "xAI",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-04-30",
      "openWeight": false
    },
    "sampleQuestions": [
      "공유 문장 목록으로 따로 표시해줘",
      "대시보드 핵심 정보를 뽑아줘",
      "기능 소개 내용을 한 문단으로 줄여줘"
    ]
  },
  "grok-4.2": {
    "name": "Grok 4.20",
    "nameKo": "Grok 4.20",
    "description": "긴 대화 맥락과 복잡한 판단을 함께 다루는 xAI 고성능 모델",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "추론"
    ],
    "modelInfo": {
      "provider": "xAI",
      "contextLength": 2000000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-03-31",
      "openWeight": false
    },
    "sampleQuestions": [
      "설문 결과 사유를 깔끔하게 정리해줘",
      "채용 기준 최악 상황을 따져줘",
      "보류할 이유 스타일로 세 줄만 써줘"
    ]
  },
  "deepseek": {
    "name": "DeepSeek V3 0324",
    "nameKo": "DeepSeek V3 0324",
    "description": "코드 문제와 구조화된 분석을 낮은 비용으로 풀어내는 DeepSeek 모델",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "DeepSeek",
      "contextLength": 163840,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-03-24",
      "openWeight": true
    },
    "sampleQuestions": [
      "데이터 해석 이해관계를 정리해줘",
      "자료 템플릿 안전 요약본을 만들어줘",
      "원인과 해결책 세 가지를 미리 예상해줘"
    ]
  },
  "deepseek-r1": {
    "name": "R1",
    "nameKo": "R1",
    "description": "수학, 논리, 코드 판단을 단계적으로 풀어내는 DeepSeek 추론 모델",
    "tags": [
      "오픈웨이트",
      "툴사용",
      "구조화",
      "추론"
    ],
    "modelInfo": {
      "provider": "DeepSeek",
      "contextLength": 163840,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-01-20",
      "openWeight": true
    },
    "sampleQuestions": [
      "액션아이템 형태로 한눈에 보이게 해줘",
      "토론 쟁점 약한 논리를 짚어줘",
      "데이터 해석 흐름을 자연스럽게 짜줘"
    ]
  },
  "qwen": {
    "name": "Qwen3.5-Flash",
    "nameKo": "Qwen3.5-Flash",
    "description": "다국어 문서와 코딩 보조를 폭넓게 처리하는 Qwen 오픈웨이트 모델",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "장문맥",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-02-25",
      "openWeight": true
    },
    "sampleQuestions": [
      "차트 이미지 내용을 보고서 문장으로 바꿔줘",
      "프로젝트 범위 전 쟁점을 뽑아줘",
      "첫 행동 세 개를 추천해줘"
    ]
  },
  "qwen-9b": {
    "name": "Qwen3.5-9B",
    "nameKo": "Qwen3.5-9B",
    "description": "가벼운 코딩 보조와 다국어 응답을 빠르게 처리하는 Qwen 모델",
    "tags": [
      "코딩",
      "오픈웨이트",
      "시각입력",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 262144,
      "inputModalities": [
        "text",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-03-10",
      "openWeight": true
    },
    "sampleQuestions": [
      "실행 순서 스타일로 세 줄만 써줘",
      "화면 캡처 핵심 정보를 뽑아줘",
      "이해관계자 의견 내용을 더 명확하게 고쳐줘"
    ]
  },
  "qwen-plus": {
    "name": "Qwen3.6 Plus",
    "nameKo": "Qwen3.6 Plus",
    "description": "문서 분석과 다국어 추론을 안정적으로 이어 가는 Qwen 상위 모델",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "장문맥",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-04-02",
      "openWeight": true
    },
    "sampleQuestions": [
      "사업 제안 항목을 우선순위로 정렬해줘",
      "차트 이미지 속 이상한 점을 찾아줘",
      "공유 문장 형태로 다시 써줘"
    ]
  },
  "qwen-thinking": {
    "name": "Qwen3 Max Thinking",
    "nameKo": "Qwen3 Max Thinking",
    "description": "생각 과정이 필요한 문제를 단계적으로 정리하는 Qwen 추론 모델",
    "tags": [
      "오픈웨이트",
      "중국어",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-02-09",
      "openWeight": true
    },
    "sampleQuestions": [
      "학습 계획 내용을 개선안으로 바꿔줘",
      "투자 판단 숨은 전제를 찾아줘",
      "의사결정 요약 형식으로 바꿔줘"
    ]
  },
  "llama-maverick": {
    "name": "Llama 4 Maverick",
    "nameKo": "Llama 4 Maverick",
    "description": "이미지와 긴 문서를 함께 다루는 Meta 오픈웨이트 모델",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "장문맥",
      "저비용"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 1048576,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-04-05",
      "openWeight": true
    },
    "sampleQuestions": [
      "비교표를 먼저 찾아줘",
      "문서 사진 숫자만 정리해줘",
      "사용자 불편 목차를 새로 짜줘"
    ]
  },
  "llama-scout": {
    "name": "Llama 4 Scout",
    "nameKo": "Llama 4 Scout",
    "description": "넓은 자료 탐색과 빠른 멀티모달 처리를 돕는 Meta 모델",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "장문맥",
      "저비용"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 10000000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-04-05",
      "openWeight": true
    },
    "sampleQuestions": [
      "문서 사진 내용을 보고서 문장으로 바꿔줘",
      "발표 준비 반복 의견을 묶어줘",
      "결론 톤으로 다듬어줘"
    ]
  },
  "mistral-large": {
    "name": "Mistral Large 3 2512",
    "nameKo": "Mistral Large 3 2512",
    "description": "유럽권 언어와 업무 문서 처리에 강한 Mistral 상위 모델",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 262144,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-12-01",
      "openWeight": true
    },
    "sampleQuestions": [
      "단호한 표현 스타일로 세 줄만 써줘",
      "슬라이드 흐름 문제를 짚어줘",
      "장애 대응 해석의 허점을 찾아줘"
    ]
  },
  "mistral-medium": {
    "name": "Mistral Medium 3.1",
    "nameKo": "Mistral Medium 3.1",
    "description": "일반 업무와 문서 분석을 균형 있게 처리하는 Mistral 모델",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 131072,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-08-13",
      "openWeight": true
    },
    "sampleQuestions": [
      "신제품 회의 계획을 주간 단위로 나눠줘",
      "영수증 내용을 할 일로 바꿔줘",
      "반박 포인트 예시를 만들어줘"
    ]
  },
  "mistral-small": {
    "name": "Mistral Small 4",
    "nameKo": "Mistral Small 4",
    "description": "가벼운 비용으로 요약과 시각 입력을 처리하는 Mistral 모델",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 262144,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-03-16",
      "openWeight": true
    },
    "sampleQuestions": [
      "장애 대응 항목을 우선순위로 정렬해줘",
      "앱 화면 핵심 정보를 뽑아줘",
      "장단점 목록만 체크해줘"
    ]
  },
  "codestral": {
    "name": "Codestral 2508",
    "nameKo": "Codestral 2508",
    "description": "코드 생성, 보완, 리뷰 흐름에 초점을 둔 Mistral 개발 모델",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 256000,
      "inputModalities": [
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-08-01",
      "openWeight": true
    },
    "sampleQuestions": [
      "이해관계자 의견 내용을 더 명확하게 고쳐줘",
      "리뷰 댓글 빠진 조건을 찾아줘",
      "확인 사항으로 더 단호하게 바꿔줘"
    ]
  },
  "devstral": {
    "name": "Devstral 2 2512",
    "nameKo": "Devstral 2 2512",
    "description": "저장소 이해와 에이전트형 개발 작업에 맞춘 Mistral 개발 모델",
    "tags": [
      "코딩",
      "오픈웨이트",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 262144,
      "inputModalities": [
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-12-09",
      "openWeight": true
    },
    "sampleQuestions": [
      "신제품 회의 질문을 준비해줘",
      "리팩터링안 우선순위를 정해줘",
      "의사결정 요약 목록으로 따로 표시해줘"
    ]
  },
  "gemma": {
    "name": "Gemma 4 31B",
    "nameKo": "Gemma 4 31B",
    "description": "일반 대화와 문서 처리를 가볍게 실행하는 Google 오픈웨이트 모델",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 262144,
      "inputModalities": [
        "image",
        "text",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-02",
      "openWeight": true
    },
    "sampleQuestions": [
      "프로젝트 범위 내용을 더 명확하게 고쳐줘",
      "영수증 핵심 정보를 뽑아줘",
      "의사결정 요약으로 더 단호하게 바꿔줘"
    ]
  },
  "phi": {
    "name": "Phi 4",
    "nameKo": "Phi 4",
    "description": "작은 규모에서도 논리 문제와 구조화된 답변을 노리는 Microsoft 모델",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화",
      "업무"
    ],
    "modelInfo": {
      "provider": "Microsoft",
      "contextLength": 16384,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-01-10",
      "openWeight": true
    },
    "sampleQuestions": [
      "보고 문장 톤으로 다듬어줘",
      "정책 초안 반복 업무용으로 바꿔줘",
      "발표 준비 체크 포인트를 만들어줘"
    ]
  },
  "command-r-plus": {
    "name": "Command R+ (08-2024)",
    "nameKo": "Command R+ (08-2024)",
    "description": "RAG 검색, 인용 기반 답변, 기업용 질의응답에 맞춘 Cohere 모델",
    "tags": [
      "검색",
      "구조화",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Cohere",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2024-08-30",
      "openWeight": false
    },
    "sampleQuestions": [
      "보고 문장 형식으로 바꿔줘",
      "면접 답변 공유용으로 정리해줘",
      "장애 대응 문장을 부드럽게 써줘"
    ]
  },
  "command-a": {
    "name": "Command A",
    "nameKo": "Command A",
    "description": "업무용 검색과 구조화된 답변을 안정적으로 처리하는 Cohere 모델",
    "tags": [
      "코딩",
      "구조화",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Cohere",
      "contextLength": 256000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-03-13",
      "openWeight": false
    },
    "sampleQuestions": [
      "핵심 메시지와 요약을 분리해줘",
      "면접 답변 더 명확하게 고쳐줘",
      "장애 대응 문서를 순서대로 정리해줘"
    ]
  },
  "nova-premier": {
    "name": "Nova Premier 1.0",
    "nameKo": "Nova Premier 1.0",
    "description": "대규모 문서와 멀티모달 업무를 폭넓게 다루는 Amazon 상위 모델",
    "tags": [
      "시각입력",
      "장문맥",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Amazon",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-10-31",
      "openWeight": false
    },
    "sampleQuestions": [
      "결론 중심으로 번호를 매겨줘",
      "영수증 핵심 정보를 뽑아줘",
      "발표 준비 표현의 과장을 줄여줘"
    ]
  },
  "nova-2-lite": {
    "name": "Nova 2 Lite",
    "nameKo": "Nova 2 Lite",
    "description": "긴 자료를 빠르게 훑고 요약하는 Amazon 경량 멀티모달 모델",
    "tags": [
      "시각입력",
      "장문맥",
      "고속",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Amazon",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image",
        "video",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-12-02",
      "openWeight": false
    },
    "sampleQuestions": [
      "대시보드 핵심 정보를 뽑아줘",
      "팀 회고 문장을 부드럽게 써줘",
      "불확실한 부분처럼 바로 읽게 써줘"
    ]
  },
  "dolphin": {
    "name": "Uncensored Free",
    "nameKo": "Uncensored Free",
    "description": "자유로운 지시 수행과 창작형 대화에 맞춘 오픈웨이트 모델",
    "tags": [
      "오픈웨이트",
      "무료",
      "구조화",
      "업무"
    ],
    "modelInfo": {
      "provider": "Cognitive Computations",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2025-07-09",
      "openWeight": true
    },
    "sampleQuestions": [
      "발표 준비 표현의 과장을 줄여줘",
      "보안 검토 민감정보를 줄여줘",
      "회의 발언 예시를 만들어줘"
    ]
  },
  "glm": {
    "name": "GLM 5.1",
    "nameKo": "GLM 5.1",
    "description": "중국어와 업무형 추론을 균형 있게 처리하는 Z.ai 모델",
    "tags": [
      "코딩",
      "오픈웨이트",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Z.ai",
      "contextLength": 202752,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-04-07",
      "openWeight": true
    },
    "sampleQuestions": [
      "상황별 답변 방식으로 쉽게 풀어줘",
      "자료 템플릿 검토 항목을 뽑아줘",
      "프로젝트 범위 이해관계를 정리해줘"
    ]
  },
  "mimo": {
    "name": "MiMo-V2.5-Pro",
    "nameKo": "MiMo-V2.5-Pro",
    "description": "다국어 업무와 일반 분석을 함께 처리하는 Xiaomi 모델",
    "tags": [
      "코딩",
      "장문맥",
      "저비용",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Xiaomi",
      "contextLength": 1048576,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-22",
      "openWeight": false
    },
    "sampleQuestions": [
      "사업 제안 목차를 새로 짜줘",
      "제안서 실행 순서로 바꿔줘",
      "보고 문장 형태로 다시 써줘"
    ]
  },
  "mimo-flash": {
    "name": "MiMo-V2-Flash",
    "nameKo": "MiMo-V2-Flash",
    "description": "짧은 질의와 빠른 응답을 중심으로 설계된 Xiaomi 경량 모델",
    "tags": [
      "저비용",
      "고속",
      "툴사용",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Xiaomi",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-12-14",
      "openWeight": false
    },
    "sampleQuestions": [
      "고객 이탈 체크 포인트를 만들어줘",
      "요약문 표현을 덜어줘",
      "확인 사항 기준을 맞춰줘"
    ]
  },
  "nemotron": {
    "name": "Nemotron 3 Super",
    "nameKo": "Nemotron 3 Super",
    "description": "기업형 추론과 코드 보조 작업을 겨냥한 NVIDIA 모델",
    "tags": [
      "오픈웨이트",
      "장문맥",
      "저비용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "NVIDIA",
      "contextLength": 1000000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-03-11",
      "openWeight": true
    },
    "sampleQuestions": [
      "반박 포인트 형태로 한눈에 보이게 해줘",
      "자료 템플릿 분류 규칙을 만들어줘",
      "신제품 회의 기준을 다시 잡아줘"
    ]
  },
  "seed": {
    "name": "Seed-2.0-Lite",
    "nameKo": "Seed-2.0-Lite",
    "description": "빠른 응답과 멀티모달 이해를 함께 제공하는 ByteDance 모델",
    "tags": [
      "시각입력",
      "고속",
      "툴사용",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "ByteDance Seed",
      "contextLength": 262144,
      "inputModalities": [
        "text",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-03-10",
      "openWeight": false
    },
    "sampleQuestions": [
      "발표 대본 구간을 따로 표시해줘",
      "앱 화면 흐름 문제를 짚어줘",
      "일정 지연 계획을 주간 단위로 나눠줘"
    ]
  },
  "seed-mini": {
    "name": "Seed-2.0-Mini",
    "nameKo": "Seed-2.0-Mini",
    "description": "비용 효율적인 요약과 일상 작업에 맞춘 ByteDance 경량 모델",
    "tags": [
      "시각입력",
      "저비용",
      "고속",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "ByteDance Seed",
      "contextLength": 262144,
      "inputModalities": [
        "text",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-02-26",
      "openWeight": false
    },
    "sampleQuestions": [
      "사업 제안 목차를 새로 짜줘",
      "차트 이미지 흐름 문제를 짚어줘",
      "결론을 제목처럼 뽑아줘"
    ]
  },
  "minimax": {
    "name": "MiniMax M2.7",
    "nameKo": "MiniMax M2.7",
    "description": "긴 문맥과 업무형 대화를 안정적으로 처리하는 MiniMax 모델",
    "tags": [
      "코딩",
      "저비용",
      "고속",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "MiniMax",
      "contextLength": 204800,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-03-18",
      "openWeight": false
    },
    "sampleQuestions": [
      "신제품 회의 흐름을 자연스럽게 짜줘",
      "짧은 안내문 표현을 덜어줘",
      "첫 행동으로 더 단호하게 바꿔줘"
    ]
  },
  "kimi": {
    "name": "Kimi K2.5",
    "nameKo": "Kimi K2.5",
    "description": "긴 문서 리서치와 코딩 보조에 강한 Moonshot 모델",
    "tags": [
      "코딩",
      "시각입력",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Moonshot AI",
      "contextLength": 262144,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-01-27",
      "openWeight": false
    },
    "sampleQuestions": [
      "표 이미지 핵심 정보를 뽑아줘",
      "장애 대응 항목을 우선순위로 정렬해줘",
      "장단점 목록만 체크해줘"
    ]
  },
  "kimi-thinking": {
    "name": "Kimi K2 Thinking",
    "nameKo": "Kimi K2 Thinking",
    "description": "단계적 추론과 장문 분석을 함께 다루는 Moonshot 모델",
    "tags": [
      "코딩",
      "중국어",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "Moonshot AI",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-11-06",
      "openWeight": false
    },
    "sampleQuestions": [
      "채용 기준 점수표를 만들어줘",
      "사업 제안 목차를 새로 짜줘",
      "회의 발언 하나만 골라줘"
    ]
  },
  "solar": {
    "name": "Solar Pro 3",
    "nameKo": "Solar Pro 3",
    "description": "한국어 업무 문서와 논리 정리를 돕는 Upstage 모델",
    "tags": [
      "저비용",
      "한국어",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Upstage",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-01-27",
      "openWeight": false
    },
    "sampleQuestions": [
      "공지문 다음 질문을 만들어줘",
      "사용자 불편 목차를 새로 짜줘",
      "단호한 표현 형태로 한눈에 보이게 해줘"
    ]
  },
  "mercury": {
    "name": "Mercury 2",
    "nameKo": "Mercury 2",
    "description": "낮은 지연 시간으로 빠른 추론 응답을 제공하는 Inception 모델",
    "tags": [
      "저비용",
      "툴사용",
      "구조화",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Inception Labs",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-03-04",
      "openWeight": false
    },
    "sampleQuestions": [
      "경쟁사 비교 계획을 주간 단위로 나눠줘",
      "기획안 실행 순서로 바꿔줘",
      "회의 발언 목록만 체크해줘"
    ]
  },
  "hunyuan": {
    "name": "Hunyuan A13B Instruct",
    "nameKo": "Hunyuan A13B Instruct",
    "description": "중국어 업무 대화와 구조화된 답변에 맞춘 Tencent 모델",
    "tags": [
      "저비용",
      "중국어",
      "구조화",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Tencent",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-07-08",
      "openWeight": false
    },
    "sampleQuestions": [
      "업무 메시지 더 공손하게 바꿔줘",
      "이해관계자 의견 표현의 과장을 줄여줘",
      "불확실한 부분 예시를 만들어줘"
    ]
  },
  "jamba": {
    "name": "Jamba Large 1.7",
    "nameKo": "Jamba Large 1.7",
    "description": "긴 문서 처리와 기업형 질의응답을 지원하는 AI21 모델",
    "tags": [
      "툴사용",
      "구조화",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "AI21 Labs",
      "contextLength": 256000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-08-08",
      "openWeight": false
    },
    "sampleQuestions": [
      "사용자 불편 문장을 부드럽게 써줘",
      "학습 노트 핵심을 뽑아줘",
      "핵심 메시지 세 가지를 미리 예상해줘"
    ]
  },
  "granite": {
    "name": "Granite 4.0 Micro",
    "nameKo": "Granite 4.0 Micro",
    "description": "기업 문서와 코드 보조를 안정적으로 처리하는 IBM 모델",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "IBM",
      "contextLength": 131000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-10-20",
      "openWeight": true
    },
    "sampleQuestions": [
      "확인 사항 형식으로 바꿔줘",
      "자료 템플릿 민감정보를 줄여줘",
      "프로젝트 범위 내용을 개선안으로 바꿔줘"
    ]
  },
  "step": {
    "name": "Step 3.5 Flash",
    "nameKo": "Step 3.5 Flash",
    "description": "중국어 실무 질의와 빠른 응답에 맞춘 StepFun 모델",
    "tags": [
      "저비용",
      "고속",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "StepFun",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-01-29",
      "openWeight": false
    },
    "sampleQuestions": [
      "다음 질문 하나만 골라줘",
      "요청사항 더 공손하게 바꿔줘",
      "설문 결과 표현의 과장을 줄여줘"
    ]
  },
  "palmyra": {
    "name": "Palmyra X5",
    "nameKo": "Palmyra X5",
    "description": "비즈니스 문서 작성과 긴 글 작업에 특화된 Writer 모델",
    "tags": [
      "장문맥",
      "창작",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Writer",
      "contextLength": 1040000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-01-21",
      "openWeight": false
    },
    "sampleQuestions": [
      "고객 피드백 핵심을 뽑아줘",
      "사업 제안 항목을 우선순위로 정렬해줘",
      "예상 질문을 먼저 찾아줘"
    ]
  }
} satisfies Record<string, OpenRouterExistingModelOverride>;
