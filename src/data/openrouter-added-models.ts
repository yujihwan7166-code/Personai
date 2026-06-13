import type { AIAbilityStats, Expert, ModelInfo } from '@/types/expert';
import type { ModelBrand } from '@/lib/modelTaxonomy';

export const OPENROUTER_ADDED_EXPERTS = [
  {
    "id": "or-google-gemini-3-1-flash-lite",
    "name": "Gemini 3.1 Flash Lite",
    "nameKo": "Gemini 3.1 Flash Lite",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemini-3.1-flash-lite",
    "description": "경량 입력에서도 문서 내용과 대화 맥락을 자연스럽게 연결하는 Google 모델",
    "quote": "Gemini 3.1 Flash Lite로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "대시보드 내용을 할 일로 바꿔줘",
      "설문 결과 흐름을 자연스럽게 짜줘",
      "확인 사항으로 더 단호하게 바꿔줘"
    ],
    "greeting": "Google의 Gemini 3.1 Flash Lite입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
        "video",
        "file",
        "audio"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-05-07",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5",
    "name": "GPT-5",
    "nameKo": "GPT-5",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5",
    "description": "고난도 작업 조건의 범용 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 OpenAI 모델",
    "quote": "GPT-5로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "공지 작성 이해관계를 정리해줘",
      "화면 캡처 숫자만 정리해줘",
      "회의 발언 세 가지를 미리 예상해줘"
    ],
    "greeting": "OpenAI의 GPT-5입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-08-07",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-pro",
    "name": "GPT-5 Pro",
    "nameKo": "GPT-5 Pro",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5-pro",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 OpenAI 모델",
    "quote": "GPT-5 Pro로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "표 이미지 속 이상한 점을 찾아줘",
      "업무 요청 기준을 다시 잡아줘",
      "장단점 기준을 맞춰줘"
    ],
    "greeting": "OpenAI의 GPT-5 Pro입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-10-06",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-mini",
    "name": "GPT-5 Mini",
    "nameKo": "GPT-5 Mini",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5-mini",
    "description": "문서와 시각 자료를 함께 읽고 핵심을 정리하는 OpenAI 모델",
    "quote": "GPT-5 Mini로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "대시보드 흐름 문제를 짚어줘",
      "팀 회고 문서를 순서대로 정리해줘",
      "주의할 점 형식으로 바꿔줘"
    ],
    "greeting": "OpenAI의 GPT-5 Mini입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "고속",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-08-07",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-nano",
    "name": "GPT-5 Nano",
    "nameKo": "GPT-5 Nano",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5-nano",
    "description": "이미지와 문서 내용을 빠르게 읽고 핵심만 정리하는 OpenAI 모델",
    "quote": "GPT-5 Nano로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "보고 문장으로 더 단호하게 바꿔줘",
      "영수증 속 이상한 점을 찾아줘",
      "사업 제안 문구를 짧게 만들어줘"
    ],
    "greeting": "OpenAI의 GPT-5 Nano입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "저비용",
      "고속",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-08-07",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-4-nano",
    "name": "GPT-5.4 Nano",
    "nameKo": "GPT-5.4 Nano",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.4-nano",
    "description": "저비용 호출 조건의 경량 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 OpenAI 모델",
    "quote": "GPT-5.4 Nano로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "슬라이드 내용을 보고서 문장으로 바꿔줘",
      "공지 작성 기준을 다시 잡아줘",
      "발표 대본 스타일로 세 줄만 써줘"
    ],
    "greeting": "OpenAI의 GPT-5.4 Nano입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "저비용",
      "고속",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-03-17",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-3-chat",
    "name": "GPT-5.3 Chat",
    "nameKo": "GPT-5.3 Chat",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.3-chat",
    "description": "범용 입력에서도 문서 내용과 대화 맥락을 자연스럽게 연결하는 OpenAI 모델",
    "quote": "GPT-5.3 Chat로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문 구조로 나눠서 써줘",
      "앱 화면 핵심 정보를 뽑아줘",
      "예산 검토 내용을 한 문단으로 줄여줘"
    ],
    "greeting": "OpenAI의 GPT-5.3 Chat입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-03-03",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-3-codex",
    "name": "GPT-5.3-Codex",
    "nameKo": "GPT-5.3-Codex",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.3-codex",
    "description": "개발자용 작업에 맞춰 버그 원인 분석과 구현 대안을 비교하는 OpenAI 모델",
    "quote": "GPT-5.3-Codex로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "테스트 코드 원인을 좁혀줘",
      "발표 준비 표현의 과장을 줄여줘",
      "공유 문장 형태로 다시 써줘"
    ],
    "greeting": "OpenAI의 GPT-5.3-Codex입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-02-24",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-2-pro",
    "name": "GPT-5.2 Pro",
    "nameKo": "GPT-5.2 Pro",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.2-pro",
    "description": "복잡한 문서와 이미지 자료를 차분히 정리하는 OpenAI 모델",
    "quote": "GPT-5.2 Pro로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "경쟁사 비교 항목을 우선순위로 정렬해줘",
      "화면 캡처 속 이상한 점을 찾아줘",
      "예상 질문을 먼저 찾아줘"
    ],
    "greeting": "OpenAI의 GPT-5.2 Pro입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-12-10",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-2",
    "name": "GPT-5.2",
    "nameKo": "GPT-5.2",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.2",
    "description": "문서와 이미지 자료를 함께 읽고 핵심 내용을 정리하는 OpenAI 모델",
    "quote": "GPT-5.2로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사업 제안 질문을 준비해줘",
      "차트 이미지 핵심 정보를 뽑아줘",
      "보고 문장 구조로 나눠서 써줘"
    ],
    "greeting": "OpenAI의 GPT-5.2입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-12-10",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-2-chat",
    "name": "GPT-5.2 Chat",
    "nameKo": "GPT-5.2 Chat",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.2-chat",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 OpenAI 모델",
    "quote": "GPT-5.2 Chat로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "표 이미지 핵심 정보를 뽑아줘",
      "장애 대응 항목을 우선순위로 정렬해줘",
      "결론 중심으로 번호를 매겨줘"
    ],
    "greeting": "OpenAI의 GPT-5.2 Chat입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-12-10",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-2-codex",
    "name": "GPT-5.2-Codex",
    "nameKo": "GPT-5.2-Codex",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.2-codex",
    "description": "장문 코드 맥락에서 구조 파악, 수정안, 테스트 보완을 이어가기 좋은 OpenAI 모델",
    "quote": "GPT-5.2-Codex로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문을 먼저 찾아줘",
      "API 설계 원인을 좁혀줘",
      "공지 작성 표현의 과장을 줄여줘"
    ],
    "greeting": "OpenAI의 GPT-5.2-Codex입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-01-14",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-codex",
    "name": "GPT-5 Codex",
    "nameKo": "GPT-5 Codex",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5-codex",
    "description": "API 설계와 테스트 케이스 점검을 돕는 OpenAI 개발 모델",
    "quote": "GPT-5 Codex로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "보고 문장 중심으로 번호를 매겨줘",
      "리뷰 댓글 체크리스트를 만들어줘",
      "마케팅 문구 주제를 찬반 질문으로 바꿔줘"
    ],
    "greeting": "OpenAI의 GPT-5 Codex입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-09-23",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-1-chat",
    "name": "GPT-5.1 Chat",
    "nameKo": "GPT-5.1 Chat",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.1-chat",
    "description": "복잡한 자료를 읽고 요약과 판단 근거를 정리하는 OpenAI 모델",
    "quote": "GPT-5.1 Chat로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "마케팅 문구 주제를 찬반 질문으로 바꿔줘",
      "앱 화면 숫자만 정리해줘",
      "단호한 표현을 찾아줘"
    ],
    "greeting": "OpenAI의 GPT-5.1 Chat입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-11-13",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-1-codex-max",
    "name": "GPT-5.1-Codex-Max",
    "nameKo": "GPT-5.1-Codex-Max",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.1-codex-max",
    "description": "저장소 이해와 개발 질의 응답을 작업 흐름으로 처리하기 좋은 OpenAI 모델",
    "quote": "GPT-5.1-Codex-Max로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "비교표를 찾아줘",
      "리뷰 댓글 단계별 수정안을 써줘",
      "장애 대응 문서를 순서대로 정리해줘"
    ],
    "greeting": "OpenAI의 GPT-5.1-Codex-Max입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-12-04",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-1-codex",
    "name": "GPT-5.1-Codex",
    "nameKo": "GPT-5.1-Codex",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.1-codex",
    "description": "API 설계와 테스트 케이스 점검을 돕는 OpenAI 개발 모델",
    "quote": "GPT-5.1-Codex로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "설문 결과 이해관계를 정리해줘",
      "테스트 코드 위험 구간을 표시해줘",
      "불확실한 부분 목록으로 따로 표시해줘"
    ],
    "greeting": "OpenAI의 GPT-5.1-Codex입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-11-13",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-1-codex-mini",
    "name": "GPT-5.1-Codex-Mini",
    "nameKo": "GPT-5.1-Codex-Mini",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.1-codex-mini",
    "description": "저장소 이해와 개발 질의 응답을 작업 흐름으로 처리하기 좋은 OpenAI 모델",
    "quote": "GPT-5.1-Codex-Mini로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "팀 회고 내용을 한 문단으로 줄여줘",
      "테스트 코드 원인을 좁혀줘",
      "불확실한 부분 세 개를 추천해줘"
    ],
    "greeting": "OpenAI의 GPT-5.1-Codex-Mini입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "고속",
      "툴사용",
      "코딩"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-11-13",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-5-pro",
    "name": "GPT-5.5 Pro",
    "nameKo": "GPT-5.5 Pro",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.5-pro",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 OpenAI 모델",
    "quote": "GPT-5.5 Pro로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "다음 질문 방식으로 쉽게 풀어줘",
      "차트 이미지 속 이상한 점을 찾아줘",
      "설문 결과 전 쟁점을 뽑아줘"
    ],
    "greeting": "OpenAI의 GPT-5.5 Pro입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 1050000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-04-24",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-5",
    "name": "GPT-5.5",
    "nameKo": "GPT-5.5",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.5",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 OpenAI 모델",
    "quote": "GPT-5.5로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "발표 대본 구간을 따로 표시해줘",
      "앱 화면 흐름 문제를 짚어줘",
      "일정 지연 계획을 주간 단위로 나눠줘"
    ],
    "greeting": "OpenAI의 GPT-5.5입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 1050000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-04-24",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-4-pro",
    "name": "GPT-5.4 Pro",
    "nameKo": "GPT-5.4 Pro",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.4-pro",
    "description": "복잡한 자료를 읽고 요약과 판단 근거를 정리하는 OpenAI 모델",
    "quote": "GPT-5.4 Pro로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "화면 캡처 내용을 보고서 문장으로 바꿔줘",
      "사용자 불편 문장을 부드럽게 써줘",
      "장단점 구조로 나눠서 써줘"
    ],
    "greeting": "OpenAI의 GPT-5.4 Pro입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 1050000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-03-05",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-4",
    "name": "GPT-5.4",
    "nameKo": "GPT-5.4",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.4",
    "description": "복잡한 자료를 읽고 요약과 판단 근거를 정리하는 OpenAI 모델",
    "quote": "GPT-5.4로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "확인 사항으로 더 단호하게 바꿔줘",
      "표 이미지 핵심 정보를 뽑아줘",
      "프로젝트 범위 내용을 더 명확하게 고쳐줘"
    ],
    "greeting": "OpenAI의 GPT-5.4입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 1050000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-03-05",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-1",
    "name": "GPT-5.1",
    "nameKo": "GPT-5.1",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.1",
    "description": "고난도 작업 조건의 범용 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 OpenAI 모델",
    "quote": "GPT-5.1로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "화면 캡처 흐름 문제를 짚어줘",
      "학습 계획 사유를 깔끔하게 정리해줘",
      "비교표 항목은 과감히 덜어줘"
    ],
    "greeting": "OpenAI의 GPT-5.1입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-11-13",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-chat-latest",
    "name": "GPT Chat Latest",
    "nameKo": "GPT Chat Latest",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-chat-latest",
    "description": "범용 입력에서도 문서 내용과 대화 맥락을 자연스럽게 연결하는 OpenAI 모델",
    "quote": "GPT Chat Latest로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "온보딩 문장을 부드럽게 써줘",
      "슬라이드 속 이상한 점을 찾아줘",
      "확인 사항 형식으로 바꿔줘"
    ],
    "greeting": "OpenAI의 GPT Chat Latest입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-05-05",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o3-pro",
    "name": "o3 Pro",
    "nameKo": "o3 Pro",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o3-pro",
    "description": "모호한 질문을 쪼개고 단계별 판단 근거를 정리하는 OpenAI 모델",
    "quote": "o3 Pro로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "불확실한 부분처럼 바로 읽게 써줘",
      "의사결정안 기준별 비교표를 만들어줘",
      "고객 이탈 반복 의견을 묶어줘"
    ],
    "greeting": "OpenAI의 o3 Pro입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "file",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-06-10",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o3",
    "name": "o3",
    "nameKo": "o3",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o3",
    "description": "모호한 질문을 쪼개고 단계별 판단 근거를 정리하는 OpenAI 모델",
    "quote": "o3로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "우선순위 숨은 전제를 찾아줘",
      "채용 검토 문장을 부드럽게 써줘",
      "비교표 톤으로 다듬어줘"
    ],
    "greeting": "OpenAI의 o3입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-04-16",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o3-deep-research",
    "name": "o3 Deep Research",
    "nameKo": "o3 Deep Research",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o3-deep-research",
    "description": "출처 확인과 최신 쟁점 정리에 맞춘 OpenAI 검색형 모델",
    "quote": "o3 Deep Research로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "채용 검토 목차를 새로 짜줘",
      "제품 이슈 반대 근거를 찾아줘",
      "반박 포인트 하나만 골라줘"
    ],
    "greeting": "OpenAI의 o3 Deep Research입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "시각입력",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-10-10",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o4-mini-deep-research",
    "name": "o4 Mini Deep Research",
    "nameKo": "o4 Mini Deep Research",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o4-mini-deep-research",
    "description": "검색형 흐름으로 사실 확인과 이슈 추적을 우선하는 OpenAI 모델",
    "quote": "o4 Mini Deep Research로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "장애 대응 해석의 허점을 찾아줘",
      "보도자료 관련 사실만 골라줘",
      "핵심 메시지처럼 바로 읽게 써줘"
    ],
    "greeting": "OpenAI의 o4 Mini Deep Research입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "시각입력",
      "고속",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-10-10",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o4-mini",
    "name": "o4 Mini",
    "nameKo": "o4 Mini",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o4-mini",
    "description": "추론형 작업에 맞춰 복잡한 선택지를 기준별로 채점하는 OpenAI 모델",
    "quote": "o4 Mini로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "고객 이탈 원인을 가설로 나눠줘",
      "협상 조건 점수표를 만들어줘",
      "상황별 답변 방식으로 쉽게 풀어줘"
    ],
    "greeting": "OpenAI의 o4 Mini입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "고속",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-04-16",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o4-mini-high",
    "name": "o4 Mini High",
    "nameKo": "o4 Mini High",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o4-mini-high",
    "description": "모호한 질문을 쪼개고 단계별 판단 근거를 정리하는 OpenAI 모델",
    "quote": "o4 Mini High로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "고객 이탈 계획을 주간 단위로 나눠줘",
      "협상 조건 약한 논리를 짚어줘",
      "상황별 답변 구간을 따로 표시해줘"
    ],
    "greeting": "OpenAI의 o4 Mini High입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "고속",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-04-16",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o3-mini-high",
    "name": "o3 Mini High",
    "nameKo": "o3 Mini High",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o3-mini-high",
    "description": "복잡한 자료에서 전제, 반례, 결론을 차분히 분리하는 OpenAI 추론 모델",
    "quote": "o3 Mini High로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "의사결정안 최악 상황을 따져줘",
      "학습 계획 전 확인할 것을 뽑아줘",
      "비교표를 먼저 찾아줘"
    ],
    "greeting": "OpenAI의 o3 Mini High입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "고속",
      "툴사용",
      "구조화",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-02-12",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o3-mini",
    "name": "o3 Mini",
    "nameKo": "o3 Mini",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o3-mini",
    "description": "모호한 질문을 쪼개고 단계별 판단 근거를 정리하는 OpenAI 모델",
    "quote": "o3 Mini로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "다음 질문 하나만 골라줘",
      "의사결정안 탈락 기준으로 걸러줘",
      "고객 이탈 항목을 우선순위로 정렬해줘"
    ],
    "greeting": "OpenAI의 o3 Mini입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "고속",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-01-31",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o1-pro",
    "name": "o1-pro",
    "nameKo": "o1-pro",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o1-pro",
    "description": "고난도 작업 작업에서 수학적 판단과 논리 검토를 깊게 밀어붙이는 OpenAI 모델",
    "quote": "o1-pro로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "반박 포인트 예시를 만들어줘",
      "대안 후보 약한 논리를 짚어줘",
      "채용 검토 주제를 찬반 질문으로 바꿔줘"
    ],
    "greeting": "OpenAI의 o1-pro입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "구조화",
      "문서입력",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-03-19",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-o1",
    "name": "o1",
    "nameKo": "o1",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o1",
    "description": "고난도 작업 작업에서 수학적 판단과 논리 검토를 깊게 밀어붙이는 OpenAI 모델",
    "quote": "o1로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예산 검토 내용을 한 문단으로 줄여줘",
      "대안 후보 숨은 전제를 찾아줘",
      "액션아이템 방식으로 쉽게 풀어줘"
    ],
    "greeting": "OpenAI의 o1입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "추론"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2024-12-17",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-4o",
    "name": "GPT-4o",
    "nameKo": "GPT-4o",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4o",
    "description": "고난도 작업 조건의 범용 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 OpenAI 모델",
    "quote": "GPT-4o로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "팀 회고 전 확인할 것을 뽑아줘",
      "문서 사진 내용을 할 일로 바꿔줘",
      "주의할 점 형태로 다시 써줘"
    ],
    "greeting": "OpenAI의 GPT-4o입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2024-05-13",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-4o-mini",
    "name": "GPT-4o-mini",
    "nameKo": "GPT-4o-mini",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4o-mini",
    "description": "저비용 호출 조건의 경량 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 OpenAI 모델",
    "quote": "GPT-4o-mini로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "장단점 세 개를 추천해줘",
      "영수증 숫자만 정리해줘",
      "사업 제안 계획을 주간 단위로 나눠줘"
    ],
    "greeting": "OpenAI의 GPT-4o-mini입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "저비용",
      "고속",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "text",
        "image",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-07-18",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-4o-search-preview",
    "name": "GPT-4o Search Preview",
    "nameKo": "GPT-4o Search Preview",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4o-search-preview",
    "description": "질문의 배경 자료를 찾고 핵심 근거를 짧게 정리하는 OpenAI 리서치 모델",
    "quote": "GPT-4o Search Preview로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "단호한 표현 방식으로 쉽게 풀어줘",
      "경쟁사 발표 자료를 출처별로 비교해줘",
      "토론 준비 원인을 가설로 나눠줘"
    ],
    "greeting": "OpenAI의 GPT-4o Search Preview입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "구조화",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-03-12",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-4o-mini-search-preview",
    "name": "GPT-4o-mini Search Preview",
    "nameKo": "GPT-4o-mini Search Preview",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4o-mini-search-preview",
    "description": "질문의 배경 자료를 찾고 핵심 근거를 짧게 정리하는 OpenAI 리서치 모델",
    "quote": "GPT-4o-mini Search Preview로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "보도자료 관련 사실만 골라줘",
      "이해관계자 의견 이해관계를 정리해줘",
      "상황별 답변 방식으로 쉽게 풀어줘"
    ],
    "greeting": "OpenAI의 GPT-4o-mini Search Preview입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "저비용",
      "고속",
      "구조화"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-03-12",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-oss-120b",
    "name": "gpt-oss-120b",
    "nameKo": "gpt-oss-120b",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-oss-120b",
    "description": "문서 요약, 비교, 일반 대화를 안정적으로 처리하는 OpenAI 모델",
    "quote": "gpt-oss-120b로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "프로젝트 범위 이슈를 원인별로 묶어줘",
      "계약서 더 명확하게 고쳐줘",
      "상황별 답변 구간을 따로 표시해줘"
    ],
    "greeting": "OpenAI의 gpt-oss-120b입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "저비용",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-08-05",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-oss-120b-free",
    "name": "gpt-oss-120b Free",
    "nameKo": "gpt-oss-120b Free",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-oss-120b:free",
    "description": "무료 호출 균형을 살려 일상 업무와 지식 질의에 두루 쓰기 좋은 OpenAI 모델",
    "quote": "gpt-oss-120b Free로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "장단점 세 개를 추천해줘",
      "면접 답변 다음 질문을 만들어줘",
      "마케팅 문구 주제를 찬반 질문으로 바꿔줘"
    ],
    "greeting": "OpenAI의 gpt-oss-120b Free입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "무료",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2025-08-05",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-oss-20b",
    "name": "gpt-oss-20b",
    "nameKo": "gpt-oss-20b",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-oss-20b",
    "description": "저비용 호출 균형을 살려 일상 업무와 지식 질의에 두루 쓰기 좋은 OpenAI 모델",
    "quote": "gpt-oss-20b로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "채용 공고 더 명확하게 고쳐줘",
      "팀 회고 주제를 찬반 질문으로 바꿔줘",
      "주의할 점 중심으로 번호를 매겨줘"
    ],
    "greeting": "OpenAI의 gpt-oss-20b입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "저비용",
      "툴사용",
      "구조화",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-08-05",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-oss-20b-free",
    "name": "gpt-oss-20b Free",
    "nameKo": "gpt-oss-20b Free",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-oss-20b:free",
    "description": "오픈웨이트 GPT 계열 업무에 맞춰 초안 작성과 의사결정 보조를 맡기 좋은 OpenAI 모델",
    "quote": "gpt-oss-20b Free로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "반박 포인트와 요약을 분리해줘",
      "설문 응답 더 명확하게 고쳐줘",
      "토론 준비 원인을 가설로 나눠줘"
    ],
    "greeting": "OpenAI의 gpt-oss-20b Free입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "무료",
      "툴사용",
      "문맥처리",
      "업무"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2025-08-05",
      "openWeight": false
    }
  },
  {
    "id": "or-qwen-qwen3-max",
    "name": "Qwen3 Max",
    "nameKo": "Qwen3 Max",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-max",
    "description": "균형형 비용 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Alibaba Qwen 모델",
    "quote": "Qwen3 Max로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "실행 순서 형식으로 바꿔줘",
      "자료 템플릿 검토 항목을 뽑아줘",
      "신제품 회의 원인을 가설로 나눠줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Max입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "중국어",
      "툴사용",
      "문맥처리"
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
      "createdAt": "2025-09-23",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-7-plus",
    "name": "Qwen3.7 Plus",
    "nameKo": "Qwen3.7 Plus",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.7-plus",
    "description": "균형형 비용 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Alibaba Qwen 모델",
    "quote": "Qwen3.7 Plus로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "고객 이탈 반복 의견을 묶어줘",
      "슬라이드 속 이상한 점을 찾아줘",
      "상황별 답변과 요약을 분리해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.7 Plus입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "장문맥",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-06-03",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-5-plus-20260420",
    "name": "Qwen3.5 Plus 2026-04-20",
    "nameKo": "Qwen3.5 Plus 2026-04-20",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.5-plus-20260420",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 Alibaba Qwen 모델",
    "quote": "Qwen3.5 Plus 2026-04-20로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "대시보드 핵심 정보를 뽑아줘",
      "가격 인상 반복 의견을 묶어줘",
      "보류할 이유 항목은 과감히 덜어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.5 Plus 2026-04-20입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2026-04-27",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-6-flash",
    "name": "Qwen3.6 Flash",
    "nameKo": "Qwen3.6 Flash",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.6-flash",
    "description": "초장문 환경에서 오픈웨이트 실험과 비용 통제를 검토하기 좋은 Alibaba Qwen 모델",
    "quote": "Qwen3.6 Flash로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "화면 캡처 흐름 문제를 짚어줘",
      "사용자 불편 해석의 허점을 찾아줘",
      "단호한 표현 스타일로 세 줄만 써줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.6 Flash입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2026-04-27",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-6-35b-a3b",
    "name": "Qwen3.6 35B A3B",
    "nameKo": "Qwen3.6 35B A3B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.6-35b-a3b",
    "description": "장문·저비용 호출 조건에서 라이선스와 배포 유연성을 함께 보는 Alibaba Qwen 오픈웨이트 모델",
    "quote": "Qwen3.6 35B A3B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "반박 포인트처럼 바로 읽게 써줘",
      "문서 사진 흐름 문제를 짚어줘",
      "학습 계획 사유를 깔끔하게 정리해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.6 35B A3B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
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
      "createdAt": "2026-04-27",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-6-27b",
    "name": "Qwen3.6 27B",
    "nameKo": "Qwen3.6 27B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.6-27b",
    "description": "장문·균형형 비용 조건에서 라이선스와 배포 유연성을 함께 보는 Alibaba Qwen 오픈웨이트 모델",
    "quote": "Qwen3.6 27B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "일정 지연 항목을 우선순위로 정렬해줘",
      "표 이미지 속 이상한 점을 찾아줘",
      "발표 대본 중심으로 번호를 매겨줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.6 27B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "중국어",
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
      "priceTier": "standard",
      "createdAt": "2026-04-27",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-next-80b-a3b-thinking",
    "name": "Qwen3 Next 80B A3B Thinking",
    "nameKo": "Qwen3 Next 80B A3B Thinking",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-next-80b-a3b-thinking",
    "description": "모호한 질문을 쪼개고 단계별 판단 근거를 정리하는 Alibaba Qwen 모델",
    "quote": "Qwen3 Next 80B A3B Thinking로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "신제품 회의 질문을 준비해줘",
      "리스크 목록 탈락 기준으로 걸러줘",
      "첫 행동 세 개를 추천해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Next 80B A3B Thinking입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
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
      "priceTier": "low",
      "createdAt": "2025-09-11",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-coder-next",
    "name": "Qwen3 Coder Next",
    "nameKo": "Qwen3 Coder Next",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder-next",
    "description": "API 설계와 테스트 케이스 점검을 돕는 Alibaba Qwen 개발 모델",
    "quote": "Qwen3 Coder Next로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "리뷰 댓글 단계별 수정안을 써줘",
      "기능 소개 전 확인할 것을 뽑아줘",
      "액션아이템 형태로 한눈에 보이게 해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder Next입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "중국어"
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
      "priceTier": "low",
      "createdAt": "2026-02-04",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-6-max-preview",
    "name": "Qwen3.6 Max Preview",
    "nameKo": "Qwen3.6 Max Preview",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.6-max-preview",
    "description": "균형형 비용 상위 이용을 염두에 둔 로컬 테스트와 모델 비교용 Alibaba Qwen 모델",
    "quote": "Qwen3.6 Max Preview로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "낮은 중요도 방식으로 쉽게 풀어줘",
      "정책 초안 분류 규칙을 만들어줘",
      "발표 준비 전 쟁점을 뽑아줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.6 Max Preview입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "중국어",
      "문맥처리"
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
      "createdAt": "2026-04-27",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen-plus-2025-07-28-thinking",
    "name": "Qwen Plus 0728 (thinking)",
    "nameKo": "Qwen Plus 0728 (thinking)",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen-plus-2025-07-28:thinking",
    "description": "초장문 자료를 놓고 전제, 반례, 결론을 차분히 분리하는 Alibaba Qwen 추론 모델",
    "quote": "Qwen Plus 0728 (thinking)로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "투자 판단 기준별 비교표를 만들어줘",
      "설문 결과 내용을 개선안으로 바꿔줘",
      "확인 사항 형식으로 바꿔줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen Plus 0728 (thinking)입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "장문맥",
      "저비용",
      "추론"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-09-08",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen-plus-2025-07-28",
    "name": "Qwen Plus 0728",
    "nameKo": "Qwen Plus 0728",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen-plus-2025-07-28",
    "description": "저비용 호출 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Alibaba Qwen 모델",
    "quote": "Qwen Plus 0728로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사내 FAQ 반복 업무용으로 바꿔줘",
      "가격 인상 목차를 새로 짜줘",
      "주의할 점 형태로 다시 써줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen Plus 0728입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "장문맥",
      "저비용",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-09-08",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-coder-plus",
    "name": "Qwen3 Coder Plus",
    "nameKo": "Qwen3 Coder Plus",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder-plus",
    "description": "초API 설계와 테스트 케이스 점검을 돕는 Alibaba Qwen 개발 모델",
    "quote": "Qwen3 Coder Plus로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "보고 문장 톤으로 다듬어줘",
      "리팩터링안 단계별 수정안을 써줘",
      "계약 협상 사유를 깔끔하게 정리해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder Plus입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "장문맥",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-09-23",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-coder-flash",
    "name": "Qwen3 Coder Flash",
    "nameKo": "Qwen3 Coder Flash",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder-flash",
    "description": "저장소 이해와 개발 질의 응답을 작업 흐름으로 처리하기 좋은 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder Flash로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "보고 문장 형태로 다시 써줘",
      "리팩터링안 위험 구간을 표시해줘",
      "발표 준비 흐름을 자연스럽게 짜줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder Flash입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "장문맥",
      "저비용"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-09-17",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-coder",
    "name": "Qwen3 Coder 480B A35B",
    "nameKo": "Qwen3 Coder 480B A35B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder",
    "description": "균형형 비용 기준으로 코드 리뷰, 함수 설계, 리팩터링 초안을 빠르게 만드는 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder 480B A35B로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "리뷰 댓글 체크리스트를 만들어줘",
      "공지 작성 이해관계를 정리해줘",
      "예상 질문 형식으로 바꿔줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 480B A35B입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "장문맥",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1048576,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-07-23",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-coder-free",
    "name": "Qwen3 Coder 480B A35B Free",
    "nameKo": "Qwen3 Coder 480B A35B Free",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder:free",
    "description": "저장소 이해와 개발 질의 응답을 작업 흐름으로 처리하기 좋은 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder 480B A35B Free로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "성능 지표 체크리스트를 만들어줘",
      "온보딩 해석의 허점을 찾아줘",
      "반박 포인트처럼 바로 읽게 써줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 480B A35B Free입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "장문맥",
      "무료"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1048576,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2025-07-23",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-coder-30b-a3b-instruct",
    "name": "Qwen3 Coder 30B A3B Instruct",
    "nameKo": "Qwen3 Coder 30B A3B Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder-30b-a3b-instruct",
    "description": "코드 구조 파악, 수정안 작성, 테스트 보완에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder 30B A3B Instruct로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "상황별 답변 스타일로 세 줄만 써줘",
      "타입 오류 체크리스트를 만들어줘",
      "프로젝트 범위 사유를 깔끔하게 정리해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 30B A3B Instruct입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 160000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-07-31",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-next-80b-a3b-instruct",
    "name": "Qwen3 Next 80B A3B Instruct",
    "nameKo": "Qwen3 Next 80B A3B Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-next-80b-a3b-instruct",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Alibaba Qwen 모델",
    "quote": "Qwen3 Next 80B A3B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문 형태로 다시 써줘",
      "운영 절차 반복 업무용으로 바꿔줘",
      "예산 검토 전 확인할 것을 뽑아줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Next 80B A3B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "중국어"
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
      "priceTier": "low",
      "createdAt": "2025-09-11",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-next-80b-a3b-instruct-free",
    "name": "Qwen3 Next 80B A3B Instruct Free",
    "nameKo": "Qwen3 Next 80B A3B Instruct Free",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-next-80b-a3b-instruct:free",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 Alibaba Qwen 모델",
    "quote": "Qwen3 Next 80B A3B Instruct Free로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "이해관계자 의견 표현의 과장을 줄여줘",
      "용어집 처리 순서를 단순화해줘",
      "불확실한 부분 예시를 만들어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Next 80B A3B Instruct Free입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "무료",
      "중국어"
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
      "priceTier": "free",
      "createdAt": "2025-09-11",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-235b-a22b-thinking-2507",
    "name": "Qwen3 235B A22B Thinking 2507",
    "nameKo": "Qwen3 235B A22B Thinking 2507",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-235b-a22b-thinking-2507",
    "description": "저비용 호출 작업에서 수학적 판단과 논리 검토를 깊게 밀어붙이는 Alibaba Qwen 모델",
    "quote": "Qwen3 235B A22B Thinking 2507로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "토론 쟁점 탈락 기준으로 걸러줘",
      "고객 이탈 항목을 우선순위로 정렬해줘",
      "확인 사항 형태로 다시 써줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B Thinking 2507입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
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
      "priceTier": "low",
      "createdAt": "2025-07-25",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-30b-a3b-thinking-2507",
    "name": "Qwen3 30B A3B Thinking 2507",
    "nameKo": "Qwen3 30B A3B Thinking 2507",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-30b-a3b-thinking-2507",
    "description": "저비용 호출 작업에서 수학적 판단과 논리 검토를 깊게 밀어붙이는 Alibaba Qwen 모델",
    "quote": "Qwen3 30B A3B Thinking 2507로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "공지 작성 표현의 과장을 줄여줘",
      "의사결정안 숨은 전제를 찾아줘",
      "예상 질문을 먼저 찾아줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B Thinking 2507입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "추론"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-08-28",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-235b-a22b-2507",
    "name": "Qwen3 235B A22B Instruct 2507",
    "nameKo": "Qwen3 235B A22B Instruct 2507",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-235b-a22b-2507",
    "description": "장문 환경에서 오픈웨이트 실험과 비용 통제를 검토하기 좋은 Alibaba Qwen 모델",
    "quote": "Qwen3 235B A22B Instruct 2507로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "설문 결과 표현의 과장을 줄여줘",
      "업무 로그 처리 순서를 단순화해줘",
      "초보자 설명 형태로 다시 써줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B Instruct 2507입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "툴사용"
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
      "priceTier": "low",
      "createdAt": "2025-07-21",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-30b-a3b-instruct-2507",
    "name": "Qwen3 30B A3B Instruct 2507",
    "nameKo": "Qwen3 30B A3B Instruct 2507",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-30b-a3b-instruct-2507",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Alibaba Qwen 모델",
    "quote": "Qwen3 30B A3B Instruct 2507로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문 형식으로 바꿔줘",
      "운영 절차 안전 요약본을 만들어줘",
      "예산 검토 문서를 순서대로 정리해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B Instruct 2507입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-07-29",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-235b-a22b",
    "name": "Qwen3 235B A22B",
    "nameKo": "Qwen3 235B A22B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-235b-a22b",
    "description": "균형형 비용 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Alibaba Qwen 모델",
    "quote": "Qwen3 235B A22B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "초보자 설명으로 더 단호하게 바꿔줘",
      "운영 절차 반복 업무용으로 바꿔줘",
      "일정 지연 목차를 새로 짜줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "중국어",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-04-28",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-32b",
    "name": "Qwen3 32B",
    "nameKo": "Qwen3 32B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-32b",
    "description": "오픈소스 실험과 비용 통제를 검토하기 좋은 Alibaba Qwen 모델",
    "quote": "Qwen3 32B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "운영 절차 분류 규칙을 만들어줘",
      "온보딩 문구를 짧게 만들어줘",
      "상황별 답변을 제목처럼 뽑아줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 32B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-04-28",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-14b",
    "name": "Qwen3 14B",
    "nameKo": "Qwen3 14B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-14b",
    "description": "오픈소스 실험과 비용 통제를 검토하기 좋은 Alibaba Qwen 모델",
    "quote": "Qwen3 14B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "공지 작성 체크 포인트를 만들어줘",
      "내부 문서 반복 업무용으로 바꿔줘",
      "발표 대본 항목은 과감히 덜어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 14B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131702,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-04-28",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-8b",
    "name": "Qwen3 8B",
    "nameKo": "Qwen3 8B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-8b",
    "description": "저비용 배포와 라이선스 유연성을 함께 검토하기 좋은 Alibaba Qwen 오픈웨이트 모델",
    "quote": "Qwen3 8B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사내 FAQ 반복 업무용으로 바꿔줘",
      "가격 인상 목차를 새로 짜줘",
      "확인 사항으로 더 단호하게 바꿔줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 8B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-04-28",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-30b-a3b",
    "name": "Qwen3 30B A3B",
    "nameKo": "Qwen3 30B A3B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-30b-a3b",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Alibaba Qwen 모델",
    "quote": "Qwen3 30B A3B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "회의 발언 세 가지를 미리 예상해줘",
      "정책 초안 처리 순서를 단순화해줘",
      "발표 준비 반복 의견을 묶어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-04-28",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen-2-5-coder-32b-instruct",
    "name": "Qwen2.5 Coder 32B Instruct",
    "nameKo": "Qwen2.5 Coder 32B Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen-2.5-coder-32b-instruct",
    "description": "개발자용 작업에 맞춰 버그 원인 분석과 구현 대안을 비교하는 Alibaba Qwen 모델",
    "quote": "Qwen2.5 Coder 32B Instruct로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "리팩터링안 원인을 좁혀줘",
      "예산 검토 내용을 한 문단으로 줄여줘",
      "원인과 해결책 세 개를 추천해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen2.5 Coder 32B Instruct입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2024-11-11",
      "openWeight": true
    }
  },
  {
    "id": "or-openai-gpt-5-4-mini",
    "name": "GPT-5.4 Mini",
    "nameKo": "GPT-5.4 Mini",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.4-mini",
    "description": "이미지와 문서 내용을 빠르게 읽고 핵심만 정리하는 OpenAI 모델",
    "quote": "GPT-5.4 Mini로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "공지 작성 흐름을 자연스럽게 짜줘",
      "화면 캡처 흐름 문제를 짚어줘",
      "회의 발언 하나만 골라줘"
    ],
    "greeting": "OpenAI의 GPT-5.4 Mini입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "고속",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 400000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-03-17",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-fable-5",
    "name": "Claude Fable 5",
    "nameKo": "Claude Fable 5",
    "icon": "?",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-fable-5",
    "description": "복잡한 문서 분석, 코딩, 시각 자료 해석을 안정적으로 처리하는 Anthropic 최상위 모델",
    "quote": "Claude Fable 5로 긴 자료를 읽고 핵심 판단과 실행 방향을 정리해보겠습니다.",
    "sampleQuestions": [
      "회의 자료에서 결정해야 할 쟁점을 뽑아줘",
      "코드 변경안의 위험한 부분을 검토해줘",
      "첨부 이미지와 문서 내용을 함께 요약해줘"
    ],
    "greeting": "Anthropic의 Claude Fable 5입니다. 복잡한 자료를 차분히 읽고 판단에 필요한 핵심부터 정리해드릴게요.",
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
      "createdAt": "2026-06-09",
      "openWeight": false,
      "availability": "disabled",
      "availabilityLabel": "현재 사용 불가",
      "availabilityReason": "Anthropic이 2026-06-13 미국 정부 지시에 따른 접근 제한 대응으로 고객 접근을 중단한 모델입니다.",
      "availabilityUpdatedAt": "2026-06-13"
    }
  },
  {
    "id": "or-google-gemini-3-5-flash",
    "name": "Gemini 3.5 Flash",
    "nameKo": "Gemini 3.5 Flash",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemini-3.5-flash",
    "description": "고난도 작업 조건의 경량 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 Google 모델",
    "quote": "Gemini 3.5 Flash로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "낮은 중요도 형태로 한눈에 보이게 해줘",
      "대시보드 흐름 문제를 짚어줘",
      "경쟁사 비교 목차를 새로 짜줘"
    ],
    "greeting": "Google의 Gemini 3.5 Flash입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
        "video",
        "file",
        "audio"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-05-19",
      "openWeight": false
    }
  },
  {
    "id": "or-x-ai-grok-build-0-1",
    "name": "Grok Build 0.1",
    "nameKo": "Grok Build 0.1",
    "icon": "⚡",
    "avatarUrl": "/logos/grok.svg",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "x-ai/grok-build-0.1",
    "description": "문서와 이미지 자료를 함께 읽고 핵심 내용을 정리하는 xAI 모델",
    "quote": "Grok Build 0.1로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "의사결정 요약를 먼저 찾아줘",
      "문서 사진 핵심 정보를 뽑아줘",
      "토론 준비 표현의 과장을 줄여줘"
    ],
    "greeting": "xAI의 Grok Build 0.1입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "xAI",
      "contextLength": 256000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-05-20",
      "openWeight": false
    }
  },
  {
    "id": "or-perplexity-sonar-pro-search",
    "name": "Sonar Pro Search",
    "nameKo": "Sonar Pro Search",
    "icon": "🔍",
    "avatarUrl": "/logos/perplexity.svg",
    "color": "pink",
    "category": "ai",
    "openrouterModel": "perplexity/sonar-pro-search",
    "description": "고난도 작업 조건에서 웹 근거, 비교 자료, 요약 보고서를 빠르게 묶는 Perplexity 모델",
    "quote": "Sonar Pro Search로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사업 제안 항목을 우선순위로 정렬해줘",
      "논문 주장 관련 원문 근거를 찾아줘",
      "공유 문장 형태로 다시 써줘"
    ],
    "greeting": "Perplexity의 Sonar Pro Search입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "시각입력",
      "구조화",
      "문맥처리"
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
      "createdAt": "2025-10-30",
      "openWeight": false
    }
  },
  {
    "id": "or-deepseek-deepseek-v4-pro",
    "name": "DeepSeek V4 Pro",
    "nameKo": "DeepSeek V4 Pro",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-v4-pro",
    "description": "상위 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 DeepSeek 모델",
    "quote": "DeepSeek V4 Pro로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "마케팅 문구 사유를 깔끔하게 정리해줘",
      "운영 절차 검토 항목을 뽑아줘",
      "장단점 중심으로 다시 써줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V4 Pro입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "장문맥",
      "저비용"
    ],
    "modelInfo": {
      "provider": "DeepSeek",
      "contextLength": 1048576,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-24",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen3-7-max",
    "name": "Qwen3.7 Max",
    "nameKo": "Qwen3.7 Max",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.7-max",
    "description": "균형형 비용 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Alibaba Qwen 모델",
    "quote": "Qwen3.7 Max로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "확인 사항 구조로 나눠서 써줘",
      "자료 템플릿 검토 항목을 뽑아줘",
      "프로젝트 범위 이해관계를 정리해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.7 Max입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "장문맥",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-05-21",
      "openWeight": true
    }
  },
  {
    "id": "or-meta-llama-llama-3-2-3b-instruct",
    "name": "Llama 3.2 3B Instruct",
    "nameKo": "Llama 3.2 3B Instruct",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3.2-3b-instruct",
    "description": "저비용 호출 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Meta 모델",
    "quote": "Llama 3.2 3B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "계약 협상 내용을 한 문단으로 줄여줘",
      "보안 검토 분류 규칙을 만들어줘",
      "회의 발언 세 개를 추천해줘"
    ],
    "greeting": "Meta의 Llama 3.2 3B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "문맥처리",
      "업무"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-09-25",
      "openWeight": true
    }
  },
  {
    "id": "or-mistralai-mistral-medium-3-5",
    "name": "Mistral Medium 3.5",
    "nameKo": "Mistral Medium 3.5",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-medium-3-5",
    "description": "고난도 작업 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Mistral AI 모델",
    "quote": "Mistral Medium 3.5로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "비교표 구간을 따로 표시해줘",
      "문서 사진 내용을 보고서 문장으로 바꿔줘",
      "토론 준비 질문을 준비해줘"
    ],
    "greeting": "Mistral AI의 Mistral Medium 3.5입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "시각입력",
      "문서입력"
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
      "priceTier": "premium",
      "createdAt": "2026-04-30",
      "openWeight": true
    }
  },
  {
    "id": "or-cohere-command-r-08-2024",
    "name": "Command R (08-2024)",
    "nameKo": "Command R (08-2024)",
    "icon": "📚",
    "avatarUrl": "/logos/cohere.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "cohere/command-r-08-2024",
    "description": "복잡하지 않은 분석과 대화형 업무 보조를 균형 있게 처리하는 Cohere 모델",
    "quote": "Command R (08-2024)로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "가격 안내 공유용으로 정리해줘",
      "데이터 해석 표현의 과장을 줄여줘",
      "액션아이템 하나만 골라줘"
    ],
    "greeting": "Cohere의 Command R (08-2024)입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "저비용",
      "툴사용",
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
      "priceTier": "low",
      "createdAt": "2024-08-30",
      "openWeight": false
    }
  },
  {
    "id": "or-microsoft-phi-4-mini-instruct",
    "name": "Phi 4 Mini Instruct",
    "nameKo": "Phi 4 Mini Instruct",
    "icon": "🏢",
    "avatarUrl": "/logos/microsoft.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "microsoft/phi-4-mini-instruct",
    "description": "가벼운 실험과 평가 자동화에 맞춘 공개형 Microsoft 모델",
    "quote": "Phi 4 Mini Instruct로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문 형태로 다시 써줘",
      "사내 FAQ 검토 항목을 뽑아줘",
      "공지 작성 흐름을 자연스럽게 짜줘"
    ],
    "greeting": "Microsoft의 Phi 4 Mini Instruct입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "고속",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Microsoft",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-10-17",
      "openWeight": true
    }
  },
  {
    "id": "or-amazon-nova-pro-v1",
    "name": "Nova Pro 1.0",
    "nameKo": "Nova Pro 1.0",
    "icon": "📦",
    "avatarUrl": "/logos/amazon.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "amazon/nova-pro-v1",
    "description": "복잡한 문서와 이미지 자료를 차분히 정리하는 Amazon 모델",
    "quote": "Nova Pro 1.0로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "대시보드 흐름 문제를 짚어줘",
      "가격 인상 원인을 가설로 나눠줘",
      "불확실한 부분 목록으로 따로 표시해줘"
    ],
    "greeting": "Amazon의 Nova Pro 1.0입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "문맥처리",
      "업무"
    ],
    "modelInfo": {
      "provider": "Amazon",
      "contextLength": 300000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2024-12-05",
      "openWeight": false
    }
  },
  {
    "id": "or-nvidia-nemotron-3-nano-30b-a3b",
    "name": "Nemotron 3 Nano 30B A3B",
    "nameKo": "Nemotron 3 Nano 30B A3B",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-nano-30b-a3b",
    "description": "경량 계열의 장문 공개 모델로 평가 자동화와 실험 설계에 맞춘 NVIDIA 모델",
    "quote": "Nemotron 3 Nano 30B A3B로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "실행 순서 항목은 과감히 덜어줘",
      "자료 템플릿 안전 요약본을 만들어줘",
      "신제품 회의 체크 포인트를 만들어줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Nano 30B A3B입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "NVIDIA",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-12-14",
      "openWeight": true
    }
  },
  {
    "id": "or-moonshotai-kimi-k2-7-code",
    "name": "Kimi K2.7 Code",
    "nameKo": "Kimi K2.7 Code",
    "icon": "🌙",
    "avatarUrl": "/logos/moonshot.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "moonshotai/kimi-k2.7-code",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 Moonshot AI 모델",
    "quote": "Kimi K2.7 Code로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "이해관계자 의견 전 쟁점을 뽑아줘",
      "리뷰 댓글 원인을 좁혀줘",
      "실행 순서 구간을 따로 표시해줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2.7 Code입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "중국어",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "Moonshot AI",
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
      "createdAt": "2026-06-12",
      "openWeight": false
    }
  },
  {
    "id": "or-z-ai-glm-5",
    "name": "GLM 5",
    "nameKo": "GLM 5",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-5",
    "description": "평가 자동화와 실험 설계에 맞춘 공개형 Z.ai 모델",
    "quote": "GLM 5로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "설문 결과 내용을 개선안으로 바꿔줘",
      "업무 로그 분류 규칙을 만들어줘",
      "주의할 점 톤으로 다듬어줘"
    ],
    "greeting": "Z.ai의 GLM 5입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2026-02-11",
      "openWeight": true
    }
  },
  {
    "id": "or-minimax-minimax-m3",
    "name": "MiniMax M3",
    "nameKo": "MiniMax M3",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m3",
    "description": "저비용 호출 조건의 경량 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 MiniMax 모델",
    "quote": "MiniMax M3로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "기능 소개 문서를 순서대로 정리해줘",
      "화면 캡처 숫자만 정리해줘",
      "액션아이템과 요약문문을 분리해줘"
    ],
    "greeting": "MiniMax의 MiniMax M3입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "MiniMax",
      "contextLength": 1048576,
      "inputModalities": [
        "text",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-05-31",
      "openWeight": false
    }
  },
  {
    "id": "or-tencent-hy3-preview",
    "name": "Hy3 preview",
    "nameKo": "Hy3 preview",
    "icon": "💬",
    "avatarUrl": "/logos/tencent.png",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "tencent/hy3-preview",
    "description": "저비용 호출 균형을 살려 일상 업무와 지식 질의에 두루 쓰기 좋은 Tencent 모델",
    "quote": "Hy3 preview로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "확인 사항 목록으로 따로 표시해줘",
      "보고서 공유용으로 정리해줘",
      "프로젝트 범위 전 쟁점을 뽑아줘"
    ],
    "greeting": "Tencent의 Hy3 preview입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "저비용",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Tencent",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-22",
      "openWeight": false
    }
  },
  {
    "id": "or-ibm-granite-granite-4-1-8b",
    "name": "Granite 4.1 8B",
    "nameKo": "Granite 4.1 8B",
    "icon": "🏛️",
    "avatarUrl": "/logos/ibm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "ibm-granite/granite-4.1-8b",
    "description": "평가 자동화와 실험 설계에 맞춘 공개형 IBM 모델",
    "quote": "Granite 4.1 8B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "공유 문장 중심으로 다시 써줘",
      "사내 FAQ 반복 업무용으로 바꿔줘",
      "기능 소개 사유를 깔끔하게 정리해줘"
    ],
    "greeting": "IBM의 Granite 4.1 8B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "IBM",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-30",
      "openWeight": true
    }
  },
  {
    "id": "or-bytedance-seed-seed-1-6-flash",
    "name": "Seed 1.6 Flash",
    "nameKo": "Seed 1.6 Flash",
    "icon": "🌱",
    "avatarUrl": "/logos/bytedance.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "bytedance-seed/seed-1.6-flash",
    "description": "이미지와 문서 내용을 빠르게 읽고 핵심만 정리하는 ByteDance Seed 모델",
    "quote": "Seed 1.6 Flash로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "불확실한 부분 목록으로 따로 표시해줘",
      "화면 캡처 흐름 문제를 짚어줘",
      "고객 이탈 원인을 가설로 나눠줘"
    ],
    "greeting": "ByteDance Seed의 Seed 1.6 Flash입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
        "image",
        "text",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-12-23",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-opus-4-7",
    "name": "Claude Opus 4.7",
    "nameKo": "Claude Opus 4.7",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-opus-4.7",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 Anthropic 모델",
    "quote": "Claude Opus 4.7로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "반박 포인트 형태로 한눈에 보이게 해줘",
      "문서 사진 핵심 정보를 뽑아줘",
      "학습 계획 내용을 더 명확하게 고쳐줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.7입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "추론"
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
      "createdAt": "2026-04-16",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-sonnet-4",
    "name": "Claude Sonnet 4",
    "nameKo": "Claude Sonnet 4",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-sonnet-4",
    "description": "긴 문서와 시각 자료를 함께 이해해 핵심 판단을 돕는 Anthropic 모델",
    "quote": "Claude Sonnet 4로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "설문 결과 이해관계를 정리해줘",
      "문서 사진 흐름 문제를 짚어줘",
      "주의할 점 형식으로 바꿔줘"
    ],
    "greeting": "Anthropic의 Claude Sonnet 4입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
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
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-05-22",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-opus-4-8-fast",
    "name": "Claude Opus 4.8 (Fast)",
    "nameKo": "Claude Opus 4.8 (Fast)",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-opus-4.8-fast",
    "description": "고난도 작업 조건의 경량 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 Anthropic 모델",
    "quote": "Claude Opus 4.8 (Fast)로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "회의 발언 중심으로 다시 써줘",
      "영수증 속 이상한 점을 찾아줘",
      "사업 제안 문구를 짧게 만들어줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.8 (Fast)입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "고속",
      "추론"
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
      "createdAt": "2026-05-27",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-opus-4-8",
    "name": "Claude Opus 4.8",
    "nameKo": "Claude Opus 4.8",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-opus-4.8",
    "description": "복잡한 자료를 읽고 요약과 판단 근거를 정리하는 Anthropic 모델",
    "quote": "Claude Opus 4.8로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예산 검토 전 확인할 것을 뽑아줘",
      "표 이미지 내용을 할 일로 바꿔줘",
      "원인과 해결책 기준을 맞춰줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.8입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "툴사용",
      "추론"
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
      "createdAt": "2026-05-27",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-opus-4-7-fast",
    "name": "Claude Opus 4.7 (Fast)",
    "nameKo": "Claude Opus 4.7 (Fast)",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-opus-4.7-fast",
    "description": "초이미지와 문서 내용을 빠르게 읽고 핵심만 정리하는 Anthropic 모델",
    "quote": "Claude Opus 4.7 (Fast)로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "슬라이드 내용을 할 일로 바꿔줘",
      "기능 소개 사유를 깔끔하게 정리해줘",
      "액션아이템 세 가지를 미리 예상해줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.7 (Fast)입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "고속",
      "추론"
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
      "createdAt": "2026-05-12",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-opus-4-5",
    "name": "Claude Opus 4.5",
    "nameKo": "Claude Opus 4.5",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-opus-4.5",
    "description": "고난도 작업 조건의 상위 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 Anthropic 모델",
    "quote": "Claude Opus 4.5로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "앱 화면 내용을 보고서 문장으로 바꿔줘",
      "이해관계자 의견 표현의 과장을 줄여줘",
      "상황별 답변 형태로 한눈에 보이게 해줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.5입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 200000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-11-24",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-opus-4-6-fast",
    "name": "Claude Opus 4.6 (Fast)",
    "nameKo": "Claude Opus 4.6 (Fast)",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-opus-4.6-fast",
    "description": "긴 문서와 시각 자료를 함께 이해해 핵심 판단을 돕는 Anthropic 모델",
    "quote": "Claude Opus 4.6 (Fast)로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "첫 행동으로 더 단호하게 바꿔줘",
      "문서 사진 숫자만 정리해줘",
      "토론 준비 흐름을 자연스럽게 짜줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.6 (Fast)입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "고속",
      "추론"
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
      "createdAt": "2026-04-07",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-opus-4-1",
    "name": "Claude Opus 4.1",
    "nameKo": "Claude Opus 4.1",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-opus-4.1",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 Anthropic 모델",
    "quote": "Claude Opus 4.1로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "화면 캡처 핵심 정보를 뽑아줘",
      "학습 계획 내용을 고객용으로 바꿔줘",
      "단호한 표현 하나만 골라줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.1입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 200000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-08-05",
      "openWeight": false
    }
  },
  {
    "id": "or-google-gemini-2-5-pro",
    "name": "Gemini 2.5 Pro",
    "nameKo": "Gemini 2.5 Pro",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemini-2.5-pro",
    "description": "긴 문서와 시각 자료를 함께 이해해 핵심 판단을 돕는 Google 모델",
    "quote": "Gemini 2.5 Pro로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예산 검토 문장을 부드럽게 써줘",
      "표 이미지 핵심 정보를 뽑아줘",
      "액션아이템 세 가지를 미리 예상해줘"
    ],
    "greeting": "Google의 Gemini 2.5 Pro입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
      "priceTier": "premium",
      "createdAt": "2025-06-17",
      "openWeight": false
    }
  },
  {
    "id": "or-anthropic-claude-opus-4",
    "name": "Claude Opus 4",
    "nameKo": "Claude Opus 4",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-opus-4",
    "description": "긴 문서와 시각 자료를 함께 이해해 핵심 판단을 돕는 Anthropic 모델",
    "quote": "Claude Opus 4로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "낮은 중요도와 요약을 분리해줘",
      "영수증 내용을 보고서 문장으로 바꿔줘",
      "계약 협상 내용을 개선안으로 바꿔줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "툴사용",
      "추론"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 200000,
      "inputModalities": [
        "image",
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-05-22",
      "openWeight": false
    }
  },
  {
    "id": "or-google-gemma-4-26b-a4b-it",
    "name": "Gemma 4 26B A4B",
    "nameKo": "Gemma 4 26B A4B",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-4-26b-a4b-it",
    "description": "장문·저비용 호출 조건에서 라이선스와 배포 유연성을 함께 보는 Google 오픈웨이트 모델",
    "quote": "Gemma 4 26B A4B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "계약 협상 사유를 깔끔하게 정리해줘",
      "차트 이미지 내용을 할 일로 바꿔줘",
      "회의 발언처럼 바로 읽게 써줘"
    ],
    "greeting": "Google의 Gemma 4 26B A4B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2026-04-03",
      "openWeight": true
    }
  },
  {
    "id": "or-google-gemma-4-26b-a4b-it-free",
    "name": "Gemma 4 26B A4B Free",
    "nameKo": "Gemma 4 26B A4B Free",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-4-26b-a4b-it:free",
    "description": "범용 계열의 장문 공개 모델로 평가 자동화와 실험 설계에 맞춘 Google 모델",
    "quote": "Gemma 4 26B A4B Free로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "설문 결과 이해관계를 정리해줘",
      "문서 사진 흐름 문제를 짚어줘",
      "다음 질문과 요약문문을 분리해줘"
    ],
    "greeting": "Google의 Gemma 4 26B A4B Free입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "무료",
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
      "priceTier": "free",
      "createdAt": "2026-04-03",
      "openWeight": true
    }
  },
  {
    "id": "or-google-gemma-4-31b-it-free",
    "name": "Gemma 4 31B Free",
    "nameKo": "Gemma 4 31B Free",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-4-31b-it:free",
    "description": "장문 환경에서 오픈웨이트 실험과 비용 통제를 검토하기 좋은 Google 모델",
    "quote": "Gemma 4 31B Free로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사용자 불편 목차를 새로 짜줘",
      "대시보드 숫자만 정리해줘",
      "의사결정 요약 형태로 다시 써줘"
    ],
    "greeting": "Google의 Gemma 4 31B Free입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "무료",
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
      "priceTier": "free",
      "createdAt": "2026-04-02",
      "openWeight": true
    }
  },
  {
    "id": "or-google-gemini-2-5-pro-preview",
    "name": "Gemini 2.5 Pro Preview 06-05",
    "nameKo": "Gemini 2.5 Pro Preview 06-05",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemini-2.5-pro-preview",
    "description": "복잡한 자료를 읽고 요약과 판단 근거를 정리하는 Google 모델",
    "quote": "Gemini 2.5 Pro Preview 06-05로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "발표 준비 흐름을 자연스럽게 짜줘",
      "차트 이미지 흐름 문제를 짚어줘",
      "결론을 제목처럼 뽑아줘"
    ],
    "greeting": "Google의 Gemini 2.5 Pro Preview 06-05입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
        "audio"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-06-05",
      "openWeight": false
    }
  },
  {
    "id": "or-google-gemini-2-5-pro-preview-05-06",
    "name": "Gemini 2.5 Pro Preview 05-06",
    "nameKo": "Gemini 2.5 Pro Preview 05-06",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemini-2.5-pro-preview-05-06",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 Google 모델",
    "quote": "Gemini 2.5 Pro Preview 05-06로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "계약 협상 내용을 더 명확하게 고쳐줘",
      "차트 이미지 속 이상한 점을 찾아줘",
      "회의 발언 중심으로 다시 써줘"
    ],
    "greeting": "Google의 Gemini 2.5 Pro Preview 05-06입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
      "priceTier": "premium",
      "createdAt": "2025-05-07",
      "openWeight": false
    }
  },
  {
    "id": "or-x-ai-grok-4-20-multi-agent",
    "name": "Grok 4.20 Multi-Agent",
    "nameKo": "Grok 4.20 Multi-Agent",
    "icon": "⚡",
    "avatarUrl": "/logos/grok.svg",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "x-ai/grok-4.20-multi-agent",
    "description": "비용과 성능의 균형을 맞춰 자료 요약을 돕는 xAI 모델",
    "quote": "Grok 4.20 Multi-Agent로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "첫 행동 기준을 맞춰줘",
      "채용 기준 기준별 비교표를 만들어줘",
      "토론 준비 기준을 다시 잡아줘"
    ],
    "greeting": "xAI의 Grok 4.20 Multi-Agent입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "구조화",
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
    }
  },
  {
    "id": "or-moonshotai-kimi-k2-6",
    "name": "Kimi K2.6",
    "nameKo": "Kimi K2.6",
    "icon": "🌙",
    "avatarUrl": "/logos/moonshot.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "moonshotai/kimi-k2.6",
    "description": "문서와 이미지 자료를 함께 읽고 핵심 내용을 정리하는 Moonshot AI 모델",
    "quote": "Kimi K2.6로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "대시보드 내용을 보고서 문장으로 바꿔줘",
      "팀 회고 내용을 고객용으로 바꿔줘",
      "보류할 이유 형태로 한눈에 보이게 해줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2.6입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2026-04-20",
      "openWeight": false
    }
  },
  {
    "id": "or-google-gemini-3-1-pro-preview-customtools",
    "name": "Gemini 3.1 Pro Preview Custom Tools",
    "nameKo": "Gemini 3.1 Pro Preview Custom Tools",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemini-3.1-pro-preview-customtools",
    "description": "복잡한 자료를 읽고 요약과 판단 근거를 정리하는 Google 모델",
    "quote": "Gemini 3.1 Pro Preview Custom Tools로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "영수증 속 이상한 점을 찾아줘",
      "일정 지연 질문을 준비해줘",
      "보류할 이유를 찾아줘"
    ],
    "greeting": "Google의 Gemini 3.1 Pro Preview Custom Tools입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "장문맥",
      "고속",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 1048756,
      "inputModalities": [
        "text",
        "audio",
        "image",
        "video",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2026-02-25",
      "openWeight": false
    }
  },
  {
    "id": "or-google-gemini-2-5-flash-lite-preview-09-2025",
    "name": "Gemini 2.5 Flash Lite Preview 09-2025",
    "nameKo": "Gemini 2.5 Flash Lite Preview 09-2025",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemini-2.5-flash-lite-preview-09-2025",
    "description": "경량 입력에서도 문서 내용과 대화 맥락을 자연스럽게 연결하는 Google 모델",
    "quote": "Gemini 2.5 Flash Lite Preview 09-2025로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "원인과 해결책 예시를 만들어줘",
      "차트 이미지 내용을 보고서 문장으로 바꿔줘",
      "설문 결과 표현의 과장을 줄여줘"
    ],
    "greeting": "Google의 Gemini 2.5 Flash Lite Preview 09-2025입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2025-09-25",
      "openWeight": false
    }
  },
  {
    "id": "or-deepseek-deepseek-v4-flash",
    "name": "DeepSeek V4 Flash",
    "nameKo": "DeepSeek V4 Flash",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-v4-flash",
    "description": "저비용 호출 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 DeepSeek 모델",
    "quote": "DeepSeek V4 Flash로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "다음 질문 세 가지를 미리 예상해줘",
      "보안 검토 분류 규칙을 만들어줘",
      "설문 결과 내용을 개선안으로 바꿔줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V4 Flash입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "장문맥",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "DeepSeek",
      "contextLength": 1048576,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-24",
      "openWeight": true
    }
  },
  {
    "id": "or-deepseek-deepseek-v3-2",
    "name": "DeepSeek V3.2",
    "nameKo": "DeepSeek V3.2",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-v3.2",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 DeepSeek 모델",
    "quote": "DeepSeek V3.2로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사내 FAQ 민감정보를 줄여줘",
      "가격 인상 질문을 준비해줘",
      "다음 질문 방식으로 쉽게 풀어줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.2입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "DeepSeek",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-12-01",
      "openWeight": true
    }
  },
  {
    "id": "or-anthropic-claude-3-5-haiku",
    "name": "Claude 3.5 Haiku",
    "nameKo": "Claude 3.5 Haiku",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-3.5-haiku",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 Anthropic 모델",
    "quote": "Claude 3.5 Haiku로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문을 먼저 찾아줘",
      "앱 화면 속 이상한 점을 찾아줘",
      "일정 지연 항목을 우선순위로 정렬해줘"
    ],
    "greeting": "Anthropic의 Claude 3.5 Haiku입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "고속",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2024-11-04",
      "openWeight": false
    }
  },
  {
    "id": "or-xiaomi-mimo-v2-5",
    "name": "MiMo-V2.5",
    "nameKo": "MiMo-V2.5",
    "icon": "📱",
    "avatarUrl": "/logos/xiaomi.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "xiaomi/mimo-v2.5",
    "description": "범용 입력에서도 문서 내용과 대화 맥락을 자연스럽게 연결하는 Xiaomi 모델",
    "quote": "MiMo-V2.5로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "초보자 설명 세 개를 추천해줘",
      "앱 화면 흐름 문제를 짚어줘",
      "예산 검토 주제를 찬반 질문으로 바꿔줘"
    ],
    "greeting": "Xiaomi의 MiMo-V2.5입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "장문맥",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "Xiaomi",
      "contextLength": 1048576,
      "inputModalities": [
        "text",
        "audio",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-22",
      "openWeight": false
    }
  },
  {
    "id": "or-nex-agi-nex-n2-pro-free",
    "name": "Nex-N2-Pro Free",
    "nameKo": "Nex-N2-Pro Free",
    "icon": "🤖",
    "avatarUrl": "/logos/openrouter/nex-agi.png",
    "color": "cyan",
    "category": "ai",
    "openrouterModel": "nex-agi/nex-n2-pro:free",
    "description": "복잡한 문서와 이미지 자료를 차분히 정리하는 Nex AGI 모델",
    "quote": "Nex-N2-Pro Free로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "가격 인상 체크 포인트를 만들어줘",
      "문서 사진 숫자만 정리해줘",
      "초보자 설명 기준을 맞춰줘"
    ],
    "greeting": "Nex AGI의 Nex-N2-Pro Free입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "시각입력",
      "무료",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Nex AGI",
      "contextLength": 262144,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2026-06-08",
      "openWeight": false
    }
  },
  {
    "id": "or-nvidia-nemotron-3-ultra-550b-a55b",
    "name": "Nemotron 3 Ultra",
    "nameKo": "Nemotron 3 Ultra",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-ultra-550b-a55b",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 NVIDIA 모델",
    "quote": "Nemotron 3 Ultra로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "첫 행동 세 개를 추천해줘",
      "업무 로그 처리 순서를 단순화해줘",
      "사용자 불편 내용을 한 문단으로 줄여줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Ultra입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "장문맥",
      "툴사용",
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
      "priceTier": "standard",
      "createdAt": "2026-06-04",
      "openWeight": true
    }
  },
  {
    "id": "or-arcee-ai-trinity-large-thinking",
    "name": "Trinity Large Thinking",
    "nameKo": "Trinity Large Thinking",
    "icon": "🧭",
    "avatarUrl": "/logos/openrouter/arcee-ai.png",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "arcee-ai/trinity-large-thinking",
    "description": "장문 자료를 놓고 전제, 반례, 결론을 차분히 분리하는 Arcee AI 추론 모델",
    "quote": "Trinity Large Thinking로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "우선순위 기준별 비교표를 만들어줘",
      "신제품 회의 기준을 다시 잡아줘",
      "상황별 답변을 제목처럼 뽑아줘"
    ],
    "greeting": "Arcee AI의 Trinity Large Thinking입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "추론"
    ],
    "modelInfo": {
      "provider": "Arcee AI",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-01",
      "openWeight": true
    }
  },
  {
    "id": "or-z-ai-glm-4-7-flash",
    "name": "GLM 4.7 Flash",
    "nameKo": "GLM 4.7 Flash",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.7-flash",
    "description": "가벼운 실험과 평가 자동화에 맞춘 공개형 Z.ai 모델",
    "quote": "GLM 4.7 Flash로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사내 FAQ 검토 항목을 뽑아줘",
      "가격 인상 원인을 가설로 나눠줘",
      "다음 질문과 요약문문을 분리해줘"
    ],
    "greeting": "Z.ai의 GLM 4.7 Flash입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "고속"
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
      "priceTier": "low",
      "createdAt": "2026-01-19",
      "openWeight": true
    }
  },
  {
    "id": "or-inclusionai-ring-2-6-1t",
    "name": "Ring-2.6-1T",
    "nameKo": "Ring-2.6-1T",
    "icon": "🤖",
    "avatarUrl": "/logos/openrouter/inclusionai.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "inclusionai/ring-2.6-1t",
    "description": "장문·저비용 호출 조건에서 라이선스와 배포 유연성을 함께 보는 InclusionAI 오픈웨이트 모델",
    "quote": "Ring-2.6-1T로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "핵심 메시지 하나만 골라줘",
      "용어집 안전 요약본을 만들어줘",
      "마케팅 문구 전 확인할 것을 뽑아줘"
    ],
    "greeting": "InclusionAI의 Ring-2.6-1T입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "InclusionAI",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-05-08",
      "openWeight": true
    }
  },
  {
    "id": "or-deepseek-deepseek-v3-2-exp",
    "name": "DeepSeek V3.2 Exp",
    "nameKo": "DeepSeek V3.2 Exp",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-v3.2-exp",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 DeepSeek 모델",
    "quote": "DeepSeek V3.2 Exp로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "마케팅 문구 사유를 깔끔하게 정리해줘",
      "운영 절차 검토 항목을 뽑아줘",
      "핵심 메시지처럼 바로 읽게 써줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.2 Exp입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "문맥처리"
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
      "createdAt": "2025-09-29",
      "openWeight": true
    }
  },
  {
    "id": "or-minimax-minimax-m2-5",
    "name": "MiniMax M2.5",
    "nameKo": "MiniMax M2.5",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m2.5",
    "description": "긴 자료를 빠르게 읽고 실무용 초안을 만드는 MiniMax 모델",
    "quote": "MiniMax M2.5로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "회의 메모 바로 보낼 말로 고쳐줘",
      "팀 회고 주제를 찬반 질문으로 바꿔줘",
      "불확실한 부분 목록만 체크해줘"
    ],
    "greeting": "MiniMax의 MiniMax M2.5입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2026-02-12",
      "openWeight": false
    }
  },
  {
    "id": "or-nvidia-nemotron-3-ultra-550b-a55b-free",
    "name": "Nemotron 3 Ultra Free",
    "nameKo": "Nemotron 3 Ultra Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-ultra-550b-a55b:free",
    "description": "초장문·무료 호출 조건에서 라이선스와 배포 유연성을 함께 보는 NVIDIA 오픈웨이트 모델",
    "quote": "Nemotron 3 Ultra Free로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사내 FAQ 처리 순서를 단순화해줘",
      "가격 인상 항목을 우선순위로 정렬해줘",
      "다음 질문 하나만 골라줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Ultra Free입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "장문맥",
      "무료",
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
      "priceTier": "free",
      "createdAt": "2026-06-04",
      "openWeight": true
    }
  },
  {
    "id": "or-deepseek-deepseek-v3-1-terminus",
    "name": "DeepSeek V3.1 Terminus",
    "nameKo": "DeepSeek V3.1 Terminus",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-v3.1-terminus",
    "description": "저비용 배포와 라이선스 유연성을 함께 검토하기 좋은 DeepSeek 오픈웨이트 모델",
    "quote": "DeepSeek V3.1 Terminus로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문 톤으로 다듬어줘",
      "사내 FAQ 반복 업무용으로 바꿔줘",
      "경쟁사 비교 해석의 허점을 찾아줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.1 Terminus입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "문맥처리"
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
      "createdAt": "2025-09-22",
      "openWeight": true
    }
  },
  {
    "id": "or-z-ai-glm-4-7",
    "name": "GLM 4.7",
    "nameKo": "GLM 4.7",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.7",
    "description": "균형형 비용과 배포 유연성을 함께 검토하기 좋은 Z.ai 오픈웨이트 모델",
    "quote": "GLM 4.7로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "발표 대본을 제목처럼 뽑아줘",
      "사내 FAQ 검토 항목을 뽑아줘",
      "경쟁사 비교 목차를 새로 짜줘"
    ],
    "greeting": "Z.ai의 GLM 4.7입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2025-12-22",
      "openWeight": true
    }
  },
  {
    "id": "or-perplexity-sonar-reasoning-pro",
    "name": "Sonar Reasoning Pro",
    "nameKo": "Sonar Reasoning Pro",
    "icon": "🔍",
    "avatarUrl": "/logos/perplexity.svg",
    "color": "pink",
    "category": "ai",
    "openrouterModel": "perplexity/sonar-reasoning-pro",
    "description": "검색형 흐름으로 사실 확인과 이슈 추적을 우선하는 Perplexity 모델",
    "quote": "Sonar Reasoning Pro로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "다음 질문처럼 바로 읽게 써줘",
      "논문 주장 반대 근거를 찾아줘",
      "팀 회고 해석의 허점을 찾아줘"
    ],
    "greeting": "Perplexity의 Sonar Reasoning Pro입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "시각입력",
      "문맥처리",
      "추론"
    ],
    "modelInfo": {
      "provider": "Perplexity",
      "contextLength": 128000,
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
    }
  },
  {
    "id": "or-nvidia-llama-3-3-nemotron-super-49b-v1-5",
    "name": "Llama 3.3 Nemotron Super 49B V1.5",
    "nameKo": "Llama 3.3 Nemotron Super 49B V1.5",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    "description": "오픈소스 실험과 비용 통제를 검토하기 좋은 NVIDIA 모델",
    "quote": "Llama 3.3 Nemotron Super 49B V1.5로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "업무 요청 흐름을 자연스럽게 짜줘",
      "운영 절차 검토 항목을 뽑아줘",
      "단호한 표현 형태로 한눈에 보이게 해줘"
    ],
    "greeting": "NVIDIA의 Llama 3.3 Nemotron Super 49B V1.5입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "NVIDIA",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-10-10",
      "openWeight": true
    }
  },
  {
    "id": "or-deepseek-deepseek-chat-v3-1",
    "name": "DeepSeek V3.1",
    "nameKo": "DeepSeek V3.1",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-chat-v3.1",
    "description": "평가 자동화와 실험 설계에 맞춘 공개형 DeepSeek 모델",
    "quote": "DeepSeek V3.1로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "프로젝트 범위 이슈를 원인별로 묶어줘",
      "정책 초안 반복 업무용으로 바꿔줘",
      "첫 행동 목록만 체크해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.1입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "문맥처리"
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
      "createdAt": "2025-08-21",
      "openWeight": true
    }
  },
  {
    "id": "or-nvidia-nemotron-3-nano-30b-a3b-free",
    "name": "Nemotron 3 Nano 30B A3B Free",
    "nameKo": "Nemotron 3 Nano 30B A3B Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-nano-30b-a3b:free",
    "description": "무료 호출 경량 이용을 염두에 둔 로컬 테스트와 모델 비교용 NVIDIA 모델",
    "quote": "Nemotron 3 Nano 30B A3B Free로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "액션아이템 세 가지를 미리 예상해줘",
      "운영 절차 분류 규칙을 만들어줘",
      "일정 지연 반복 의견을 묶어줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Nano 30B A3B Free입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "무료",
      "고속"
    ],
    "modelInfo": {
      "provider": "NVIDIA",
      "contextLength": 256000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2025-12-14",
      "openWeight": true
    }
  },
  {
    "id": "or-poolside-laguna-xs-2-free",
    "name": "Laguna XS.2 Free",
    "nameKo": "Laguna XS.2 Free",
    "icon": "🌊",
    "avatarUrl": "/logos/openrouter/poolside.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "poolside/laguna-xs.2:free",
    "description": "범용 업무에 맞춰 초안 작성과 의사결정 보조를 맡기 좋은 Poolside 모델",
    "quote": "Laguna XS.2 Free로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "공지문 다음 질문을 만들어줘",
      "학습 계획 전 확인할 것을 뽑아줘",
      "단호한 표현 형태로 한눈에 보이게 해줘"
    ],
    "greeting": "Poolside의 Laguna XS.2 Free입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "무료",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Poolside",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2026-04-28",
      "openWeight": false
    }
  },
  {
    "id": "or-poolside-laguna-m-1-free",
    "name": "Laguna M.1 Free",
    "nameKo": "Laguna M.1 Free",
    "icon": "🌊",
    "avatarUrl": "/logos/openrouter/poolside.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "poolside/laguna-m.1:free",
    "description": "복잡하지 않은 분석과 대화형 업무 보조를 균형 있게 처리하는 Poolside 모델",
    "quote": "Laguna M.1 Free로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "채용 공고 더 명확하게 고쳐줘",
      "가격 인상 계획을 주간 단위로 나눠줘",
      "확인 사항를 먼저 찾아줘"
    ],
    "greeting": "Poolside의 Laguna M.1 Free입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "무료",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Poolside",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2026-04-28",
      "openWeight": false
    }
  },
  {
    "id": "or-mistralai-ministral-14b-2512",
    "name": "Ministral 3 14B 2512",
    "nameKo": "Ministral 3 14B 2512",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/ministral-14b-2512",
    "description": "장문·저비용 호출 조건에서 라이선스와 배포 유연성을 함께 보는 Mistral AI 오픈웨이트 모델",
    "quote": "Ministral 3 14B 2512로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "채용 검토 내용을 한 문단으로 줄여줘",
      "영수증 내용을 보고서 문장으로 바꿔줘",
      "의사결정 요약 목록으로 따로 표시해줘"
    ],
    "greeting": "Mistral AI의 Ministral 3 14B 2512입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2025-12-02",
      "openWeight": true
    }
  },
  {
    "id": "or-minimax-minimax-m2-1",
    "name": "MiniMax M2.1",
    "nameKo": "MiniMax M2.1",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m2.1",
    "description": "저비용 호출과 짧은 지연 시간을 우선하는 반복 질의용 MiniMax 모델",
    "quote": "MiniMax M2.1로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예산 검토 내용을 고객용으로 바꿔줘",
      "제목 후보 세 줄 버전으로 줄여줘",
      "주의할 점를 먼저 찾아줘"
    ],
    "greeting": "MiniMax의 MiniMax M2.1입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2025-12-23",
      "openWeight": false
    }
  },
  {
    "id": "or-mistralai-mistral-large-2407",
    "name": "Mistral Large 2407",
    "nameKo": "Mistral Large 2407",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-large-2407",
    "description": "균형형 비용 상위 이용을 염두에 둔 로컬 테스트와 모델 비교용 Mistral AI 모델",
    "quote": "Mistral Large 2407로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "온보딩 문구를 짧게 만들어줘",
      "용어집 분류 규칙을 만들어줘",
      "불확실한 부분 기준을 맞춰줘"
    ],
    "greeting": "Mistral AI의 Mistral Large 2407입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 131072,
      "inputModalities": [
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2024-11-19",
      "openWeight": true
    }
  },
  {
    "id": "or-z-ai-glm-5-turbo",
    "name": "GLM 5 Turbo",
    "nameKo": "GLM 5 Turbo",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-5-turbo",
    "description": "장문·균형형 비용 조건에서 라이선스와 배포 유연성을 함께 보는 Z.ai 오픈웨이트 모델",
    "quote": "GLM 5 Turbo로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "가격 인상 목차를 새로 짜줘",
      "업무 로그 반복 업무용으로 바꿔줘",
      "초보자 설명으로 더 단호하게 바꿔줘"
    ],
    "greeting": "Z.ai의 GLM 5 Turbo입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "고속",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Z.ai",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-03-15",
      "openWeight": true
    }
  },
  {
    "id": "or-mistralai-mistral-medium-3",
    "name": "Mistral Medium 3",
    "nameKo": "Mistral Medium 3",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-medium-3",
    "description": "균형형 비용 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Mistral AI 모델",
    "quote": "Mistral Medium 3로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "학습 계획 내용을 고객용으로 바꿔줘",
      "대시보드 핵심 정보를 뽑아줘",
      "단호한 표현 하나만 골라줘"
    ],
    "greeting": "Mistral AI의 Mistral Medium 3입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "툴사용",
      "문서입력"
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
      "createdAt": "2025-05-07",
      "openWeight": true
    }
  },
  {
    "id": "or-nvidia-nemotron-3-nano-omni-30b-a3b-reasoning-free",
    "name": "Nemotron 3 Nano Omni Free",
    "nameKo": "Nemotron 3 Nano Omni Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    "description": "복잡한 자료에서 전제, 반례, 결론을 차분히 분리하는 NVIDIA 추론 모델",
    "quote": "Nemotron 3 Nano Omni Free로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "의사결정안 점수표를 만들어줘",
      "사용자 불편 해석의 허점을 찾아줘",
      "의사결정 요약 톤으로 다듬어줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Nano Omni Free입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "무료",
      "추론"
    ],
    "modelInfo": {
      "provider": "NVIDIA",
      "contextLength": 256000,
      "inputModalities": [
        "text",
        "audio",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2026-04-28",
      "openWeight": true
    }
  },
  {
    "id": "or-nvidia-nemotron-3-super-120b-a12b-free",
    "name": "Nemotron 3 Super Free",
    "nameKo": "Nemotron 3 Super Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-super-120b-a12b:free",
    "description": "초장문 환경에서 오픈웨이트 실험과 비용 통제를 검토하기 좋은 NVIDIA 모델",
    "quote": "Nemotron 3 Super Free로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "실행 순서 형식으로 바꿔줘",
      "내부 문서 검토 항목을 뽑아줘",
      "이해관계자 의견 이해관계를 정리해줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Super Free입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "장문맥",
      "무료",
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
      "priceTier": "free",
      "createdAt": "2026-03-11",
      "openWeight": true
    }
  },
  {
    "id": "or-minimax-minimax-m2",
    "name": "MiniMax M2",
    "nameKo": "MiniMax M2",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m2",
    "description": "긴 자료를 빠르게 읽고 실무용 초안을 만드는 MiniMax 모델",
    "quote": "MiniMax M2로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "회의 메모 바로 보낼 말로 고쳐줘",
      "팀 회고 전 확인할 것을 뽑아줘",
      "보류할 이유를 제목처럼 뽑아줘"
    ],
    "greeting": "MiniMax의 MiniMax M2입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2025-10-23",
      "openWeight": false
    }
  },
  {
    "id": "or-deepseek-deepseek-r1-0528",
    "name": "R1 0528",
    "nameKo": "R1 0528",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-r1-0528",
    "description": "균형형 비용 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 DeepSeek 모델",
    "quote": "R1 0528로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "이해관계자 의견 내용을 개선안으로 바꿔줘",
      "협상 조건 숨은 전제를 찾아줘",
      "다음 질문 세 가지를 미리 예상해줘"
    ],
    "greeting": "DeepSeek의 R1 0528입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
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
      "createdAt": "2025-05-28",
      "openWeight": true
    }
  },
  {
    "id": "or-mistralai-mistral-small-3-1-24b-instruct",
    "name": "Mistral Small 3.1 24B",
    "nameKo": "Mistral Small 3.1 24B",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-small-3.1-24b-instruct",
    "description": "저비용 배포와 라이선스 유연성을 함께 검토하기 좋은 Mistral AI 오픈웨이트 모델",
    "quote": "Mistral Small 3.1 24B로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "단호한 표현 하나만 골라줘",
      "슬라이드 핵심 정보를 뽑아줘",
      "마케팅 문구 내용을 고객용으로 바꿔줘"
    ],
    "greeting": "Mistral AI의 Mistral Small 3.1 24B입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 128000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-03-17",
      "openWeight": true
    }
  },
  {
    "id": "or-bytedance-seed-seed-1-6",
    "name": "Seed 1.6",
    "nameKo": "Seed 1.6",
    "icon": "🌱",
    "avatarUrl": "/logos/bytedance.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "bytedance-seed/seed-1.6",
    "description": "균형형 비용 조건의 범용 입력에서 화면 자료와 텍스트를 함께 검토해 판단을 돕는 ByteDance Seed 모델",
    "quote": "Seed 1.6로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "보류할 이유 방식으로 쉽게 풀어줘",
      "화면 캡처 흐름 문제를 짚어줘",
      "온보딩 문서를 순서대로 정리해줘"
    ],
    "greeting": "ByteDance Seed의 Seed 1.6입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "ByteDance Seed",
      "contextLength": 262144,
      "inputModalities": [
        "image",
        "text",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-12-23",
      "openWeight": false
    }
  },
  {
    "id": "or-z-ai-glm-4-6v",
    "name": "GLM 4.6V",
    "nameKo": "GLM 4.6V",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.6v",
    "description": "평가 자동화와 실험 설계에 맞춘 공개형 Z.ai 모델",
    "quote": "GLM 4.6V로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "발표 대본 항목은 과감히 덜어줘",
      "앱 화면 핵심 정보를 뽑아줘",
      "예산 검토 문장을 부드럽게 써줘"
    ],
    "greeting": "Z.ai의 GLM 4.6V입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
      "멀티모달"
    ],
    "modelInfo": {
      "provider": "Z.ai",
      "contextLength": 131072,
      "inputModalities": [
        "image",
        "text",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-12-08",
      "openWeight": true
    }
  },
  {
    "id": "or-deepseek-deepseek-r1-distill-qwen-32b",
    "name": "R1 Distill Qwen 32B",
    "nameKo": "R1 Distill Qwen 32B",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-r1-distill-qwen-32b",
    "description": "저비용 배포와 라이선스 유연성을 함께 검토하기 좋은 DeepSeek 오픈웨이트 모델",
    "quote": "R1 Distill Qwen 32B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "이해관계자 의견 전 쟁점을 뽑아줘",
      "협상 조건 숨은 전제를 찾아줘",
      "다음 질문 방식으로 쉽게 풀어줘"
    ],
    "greeting": "DeepSeek의 R1 Distill Qwen 32B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "추론"
    ],
    "modelInfo": {
      "provider": "DeepSeek",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-01-29",
      "openWeight": true
    }
  },
  {
    "id": "or-deepseek-deepseek-r1-distill-llama-70b",
    "name": "R1 Distill Llama 70B",
    "nameKo": "R1 Distill Llama 70B",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-r1-distill-llama-70b",
    "description": "균형형 비용 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 DeepSeek 모델",
    "quote": "R1 Distill Llama 70B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "대안 후보 약한 논리를 짚어줘",
      "업무 요청 체크 포인트를 만들어줘",
      "낮은 중요도 세 가지를 미리 예상해줘"
    ],
    "greeting": "DeepSeek의 R1 Distill Llama 70B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "범용",
      "문맥처리",
      "추론"
    ],
    "modelInfo": {
      "provider": "DeepSeek",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-01-23",
      "openWeight": true
    }
  },
  {
    "id": "or-perplexity-sonar-deep-research",
    "name": "Sonar Deep Research",
    "nameKo": "Sonar Deep Research",
    "icon": "🔍",
    "avatarUrl": "/logos/perplexity.svg",
    "color": "pink",
    "category": "ai",
    "openrouterModel": "perplexity/sonar-deep-research",
    "description": "고난도 작업 조건에서 웹 근거, 비교 자료, 요약 보고서를 빠르게 묶는 Perplexity 모델",
    "quote": "Sonar Deep Research로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "논문 주장 신뢰도를 점검해줘",
      "신제품 회의 질문을 준비해줘",
      "상황별 답변을 찾아줘"
    ],
    "greeting": "Perplexity의 Sonar Deep Research입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "범용",
      "문맥처리",
      "추론"
    ],
    "modelInfo": {
      "provider": "Perplexity",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-03-07",
      "openWeight": false
    }
  },
  {
    "id": "or-deepseek-deepseek-chat",
    "name": "DeepSeek V3",
    "nameKo": "DeepSeek V3",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-chat",
    "description": "오픈소스 실험과 비용 통제를 검토하기 좋은 DeepSeek 모델",
    "quote": "DeepSeek V3로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "마케팅 문구 내용을 고객용으로 바꿔줘",
      "운영 절차 분류 규칙을 만들어줘",
      "결론 중심으로 번호를 매겨줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "DeepSeek",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-12-26",
      "openWeight": true
    }
  },
  {
    "id": "or-mistralai-mistral-large",
    "name": "Mistral Large",
    "nameKo": "Mistral Large",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-large",
    "description": "균형형 비용과 배포 유연성을 함께 검토하기 좋은 Mistral AI 오픈웨이트 모델",
    "quote": "Mistral Large로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "발표 대본 중심으로 번호를 매겨줘",
      "운영 절차 민감정보를 줄여줘",
      "데이터 해석 표현의 과장을 줄여줘"
    ],
    "greeting": "Mistral AI의 Mistral Large입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "툴사용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 128000,
      "inputModalities": [
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2024-02-26",
      "openWeight": true
    }
  },
  {
    "id": "or-liquid-lfm-2-5-1-2b-thinking-free",
    "name": "LFM2.5-1.2B-Thinking Free",
    "nameKo": "LFM2.5-1.2B-Thinking Free",
    "icon": "💧",
    "avatarUrl": "/logos/openrouter/liquid.png",
    "color": "cyan",
    "category": "ai",
    "openrouterModel": "liquid/lfm-2.5-1.2b-thinking:free",
    "description": "표준 문맥 자료를 놓고 전제, 반례, 결론을 차분히 분리하는 Liquid AI 추론 모델",
    "quote": "LFM2.5-1.2B-Thinking Free로 복잡한 추론과 단계별 판단 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "초보자 설명 형태로 다시 써줘",
      "우선순위 탈락 기준으로 걸러줘",
      "설문 결과 표현의 과장을 줄여줘"
    ],
    "greeting": "Liquid AI의 LFM2.5-1.2B-Thinking Free입니다. 복잡한 추론과 단계별 판단에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "무료",
      "추론"
    ],
    "modelInfo": {
      "provider": "Liquid AI",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2026-01-20",
      "openWeight": true
    }
  },
  {
    "id": "or-anthropic-claude-3-haiku",
    "name": "Claude 3 Haiku",
    "nameKo": "Claude 3 Haiku",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-3-haiku",
    "description": "긴 문서와 시각 자료를 함께 이해해 핵심 판단을 돕는 Anthropic 모델",
    "quote": "Claude 3 Haiku로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "원인과 해결책 기준을 맞춰줘",
      "앱 화면 내용을 할 일로 바꿔줘",
      "데이터 해석 흐름을 자연스럽게 짜줘"
    ],
    "greeting": "Anthropic의 Claude 3 Haiku입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "저비용",
      "고속",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "Anthropic",
      "contextLength": 200000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-03-13",
      "openWeight": false
    }
  },
  {
    "id": "or-minimax-minimax-m1",
    "name": "MiniMax M1",
    "nameKo": "MiniMax M1",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m1",
    "description": "균형형 비용과 짧은 지연 시간을 우선하는 반복 질의용 MiniMax 모델",
    "quote": "MiniMax M1로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "확인 사항 형태로 다시 써줘",
      "긴 답장 더 공손하게 바꿔줘",
      "고객 이탈 항목을 우선순위로 정렬해줘"
    ],
    "greeting": "MiniMax의 MiniMax M1입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "장문맥",
      "고속",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "MiniMax",
      "contextLength": 1000000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-06-17",
      "openWeight": false
    }
  },
  {
    "id": "or-google-gemma-3n-e4b-it",
    "name": "Gemma 3n 4B",
    "nameKo": "Gemma 3n 4B",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-3n-e4b-it",
    "description": "저비용 호출 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Google 모델",
    "quote": "Gemma 3n 4B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "계약 협상 사유를 깔끔하게 정리해줘",
      "보안 검토 반복 업무용으로 바꿔줘",
      "낮은 중요도 세 가지를 미리 예상해줘"
    ],
    "greeting": "Google의 Gemma 3n 4B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-05-20",
      "openWeight": true
    }
  },
  {
    "id": "or-mistralai-mistral-small-3-2-24b-instruct",
    "name": "Mistral Small 3.2 24B",
    "nameKo": "Mistral Small 3.2 24B",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-small-3.2-24b-instruct",
    "description": "경량 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 Mistral AI 모델",
    "quote": "Mistral Small 3.2 24B로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "비교표 톤으로 다듬어줘",
      "문서 사진 속 이상한 점을 찾아줘",
      "토론 준비 반복 의견을 묶어줘"
    ],
    "greeting": "Mistral AI의 Mistral Small 3.2 24B입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 128000,
      "inputModalities": [
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-06-20",
      "openWeight": true
    }
  },
  {
    "id": "or-z-ai-glm-4-6",
    "name": "GLM 4.6",
    "nameKo": "GLM 4.6",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.6",
    "description": "평가 자동화와 실험 설계에 맞춘 공개형 Z.ai 모델",
    "quote": "GLM 4.6로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "업무 로그 처리 순서를 단순화해줘",
      "사업 제안 문장을 부드럽게 써줘",
      "예상 질문 형식으로 바꿔줘"
    ],
    "greeting": "Z.ai의 GLM 4.6입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "중국어",
      "툴사용",
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
      "createdAt": "2025-09-30",
      "openWeight": true
    }
  },
  {
    "id": "or-kwaipilot-kat-coder-pro-v2",
    "name": "KAT-Coder-Pro V2",
    "nameKo": "KAT-Coder-Pro V2",
    "icon": "🧰",
    "avatarUrl": "/logos/openrouter/kwaipilot.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "kwaipilot/kat-coder-pro-v2",
    "description": "저비용 호출 기준으로 코드 리뷰, 함수 설계, 리팩터링 초안을 빠르게 만드는 KwaiPilot 모델",
    "quote": "KAT-Coder-Pro V2로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "보고 문장 톤으로 다듬어줘",
      "리뷰 댓글 위험 구간을 표시해줘",
      "마케팅 문구 사유를 깔끔하게 정리해줘"
    ],
    "greeting": "KwaiPilot의 KAT-Coder-Pro V2입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "저비용",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "KwaiPilot",
      "contextLength": 256000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-03-27",
      "openWeight": false
    }
  },
  {
    "id": "or-meta-llama-llama-3-2-3b-instruct-free",
    "name": "Llama 3.2 3B Instruct Free",
    "nameKo": "Llama 3.2 3B Instruct Free",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3.2-3b-instruct:free",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 Meta 모델",
    "quote": "Llama 3.2 3B Instruct Free로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "내부 문서 검토 항목을 뽑아줘",
      "토론 준비 체크 포인트를 만들어줘",
      "핵심 메시지처럼 바로 읽게 써줘"
    ],
    "greeting": "Meta의 Llama 3.2 3B Instruct Free입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "무료",
      "문맥처리",
      "업무"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2024-09-25",
      "openWeight": true
    }
  },
  {
    "id": "or-nvidia-nemotron-nano-9b-v2-free",
    "name": "Nemotron Nano 9B V2 Free",
    "nameKo": "Nemotron Nano 9B V2 Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-nano-9b-v2:free",
    "description": "무료 활용과 배포 유연성을 함께 검토하기 좋은 NVIDIA 오픈웨이트 모델",
    "quote": "Nemotron Nano 9B V2 Free로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "회의 발언 세 가지를 미리 예상해줘",
      "사내 FAQ 안전 요약본을 만들어줘",
      "기능 소개 문서를 순서대로 정리해줘"
    ],
    "greeting": "NVIDIA의 Nemotron Nano 9B V2 Free입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "무료",
      "고속",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "NVIDIA",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2025-09-05",
      "openWeight": true
    }
  },
  {
    "id": "or-z-ai-glm-4-5",
    "name": "GLM 4.5",
    "nameKo": "GLM 4.5",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.5",
    "description": "균형형 비용 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Z.ai 모델",
    "quote": "GLM 4.5로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사업 제안 항목을 우선순위로 정렬해줘",
      "보안 검토 민감정보를 줄여줘",
      "공유 문장 형태로 다시 써줘"
    ],
    "greeting": "Z.ai의 GLM 4.5입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "중국어",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Z.ai",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-07-25",
      "openWeight": true
    }
  },
  {
    "id": "or-z-ai-glm-4-5-air",
    "name": "GLM 4.5 Air",
    "nameKo": "GLM 4.5 Air",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.5-air",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 Z.ai 모델",
    "quote": "GLM 4.5 Air로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사내 FAQ 처리 순서를 단순화해줘",
      "팀 회고 내용을 고객용으로 바꿔줘",
      "다음 질문 하나만 골라줘"
    ],
    "greeting": "Z.ai의 GLM 4.5 Air입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "중국어",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Z.ai",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-07-25",
      "openWeight": true
    }
  },
  {
    "id": "or-moonshotai-kimi-k2-0905",
    "name": "Kimi K2 0905",
    "nameKo": "Kimi K2 0905",
    "icon": "🌙",
    "avatarUrl": "/logos/moonshot.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "moonshotai/kimi-k2-0905",
    "description": "복잡하지 않은 분석과 대화형 업무 보조를 균형 있게 처리하는 Moonshot AI 모델",
    "quote": "Kimi K2 0905로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "가격 인상 반복 의견을 묶어줘",
      "사용자 리뷰 빈틈을 찾아줘",
      "초보자 설명 형식으로 바꿔줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2 0905입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "중국어",
      "툴사용",
      "구조화",
      "문맥처리"
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
      "createdAt": "2025-09-04",
      "openWeight": false
    }
  },
  {
    "id": "or-mistralai-voxtral-small-24b-2507",
    "name": "Voxtral Small 24B 2507",
    "nameKo": "Voxtral Small 24B 2507",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/voxtral-small-24b-2507",
    "description": "저비용 호출 경량 이용을 염두에 둔 로컬 테스트와 모델 비교용 Mistral AI 모델",
    "quote": "Voxtral Small 24B 2507로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "운영 절차 처리 순서를 단순화해줘",
      "이해관계자 의견 전 쟁점을 뽑아줘",
      "상황별 답변을 찾아줘"
    ],
    "greeting": "Mistral AI의 Voxtral Small 24B 2507입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "고속",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 32000,
      "inputModalities": [
        "text",
        "audio",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-10-30",
      "openWeight": true
    }
  },
  {
    "id": "or-essentialai-rnj-1-instruct",
    "name": "Rnj 1 Instruct",
    "nameKo": "Rnj 1 Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/openrouter/essentialai.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "essentialai/rnj-1-instruct",
    "description": "범용 업무에 맞춰 초안 작성과 의사결정 보조를 맡기 좋은 Essential AI 모델",
    "quote": "Rnj 1 Instruct로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "가격 안내 공유용으로 정리해줘",
      "일정 지연 항목을 우선순위로 정렬해줘",
      "초보자 설명 형태로 다시 써줘"
    ],
    "greeting": "Essential AI의 Rnj 1 Instruct입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "저비용",
      "툴사용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Essential AI",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-12-07",
      "openWeight": false
    }
  },
  {
    "id": "or-cohere-command-r7b-12-2024",
    "name": "Command R7B (12-2024)",
    "nameKo": "Command R7B (12-2024)",
    "icon": "📚",
    "avatarUrl": "/logos/cohere.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "cohere/command-r7b-12-2024",
    "description": "저비용 호출 균형을 살려 일상 업무와 지식 질의에 두루 쓰기 좋은 Cohere 모델",
    "quote": "Command R7B (12-2024)로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "실행 순서 중심으로 번호를 매겨줘",
      "긴 답장 바로 보낼 말로 고쳐줘",
      "고객 이탈 계획을 주간 단위로 나눠줘"
    ],
    "greeting": "Cohere의 Command R7B (12-2024)입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "저비용",
      "구조화",
      "문맥처리",
      "업무"
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
      "priceTier": "low",
      "createdAt": "2024-12-14",
      "openWeight": false
    }
  },
  {
    "id": "or-rekaai-reka-flash-3",
    "name": "Reka Flash 3",
    "nameKo": "Reka Flash 3",
    "icon": "✨",
    "avatarUrl": "/logos/openrouter/rekaai.png",
    "color": "pink",
    "category": "ai",
    "openrouterModel": "rekaai/reka-flash-3",
    "description": "경량 계열의 표준 문맥 공개 모델로 평가 자동화와 실험 설계에 맞춘 Reka AI 모델",
    "quote": "Reka Flash 3로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "자료 템플릿 민감정보를 줄여줘",
      "업무 요청 기준을 다시 잡아줘",
      "낮은 중요도를 제목처럼 뽑아줘"
    ],
    "greeting": "Reka AI의 Reka Flash 3입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "Reka AI",
      "contextLength": 65536,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-03-12",
      "openWeight": true
    }
  },
  {
    "id": "or-amazon-nova-lite-v1",
    "name": "Nova Lite 1.0",
    "nameKo": "Nova Lite 1.0",
    "icon": "📦",
    "avatarUrl": "/logos/amazon.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "amazon/nova-lite-v1",
    "description": "문서, 이미지, 표를 함께 검토해 실행 항목을 정리하는 Amazon 모델",
    "quote": "Nova Lite 1.0로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "영수증 속 이상한 점을 찾아줘",
      "일정 지연 질문을 준비해줘",
      "보류할 이유를 찾아줘"
    ],
    "greeting": "Amazon의 Nova Lite 1.0입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "저비용",
      "고속",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "Amazon",
      "contextLength": 300000,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-12-05",
      "openWeight": false
    }
  },
  {
    "id": "or-google-gemma-2-27b-it",
    "name": "Gemma 2 27B",
    "nameKo": "Gemma 2 27B",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-2-27b-it",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 Google 모델",
    "quote": "Gemma 2 27B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "용어집 반복 업무용으로 바꿔줘",
      "공지 작성 흐름을 자연스럽게 짜줘",
      "원인과 해결책 기준을 맞춰줘"
    ],
    "greeting": "Google의 Gemma 2 27B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화",
      "업무"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 8192,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-07-13",
      "openWeight": true
    }
  },
  {
    "id": "or-mistralai-mixtral-8x22b-instruct",
    "name": "Mixtral 8x22B Instruct",
    "nameKo": "Mixtral 8x22B Instruct",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mixtral-8x22b-instruct",
    "description": "범용 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 Mistral AI 모델",
    "quote": "Mixtral 8x22B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "신제품 회의 계획을 주간 단위로 나눠줘",
      "정책 초안 반복 업무용으로 바꿔줘",
      "의사결정 요약를 먼저 찾아줘"
    ],
    "greeting": "Mistral AI의 Mixtral 8x22B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 65536,
      "inputModalities": [
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2024-04-17",
      "openWeight": true
    }
  },
  {
    "id": "or-arcee-ai-trinity-mini",
    "name": "Trinity Mini",
    "nameKo": "Trinity Mini",
    "icon": "🧭",
    "avatarUrl": "/logos/openrouter/arcee-ai.png",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "arcee-ai/trinity-mini",
    "description": "저비용 배포와 라이선스 유연성을 함께 검토하기 좋은 Arcee AI 오픈웨이트 모델",
    "quote": "Trinity Mini로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "계약 협상 내용을 한 문단으로 줄여줘",
      "보안 검토 분류 규칙을 만들어줘",
      "공유 문장 목록으로 따로 표시해줘"
    ],
    "greeting": "Arcee AI의 Trinity Mini입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "고속",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Arcee AI",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-12-01",
      "openWeight": true
    }
  },
  {
    "id": "or-nousresearch-hermes-4-70b",
    "name": "Hermes 4 70B",
    "nameKo": "Hermes 4 70B",
    "icon": "🧪",
    "avatarUrl": "/logos/nous.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "nousresearch/hermes-4-70b",
    "description": "질문의 배경 자료를 찾고 핵심 근거를 짧게 정리하는 Nous Research 리서치 모델",
    "quote": "Hermes 4 70B로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "비교표를 찾아줘",
      "경쟁사 발표 자료를 출처별로 비교해줘",
      "토론 준비 원인을 가설로 나눠줘"
    ],
    "greeting": "Nous Research의 Hermes 4 70B입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "오픈웨이트",
      "저비용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Nous Research",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-08-26",
      "openWeight": true
    }
  },
  {
    "id": "or-nousresearch-hermes-4-405b",
    "name": "Hermes 4 405B",
    "nameKo": "Hermes 4 405B",
    "icon": "🧪",
    "avatarUrl": "/logos/nous.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "nousresearch/hermes-4-405b",
    "description": "출처 확인과 최신 쟁점 정리에 맞춘 Nous Research 검색형 모델",
    "quote": "Hermes 4 405B로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문 항목은 과감히 덜어줘",
      "보도자료 신뢰도를 점검해줘",
      "예산 검토 내용을 더 명확하게 고쳐줘"
    ],
    "greeting": "Nous Research의 Hermes 4 405B입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "오픈웨이트",
      "구조화",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Nous Research",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-08-26",
      "openWeight": true
    }
  },
  {
    "id": "or-morph-morph-v3-large",
    "name": "Morph V3 Large",
    "nameKo": "Morph V3 Large",
    "icon": "🧬",
    "avatarUrl": "/logos/openrouter/morph.png",
    "color": "indigo",
    "category": "ai",
    "openrouterModel": "morph/morph-v3-large",
    "description": "균형형 비용 균형을 살려 일상 업무와 지식 질의에 두루 쓰기 좋은 Morph 모델",
    "quote": "Morph V3 Large로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "채용 공고 더 명확하게 고쳐줘",
      "설문 결과 흐름을 자연스럽게 짜줘",
      "불확실한 부분 기준을 맞춰줘"
    ],
    "greeting": "Morph의 Morph V3 Large입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "범용",
      "업무",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Morph",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-07-07",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-4-turbo-preview",
    "name": "GPT-4 Turbo Preview",
    "nameKo": "GPT-4 Turbo Preview",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4-turbo-preview",
    "description": "복잡하지 않은 분석과 대화형 업무 보조를 균형 있게 처리하는 OpenAI 모델",
    "quote": "GPT-4 Turbo Preview로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "업무 메모 더 명확하게 고쳐줘",
      "장애 대응 해석의 허점을 찾아줘",
      "보고 문장 톤으로 다듬어줘"
    ],
    "greeting": "OpenAI의 GPT-4 Turbo Preview입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "고속",
      "툴사용",
      "구조화",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2024-01-25",
      "openWeight": false
    }
  },
  {
    "id": "or-mistralai-mistral-saba",
    "name": "Saba",
    "nameKo": "Saba",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-saba",
    "description": "표준 문맥·저비용 호출 조건에서 라이선스와 배포 유연성을 함께 보는 Mistral AI 오픈웨이트 모델",
    "quote": "Saba로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "업무 요청 기준을 다시 잡아줘",
      "운영 절차 민감정보를 줄여줘",
      "핵심 메시지 중심으로 다시 써줘"
    ],
    "greeting": "Mistral AI의 Saba입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 32768,
      "inputModalities": [
        "text",
        "file"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-02-17",
      "openWeight": true
    }
  },
  {
    "id": "or-meta-llama-llama-3-3-70b-instruct",
    "name": "Llama 3.3 70B Instruct",
    "nameKo": "Llama 3.3 70B Instruct",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3.3-70b-instruct",
    "description": "평가 자동화와 실험 설계에 맞춘 공개형 Meta 모델",
    "quote": "Llama 3.3 70B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "액션아이템을 제목처럼 뽑아줘",
      "운영 절차 처리 순서를 단순화해줘",
      "데이터 해석 기준을 다시 잡아줘"
    ],
    "greeting": "Meta의 Llama 3.3 70B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-12-06",
      "openWeight": true
    }
  },
  {
    "id": "or-mistralai-mistral-small-24b-instruct-2501",
    "name": "Mistral Small 3",
    "nameKo": "Mistral Small 3",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-small-24b-instruct-2501",
    "description": "경량 계열의 표준 문맥 공개 모델로 평가 자동화와 실험 설계에 맞춘 Mistral AI 모델",
    "quote": "Mistral Small 3로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "계약 협상 주제를 찬반 질문으로 바꿔줘",
      "보안 검토 안전 요약본을 만들어줘",
      "결론 구간을 따로 표시해줘"
    ],
    "greeting": "Mistral AI의 Mistral Small 3입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "고속",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-01-30",
      "openWeight": true
    }
  },
  {
    "id": "or-inclusionai-ling-2-6-1t",
    "name": "Ling-2.6-1T",
    "nameKo": "Ling-2.6-1T",
    "icon": "🤖",
    "avatarUrl": "/logos/openrouter/inclusionai.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "inclusionai/ling-2.6-1t",
    "description": "장문·저비용 호출 조건에서 라이선스와 배포 유연성을 함께 보는 InclusionAI 오픈웨이트 모델",
    "quote": "Ling-2.6-1T로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "일정 지연 항목을 우선순위로 정렬해줘",
      "자료 템플릿 민감정보를 줄여줘",
      "발표 대본 중심으로 번호를 매겨줘"
    ],
    "greeting": "InclusionAI의 Ling-2.6-1T입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "InclusionAI",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-23",
      "openWeight": true
    }
  },
  {
    "id": "or-inclusionai-ling-2-6-flash",
    "name": "Ling-2.6-flash",
    "nameKo": "Ling-2.6-flash",
    "icon": "🤖",
    "avatarUrl": "/logos/openrouter/inclusionai.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "inclusionai/ling-2.6-flash",
    "description": "경량 공개 모델로 서식, 평가, 로컬 이용 가능성을 살피기 좋은 InclusionAI 모델",
    "quote": "Ling-2.6-flash로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "경쟁사 비교 목차를 새로 짜줘",
      "내부 문서 검토 항목을 뽑아줘",
      "공유 문장으로 더 단호하게 바꿔줘"
    ],
    "greeting": "InclusionAI의 Ling-2.6-flash입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "고속",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "InclusionAI",
      "contextLength": 262144,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-04-21",
      "openWeight": true
    }
  },
  {
    "id": "or-moonshotai-kimi-k2",
    "name": "Kimi K2 0711",
    "nameKo": "Kimi K2 0711",
    "icon": "🌙",
    "avatarUrl": "/logos/moonshot.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "moonshotai/kimi-k2",
    "description": "범용 업무에 맞춰 초안 작성과 의사결정 보조를 맡기 좋은 Moonshot AI 모델",
    "quote": "Kimi K2 0711로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사업 제안 문장을 부드럽게 써줘",
      "제안서 공유용으로 정리해줘",
      "낮은 중요도와 요약을 분리해줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2 0711입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "중국어",
      "툴사용",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Moonshot AI",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-07-11",
      "openWeight": false
    }
  },
  {
    "id": "or-prime-intellect-intellect-3",
    "name": "INTELLECT-3",
    "nameKo": "INTELLECT-3",
    "icon": "🧪",
    "avatarUrl": "/logos/openrouter/prime-intellect.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "prime-intellect/intellect-3",
    "description": "저비용 배포와 라이선스 유연성을 함께 검토하기 좋은 Prime Intellect 오픈웨이트 모델",
    "quote": "INTELLECT-3로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "확인 사항 기준을 맞춰줘",
      "자료 템플릿 안전 요약본을 만들어줘",
      "채용 검토 해석의 허점을 찾아줘"
    ],
    "greeting": "Prime Intellect의 INTELLECT-3입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Prime Intellect",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-11-27",
      "openWeight": true
    }
  },
  {
    "id": "or-allenai-olmo-3-32b-think",
    "name": "Olmo 3 32B Think",
    "nameKo": "Olmo 3 32B Think",
    "icon": "📚",
    "avatarUrl": "/logos/openrouter/allenai.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "allenai/olmo-3-32b-think",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Ai2 모델",
    "quote": "Olmo 3 32B Think로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "의사결정안 숨은 전제를 찾아줘",
      "사용자 불편 문구를 짧게 만들어줘",
      "단호한 표현을 제목처럼 뽑아줘"
    ],
    "greeting": "Ai2의 Olmo 3 32B Think입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화",
      "업무"
    ],
    "modelInfo": {
      "provider": "Ai2",
      "contextLength": 65536,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-11-21",
      "openWeight": true
    }
  },
  {
    "id": "or-meta-llama-llama-3-3-70b-instruct-free",
    "name": "Llama 3.3 70B Instruct Free",
    "nameKo": "Llama 3.3 70B Instruct Free",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3.3-70b-instruct:free",
    "description": "무료 호출 운용을 고려해 자체 배포 후보와 공개 모델 비교에 맞춘 Meta 모델",
    "quote": "Llama 3.3 70B Instruct Free로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "사내 FAQ 검토 항목을 뽑아줘",
      "설문 결과 이해관계를 정리해줘",
      "확인 사항 구조로 나눠서 써줘"
    ],
    "greeting": "Meta의 Llama 3.3 70B Instruct Free입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "무료",
      "툴사용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2024-12-06",
      "openWeight": true
    }
  },
  {
    "id": "or-meta-llama-llama-3-2-1b-instruct",
    "name": "Llama 3.2 1B Instruct",
    "nameKo": "Llama 3.2 1B Instruct",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3.2-1b-instruct",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Meta 모델",
    "quote": "Llama 3.2 1B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "학습 계획 전 쟁점을 뽑아줘",
      "사내 FAQ 처리 순서를 단순화해줘",
      "핵심 메시지 목록만 체크해줘"
    ],
    "greeting": "Meta의 Llama 3.2 1B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-09-25",
      "openWeight": true
    }
  },
  {
    "id": "or-deepcogito-cogito-v2-1-671b",
    "name": "Cogito v2.1 671B",
    "nameKo": "Cogito v2.1 671B",
    "icon": "🧠",
    "avatarUrl": "/logos/openrouter/deepcogito.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepcogito/cogito-v2.1-671b",
    "description": "균형형 비용 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Deep Cogito 모델",
    "quote": "Cogito v2.1 671B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "업무 로그 처리 순서를 단순화해줘",
      "발표 준비 기준을 다시 잡아줘",
      "결론 스타일로 세 줄만 써줘"
    ],
    "greeting": "Deep Cogito의 Cogito v2.1 671B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "구조화",
      "문맥처리",
      "업무"
    ],
    "modelInfo": {
      "provider": "Deep Cogito",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-11-13",
      "openWeight": true
    }
  },
  {
    "id": "or-meta-llama-llama-3-1-8b-instruct",
    "name": "Llama 3.1 8B Instruct",
    "nameKo": "Llama 3.1 8B Instruct",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3.1-8b-instruct",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Meta 모델",
    "quote": "Llama 3.1 8B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "초보자 설명으로 더 단호하게 바꿔줘",
      "보안 검토 반복 업무용으로 바꿔줘",
      "가격 인상 목차를 새로 짜줘"
    ],
    "greeting": "Meta의 Llama 3.1 8B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-07-23",
      "openWeight": true
    }
  },
  {
    "id": "or-meta-llama-llama-3-1-70b-instruct",
    "name": "Llama 3.1 70B Instruct",
    "nameKo": "Llama 3.1 70B Instruct",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3.1-70b-instruct",
    "description": "오픈소스 실험과 비용 통제를 검토하기 좋은 Meta 모델",
    "quote": "Llama 3.1 70B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "업무 로그 처리 순서를 단순화해줘",
      "발표 준비 기준을 다시 잡아줘",
      "결론 스타일로 세 줄만 써줘"
    ],
    "greeting": "Meta의 Llama 3.1 70B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-07-23",
      "openWeight": true
    }
  },
  {
    "id": "or-arcee-ai-virtuoso-large",
    "name": "Virtuoso Large",
    "nameKo": "Virtuoso Large",
    "icon": "🧭",
    "avatarUrl": "/logos/openrouter/arcee-ai.png",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "arcee-ai/virtuoso-large",
    "description": "균형형 비용과 배포 유연성을 함께 검토하기 좋은 Arcee AI 오픈웨이트 모델",
    "quote": "Virtuoso Large로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "상황별 답변 구간을 따로 표시해줘",
      "자료 템플릿 반복 업무용으로 바꿔줘",
      "신제품 회의 계획을 주간 단위로 나눠줘"
    ],
    "greeting": "Arcee AI의 Virtuoso Large입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "툴사용",
      "문맥처리",
      "업무"
    ],
    "modelInfo": {
      "provider": "Arcee AI",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-05-05",
      "openWeight": true
    }
  },
  {
    "id": "or-relace-relace-search",
    "name": "Relace Search",
    "nameKo": "Relace Search",
    "icon": "🔎",
    "avatarUrl": "/logos/openrouter/relace.png",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "relace/relace-search",
    "description": "질문의 배경 자료를 찾고 핵심 근거를 짧게 정리하는 Relace 리서치 모델",
    "quote": "Relace Search로 근거 검색과 최신 정보 요약 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "온보딩 문구를 짧게 만들어줘",
      "통계 수치 최신 쟁점을 정리해줘",
      "실행 순서 스타일로 세 줄만 써줘"
    ],
    "greeting": "Relace의 Relace Search입니다. 근거 검색과 최신 정보 요약에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "검색",
      "툴사용",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Relace",
      "contextLength": 256000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-12-08",
      "openWeight": false
    }
  },
  {
    "id": "or-arcee-ai-coder-large",
    "name": "Coder Large",
    "nameKo": "Coder Large",
    "icon": "🧭",
    "avatarUrl": "/logos/openrouter/arcee-ai.png",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "arcee-ai/coder-large",
    "description": "표준 문맥 코드 맥락에서 구조 파악, 수정안, 테스트 보완을 이어가기 좋은 Arcee AI 모델",
    "quote": "Coder Large로 코드 작성, 리팩터링, 저장소 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "일정 지연 목차를 새로 짜줘",
      "타입 오류 단계별 수정안을 써줘",
      "주의할 점 형태로 다시 써줘"
    ],
    "greeting": "Arcee AI의 Coder Large입니다. 코드 작성, 리팩터링, 저장소 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Arcee AI",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-05-05",
      "openWeight": true
    }
  },
  {
    "id": "or-mistralai-mistral-nemo",
    "name": "Mistral Nemo",
    "nameKo": "Mistral Nemo",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-nemo",
    "description": "저비용 배포와 라이선스 유연성을 함께 검토하기 좋은 Mistral AI 오픈웨이트 모델",
    "quote": "Mistral Nemo로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "첫 행동으로 더 단호하게 바꿔줘",
      "업무 로그 안전 요약본을 만들어줘",
      "사용자 불편 목차를 새로 짜줘"
    ],
    "greeting": "Mistral AI의 Mistral Nemo입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-07-19",
      "openWeight": true
    }
  },
  {
    "id": "or-meta-llama-llama-3-8b-instruct",
    "name": "Llama 3 8B Instruct",
    "nameKo": "Llama 3 8B Instruct",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3-8b-instruct",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Meta 모델",
    "quote": "Llama 3 8B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "자료 템플릿 반복 업무용으로 바꿔줘",
      "장애 대응 해석의 허점을 찾아줘",
      "장단점 중심으로 다시 써줘"
    ],
    "greeting": "Meta의 Llama 3 8B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 8192,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-04-18",
      "openWeight": true
    }
  },
  {
    "id": "or-meta-llama-llama-3-70b-instruct",
    "name": "Llama 3 70B Instruct",
    "nameKo": "Llama 3 70B Instruct",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3-70b-instruct",
    "description": "범용 계열의 표준 문맥 공개 모델로 평가 자동화와 실험 설계에 맞춘 Meta 모델",
    "quote": "Llama 3 70B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "신제품 회의 기준을 다시 잡아줘",
      "정책 초안 분류 규칙을 만들어줘",
      "첫 행동 기준을 맞춰줘"
    ],
    "greeting": "Meta의 Llama 3 70B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화",
      "업무"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 8192,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-04-18",
      "openWeight": true
    }
  },
  {
    "id": "or-morph-morph-v3-fast",
    "name": "Morph V3 Fast",
    "nameKo": "Morph V3 Fast",
    "icon": "🧬",
    "avatarUrl": "/logos/openrouter/morph.png",
    "color": "indigo",
    "category": "ai",
    "openrouterModel": "morph/morph-v3-fast",
    "description": "표준 문맥 자료를 빠르게 읽고 실무용 초안을 만드는 Morph 모델",
    "quote": "Morph V3 Fast로 빠른 응답과 대량 처리 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예상 질문 형식으로 바꿔줘",
      "업무 메시지 표현을 덜어줘",
      "일정 지연 원인을 가설로 나눠줘"
    ],
    "greeting": "Morph의 Morph V3 Fast입니다. 빠른 응답과 대량 처리에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "고속",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Morph",
      "contextLength": 81920,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-07-07",
      "openWeight": false
    }
  },
  {
    "id": "or-relace-relace-apply-3",
    "name": "Relace Apply 3",
    "nameKo": "Relace Apply 3",
    "icon": "🔎",
    "avatarUrl": "/logos/openrouter/relace.png",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "relace/relace-apply-3",
    "description": "범용 업무에 맞춰 초안 작성과 의사결정 보조를 맡기 좋은 Relace 모델",
    "quote": "Relace Apply 3로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "공지문 실행 순서로 바꿔줘",
      "사용자 불편 해석의 허점을 찾아줘",
      "장단점 중심으로 다시 써줘"
    ],
    "greeting": "Relace의 Relace Apply 3입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "범용",
      "업무",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Relace",
      "contextLength": 256000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-09-26",
      "openWeight": false
    }
  },
  {
    "id": "or-liquid-lfm-2-24b-a2b",
    "name": "LFM2-24B-A2B",
    "nameKo": "LFM2-24B-A2B",
    "icon": "💧",
    "avatarUrl": "/logos/openrouter/liquid.png",
    "color": "cyan",
    "category": "ai",
    "openrouterModel": "liquid/lfm-2-24b-a2b",
    "description": "오픈소스 실험과 비용 통제를 검토하기 좋은 Liquid AI 모델",
    "quote": "LFM2-24B-A2B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "보안 검토 처리 순서를 단순화해줘",
      "프로젝트 범위 전 쟁점을 뽑아줘",
      "비교표 구간을 따로 표시해줘"
    ],
    "greeting": "Liquid AI의 LFM2-24B-A2B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Liquid AI",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-02-25",
      "openWeight": true
    }
  },
  {
    "id": "or-amazon-nova-micro-v1",
    "name": "Nova Micro 1.0",
    "nameKo": "Nova Micro 1.0",
    "icon": "📦",
    "avatarUrl": "/logos/amazon.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "amazon/nova-micro-v1",
    "description": "범용 업무에 맞춰 초안 작성과 의사결정 보조를 맡기 좋은 Amazon 모델",
    "quote": "Nova Micro 1.0로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "고객 피드백 공유용으로 정리해줘",
      "발표 준비 반복 의견을 묶어줘",
      "회의 발언 세 가지를 미리 예상해줘"
    ],
    "greeting": "Amazon의 Nova Micro 1.0입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "저비용",
      "툴사용",
      "범용",
      "문맥처리"
    ],
    "modelInfo": {
      "provider": "Amazon",
      "contextLength": 128000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-12-05",
      "openWeight": false
    }
  },
  {
    "id": "or-liquid-lfm-2-5-1-2b-instruct-free",
    "name": "LFM2.5-1.2B-Instruct Free",
    "nameKo": "LFM2.5-1.2B-Instruct Free",
    "icon": "💧",
    "avatarUrl": "/logos/openrouter/liquid.png",
    "color": "cyan",
    "category": "ai",
    "openrouterModel": "liquid/lfm-2.5-1.2b-instruct:free",
    "description": "표준 문맥 환경에서 오픈웨이트 실험과 비용 통제를 검토하기 좋은 Liquid AI 모델",
    "quote": "LFM2.5-1.2B-Instruct Free로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "자료 템플릿 안전 요약본을 만들어줘",
      "업무 요청 이슈를 원인별로 묶어줘",
      "장단점 세 개를 추천해줘"
    ],
    "greeting": "Liquid AI의 LFM2.5-1.2B-Instruct Free입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "무료",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Liquid AI",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2026-01-20",
      "openWeight": true
    }
  },
  {
    "id": "or-microsoft-wizardlm-2-8x22b",
    "name": "WizardLM-2 8x22B",
    "nameKo": "WizardLM-2 8x22B",
    "icon": "🏢",
    "avatarUrl": "/logos/microsoft.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "microsoft/wizardlm-2-8x22b",
    "description": "표준 문맥·저비용 호출 조건에서 라이선스와 배포 유연성을 함께 보는 Microsoft 오픈웨이트 모델",
    "quote": "WizardLM-2 8x22B로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "발표 대본을 찾아줘",
      "운영 절차 분류 규칙을 만들어줘",
      "예산 검토 내용을 한 문단으로 줄여줘"
    ],
    "greeting": "Microsoft의 WizardLM-2 8x22B입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화",
      "업무"
    ],
    "modelInfo": {
      "provider": "Microsoft",
      "contextLength": 65536,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-04-16",
      "openWeight": true
    }
  },
  {
    "id": "or-inflection-inflection-3-productivity",
    "name": "Inflection 3 Productivity",
    "nameKo": "Inflection 3 Productivity",
    "icon": "💬",
    "avatarUrl": "/logos/openrouter/inflection.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "inflection/inflection-3-productivity",
    "description": "상위 업무에 맞춰 초안 작성과 의사결정 보조를 맡기 좋은 Inflection AI 모델",
    "quote": "Inflection 3 Productivity로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "장애 보고서 핵심을 뽑아줘",
      "프로젝트 범위 내용을 개선안으로 바꿔줘",
      "상황별 답변과 요약을 분리해줘"
    ],
    "greeting": "Inflection AI의 Inflection 3 Productivity입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "범용",
      "업무",
      "생산성"
    ],
    "modelInfo": {
      "provider": "Inflection AI",
      "contextLength": 8000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2024-10-11",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-5-chat",
    "name": "GPT-5 Chat",
    "nameKo": "GPT-5 Chat",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5-chat",
    "description": "문서와 이미지 자료를 함께 읽고 핵심 내용을 정리하는 OpenAI 모델",
    "quote": "GPT-5 Chat로 문서와 화면까지 함께 보는 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "비교표 구간을 따로 표시해줘",
      "문서 사진 내용을 보고서 문장으로 바꿔줘",
      "토론 준비 질문을 준비해줘"
    ],
    "greeting": "OpenAI의 GPT-5 Chat입니다. 문서와 화면까지 함께 보는 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "시각입력",
      "구조화",
      "범용",
      "문서입력"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 128000,
      "inputModalities": [
        "file",
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-08-07",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-4",
    "name": "GPT-4",
    "nameKo": "GPT-4",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4",
    "description": "고난도 작업 균형을 살려 일상 업무와 지식 질의에 두루 쓰기 좋은 OpenAI 모델",
    "quote": "GPT-4로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "고객 이탈 항목을 우선순위로 정렬해줘",
      "프로젝트 계획 공유용으로 정리해줘",
      "실행 순서를 먼저 찾아줘"
    ],
    "greeting": "OpenAI의 GPT-4입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "툴사용",
      "구조화",
      "업무",
      "범용"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 8191,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2023-05-28",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-3-5-turbo",
    "name": "GPT-3.5 Turbo",
    "nameKo": "GPT-3.5 Turbo",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-3.5-turbo",
    "description": "복잡하지 않은 분석과 대화형 업무 보조를 균형 있게 처리하는 OpenAI 모델",
    "quote": "GPT-3.5 Turbo로 업무 문서, 요약, 대화형 분석 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "공지문 실행 순서로 바꿔줘",
      "사용자 불편 해석의 허점을 찾아줘",
      "의사결정 요약 톤으로 다듬어줘"
    ],
    "greeting": "OpenAI의 GPT-3.5 Turbo입니다. 업무 문서, 요약, 대화형 분석에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "고속",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 16385,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2023-05-28",
      "openWeight": false
    }
  },
  {
    "id": "or-qwen-qwen-2-5-7b-instruct",
    "name": "Qwen2.5 7B Instruct",
    "nameKo": "Qwen2.5 7B Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen-2.5-7b-instruct",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Alibaba Qwen 모델",
    "quote": "Qwen2.5 7B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "발표 준비 기준을 다시 잡아줘",
      "보안 검토 민감정보를 줄여줘",
      "결론 스타일로 세 줄만 써줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen2.5 7B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-10-16",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen-2-5-72b-instruct",
    "name": "Qwen2.5 72B Instruct",
    "nameKo": "Qwen2.5 72B Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen-2.5-72b-instruct",
    "description": "저비용 호출 범용 이용을 염두에 둔 로컬 테스트와 모델 비교용 Alibaba Qwen 모델",
    "quote": "Qwen2.5 72B Instruct로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "자료 템플릿 안전 요약본을 만들어줘",
      "업무 요청 이슈를 원인별로 묶어줘",
      "보고 문장 중심으로 번호를 매겨줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen2.5 72B Instruct입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-09-19",
      "openWeight": true
    }
  },
  {
    "id": "or-qwen-qwen-plus",
    "name": "Qwen-Plus",
    "nameKo": "Qwen-Plus",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen-plus",
    "description": "범용 계열의 초장문 공개 모델로 평가 자동화와 실험 설계에 맞춘 Alibaba Qwen 모델",
    "quote": "Qwen-Plus로 오픈웨이트 실험과 자체 배포 검토 흐름을 먼저 잡아보겠습니다.",
    "sampleQuestions": [
      "예산 검토 문서를 순서대로 정리해줘",
      "자료 템플릿 안전 요약본을 만들어줘",
      "액션아이템과 요약문문을 분리해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen-Plus입니다. 오픈웨이트 실험과 자체 배포 검토에 맞춰 핵심부터 정리해드릴게요.",
    "tags": [
      "오픈웨이트",
      "장문맥",
      "저비용",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Alibaba Qwen",
      "contextLength": 1000000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-02-01",
      "openWeight": true
    }
  }
] satisfies Expert[];

export const OPENROUTER_ADDED_ABILITIES = {
  "or-google-gemini-3-1-flash-lite": {
    "coding": 72,
    "creativity": 84,
    "reasoning": 82,
    "math": 81,
    "multilingual": 79,
    "speed": 95,
    "costEfficiency": 88,
    "contextWindow": 98
  },
  "or-openai-gpt-5": {
    "coding": 84,
    "creativity": 93,
    "reasoning": 89,
    "math": 88,
    "multilingual": 76,
    "speed": 68,
    "costEfficiency": 69,
    "contextWindow": 88
  },
  "or-openai-gpt-5-pro": {
    "coding": 84,
    "creativity": 93,
    "reasoning": 88,
    "math": 88,
    "multilingual": 76,
    "speed": 67,
    "costEfficiency": 68,
    "contextWindow": 88
  },
  "or-openai-gpt-5-mini": {
    "coding": 78,
    "creativity": 88,
    "reasoning": 87,
    "math": 85,
    "multilingual": 76,
    "speed": 67,
    "costEfficiency": 86,
    "contextWindow": 88
  },
  "or-openai-gpt-5-nano": {
    "coding": 70,
    "creativity": 79,
    "reasoning": 75,
    "math": 71,
    "multilingual": 76,
    "speed": 72,
    "costEfficiency": 97,
    "contextWindow": 88
  },
  "or-openai-gpt-5-4-nano": {
    "coding": 76,
    "creativity": 89,
    "reasoning": 88,
    "math": 89,
    "multilingual": 73,
    "speed": 86,
    "costEfficiency": 89,
    "contextWindow": 88
  },
  "or-openai-gpt-5-3-chat": {
    "coding": 85,
    "creativity": 94,
    "reasoning": 88,
    "math": 88,
    "multilingual": 74,
    "speed": 67,
    "costEfficiency": 68,
    "contextWindow": 88
  },
  "or-openai-gpt-5-3-codex": {
    "coding": 97,
    "creativity": 96,
    "reasoning": 95,
    "math": 95,
    "multilingual": 73,
    "speed": 66,
    "costEfficiency": 64,
    "contextWindow": 88
  },
  "or-openai-gpt-5-2-pro": {
    "coding": 88,
    "creativity": 95,
    "reasoning": 93,
    "math": 93,
    "multilingual": 74,
    "speed": 64,
    "costEfficiency": 64,
    "contextWindow": 88
  },
  "or-openai-gpt-5-2": {
    "coding": 88,
    "creativity": 96,
    "reasoning": 93,
    "math": 94,
    "multilingual": 74,
    "speed": 64,
    "costEfficiency": 65,
    "contextWindow": 88
  },
  "or-openai-gpt-5-2-chat": {
    "coding": 88,
    "creativity": 96,
    "reasoning": 93,
    "math": 94,
    "multilingual": 74,
    "speed": 64,
    "costEfficiency": 65,
    "contextWindow": 88
  },
  "or-openai-gpt-5-2-codex": {
    "coding": 95,
    "creativity": 94,
    "reasoning": 92,
    "math": 93,
    "multilingual": 74,
    "speed": 75,
    "costEfficiency": 64,
    "contextWindow": 88
  },
  "or-openai-gpt-5-codex": {
    "coding": 92,
    "creativity": 91,
    "reasoning": 89,
    "math": 88,
    "multilingual": 76,
    "speed": 84,
    "costEfficiency": 69,
    "contextWindow": 88
  },
  "or-openai-gpt-5-1-chat": {
    "coding": 87,
    "creativity": 94,
    "reasoning": 91,
    "math": 90,
    "multilingual": 75,
    "speed": 72,
    "costEfficiency": 68,
    "contextWindow": 88
  },
  "or-openai-gpt-5-1-codex-max": {
    "coding": 93,
    "creativity": 92,
    "reasoning": 88,
    "math": 87,
    "multilingual": 75,
    "speed": 86,
    "costEfficiency": 63,
    "contextWindow": 88
  },
  "or-openai-gpt-5-1-codex": {
    "coding": 93,
    "creativity": 92,
    "reasoning": 88,
    "math": 87,
    "multilingual": 75,
    "speed": 86,
    "costEfficiency": 64,
    "contextWindow": 88
  },
  "or-openai-gpt-5-1-codex-mini": {
    "coding": 82,
    "creativity": 87,
    "reasoning": 84,
    "math": 82,
    "multilingual": 75,
    "speed": 89,
    "costEfficiency": 82,
    "contextWindow": 88
  },
  "or-openai-gpt-5-5-pro": {
    "coding": 94,
    "creativity": 97,
    "reasoning": 97,
    "math": 97,
    "multilingual": 72,
    "speed": 63,
    "costEfficiency": 57,
    "contextWindow": 94
  },
  "or-openai-gpt-5-5": {
    "coding": 94,
    "creativity": 98,
    "reasoning": 97,
    "math": 98,
    "multilingual": 73,
    "speed": 63,
    "costEfficiency": 57,
    "contextWindow": 94
  },
  "or-openai-gpt-5-4-pro": {
    "coding": 91,
    "creativity": 97,
    "reasoning": 96,
    "math": 97,
    "multilingual": 73,
    "speed": 66,
    "costEfficiency": 61,
    "contextWindow": 98
  },
  "or-openai-gpt-5-4": {
    "coding": 91,
    "creativity": 97,
    "reasoning": 96,
    "math": 97,
    "multilingual": 73,
    "speed": 66,
    "costEfficiency": 61,
    "contextWindow": 98
  },
  "or-openai-gpt-5-1": {
    "coding": 87,
    "creativity": 94,
    "reasoning": 91,
    "math": 90,
    "multilingual": 75,
    "speed": 72,
    "costEfficiency": 68,
    "contextWindow": 88
  },
  "or-openai-gpt-chat-latest": {
    "coding": 70,
    "creativity": 95,
    "reasoning": 89,
    "math": 91,
    "multilingual": 79,
    "speed": 55,
    "costEfficiency": 52,
    "contextWindow": 88
  },
  "or-openai-o3-pro": {
    "coding": 82,
    "creativity": 90,
    "reasoning": 85,
    "math": 95,
    "multilingual": 56,
    "speed": 62,
    "costEfficiency": 53,
    "contextWindow": 78
  },
  "or-openai-o3": {
    "coding": 82,
    "creativity": 89,
    "reasoning": 84,
    "math": 84,
    "multilingual": 57,
    "speed": 80,
    "costEfficiency": 66,
    "contextWindow": 78
  },
  "or-openai-o3-deep-research": {
    "coding": 82,
    "creativity": 89,
    "reasoning": 86,
    "math": 95,
    "multilingual": 56,
    "speed": 62,
    "costEfficiency": 53,
    "contextWindow": 78
  },
  "or-openai-o4-mini-deep-research": {
    "coding": 82,
    "creativity": 84,
    "reasoning": 80,
    "math": 80,
    "multilingual": 55,
    "speed": 80,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-openai-o4-mini": {
    "coding": 81,
    "creativity": 85,
    "reasoning": 81,
    "math": 80,
    "multilingual": 56,
    "speed": 80,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-openai-o4-mini-high": {
    "coding": 81,
    "creativity": 85,
    "reasoning": 80,
    "math": 80,
    "multilingual": 55,
    "speed": 79,
    "costEfficiency": 71,
    "contextWindow": 78
  },
  "or-openai-o3-mini-high": {
    "coding": 76,
    "creativity": 78,
    "reasoning": 72,
    "math": 77,
    "multilingual": 56,
    "speed": 88,
    "costEfficiency": 71,
    "contextWindow": 78
  },
  "or-openai-o3-mini": {
    "coding": 76,
    "creativity": 78,
    "reasoning": 72,
    "math": 77,
    "multilingual": 56,
    "speed": 88,
    "costEfficiency": 71,
    "contextWindow": 78
  },
  "or-openai-o1-pro": {
    "coding": 80,
    "creativity": 83,
    "reasoning": 73,
    "math": 98,
    "multilingual": 57,
    "speed": 52,
    "costEfficiency": 53,
    "contextWindow": 78
  },
  "or-openai-o1": {
    "coding": 74,
    "creativity": 84,
    "reasoning": 77,
    "math": 76,
    "multilingual": 57,
    "speed": 75,
    "costEfficiency": 53,
    "contextWindow": 78
  },
  "or-openai-gpt-4o": {
    "coding": 72,
    "creativity": 75,
    "reasoning": 63,
    "math": 59,
    "multilingual": 77,
    "speed": 92,
    "costEfficiency": 62,
    "contextWindow": 68
  },
  "or-openai-gpt-4o-mini": {
    "coding": 78,
    "creativity": 62,
    "reasoning": 57,
    "math": 61,
    "multilingual": 77,
    "speed": 80,
    "costEfficiency": 91,
    "contextWindow": 68
  },
  "or-openai-gpt-4o-search-preview": {
    "coding": 72,
    "creativity": 72,
    "reasoning": 64,
    "math": 64,
    "multilingual": 77,
    "speed": 86,
    "costEfficiency": 61,
    "contextWindow": 68
  },
  "or-openai-gpt-4o-mini-search-preview": {
    "coding": 74,
    "creativity": 62,
    "reasoning": 64,
    "math": 64,
    "multilingual": 77,
    "speed": 86,
    "costEfficiency": 61,
    "contextWindow": 68
  },
  "or-openai-gpt-oss-120b": {
    "coding": 61,
    "creativity": 82,
    "reasoning": 81,
    "math": 80,
    "multilingual": 72,
    "speed": 97,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-openai-gpt-oss-120b-free": {
    "coding": 61,
    "creativity": 82,
    "reasoning": 81,
    "math": 79,
    "multilingual": 72,
    "speed": 97,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-openai-gpt-oss-20b": {
    "coding": 60,
    "creativity": 77,
    "reasoning": 72,
    "math": 69,
    "multilingual": 72,
    "speed": 96,
    "costEfficiency": 96,
    "contextWindow": 78
  },
  "or-openai-gpt-oss-20b-free": {
    "coding": 60,
    "creativity": 77,
    "reasoning": 71,
    "math": 69,
    "multilingual": 72,
    "speed": 96,
    "costEfficiency": 96,
    "contextWindow": 78
  },
  "or-qwen-qwen3-max": {
    "coding": 74,
    "creativity": 81,
    "reasoning": 80,
    "math": 76,
    "multilingual": 87,
    "speed": 73,
    "costEfficiency": 60,
    "contextWindow": 88
  },
  "or-qwen-qwen3-7-plus": {
    "coding": 81,
    "creativity": 92,
    "reasoning": 94,
    "math": 92,
    "multilingual": 85,
    "speed": 72,
    "costEfficiency": 85,
    "contextWindow": 98
  },
  "or-qwen-qwen3-5-plus-20260420": {
    "coding": 75,
    "creativity": 81,
    "reasoning": 79,
    "math": 76,
    "multilingual": 86,
    "speed": 73,
    "costEfficiency": 60,
    "contextWindow": 88
  },
  "or-qwen-qwen3-6-flash": {
    "coding": 76,
    "creativity": 73,
    "reasoning": 79,
    "math": 75,
    "multilingual": 85,
    "speed": 73,
    "costEfficiency": 59,
    "contextWindow": 88
  },
  "or-qwen-qwen3-6-35b-a3b": {
    "coding": 80,
    "creativity": 84,
    "reasoning": 88,
    "math": 84,
    "multilingual": 85,
    "speed": 89,
    "costEfficiency": 83,
    "contextWindow": 88
  },
  "or-qwen-qwen3-6-27b": {
    "coding": 78,
    "creativity": 86,
    "reasoning": 89,
    "math": 87,
    "multilingual": 86,
    "speed": 73,
    "costEfficiency": 71,
    "contextWindow": 88
  },
  "or-qwen-qwen3-next-80b-a3b-thinking": {
    "coding": 73,
    "creativity": 75,
    "reasoning": 75,
    "math": 75,
    "multilingual": 86,
    "speed": 90,
    "costEfficiency": 70,
    "contextWindow": 88
  },
  "or-qwen-qwen3-coder-next": {
    "coding": 89,
    "creativity": 70,
    "reasoning": 76,
    "math": 72,
    "multilingual": 88,
    "speed": 82,
    "costEfficiency": 81,
    "contextWindow": 78
  },
  "or-qwen-qwen3-6-max-preview": {
    "coding": 78,
    "creativity": 87,
    "reasoning": 93,
    "math": 91,
    "multilingual": 85,
    "speed": 68,
    "costEfficiency": 70,
    "contextWindow": 78
  },
  "or-qwen-qwen-plus-2025-07-28-thinking": {
    "coding": 77,
    "creativity": 87,
    "reasoning": 90,
    "math": 96,
    "multilingual": 91,
    "speed": 58,
    "costEfficiency": 80,
    "contextWindow": 98
  },
  "or-qwen-qwen-plus-2025-07-28": {
    "coding": 77,
    "creativity": 73,
    "reasoning": 75,
    "math": 81,
    "multilingual": 91,
    "speed": 59,
    "costEfficiency": 80,
    "contextWindow": 98
  },
  "or-qwen-qwen3-coder-plus": {
    "coding": 87,
    "creativity": 70,
    "reasoning": 80,
    "math": 76,
    "multilingual": 87,
    "speed": 73,
    "costEfficiency": 60,
    "contextWindow": 88
  },
  "or-qwen-qwen3-coder-flash": {
    "coding": 89,
    "creativity": 65,
    "reasoning": 80,
    "math": 76,
    "multilingual": 88,
    "speed": 74,
    "costEfficiency": 60,
    "contextWindow": 88
  },
  "or-qwen-qwen3-coder": {
    "coding": 85,
    "creativity": 66,
    "reasoning": 71,
    "math": 68,
    "multilingual": 88,
    "speed": 74,
    "costEfficiency": 79,
    "contextWindow": 88
  },
  "or-qwen-qwen3-coder-free": {
    "coding": 86,
    "creativity": 66,
    "reasoning": 71,
    "math": 68,
    "multilingual": 88,
    "speed": 74,
    "costEfficiency": 79,
    "contextWindow": 88
  },
  "or-qwen-qwen3-coder-30b-a3b-instruct": {
    "coding": 86,
    "creativity": 60,
    "reasoning": 65,
    "math": 63,
    "multilingual": 88,
    "speed": 83,
    "costEfficiency": 85,
    "contextWindow": 88
  },
  "or-qwen-qwen3-next-80b-a3b-instruct": {
    "coding": 71,
    "creativity": 63,
    "reasoning": 65,
    "math": 68,
    "multilingual": 87,
    "speed": 87,
    "costEfficiency": 74,
    "contextWindow": 88
  },
  "or-qwen-qwen3-next-80b-a3b-instruct-free": {
    "coding": 71,
    "creativity": 62,
    "reasoning": 65,
    "math": 68,
    "multilingual": 87,
    "speed": 87,
    "costEfficiency": 74,
    "contextWindow": 88
  },
  "or-qwen-qwen3-235b-a22b-thinking-2507": {
    "coding": 73,
    "creativity": 79,
    "reasoning": 77,
    "math": 79,
    "multilingual": 89,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 78
  },
  "or-qwen-qwen3-30b-a3b-thinking-2507": {
    "coding": 71,
    "creativity": 71,
    "reasoning": 67,
    "math": 71,
    "multilingual": 89,
    "speed": 87,
    "costEfficiency": 82,
    "contextWindow": 88
  },
  "or-qwen-qwen3-235b-a22b-2507": {
    "coding": 73,
    "creativity": 71,
    "reasoning": 77,
    "math": 79,
    "multilingual": 90,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 78
  },
  "or-qwen-qwen3-30b-a3b-instruct-2507": {
    "coding": 72,
    "creativity": 58,
    "reasoning": 59,
    "math": 63,
    "multilingual": 89,
    "speed": 90,
    "costEfficiency": 89,
    "contextWindow": 88
  },
  "or-qwen-qwen3-235b-a22b": {
    "coding": 69,
    "creativity": 64,
    "reasoning": 66,
    "math": 64,
    "multilingual": 90,
    "speed": 74,
    "costEfficiency": 66,
    "contextWindow": 58
  },
  "or-qwen-qwen3-32b": {
    "coding": 71,
    "creativity": 61,
    "reasoning": 61,
    "math": 61,
    "multilingual": 89,
    "speed": 79,
    "costEfficiency": 86,
    "contextWindow": 58
  },
  "or-qwen-qwen3-14b": {
    "coding": 68,
    "creativity": 60,
    "reasoning": 61,
    "math": 59,
    "multilingual": 90,
    "speed": 74,
    "costEfficiency": 82,
    "contextWindow": 58
  },
  "or-qwen-qwen3-8b": {
    "coding": 65,
    "creativity": 57,
    "reasoning": 58,
    "math": 56,
    "multilingual": 88,
    "speed": 68,
    "costEfficiency": 87,
    "contextWindow": 78
  },
  "or-qwen-qwen3-30b-a3b": {
    "coding": 70,
    "creativity": 58,
    "reasoning": 59,
    "math": 58,
    "multilingual": 89,
    "speed": 82,
    "costEfficiency": 91,
    "contextWindow": 58
  },
  "or-qwen-qwen-2-5-coder-32b-instruct": {
    "coding": 77,
    "creativity": 54,
    "reasoning": 56,
    "math": 61,
    "multilingual": 90,
    "speed": 54,
    "costEfficiency": 63,
    "contextWindow": 78
  },
  "or-openai-gpt-5-4-mini": {
    "coding": 83,
    "creativity": 91,
    "reasoning": 92,
    "math": 92,
    "multilingual": 73,
    "speed": 84,
    "costEfficiency": 76,
    "contextWindow": 88
  },
  "or-anthropic-claude-fable-5": {
    "coding": 98,
    "creativity": 98,
    "reasoning": 98,
    "math": 98,
    "multilingual": 83,
    "speed": 64,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-google-gemini-3-5-flash": {
    "coding": 85,
    "creativity": 94,
    "reasoning": 96,
    "math": 95,
    "multilingual": 79,
    "speed": 82,
    "costEfficiency": 69,
    "contextWindow": 98
  },
  "or-x-ai-grok-build-0-1": {
    "coding": 89,
    "creativity": 86,
    "reasoning": 78,
    "math": 78,
    "multilingual": 64,
    "speed": 57,
    "costEfficiency": 56,
    "contextWindow": 78
  },
  "or-perplexity-sonar-pro-search": {
    "coding": 66,
    "creativity": 69,
    "reasoning": 70,
    "math": 86,
    "multilingual": 52,
    "speed": 51,
    "costEfficiency": 51,
    "contextWindow": 68
  },
  "or-deepseek-deepseek-v4-pro": {
    "coding": 89,
    "creativity": 90,
    "reasoning": 94,
    "math": 93,
    "multilingual": 65,
    "speed": 82,
    "costEfficiency": 90,
    "contextWindow": 98
  },
  "or-qwen-qwen3-7-max": {
    "coding": 81,
    "creativity": 90,
    "reasoning": 96,
    "math": 95,
    "multilingual": 85,
    "speed": 89,
    "costEfficiency": 66,
    "contextWindow": 98
  },
  "or-meta-llama-llama-3-2-3b-instruct": {
    "coding": 51,
    "creativity": 52,
    "reasoning": 55,
    "math": 52,
    "multilingual": 69,
    "speed": 77,
    "costEfficiency": 90,
    "contextWindow": 68
  },
  "or-mistralai-mistral-medium-3-5": {
    "coding": 78,
    "creativity": 86,
    "reasoning": 84,
    "math": 82,
    "multilingual": 92,
    "speed": 76,
    "costEfficiency": 63,
    "contextWindow": 78
  },
  "or-cohere-command-r-08-2024": {
    "coding": 54,
    "creativity": 52,
    "reasoning": 53,
    "math": 54,
    "multilingual": 97,
    "speed": 61,
    "costEfficiency": 57,
    "contextWindow": 68
  },
  "or-microsoft-phi-4-mini-instruct": {
    "coding": 54,
    "creativity": 53,
    "reasoning": 52,
    "math": 52,
    "multilingual": 67,
    "speed": 65,
    "costEfficiency": 91,
    "contextWindow": 68
  },
  "or-amazon-nova-pro-v1": {
    "coding": 56,
    "creativity": 60,
    "reasoning": 58,
    "math": 57,
    "multilingual": 57,
    "speed": 52,
    "costEfficiency": 75,
    "contextWindow": 88
  },
  "or-nvidia-nemotron-3-nano-30b-a3b": {
    "coding": 56,
    "creativity": 63,
    "reasoning": 71,
    "math": 70,
    "multilingual": 60,
    "speed": 83,
    "costEfficiency": 95,
    "contextWindow": 98
  },
  "or-moonshotai-kimi-k2-7-code": {
    "coding": 86,
    "creativity": 80,
    "reasoning": 73,
    "math": 72,
    "multilingual": 94,
    "speed": 65,
    "costEfficiency": 75,
    "contextWindow": 68
  },
  "or-z-ai-glm-5": {
    "coding": 84,
    "creativity": 90,
    "reasoning": 92,
    "math": 89,
    "multilingual": 96,
    "speed": 81,
    "costEfficiency": 76,
    "contextWindow": 78
  },
  "or-minimax-minimax-m3": {
    "coding": 88,
    "creativity": 88,
    "reasoning": 96,
    "math": 93,
    "multilingual": 60,
    "speed": 71,
    "costEfficiency": 87,
    "contextWindow": 98
  },
  "or-tencent-hy3-preview": {
    "coding": 68,
    "creativity": 81,
    "reasoning": 86,
    "math": 86,
    "multilingual": 95,
    "speed": 83,
    "costEfficiency": 94,
    "contextWindow": 78
  },
  "or-ibm-granite-granite-4-1-8b": {
    "coding": 56,
    "creativity": 56,
    "reasoning": 57,
    "math": 55,
    "multilingual": 70,
    "speed": 89,
    "costEfficiency": 97,
    "contextWindow": 78
  },
  "or-bytedance-seed-seed-1-6-flash": {
    "coding": 58,
    "creativity": 65,
    "reasoning": 68,
    "math": 67,
    "multilingual": 53,
    "speed": 93,
    "costEfficiency": 83,
    "contextWindow": 88
  },
  "or-anthropic-claude-opus-4-7": {
    "coding": 96,
    "creativity": 97,
    "reasoning": 97,
    "math": 96,
    "multilingual": 82,
    "speed": 67,
    "costEfficiency": 58,
    "contextWindow": 98
  },
  "or-anthropic-claude-sonnet-4": {
    "coding": 83,
    "creativity": 91,
    "reasoning": 85,
    "math": 82,
    "multilingual": 81,
    "speed": 68,
    "costEfficiency": 62,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-8-fast": {
    "coding": 96,
    "creativity": 97,
    "reasoning": 98,
    "math": 97,
    "multilingual": 82,
    "speed": 69,
    "costEfficiency": 58,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-8": {
    "coding": 97,
    "creativity": 98,
    "reasoning": 98,
    "math": 97,
    "multilingual": 82,
    "speed": 69,
    "costEfficiency": 58,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-7-fast": {
    "coding": 95,
    "creativity": 97,
    "reasoning": 97,
    "math": 96,
    "multilingual": 82,
    "speed": 67,
    "costEfficiency": 58,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-5": {
    "coding": 93,
    "creativity": 95,
    "reasoning": 93,
    "math": 91,
    "multilingual": 83,
    "speed": 67,
    "costEfficiency": 59,
    "contextWindow": 78
  },
  "or-anthropic-claude-opus-4-6-fast": {
    "coding": 92,
    "creativity": 95,
    "reasoning": 94,
    "math": 94,
    "multilingual": 82,
    "speed": 64,
    "costEfficiency": 58,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-1": {
    "coding": 67,
    "creativity": 92,
    "reasoning": 87,
    "math": 84,
    "multilingual": 83,
    "speed": 64,
    "costEfficiency": 54,
    "contextWindow": 78
  },
  "or-google-gemini-2-5-pro": {
    "coding": 59,
    "creativity": 88,
    "reasoning": 82,
    "math": 83,
    "multilingual": 80,
    "speed": 78,
    "costEfficiency": 70,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4": {
    "coding": 66,
    "creativity": 91,
    "reasoning": 85,
    "math": 83,
    "multilingual": 83,
    "speed": 65,
    "costEfficiency": 54,
    "contextWindow": 78
  },
  "or-google-gemma-4-26b-a4b-it": {
    "coding": 66,
    "creativity": 78,
    "reasoning": 78,
    "math": 79,
    "multilingual": 71,
    "speed": 94,
    "costEfficiency": 92,
    "contextWindow": 78
  },
  "or-google-gemma-4-26b-a4b-it-free": {
    "coding": 65,
    "creativity": 77,
    "reasoning": 78,
    "math": 78,
    "multilingual": 71,
    "speed": 96,
    "costEfficiency": 92,
    "contextWindow": 78
  },
  "or-google-gemma-4-31b-it-free": {
    "coding": 62,
    "creativity": 83,
    "reasoning": 85,
    "math": 85,
    "multilingual": 70,
    "speed": 70,
    "costEfficiency": 95,
    "contextWindow": 78
  },
  "or-google-gemini-2-5-pro-preview": {
    "coding": 58,
    "creativity": 88,
    "reasoning": 82,
    "math": 83,
    "multilingual": 80,
    "speed": 78,
    "costEfficiency": 69,
    "contextWindow": 98
  },
  "or-google-gemini-2-5-pro-preview-05-06": {
    "coding": 57,
    "creativity": 86,
    "reasoning": 77,
    "math": 82,
    "multilingual": 80,
    "speed": 58,
    "costEfficiency": 70,
    "contextWindow": 98
  },
  "or-x-ai-grok-4-20-multi-agent": {
    "coding": 79,
    "creativity": 91,
    "reasoning": 87,
    "math": 87,
    "multilingual": 65,
    "speed": 58,
    "costEfficiency": 54,
    "contextWindow": 78
  },
  "or-moonshotai-kimi-k2-6": {
    "coding": 86,
    "creativity": 93,
    "reasoning": 95,
    "math": 94,
    "multilingual": 94,
    "speed": 71,
    "costEfficiency": 73,
    "contextWindow": 78
  },
  "or-google-gemini-3-1-pro-preview-customtools": {
    "coding": 90,
    "creativity": 93,
    "reasoning": 91,
    "math": 93,
    "multilingual": 79,
    "speed": 58,
    "costEfficiency": 65,
    "contextWindow": 98
  },
  "or-google-gemini-2-5-flash-lite-preview-09-2025": {
    "coding": 68,
    "creativity": 74,
    "reasoning": 67,
    "math": 70,
    "multilingual": 80,
    "speed": 94,
    "costEfficiency": 96,
    "contextWindow": 98
  },
  "or-deepseek-deepseek-v4-flash": {
    "coding": 87,
    "creativity": 88,
    "reasoning": 90,
    "math": 90,
    "multilingual": 65,
    "speed": 85,
    "costEfficiency": 97,
    "contextWindow": 98
  },
  "or-deepseek-deepseek-v3-2": {
    "coding": 67,
    "creativity": 82,
    "reasoning": 87,
    "math": 85,
    "multilingual": 66,
    "speed": 60,
    "costEfficiency": 89,
    "contextWindow": 68
  },
  "or-anthropic-claude-3-5-haiku": {
    "coding": 53,
    "creativity": 64,
    "reasoning": 64,
    "math": 61,
    "multilingual": 84,
    "speed": 79,
    "costEfficiency": 76,
    "contextWindow": 78
  },
  "or-xiaomi-mimo-v2-5": {
    "coding": 71,
    "creativity": 89,
    "reasoning": 95,
    "math": 92,
    "multilingual": 61,
    "speed": 69,
    "costEfficiency": 89,
    "contextWindow": 98
  },
  "or-nex-agi-nex-n2-pro-free": {
    "coding": 69,
    "creativity": 78,
    "reasoning": 68,
    "math": 71,
    "multilingual": 58,
    "speed": 53,
    "costEfficiency": 73,
    "contextWindow": 88
  },
  "or-nvidia-nemotron-3-ultra-550b-a55b": {
    "coding": 66,
    "creativity": 85,
    "reasoning": 91,
    "math": 88,
    "multilingual": 59,
    "speed": 95,
    "costEfficiency": 77,
    "contextWindow": 88
  },
  "or-arcee-ai-trinity-large-thinking": {
    "coding": 75,
    "creativity": 82,
    "reasoning": 79,
    "math": 75,
    "multilingual": 52,
    "speed": 91,
    "costEfficiency": 86,
    "contextWindow": 94
  },
  "or-z-ai-glm-4-7-flash": {
    "coding": 58,
    "creativity": 69,
    "reasoning": 78,
    "math": 71,
    "multilingual": 96,
    "speed": 81,
    "costEfficiency": 94,
    "contextWindow": 78
  },
  "or-inclusionai-ring-2-6-1t": {
    "coding": 67,
    "creativity": 79,
    "reasoning": 83,
    "math": 84,
    "multilingual": 54,
    "speed": 85,
    "costEfficiency": 76,
    "contextWindow": 88
  },
  "or-deepseek-deepseek-v3-2-exp": {
    "coding": 64,
    "creativity": 74,
    "reasoning": 82,
    "math": 81,
    "multilingual": 66,
    "speed": 60,
    "costEfficiency": 88,
    "contextWindow": 68
  },
  "or-minimax-minimax-m2-5": {
    "coding": 78,
    "creativity": 76,
    "reasoning": 86,
    "math": 85,
    "multilingual": 61,
    "speed": 90,
    "costEfficiency": 85,
    "contextWindow": 78
  },
  "or-nvidia-nemotron-3-ultra-550b-a55b-free": {
    "coding": 67,
    "creativity": 85,
    "reasoning": 91,
    "math": 88,
    "multilingual": 58,
    "speed": 95,
    "costEfficiency": 77,
    "contextWindow": 88
  },
  "or-deepseek-deepseek-v3-1-terminus": {
    "coding": 64,
    "creativity": 75,
    "reasoning": 82,
    "math": 82,
    "multilingual": 66,
    "speed": 60,
    "costEfficiency": 66,
    "contextWindow": 68
  },
  "or-z-ai-glm-4-7": {
    "coding": 65,
    "creativity": 82,
    "reasoning": 87,
    "math": 86,
    "multilingual": 96,
    "speed": 87,
    "costEfficiency": 74,
    "contextWindow": 78
  },
  "or-perplexity-sonar-reasoning-pro": {
    "coding": 62,
    "creativity": 77,
    "reasoning": 69,
    "math": 97,
    "multilingual": 52,
    "speed": 51,
    "costEfficiency": 51,
    "contextWindow": 68
  },
  "or-nvidia-llama-3-3-nemotron-super-49b-v1-5": {
    "coding": 56,
    "creativity": 58,
    "reasoning": 64,
    "math": 67,
    "multilingual": 68,
    "speed": 75,
    "costEfficiency": 92,
    "contextWindow": 68
  },
  "or-deepseek-deepseek-chat-v3-1": {
    "coding": 62,
    "creativity": 70,
    "reasoning": 76,
    "math": 73,
    "multilingual": 66,
    "speed": 60,
    "costEfficiency": 76,
    "contextWindow": 68
  },
  "or-nvidia-nemotron-3-nano-30b-a3b-free": {
    "coding": 56,
    "creativity": 63,
    "reasoning": 71,
    "math": 70,
    "multilingual": 59,
    "speed": 83,
    "costEfficiency": 95,
    "contextWindow": 98
  },
  "or-poolside-laguna-xs-2-free": {
    "coding": 90,
    "creativity": 71,
    "reasoning": 62,
    "math": 63,
    "multilingual": 63,
    "speed": 62,
    "costEfficiency": 73,
    "contextWindow": 88
  },
  "or-poolside-laguna-m-1-free": {
    "coding": 90,
    "creativity": 72,
    "reasoning": 62,
    "math": 63,
    "multilingual": 63,
    "speed": 62,
    "costEfficiency": 73,
    "contextWindow": 88
  },
  "or-mistralai-ministral-14b-2512": {
    "coding": 54,
    "creativity": 61,
    "reasoning": 62,
    "math": 61,
    "multilingual": 94,
    "speed": 85,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-minimax-minimax-m2-1": {
    "coding": 76,
    "creativity": 74,
    "reasoning": 84,
    "math": 83,
    "multilingual": 61,
    "speed": 88,
    "costEfficiency": 82,
    "contextWindow": 78
  },
  "or-mistralai-mistral-large-2407": {
    "coding": 67,
    "creativity": 57,
    "reasoning": 60,
    "math": 57,
    "multilingual": 93,
    "speed": 75,
    "costEfficiency": 61,
    "contextWindow": 68
  },
  "or-z-ai-glm-5-turbo": {
    "coding": 83,
    "creativity": 88,
    "reasoning": 90,
    "math": 87,
    "multilingual": 95,
    "speed": 77,
    "costEfficiency": 79,
    "contextWindow": 78
  },
  "or-mistralai-mistral-medium-3": {
    "coding": 71,
    "creativity": 71,
    "reasoning": 63,
    "math": 64,
    "multilingual": 93,
    "speed": 71,
    "costEfficiency": 77,
    "contextWindow": 68
  },
  "or-nvidia-nemotron-3-nano-omni-30b-a3b-reasoning-free": {
    "coding": 57,
    "creativity": 76,
    "reasoning": 66,
    "math": 64,
    "multilingual": 59,
    "speed": 96,
    "costEfficiency": 94,
    "contextWindow": 78
  },
  "or-nvidia-nemotron-3-super-120b-a12b-free": {
    "coding": 64,
    "creativity": 78,
    "reasoning": 60,
    "math": 62,
    "multilingual": 59,
    "speed": 52,
    "costEfficiency": 85,
    "contextWindow": 98
  },
  "or-minimax-minimax-m2": {
    "coding": 75,
    "creativity": 71,
    "reasoning": 83,
    "math": 80,
    "multilingual": 61,
    "speed": 85,
    "costEfficiency": 82,
    "contextWindow": 78
  },
  "or-deepseek-deepseek-r1-0528": {
    "coding": 73,
    "creativity": 76,
    "reasoning": 74,
    "math": 77,
    "multilingual": 55,
    "speed": 53,
    "costEfficiency": 64,
    "contextWindow": 68
  },
  "or-mistralai-mistral-small-3-1-24b-instruct": {
    "coding": 55,
    "creativity": 58,
    "reasoning": 60,
    "math": 59,
    "multilingual": 92,
    "speed": 91,
    "costEfficiency": 93,
    "contextWindow": 68
  },
  "or-bytedance-seed-seed-1-6": {
    "coding": 65,
    "creativity": 75,
    "reasoning": 76,
    "math": 74,
    "multilingual": 53,
    "speed": 56,
    "costEfficiency": 55,
    "contextWindow": 88
  },
  "or-z-ai-glm-4-6v": {
    "coding": 64,
    "creativity": 72,
    "reasoning": 69,
    "math": 69,
    "multilingual": 96,
    "speed": 81,
    "costEfficiency": 84,
    "contextWindow": 68
  },
  "or-deepseek-deepseek-r1-distill-qwen-32b": {
    "coding": 74,
    "creativity": 70,
    "reasoning": 63,
    "math": 66,
    "multilingual": 84,
    "speed": 55,
    "costEfficiency": 79,
    "contextWindow": 68
  },
  "or-deepseek-deepseek-r1-distill-llama-70b": {
    "coding": 69,
    "creativity": 69,
    "reasoning": 61,
    "math": 58,
    "multilingual": 67,
    "speed": 70,
    "costEfficiency": 72,
    "contextWindow": 68
  },
  "or-perplexity-sonar-deep-research": {
    "coding": 62,
    "creativity": 64,
    "reasoning": 70,
    "math": 78,
    "multilingual": 52,
    "speed": 53,
    "costEfficiency": 52,
    "contextWindow": 68
  },
  "or-deepseek-deepseek-chat": {
    "coding": 57,
    "creativity": 59,
    "reasoning": 62,
    "math": 63,
    "multilingual": 67,
    "speed": 61,
    "costEfficiency": 81,
    "contextWindow": 68
  },
  "or-mistralai-mistral-large": {
    "coding": 73,
    "creativity": 57,
    "reasoning": 55,
    "math": 56,
    "multilingual": 93,
    "speed": 57,
    "costEfficiency": 56,
    "contextWindow": 58
  },
  "or-liquid-lfm-2-5-1-2b-thinking-free": {
    "coding": 62,
    "creativity": 66,
    "reasoning": 52,
    "math": 52,
    "multilingual": 62,
    "speed": 63,
    "costEfficiency": 85,
    "contextWindow": 45
  },
  "or-anthropic-claude-3-haiku": {
    "coding": 53,
    "creativity": 59,
    "reasoning": 57,
    "math": 55,
    "multilingual": 84,
    "speed": 95,
    "costEfficiency": 84,
    "contextWindow": 78
  },
  "or-minimax-minimax-m1": {
    "coding": 70,
    "creativity": 59,
    "reasoning": 67,
    "math": 75,
    "multilingual": 61,
    "speed": 63,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-google-gemma-3n-e4b-it": {
    "coding": 55,
    "creativity": 56,
    "reasoning": 55,
    "math": 53,
    "multilingual": 71,
    "speed": 98,
    "costEfficiency": 93,
    "contextWindow": 45
  },
  "or-mistralai-mistral-small-3-2-24b-instruct": {
    "coding": 55,
    "creativity": 58,
    "reasoning": 60,
    "math": 60,
    "multilingual": 92,
    "speed": 90,
    "costEfficiency": 94,
    "contextWindow": 68
  },
  "or-z-ai-glm-4-6": {
    "coding": 61,
    "creativity": 74,
    "reasoning": 82,
    "math": 79,
    "multilingual": 96,
    "speed": 70,
    "costEfficiency": 74,
    "contextWindow": 78
  },
  "or-kwaipilot-kat-coder-pro-v2": {
    "coding": 83,
    "creativity": 65,
    "reasoning": 83,
    "math": 83,
    "multilingual": 63,
    "speed": 53,
    "costEfficiency": 68,
    "contextWindow": 78
  },
  "or-meta-llama-llama-3-2-3b-instruct-free": {
    "coding": 51,
    "creativity": 52,
    "reasoning": 55,
    "math": 52,
    "multilingual": 69,
    "speed": 77,
    "costEfficiency": 90,
    "contextWindow": 68
  },
  "or-nvidia-nemotron-nano-9b-v2-free": {
    "coding": 52,
    "creativity": 55,
    "reasoning": 59,
    "math": 60,
    "multilingual": 58,
    "speed": 88,
    "costEfficiency": 97,
    "contextWindow": 78
  },
  "or-z-ai-glm-4-5": {
    "coding": 60,
    "creativity": 70,
    "reasoning": 76,
    "math": 74,
    "multilingual": 97,
    "speed": 72,
    "costEfficiency": 74,
    "contextWindow": 68
  },
  "or-z-ai-glm-4-5-air": {
    "coding": 61,
    "creativity": 67,
    "reasoning": 69,
    "math": 69,
    "multilingual": 97,
    "speed": 81,
    "costEfficiency": 87,
    "contextWindow": 68
  },
  "or-moonshotai-kimi-k2-0905": {
    "coding": 80,
    "creativity": 80,
    "reasoning": 78,
    "math": 74,
    "multilingual": 94,
    "speed": 65,
    "costEfficiency": 73,
    "contextWindow": 78
  },
  "or-mistralai-voxtral-small-24b-2507": {
    "coding": 58,
    "creativity": 60,
    "reasoning": 64,
    "math": 65,
    "multilingual": 84,
    "speed": 93,
    "costEfficiency": 91,
    "contextWindow": 45
  },
  "or-essentialai-rnj-1-instruct": {
    "coding": 65,
    "creativity": 70,
    "reasoning": 65,
    "math": 65,
    "multilingual": 54,
    "speed": 59,
    "costEfficiency": 67,
    "contextWindow": 58
  },
  "or-cohere-command-r7b-12-2024": {
    "coding": 52,
    "creativity": 51,
    "reasoning": 53,
    "math": 54,
    "multilingual": 97,
    "speed": 98,
    "costEfficiency": 57,
    "contextWindow": 68
  },
  "or-rekaai-reka-flash-3": {
    "coding": 54,
    "creativity": 52,
    "reasoning": 54,
    "math": 55,
    "multilingual": 54,
    "speed": 93,
    "costEfficiency": 84,
    "contextWindow": 68
  },
  "or-amazon-nova-lite-v1": {
    "coding": 53,
    "creativity": 55,
    "reasoning": 56,
    "math": 55,
    "multilingual": 58,
    "speed": 91,
    "costEfficiency": 97,
    "contextWindow": 88
  },
  "or-google-gemma-2-27b-it": {
    "coding": 54,
    "creativity": 53,
    "reasoning": 59,
    "math": 57,
    "multilingual": 71,
    "speed": 94,
    "costEfficiency": 93,
    "contextWindow": 45
  },
  "or-mistralai-mixtral-8x22b-instruct": {
    "coding": 58,
    "creativity": 55,
    "reasoning": 54,
    "math": 56,
    "multilingual": 91,
    "speed": 57,
    "costEfficiency": 63,
    "contextWindow": 58
  },
  "or-arcee-ai-trinity-mini": {
    "coding": 57,
    "creativity": 61,
    "reasoning": 65,
    "math": 65,
    "multilingual": 51,
    "speed": 93,
    "costEfficiency": 91,
    "contextWindow": 78
  },
  "or-nousresearch-hermes-4-70b": {
    "coding": 63,
    "creativity": 80,
    "reasoning": 76,
    "math": 62,
    "multilingual": 64,
    "speed": 56,
    "costEfficiency": 80,
    "contextWindow": 78
  },
  "or-nousresearch-hermes-4-405b": {
    "coding": 59,
    "creativity": 80,
    "reasoning": 74,
    "math": 59,
    "multilingual": 64,
    "speed": 51,
    "costEfficiency": 54,
    "contextWindow": 78
  },
  "or-morph-morph-v3-large": {
    "coding": 85,
    "creativity": 68,
    "reasoning": 73,
    "math": 72,
    "multilingual": 60,
    "speed": 57,
    "costEfficiency": 56,
    "contextWindow": 88
  },
  "or-openai-gpt-4-turbo-preview": {
    "coding": 63,
    "creativity": 62,
    "reasoning": 58,
    "math": 60,
    "multilingual": 78,
    "speed": 66,
    "costEfficiency": 54,
    "contextWindow": 68
  },
  "or-mistralai-mistral-saba": {
    "coding": 64,
    "creativity": 58,
    "reasoning": 56,
    "math": 61,
    "multilingual": 84,
    "speed": 59,
    "costEfficiency": 79,
    "contextWindow": 45
  },
  "or-meta-llama-llama-3-3-70b-instruct": {
    "coding": 53,
    "creativity": 55,
    "reasoning": 61,
    "math": 58,
    "multilingual": 69,
    "speed": 83,
    "costEfficiency": 78,
    "contextWindow": 68
  },
  "or-mistralai-mistral-small-24b-instruct-2501": {
    "coding": 56,
    "creativity": 54,
    "reasoning": 56,
    "math": 57,
    "multilingual": 92,
    "speed": 91,
    "costEfficiency": 94,
    "contextWindow": 45
  },
  "or-inclusionai-ling-2-6-1t": {
    "coding": 66,
    "creativity": 74,
    "reasoning": 81,
    "math": 74,
    "multilingual": 62,
    "speed": 59,
    "costEfficiency": 78,
    "contextWindow": 88
  },
  "or-inclusionai-ling-2-6-flash": {
    "coding": 57,
    "creativity": 65,
    "reasoning": 73,
    "math": 66,
    "multilingual": 62,
    "speed": 94,
    "costEfficiency": 95,
    "contextWindow": 88
  },
  "or-moonshotai-kimi-k2": {
    "coding": 79,
    "creativity": 76,
    "reasoning": 73,
    "math": 73,
    "multilingual": 95,
    "speed": 66,
    "costEfficiency": 75,
    "contextWindow": 68
  },
  "or-prime-intellect-intellect-3": {
    "coding": 62,
    "creativity": 66,
    "reasoning": 67,
    "math": 70,
    "multilingual": 64,
    "speed": 60,
    "costEfficiency": 80,
    "contextWindow": 78
  },
  "or-allenai-olmo-3-32b-think": {
    "coding": 65,
    "creativity": 79,
    "reasoning": 85,
    "math": 94,
    "multilingual": 55,
    "speed": 62,
    "costEfficiency": 52,
    "contextWindow": 78
  },
  "or-meta-llama-llama-3-3-70b-instruct-free": {
    "coding": 52,
    "creativity": 55,
    "reasoning": 60,
    "math": 58,
    "multilingual": 68,
    "speed": 82,
    "costEfficiency": 78,
    "contextWindow": 68
  },
  "or-meta-llama-llama-3-2-1b-instruct": {
    "coding": 51,
    "creativity": 51,
    "reasoning": 51,
    "math": 51,
    "multilingual": 69,
    "speed": 84,
    "costEfficiency": 98,
    "contextWindow": 68
  },
  "or-deepcogito-cogito-v2-1-671b": {
    "coding": 55,
    "creativity": 81,
    "reasoning": 72,
    "math": 73,
    "multilingual": 67,
    "speed": 54,
    "costEfficiency": 62,
    "contextWindow": 68
  },
  "or-meta-llama-llama-3-1-8b-instruct": {
    "coding": 52,
    "creativity": 53,
    "reasoning": 56,
    "math": 53,
    "multilingual": 69,
    "speed": 92,
    "costEfficiency": 94,
    "contextWindow": 68
  },
  "or-meta-llama-llama-3-1-70b-instruct": {
    "coding": 53,
    "creativity": 54,
    "reasoning": 57,
    "math": 55,
    "multilingual": 70,
    "speed": 70,
    "costEfficiency": 78,
    "contextWindow": 68
  },
  "or-arcee-ai-virtuoso-large": {
    "coding": 60,
    "creativity": 67,
    "reasoning": 67,
    "math": 67,
    "multilingual": 51,
    "speed": 56,
    "costEfficiency": 62,
    "contextWindow": 78
  },
  "or-relace-relace-search": {
    "coding": 63,
    "creativity": 65,
    "reasoning": 66,
    "math": 65,
    "multilingual": 54,
    "speed": 55,
    "costEfficiency": 55,
    "contextWindow": 78
  },
  "or-arcee-ai-coder-large": {
    "coding": 78,
    "creativity": 61,
    "reasoning": 68,
    "math": 67,
    "multilingual": 67,
    "speed": 61,
    "costEfficiency": 81,
    "contextWindow": 58
  },
  "or-mistralai-mistral-nemo": {
    "coding": 59,
    "creativity": 54,
    "reasoning": 52,
    "math": 54,
    "multilingual": 92,
    "speed": 76,
    "costEfficiency": 59,
    "contextWindow": 58
  },
  "or-meta-llama-llama-3-8b-instruct": {
    "coding": 51,
    "creativity": 51,
    "reasoning": 51,
    "math": 51,
    "multilingual": 70,
    "speed": 97,
    "costEfficiency": 97,
    "contextWindow": 45
  },
  "or-meta-llama-llama-3-70b-instruct": {
    "coding": 52,
    "creativity": 52,
    "reasoning": 52,
    "math": 53,
    "multilingual": 70,
    "speed": 58,
    "costEfficiency": 72,
    "contextWindow": 45
  },
  "or-morph-morph-v3-fast": {
    "coding": 85,
    "creativity": 63,
    "reasoning": 73,
    "math": 72,
    "multilingual": 60,
    "speed": 76,
    "costEfficiency": 67,
    "contextWindow": 68
  },
  "or-relace-relace-apply-3": {
    "coding": 60,
    "creativity": 68,
    "reasoning": 63,
    "math": 62,
    "multilingual": 54,
    "speed": 56,
    "costEfficiency": 55,
    "contextWindow": 78
  },
  "or-liquid-lfm-2-24b-a2b": {
    "coding": 59,
    "creativity": 56,
    "reasoning": 55,
    "math": 53,
    "multilingual": 63,
    "speed": 88,
    "costEfficiency": 98,
    "contextWindow": 58
  },
  "or-amazon-nova-micro-v1": {
    "coding": 52,
    "creativity": 53,
    "reasoning": 54,
    "math": 53,
    "multilingual": 58,
    "speed": 96,
    "costEfficiency": 98,
    "contextWindow": 68
  },
  "or-liquid-lfm-2-5-1-2b-instruct-free": {
    "coding": 53,
    "creativity": 56,
    "reasoning": 53,
    "math": 52,
    "multilingual": 63,
    "speed": 97,
    "costEfficiency": 86,
    "contextWindow": 45
  },
  "or-microsoft-wizardlm-2-8x22b": {
    "coding": 54,
    "creativity": 57,
    "reasoning": 62,
    "math": 62,
    "multilingual": 51,
    "speed": 92,
    "costEfficiency": 91,
    "contextWindow": 68
  },
  "or-inflection-inflection-3-productivity": {
    "coding": 58,
    "creativity": 61,
    "reasoning": 75,
    "math": 73,
    "multilingual": 64,
    "speed": 52,
    "costEfficiency": 52,
    "contextWindow": 45
  },
  "or-openai-gpt-5-chat": {
    "coding": 81,
    "creativity": 84,
    "reasoning": 67,
    "math": 78,
    "multilingual": 76,
    "speed": 92,
    "costEfficiency": 69,
    "contextWindow": 68
  },
  "or-openai-gpt-4": {
    "coding": 52,
    "creativity": 60,
    "reasoning": 57,
    "math": 73,
    "multilingual": 78,
    "speed": 54,
    "costEfficiency": 53,
    "contextWindow": 45
  },
  "or-openai-gpt-3-5-turbo": {
    "coding": 52,
    "creativity": 55,
    "reasoning": 53,
    "math": 60,
    "multilingual": 78,
    "speed": 77,
    "costEfficiency": 76,
    "contextWindow": 45
  },
  "or-qwen-qwen-2-5-7b-instruct": {
    "coding": 55,
    "creativity": 57,
    "reasoning": 61,
    "math": 66,
    "multilingual": 90,
    "speed": 97,
    "costEfficiency": 63,
    "contextWindow": 45
  },
  "or-qwen-qwen-2-5-72b-instruct": {
    "coding": 57,
    "creativity": 59,
    "reasoning": 61,
    "math": 60,
    "multilingual": 91,
    "speed": 58,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-qwen-qwen-plus": {
    "coding": 77,
    "creativity": 73,
    "reasoning": 75,
    "math": 81,
    "multilingual": 91,
    "speed": 59,
    "costEfficiency": 80,
    "contextWindow": 98
  }
} satisfies Record<string, AIAbilityStats>;

export const OPENROUTER_ADDED_BRANDS = {
  "or-google-gemini-3-1-flash-lite": "gemini",
  "or-openai-gpt-5": "gpt",
  "or-openai-gpt-5-pro": "gpt",
  "or-openai-gpt-5-mini": "gpt",
  "or-openai-gpt-5-nano": "gpt",
  "or-openai-gpt-5-4-nano": "gpt",
  "or-openai-gpt-5-3-chat": "gpt",
  "or-openai-gpt-5-3-codex": "gpt",
  "or-openai-gpt-5-2-pro": "gpt",
  "or-openai-gpt-5-2": "gpt",
  "or-openai-gpt-5-2-chat": "gpt",
  "or-openai-gpt-5-2-codex": "gpt",
  "or-openai-gpt-5-codex": "gpt",
  "or-openai-gpt-5-1-chat": "gpt",
  "or-openai-gpt-5-1-codex-max": "gpt",
  "or-openai-gpt-5-1-codex": "gpt",
  "or-openai-gpt-5-1-codex-mini": "gpt",
  "or-openai-gpt-5-5-pro": "gpt",
  "or-openai-gpt-5-5": "gpt",
  "or-openai-gpt-5-4-pro": "gpt",
  "or-openai-gpt-5-4": "gpt",
  "or-openai-gpt-5-1": "gpt",
  "or-openai-gpt-chat-latest": "gpt",
  "or-openai-o3-pro": "gpt",
  "or-openai-o3": "gpt",
  "or-openai-o3-deep-research": "gpt",
  "or-openai-o4-mini-deep-research": "gpt",
  "or-openai-o4-mini": "gpt",
  "or-openai-o4-mini-high": "gpt",
  "or-openai-o3-mini-high": "gpt",
  "or-openai-o3-mini": "gpt",
  "or-openai-o1-pro": "gpt",
  "or-openai-o1": "gpt",
  "or-openai-gpt-4o": "gpt",
  "or-openai-gpt-4o-mini": "gpt",
  "or-openai-gpt-4o-search-preview": "gpt",
  "or-openai-gpt-4o-mini-search-preview": "gpt",
  "or-openai-gpt-oss-120b": "gpt",
  "or-openai-gpt-oss-120b-free": "gpt",
  "or-openai-gpt-oss-20b": "gpt",
  "or-openai-gpt-oss-20b-free": "gpt",
  "or-qwen-qwen3-max": "qwen",
  "or-qwen-qwen3-7-plus": "qwen",
  "or-qwen-qwen3-5-plus-20260420": "qwen",
  "or-qwen-qwen3-6-flash": "qwen",
  "or-qwen-qwen3-6-35b-a3b": "qwen",
  "or-qwen-qwen3-6-27b": "qwen",
  "or-qwen-qwen3-next-80b-a3b-thinking": "qwen",
  "or-qwen-qwen3-coder-next": "qwen",
  "or-qwen-qwen3-6-max-preview": "qwen",
  "or-qwen-qwen-plus-2025-07-28-thinking": "qwen",
  "or-qwen-qwen-plus-2025-07-28": "qwen",
  "or-qwen-qwen3-coder-plus": "qwen",
  "or-qwen-qwen3-coder-flash": "qwen",
  "or-qwen-qwen3-coder": "qwen",
  "or-qwen-qwen3-coder-free": "qwen",
  "or-qwen-qwen3-coder-30b-a3b-instruct": "qwen",
  "or-qwen-qwen3-next-80b-a3b-instruct": "qwen",
  "or-qwen-qwen3-next-80b-a3b-instruct-free": "qwen",
  "or-qwen-qwen3-235b-a22b-thinking-2507": "qwen",
  "or-qwen-qwen3-30b-a3b-thinking-2507": "qwen",
  "or-qwen-qwen3-235b-a22b-2507": "qwen",
  "or-qwen-qwen3-30b-a3b-instruct-2507": "qwen",
  "or-qwen-qwen3-235b-a22b": "qwen",
  "or-qwen-qwen3-32b": "qwen",
  "or-qwen-qwen3-14b": "qwen",
  "or-qwen-qwen3-8b": "qwen",
  "or-qwen-qwen3-30b-a3b": "qwen",
  "or-qwen-qwen-2-5-coder-32b-instruct": "qwen",
  "or-openai-gpt-5-4-mini": "gpt",
  "or-anthropic-claude-fable-5": "claude",
  "or-google-gemini-3-5-flash": "gemini",
  "or-x-ai-grok-build-0-1": "grok",
  "or-perplexity-sonar-pro-search": "perplexity",
  "or-deepseek-deepseek-v4-pro": "deepseek",
  "or-qwen-qwen3-7-max": "qwen",
  "or-meta-llama-llama-3-2-3b-instruct": "other",
  "or-mistralai-mistral-medium-3-5": "other",
  "or-cohere-command-r-08-2024": "other",
  "or-microsoft-phi-4-mini-instruct": "other",
  "or-amazon-nova-pro-v1": "other",
  "or-nvidia-nemotron-3-nano-30b-a3b": "other",
  "or-moonshotai-kimi-k2-7-code": "other",
  "or-z-ai-glm-5": "other",
  "or-minimax-minimax-m3": "other",
  "or-tencent-hy3-preview": "other",
  "or-ibm-granite-granite-4-1-8b": "other",
  "or-bytedance-seed-seed-1-6-flash": "other",
  "or-anthropic-claude-opus-4-7": "claude",
  "or-anthropic-claude-sonnet-4": "claude",
  "or-anthropic-claude-opus-4-8-fast": "claude",
  "or-anthropic-claude-opus-4-8": "claude",
  "or-anthropic-claude-opus-4-7-fast": "claude",
  "or-anthropic-claude-opus-4-5": "claude",
  "or-anthropic-claude-opus-4-6-fast": "claude",
  "or-anthropic-claude-opus-4-1": "claude",
  "or-google-gemini-2-5-pro": "gemini",
  "or-anthropic-claude-opus-4": "claude",
  "or-google-gemma-4-26b-a4b-it": "gemini",
  "or-google-gemma-4-26b-a4b-it-free": "gemini",
  "or-google-gemma-4-31b-it-free": "gemini",
  "or-google-gemini-2-5-pro-preview": "gemini",
  "or-google-gemini-2-5-pro-preview-05-06": "gemini",
  "or-x-ai-grok-4-20-multi-agent": "grok",
  "or-moonshotai-kimi-k2-6": "other",
  "or-google-gemini-3-1-pro-preview-customtools": "gemini",
  "or-google-gemini-2-5-flash-lite-preview-09-2025": "gemini",
  "or-deepseek-deepseek-v4-flash": "deepseek",
  "or-deepseek-deepseek-v3-2": "deepseek",
  "or-anthropic-claude-3-5-haiku": "claude",
  "or-xiaomi-mimo-v2-5": "other",
  "or-nex-agi-nex-n2-pro-free": "other",
  "or-nvidia-nemotron-3-ultra-550b-a55b": "other",
  "or-arcee-ai-trinity-large-thinking": "other",
  "or-z-ai-glm-4-7-flash": "other",
  "or-inclusionai-ring-2-6-1t": "other",
  "or-deepseek-deepseek-v3-2-exp": "deepseek",
  "or-minimax-minimax-m2-5": "other",
  "or-nvidia-nemotron-3-ultra-550b-a55b-free": "other",
  "or-deepseek-deepseek-v3-1-terminus": "deepseek",
  "or-z-ai-glm-4-7": "other",
  "or-perplexity-sonar-reasoning-pro": "perplexity",
  "or-nvidia-llama-3-3-nemotron-super-49b-v1-5": "other",
  "or-deepseek-deepseek-chat-v3-1": "deepseek",
  "or-nvidia-nemotron-3-nano-30b-a3b-free": "other",
  "or-poolside-laguna-xs-2-free": "other",
  "or-poolside-laguna-m-1-free": "other",
  "or-mistralai-ministral-14b-2512": "other",
  "or-minimax-minimax-m2-1": "other",
  "or-mistralai-mistral-large-2407": "other",
  "or-z-ai-glm-5-turbo": "other",
  "or-mistralai-mistral-medium-3": "other",
  "or-nvidia-nemotron-3-nano-omni-30b-a3b-reasoning-free": "other",
  "or-nvidia-nemotron-3-super-120b-a12b-free": "other",
  "or-minimax-minimax-m2": "other",
  "or-deepseek-deepseek-r1-0528": "deepseek",
  "or-mistralai-mistral-small-3-1-24b-instruct": "other",
  "or-bytedance-seed-seed-1-6": "other",
  "or-z-ai-glm-4-6v": "other",
  "or-deepseek-deepseek-r1-distill-qwen-32b": "deepseek",
  "or-deepseek-deepseek-r1-distill-llama-70b": "deepseek",
  "or-perplexity-sonar-deep-research": "perplexity",
  "or-deepseek-deepseek-chat": "deepseek",
  "or-mistralai-mistral-large": "other",
  "or-liquid-lfm-2-5-1-2b-thinking-free": "other",
  "or-anthropic-claude-3-haiku": "claude",
  "or-minimax-minimax-m1": "other",
  "or-google-gemma-3n-e4b-it": "gemini",
  "or-mistralai-mistral-small-3-2-24b-instruct": "other",
  "or-z-ai-glm-4-6": "other",
  "or-kwaipilot-kat-coder-pro-v2": "other",
  "or-meta-llama-llama-3-2-3b-instruct-free": "other",
  "or-nvidia-nemotron-nano-9b-v2-free": "other",
  "or-z-ai-glm-4-5": "other",
  "or-z-ai-glm-4-5-air": "other",
  "or-moonshotai-kimi-k2-0905": "other",
  "or-mistralai-voxtral-small-24b-2507": "other",
  "or-essentialai-rnj-1-instruct": "other",
  "or-cohere-command-r7b-12-2024": "other",
  "or-rekaai-reka-flash-3": "other",
  "or-amazon-nova-lite-v1": "other",
  "or-google-gemma-2-27b-it": "gemini",
  "or-mistralai-mixtral-8x22b-instruct": "other",
  "or-arcee-ai-trinity-mini": "other",
  "or-nousresearch-hermes-4-70b": "other",
  "or-nousresearch-hermes-4-405b": "other",
  "or-morph-morph-v3-large": "other",
  "or-openai-gpt-4-turbo-preview": "gpt",
  "or-mistralai-mistral-saba": "other",
  "or-meta-llama-llama-3-3-70b-instruct": "other",
  "or-mistralai-mistral-small-24b-instruct-2501": "other",
  "or-inclusionai-ling-2-6-1t": "other",
  "or-inclusionai-ling-2-6-flash": "other",
  "or-moonshotai-kimi-k2": "other",
  "or-prime-intellect-intellect-3": "other",
  "or-allenai-olmo-3-32b-think": "other",
  "or-meta-llama-llama-3-3-70b-instruct-free": "other",
  "or-meta-llama-llama-3-2-1b-instruct": "other",
  "or-deepcogito-cogito-v2-1-671b": "other",
  "or-meta-llama-llama-3-1-8b-instruct": "other",
  "or-meta-llama-llama-3-1-70b-instruct": "other",
  "or-arcee-ai-virtuoso-large": "other",
  "or-relace-relace-search": "other",
  "or-arcee-ai-coder-large": "other",
  "or-mistralai-mistral-nemo": "other",
  "or-meta-llama-llama-3-8b-instruct": "other",
  "or-meta-llama-llama-3-70b-instruct": "other",
  "or-morph-morph-v3-fast": "other",
  "or-relace-relace-apply-3": "other",
  "or-liquid-lfm-2-24b-a2b": "other",
  "or-amazon-nova-micro-v1": "other",
  "or-liquid-lfm-2-5-1-2b-instruct-free": "other",
  "or-microsoft-wizardlm-2-8x22b": "other",
  "or-inflection-inflection-3-productivity": "other",
  "or-openai-gpt-5-chat": "gpt",
  "or-openai-gpt-4": "gpt",
  "or-openai-gpt-3-5-turbo": "gpt",
  "or-qwen-qwen-2-5-7b-instruct": "qwen",
  "or-qwen-qwen-2-5-72b-instruct": "qwen",
  "or-qwen-qwen-plus": "qwen"
} satisfies Record<string, ModelBrand>;

export const OPENROUTER_ADDED_OPENSOURCE_IDS = [
  "or-qwen-qwen3-max",
  "or-qwen-qwen3-7-plus",
  "or-qwen-qwen3-5-plus-20260420",
  "or-qwen-qwen3-6-flash",
  "or-qwen-qwen3-6-35b-a3b",
  "or-qwen-qwen3-6-27b",
  "or-qwen-qwen3-next-80b-a3b-thinking",
  "or-qwen-qwen3-coder-next",
  "or-qwen-qwen3-6-max-preview",
  "or-qwen-qwen-plus-2025-07-28-thinking",
  "or-qwen-qwen-plus-2025-07-28",
  "or-qwen-qwen3-coder-plus",
  "or-qwen-qwen3-coder-flash",
  "or-qwen-qwen3-coder",
  "or-qwen-qwen3-coder-free",
  "or-qwen-qwen3-coder-30b-a3b-instruct",
  "or-qwen-qwen3-next-80b-a3b-instruct",
  "or-qwen-qwen3-next-80b-a3b-instruct-free",
  "or-qwen-qwen3-235b-a22b-thinking-2507",
  "or-qwen-qwen3-30b-a3b-thinking-2507",
  "or-qwen-qwen3-235b-a22b-2507",
  "or-qwen-qwen3-30b-a3b-instruct-2507",
  "or-qwen-qwen3-235b-a22b",
  "or-qwen-qwen3-32b",
  "or-qwen-qwen3-14b",
  "or-qwen-qwen3-8b",
  "or-qwen-qwen3-30b-a3b",
  "or-qwen-qwen-2-5-coder-32b-instruct",
  "or-deepseek-deepseek-v4-pro",
  "or-qwen-qwen3-7-max",
  "or-meta-llama-llama-3-2-3b-instruct",
  "or-mistralai-mistral-medium-3-5",
  "or-microsoft-phi-4-mini-instruct",
  "or-nvidia-nemotron-3-nano-30b-a3b",
  "or-z-ai-glm-5",
  "or-ibm-granite-granite-4-1-8b",
  "or-google-gemma-4-26b-a4b-it",
  "or-google-gemma-4-26b-a4b-it-free",
  "or-google-gemma-4-31b-it-free",
  "or-deepseek-deepseek-v4-flash",
  "or-deepseek-deepseek-v3-2",
  "or-nvidia-nemotron-3-ultra-550b-a55b",
  "or-arcee-ai-trinity-large-thinking",
  "or-z-ai-glm-4-7-flash",
  "or-inclusionai-ring-2-6-1t",
  "or-deepseek-deepseek-v3-2-exp",
  "or-nvidia-nemotron-3-ultra-550b-a55b-free",
  "or-deepseek-deepseek-v3-1-terminus",
  "or-z-ai-glm-4-7",
  "or-nvidia-llama-3-3-nemotron-super-49b-v1-5",
  "or-deepseek-deepseek-chat-v3-1",
  "or-nvidia-nemotron-3-nano-30b-a3b-free",
  "or-mistralai-ministral-14b-2512",
  "or-mistralai-mistral-large-2407",
  "or-z-ai-glm-5-turbo",
  "or-mistralai-mistral-medium-3",
  "or-nvidia-nemotron-3-nano-omni-30b-a3b-reasoning-free",
  "or-nvidia-nemotron-3-super-120b-a12b-free",
  "or-deepseek-deepseek-r1-0528",
  "or-mistralai-mistral-small-3-1-24b-instruct",
  "or-z-ai-glm-4-6v",
  "or-deepseek-deepseek-r1-distill-qwen-32b",
  "or-deepseek-deepseek-r1-distill-llama-70b",
  "or-deepseek-deepseek-chat",
  "or-mistralai-mistral-large",
  "or-liquid-lfm-2-5-1-2b-thinking-free",
  "or-google-gemma-3n-e4b-it",
  "or-mistralai-mistral-small-3-2-24b-instruct",
  "or-z-ai-glm-4-6",
  "or-meta-llama-llama-3-2-3b-instruct-free",
  "or-nvidia-nemotron-nano-9b-v2-free",
  "or-z-ai-glm-4-5",
  "or-z-ai-glm-4-5-air",
  "or-mistralai-voxtral-small-24b-2507",
  "or-rekaai-reka-flash-3",
  "or-google-gemma-2-27b-it",
  "or-mistralai-mixtral-8x22b-instruct",
  "or-arcee-ai-trinity-mini",
  "or-nousresearch-hermes-4-70b",
  "or-nousresearch-hermes-4-405b",
  "or-mistralai-mistral-saba",
  "or-meta-llama-llama-3-3-70b-instruct",
  "or-mistralai-mistral-small-24b-instruct-2501",
  "or-inclusionai-ling-2-6-1t",
  "or-inclusionai-ling-2-6-flash",
  "or-prime-intellect-intellect-3",
  "or-allenai-olmo-3-32b-think",
  "or-meta-llama-llama-3-3-70b-instruct-free",
  "or-meta-llama-llama-3-2-1b-instruct",
  "or-deepcogito-cogito-v2-1-671b",
  "or-meta-llama-llama-3-1-8b-instruct",
  "or-meta-llama-llama-3-1-70b-instruct",
  "or-arcee-ai-virtuoso-large",
  "or-arcee-ai-coder-large",
  "or-mistralai-mistral-nemo",
  "or-meta-llama-llama-3-8b-instruct",
  "or-meta-llama-llama-3-70b-instruct",
  "or-liquid-lfm-2-24b-a2b",
  "or-liquid-lfm-2-5-1-2b-instruct-free",
  "or-microsoft-wizardlm-2-8x22b",
  "or-qwen-qwen-2-5-7b-instruct",
  "or-qwen-qwen-2-5-72b-instruct",
  "or-qwen-qwen-plus"
] as const;

export const OPENROUTER_ADDED_REASONING_IDS = [
  "or-anthropic-claude-fable-5",
  "or-anthropic-claude-opus-4-8-fast",
  "or-openai-gpt-5-5-pro",
  "or-openai-gpt-5-5",
  "or-google-gemini-3-5-flash",
  "or-qwen-qwen3-7-max",
  "or-minimax-minimax-m3",
  "or-moonshotai-kimi-k2-6",
  "or-xiaomi-mimo-v2-5",
  "or-qwen-qwen3-7-plus",
  "or-deepseek-deepseek-v4-pro",
  "or-z-ai-glm-5",
  "or-google-gemini-3-1-pro-preview-customtools",
  "or-nvidia-nemotron-3-ultra-550b-a55b",
  "or-nvidia-nemotron-3-ultra-550b-a55b-free",
  "or-deepseek-deepseek-v4-flash"
] as const;

export const OPENROUTER_ADDED_FAST_IDS = [
  "or-liquid-lfm-2-5-1-2b-instruct-free",
  "or-google-gemma-4-26b-a4b-it-free",
  "or-nvidia-nemotron-3-nano-omni-30b-a3b-reasoning-free",
  "or-google-gemini-3-1-flash-lite",
  "or-nvidia-nemotron-3-ultra-550b-a55b",
  "or-inclusionai-ling-2-6-flash",
  "or-arcee-ai-trinity-large-thinking",
  "or-minimax-minimax-m2-5",
  "or-openai-gpt-oss-120b",
  "or-openai-gpt-oss-120b-free",
  "or-qwen-qwen3-6-35b-a3b",
  "or-qwen-qwen3-7-max",
  "or-ibm-granite-granite-4-1-8b",
  "or-liquid-lfm-2-24b-a2b",
  "or-bytedance-seed-seed-1-6-flash",
  "or-mistralai-voxtral-small-24b-2507"
] as const;

export const OPENROUTER_ADDED_FLAGSHIP_IDS = [
  "or-anthropic-claude-fable-5",
  "or-openai-gpt-5-5",
  "or-deepseek-deepseek-v4-pro",
  "or-qwen-qwen3-7-max",
  "or-moonshotai-kimi-k2-6",
  "or-z-ai-glm-5",
  "or-minimax-minimax-m3",
  "or-mistralai-mistral-medium-3-5",
  "or-nvidia-nemotron-3-ultra-550b-a55b",
  "or-xiaomi-mimo-v2-5",
  "or-tencent-hy3-preview",
  "or-inclusionai-ring-2-6-1t",
  "or-arcee-ai-trinity-large-thinking",
  "or-bytedance-seed-seed-1-6",
  "or-ibm-granite-granite-4-1-8b",
  "or-kwaipilot-kat-coder-pro-v2",
  "or-allenai-olmo-3-32b-think",
  "or-nousresearch-hermes-4-70b",
  "or-poolside-laguna-m-1-free",
  "or-morph-morph-v3-large"
] as const;

export type { ModelInfo };
