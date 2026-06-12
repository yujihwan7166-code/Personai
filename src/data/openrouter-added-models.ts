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
    "description": "Gemini 3.1 Flash Lite: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Google 모델",
    "quote": "Gemini 3.1 Flash Lite 기준으로 구조 검토·테스트 관점까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Gemini 3.1 Flash Lite가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Google의 Gemini 3.1 Flash Lite 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "id": "or-openai-gpt-5-mini",
    "name": "GPT-5 Mini",
    "nameKo": "GPT-5 Mini",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5-mini",
    "description": "GPT-5 Mini: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT-5 Mini 기준으로 근거 정리·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "이미지에서 중요한 정보를 뽑아줘",
      "GPT-5 Mini로 이미지와 문서를 함께 분석해줘",
      "GPT-5 Mini로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 GPT-5 Mini 모델입니다. 추론, 시각입력, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "고속",
      "툴사용"
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
    "id": "or-openai-gpt-5-5-pro",
    "name": "GPT-5.5 Pro",
    "nameKo": "GPT-5.5 Pro",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.5-pro",
    "description": "GPT-5.5 Pro: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT-5.5 Pro 기준으로 문맥 해석·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "GPT-5.5 Pro로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 GPT-5.5 Pro 모델입니다. 추론, 시각입력, 장문맥, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "툴사용"
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
    "description": "GPT-5.5: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT-5.5 기준으로 전제 점검·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "GPT-5.5로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 GPT-5.5 모델입니다. 추론, 시각입력, 장문맥, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "툴사용"
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
    "description": "GPT-5.4 Pro: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT-5.4 Pro 기준으로 실행 순서·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "이미지에서 중요한 정보를 뽑아줘",
      "GPT-5.4 Pro로 이미지와 문서를 함께 분석해줘",
      "GPT-5.4 Pro로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 GPT-5.4 Pro 모델입니다. 추론, 시각입력, 장문맥, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "툴사용"
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
    "description": "GPT-5.4: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT-5.4 기준으로 비용 균형·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "표나 차트의 핵심만 설명해줘",
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "GPT-5.4로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 GPT-5.4 모델입니다. 추론, 시각입력, 장문맥, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "툴사용"
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
    "description": "GPT-5.1: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT-5.1 기준으로 응답 속도·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "GPT-5.1로 이미지와 문서를 함께 분석해줘",
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "GPT-5.1로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 GPT-5.1 모델입니다. 추론, 시각입력, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "툴사용",
      "구조화"
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
    "description": "GPT Chat Latest: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT Chat Latest 기준으로 도구 활용·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "GPT Chat Latest로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "OpenAI의 GPT Chat Latest 모델입니다. 시각입력, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화"
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
    "description": "o3 Pro: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "o3 Pro 기준으로 코드 경계·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "o3 Pro로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 o3 Pro 모델입니다. 추론, 시각입력, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "툴사용",
      "구조화"
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
    "id": "or-openai-o3-deep-research",
    "name": "o3 Deep Research",
    "nameKo": "o3 Deep Research",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o3-deep-research",
    "description": "o3 Deep Research: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 OpenAI 계열 검색 모델",
    "quote": "o3 Deep Research 기준으로 자료 요약·테스트 관점까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "시장 동향을 핵심 수치 중심으로 찾아줘",
      "팩트체크할 쟁점을 먼저 나눠줘",
      "o3 Deep Research로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "OpenAI의 o3 Deep Research 모델입니다. 추론, 검색, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "시각입력",
      "툴사용"
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
    "description": "o4 Mini Deep Research: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 OpenAI 계열 검색 모델",
    "quote": "o4 Mini Deep Research 기준으로 대안 비교·테스트 관점까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "o4 Mini Deep Research로 최신 이슈를 출처와 함께 점검해줘",
      "시장 동향을 핵심 수치 중심으로 찾아줘",
      "o4 Mini Deep Research로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "OpenAI의 o4 Mini Deep Research 모델입니다. 추론, 검색, 시각입력, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "시각입력",
      "고속"
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
    "id": "or-openai-o4-mini-high",
    "name": "o4 Mini High",
    "nameKo": "o4 Mini High",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o4-mini-high",
    "description": "o4 Mini High: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "o4 Mini High 기준으로 리스크 확인·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "o4 Mini High로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 o4 Mini High 모델입니다. 추론, 시각입력, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "고속",
      "툴사용"
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
    "description": "o3 Mini High: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 OpenAI 모델",
    "quote": "o3 Mini High 기준으로 긴 문서 흐름·테스트 관점까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "선택지를 기준별로 점수화해줘",
      "이 결론의 논리적 약점을 찾아줘",
      "o3 Mini High로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 o3 Mini High 모델입니다. 추론, 고속, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "고속",
      "툴사용",
      "구조화"
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
    "description": "o3 Mini: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 OpenAI 모델",
    "quote": "o3 Mini 기준으로 언어 뉘앙스·테스트 관점까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "버그 원인을 재현 단계부터 찾아줘",
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "o3 Mini가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "OpenAI의 o3 Mini 모델입니다. 추론, 코딩, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "고속",
      "툴사용"
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
    "description": "o1-pro: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "o1-pro 기준으로 표현 다듬기·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "o1-pro로 이미지와 문서를 함께 분석해줘",
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "o1-pro로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 o1-pro 모델입니다. 추론, 시각입력, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "구조화"
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
    "description": "o1: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "o1 기준으로 수치 검증·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "o1로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "OpenAI의 o1 모델입니다. 추론, 시각입력, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "툴사용",
      "구조화"
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
    "description": "GPT-4o: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT-4o 기준으로 문서 화면·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "표나 차트의 핵심만 설명해줘",
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "GPT-4o로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "OpenAI의 GPT-4o 모델입니다. 시각입력, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "시각입력",
      "툴사용",
      "구조화"
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
    "description": "GPT-4o-mini: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 OpenAI 모델",
    "quote": "GPT-4o-mini 기준으로 오픈 활용·테스트 관점까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "표나 차트의 핵심만 설명해줘",
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "GPT-4o-mini로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "OpenAI의 GPT-4o-mini 모델입니다. 시각입력, 저비용, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
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
    "description": "GPT-4o Search Preview: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 OpenAI 계열 검색 모델",
    "quote": "GPT-4o Search Preview 기준으로 실무 적용·테스트 관점까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 요약해줘",
      "GPT-4o Search Preview로 최신 이슈를 출처와 함께 점검해줘",
      "GPT-4o Search Preview로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "OpenAI의 GPT-4o Search Preview 모델입니다. 검색, 구조화, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "검색",
      "구조화",
      "범용"
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
    "description": "GPT-4o-mini Search Preview: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 OpenAI 계열 검색 모델",
    "quote": "GPT-4o-mini Search Preview 기준으로 핵심 압축·테스트 관점까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "시장 동향을 핵심 수치 중심으로 찾아줘",
      "팩트체크할 쟁점을 먼저 나눠줘",
      "GPT-4o-mini Search Preview로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "OpenAI의 GPT-4o-mini Search Preview 모델입니다. 검색, 저비용, 고속, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-qwen-qwen3-coder-plus",
    "name": "Qwen3 Coder Plus",
    "nameKo": "Qwen3 Coder Plus",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder-plus",
    "description": "Qwen3 Coder Plus: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder Plus 기준으로 구조 검토·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "API 응답 형식을 검토하고 개선안을 줘",
      "Qwen3 Coder Plus가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder Plus 모델입니다. 코딩, 오픈웨이트, 장문맥, 중국어 작업에 맞춰 도와드리겠습니다",
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
    "description": "Qwen3 Coder Flash: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder Flash 기준으로 근거 정리·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "API 응답 형식을 검토하고 개선안을 줘",
      "Qwen3 Coder Flash가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder Flash 모델입니다. 코딩, 오픈웨이트, 장문맥, 저비용 작업에 맞춰 도와드리겠습니다",
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
    "description": "Qwen3 Coder 480B A35B: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder 480B A35B 기준으로 문맥 해석·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Qwen3 Coder 480B A35B가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 480B A35B 모델입니다. 추론, 코딩, 오픈웨이트, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "장문맥"
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
    "description": "Qwen3 Coder 480B A35B Free: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder 480B A35B Free 기준으로 전제 점검·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Qwen3 Coder 480B A35B Free가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Qwen3 Coder 480B A35B Free가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 480B A35B Free 모델입니다. 추론, 코딩, 오픈웨이트, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "장문맥"
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
    "description": "Qwen3 Coder 30B A3B Instruct: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3 Coder 30B A3B Instruct 기준으로 실행 순서·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "Qwen3 Coder 30B A3B Instruct가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 30B A3B Instruct 모델입니다. 코딩, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
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
    "description": "Qwen3 Next 80B A3B Instruct: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3 Next 80B A3B Instruct 기준으로 비용 균형·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Qwen3 Next 80B A3B Instruct가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Qwen3 Next 80B A3B Instruct가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Next 80B A3B Instruct 모델입니다. 추론, 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "description": "Qwen3 Next 80B A3B Instruct Free: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3 Next 80B A3B Instruct Free 기준으로 응답 속도·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "버그 원인을 재현 단계부터 찾아줘",
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Qwen3 Next 80B A3B Instruct Free가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Next 80B A3B Instruct Free 모델입니다. 추론, 코딩, 오픈웨이트, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "무료"
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
    "description": "Qwen3 235B A22B Thinking 2507: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Alibaba Qwen 모델",
    "quote": "Qwen3 235B A22B Thinking 2507 기준으로 도구 활용·판단 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "반례를 먼저 생각하고 답해줘",
      "선택지를 기준별로 점수화해줘",
      "Qwen3 235B A22B Thinking 2507로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B Thinking 2507 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
    "description": "Qwen3 30B A3B Thinking 2507: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Alibaba Qwen 모델",
    "quote": "Qwen3 30B A3B Thinking 2507 기준으로 코드 경계·판단 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "이 결론의 논리적 약점을 찾아줘",
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "Qwen3 30B A3B Thinking 2507로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B Thinking 2507 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
    "description": "Qwen3 235B A22B Instruct 2507: 배포 유연성과 커스터마이징 여지가 있는 Alibaba Qwen 오픈웨이트 모델",
    "quote": "Qwen3 235B A22B Instruct 2507 기준으로 자료 요약·판단 기준까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "Qwen3 235B A22B Instruct 2507의 추천 사용 사례를 정리해줘",
      "Qwen3 235B A22B Instruct 2507의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B Instruct 2507 모델입니다. 오픈웨이트, 저비용, 중국어, 툴사용 작업에 맞춰 도와드리겠습니다",
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
    "description": "Qwen3 30B A3B Instruct 2507: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Alibaba Qwen 모델",
    "quote": "Qwen3 30B A3B Instruct 2507 기준으로 대안 비교·판단 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "Qwen3 30B A3B Instruct 2507로 복잡한 판단을 단계별로 풀어줘",
      "의사결정 트레이드오프를 정리해줘",
      "Qwen3 30B A3B Instruct 2507로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B Instruct 2507 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
    "description": "Qwen3 235B A22B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Alibaba Qwen 모델",
    "quote": "Qwen3 235B A22B 기준으로 리스크 확인·판단 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "이 결론의 논리적 약점을 찾아줘",
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "Qwen3 235B A22B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B 모델입니다. 추론, 오픈웨이트, 중국어, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "중국어",
      "툴사용"
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
    "description": "Qwen3 32B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Alibaba Qwen 모델",
    "quote": "Qwen3 32B 기준으로 긴 문서 흐름·판단 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "Qwen3 32B로 복잡한 판단을 단계별로 풀어줘",
      "Qwen3 32B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 32B 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
    "description": "Qwen3 14B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Alibaba Qwen 모델",
    "quote": "Qwen3 14B 기준으로 언어 뉘앙스·판단 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "Qwen3 14B로 복잡한 판단을 단계별로 풀어줘",
      "Qwen3 14B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 14B 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "중국어"
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
    "description": "Qwen3 8B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Alibaba Qwen 모델",
    "quote": "Qwen3 8B 기준으로 표현 다듬기·판단 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "Qwen3 8B로 복잡한 판단을 단계별로 풀어줘",
      "의사결정 트레이드오프를 정리해줘",
      "Qwen3 8B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 8B 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
    "description": "Qwen3 30B A3B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Alibaba Qwen 모델",
    "quote": "Qwen3 30B A3B 기준으로 수치 검증·판단 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "Qwen3 30B A3B로 복잡한 판단을 단계별로 풀어줘",
      "의사결정 트레이드오프를 정리해줘",
      "Qwen3 30B A3B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
    "description": "Qwen2.5 Coder 32B Instruct: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen2.5 Coder 32B Instruct 기준으로 문서 화면·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Qwen2.5 Coder 32B Instruct가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen2.5 Coder 32B Instruct 모델입니다. 추론, 코딩, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "중국어"
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
    "description": "GPT-5.4 Mini: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 OpenAI 모델",
    "quote": "GPT-5.4 Mini 기준으로 오픈 활용·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "GPT-5.4 Mini가 잘 맞는 개발 작업을 예시로 비교해줘",
      "GPT-5.4 Mini가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-5.4 Mini 모델입니다. 추론, 코딩, 시각입력, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "고속"
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
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-fable-5",
    "description": "Claude Fable 5: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Anthropic 모델",
    "quote": "Claude Fable 5 기준으로 실무 적용·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "Claude Fable 5가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Anthropic의 Claude Fable 5 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
      "openWeight": false
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
    "description": "Gemini 3.5 Flash: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Google 모델",
    "quote": "Gemini 3.5 Flash 기준으로 핵심 압축·판단 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "API 응답 형식을 검토하고 개선안을 줘",
      "Gemini 3.5 Flash가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Google의 Gemini 3.5 Flash 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "description": "Grok Build 0.1: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 xAI 모델",
    "quote": "Grok Build 0.1 기준으로 구조 검토·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Grok Build 0.1가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "xAI의 Grok Build 0.1 모델입니다. 추론, 코딩, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "툴사용"
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
    "description": "Sonar Pro Search: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Perplexity 계열 검색 모델",
    "quote": "Sonar Pro Search 기준으로 근거 정리·출처 맥락까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "팩트체크할 쟁점을 먼저 나눠줘",
      "서로 다른 자료의 관점 차이를 정리해줘",
      "Sonar Pro Search로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Perplexity의 Sonar Pro Search 모델입니다. 추론, 검색, 시각입력, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "시각입력",
      "구조화"
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
    "description": "DeepSeek V4 Pro: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 DeepSeek 모델",
    "quote": "DeepSeek V4 Pro 기준으로 문맥 해석·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "DeepSeek V4 Pro가 잘 맞는 개발 작업을 예시로 비교해줘",
      "DeepSeek V4 Pro가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V4 Pro 모델입니다. 추론, 코딩, 오픈웨이트, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "장문맥"
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
    "description": "Qwen3.7 Max: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3.7 Max 기준으로 전제 점검·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Qwen3.7 Max가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Qwen3.7 Max가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.7 Max 모델입니다. 추론, 코딩, 오픈웨이트, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "장문맥"
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
    "description": "Llama 3.2 3B Instruct: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Meta 모델",
    "quote": "Llama 3.2 3B Instruct 기준으로 실행 순서·출처 맥락까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "선택지를 기준별로 점수화해줘",
      "이 결론의 논리적 약점을 찾아줘",
      "Llama 3.2 3B Instruct로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Meta의 Llama 3.2 3B Instruct 모델입니다. 추론, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용"
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
    "description": "Mistral Medium 3.5: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Mistral AI 모델",
    "quote": "Mistral Medium 3.5 기준으로 비용 균형·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Mistral Medium 3.5가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Mistral Medium 3.5가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Mistral AI의 Mistral Medium 3.5 모델입니다. 추론, 코딩, 오픈웨이트, 시각입력 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "시각입력"
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
    "description": "Command R (08-2024): 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Cohere 모델",
    "quote": "Command R (08-2024) 기준으로 응답 속도·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Command R (08-2024)가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Command R (08-2024)가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Cohere의 Command R (08-2024) 모델입니다. 추론, 코딩, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "툴사용"
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
    "description": "Phi 4 Mini Instruct: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Microsoft 모델",
    "quote": "Phi 4 Mini Instruct 기준으로 도구 활용·출처 맥락까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "Phi 4 Mini Instruct로 복잡한 판단을 단계별로 풀어줘",
      "Phi 4 Mini Instruct로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Microsoft의 Phi 4 Mini Instruct 모델입니다. 추론, 오픈웨이트, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "고속"
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
    "description": "Nova Pro 1.0: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Amazon 모델",
    "quote": "Nova Pro 1.0 기준으로 코드 경계·출처 맥락까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "Nova Pro 1.0로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Amazon의 Nova Pro 1.0 모델입니다. 추론, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
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
    "description": "Nemotron 3 Nano 30B A3B: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 NVIDIA 모델",
    "quote": "Nemotron 3 Nano 30B A3B 기준으로 자료 요약·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Nemotron 3 Nano 30B A3B가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Nano 30B A3B 모델입니다. 추론, 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "description": "Kimi K2.7 Code: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Moonshot AI 모델",
    "quote": "Kimi K2.7 Code 기준으로 대안 비교·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Kimi K2.7 Code가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Kimi K2.7 Code가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2.7 Code 모델입니다. 추론, 코딩, 시각입력, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "중국어"
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
    "description": "GLM 5: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Z.ai 모델",
    "quote": "GLM 5 기준으로 리스크 확인·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "GLM 5가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Z.ai의 GLM 5 모델입니다. 추론, 코딩, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "중국어"
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
    "description": "MiniMax M3: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 MiniMax 모델",
    "quote": "MiniMax M3 기준으로 긴 문서 흐름·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "MiniMax M3가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "MiniMax의 MiniMax M3 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "id": "or-baidu-ernie-4-5-vl-424b-a47b",
    "name": "ERNIE 4.5 VL 424B A47B",
    "nameKo": "ERNIE 4.5 VL 424B A47B",
    "icon": "🔎",
    "avatarUrl": "/logos/baidu.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "baidu/ernie-4.5-vl-424b-a47b",
    "description": "ERNIE 4.5 VL 424B A47B: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Baidu 모델",
    "quote": "ERNIE 4.5 VL 424B A47B 기준으로 언어 뉘앙스·출처 맥락까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "ERNIE 4.5 VL 424B A47B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Baidu의 ERNIE 4.5 VL 424B A47B 모델입니다. 추론, 시각입력, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Baidu",
      "contextLength": 131072,
      "inputModalities": [
        "image",
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-06-30",
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
    "description": "Hy3 preview: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Tencent 모델",
    "quote": "Hy3 preview 기준으로 표현 다듬기·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "API 응답 형식을 검토하고 개선안을 줘",
      "Hy3 preview가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Tencent의 Hy3 preview 모델입니다. 추론, 코딩, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "중국어"
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
    "description": "Granite 4.1 8B: 배포 유연성과 커스터마이징 여지가 있는 IBM 오픈웨이트 모델",
    "quote": "Granite 4.1 8B 기준으로 수치 검증·출처 맥락까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "실행 가능한 계획으로 정리해줘",
      "핵심만 빠르게 요약해줘",
      "Granite 4.1 8B의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "IBM의 Granite 4.1 8B 모델입니다. 오픈웨이트, 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-stepfun-step-3-7-flash",
    "name": "Step 3.7 Flash",
    "nameKo": "Step 3.7 Flash",
    "icon": "👣",
    "avatarUrl": "/logos/stepfun.png",
    "color": "cyan",
    "category": "ai",
    "openrouterModel": "stepfun/step-3.7-flash",
    "description": "Step 3.7 Flash: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 StepFun 모델",
    "quote": "Step 3.7 Flash 기준으로 문서 화면·출처 맥락까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "Step 3.7 Flash로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "StepFun의 Step 3.7 Flash 모델입니다. 추론, 시각입력, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "StepFun",
      "contextLength": 256000,
      "inputModalities": [
        "text",
        "image",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-05-28",
      "openWeight": false
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
    "description": "Seed 1.6 Flash: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 ByteDance Seed 모델",
    "quote": "Seed 1.6 Flash 기준으로 오픈 활용·출처 맥락까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "Seed 1.6 Flash로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "ByteDance Seed의 Seed 1.6 Flash 모델입니다. 추론, 시각입력, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "저비용",
      "고속"
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
    "description": "Claude Opus 4.7: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Anthropic 모델",
    "quote": "Claude Opus 4.7 기준으로 실무 적용·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "버그 원인을 재현 단계부터 찾아줘",
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Claude Opus 4.7가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.7 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "id": "or-openai-gpt-5-3-codex",
    "name": "GPT-5.3-Codex",
    "nameKo": "GPT-5.3-Codex",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.3-codex",
    "description": "GPT-5.3-Codex: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 OpenAI 모델",
    "quote": "GPT-5.3-Codex 기준으로 핵심 압축·출처 맥락까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "버그 원인을 재현 단계부터 찾아줘",
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "GPT-5.3-Codex가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-5.3-Codex 모델입니다. 추론, 코딩, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "툴사용"
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
    "id": "or-openai-gpt-5-2-codex",
    "name": "GPT-5.2-Codex",
    "nameKo": "GPT-5.2-Codex",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.2-codex",
    "description": "GPT-5.2-Codex: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 OpenAI 모델",
    "quote": "GPT-5.2-Codex 기준으로 구조 검토·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "GPT-5.2-Codex가 잘 맞는 개발 작업을 예시로 비교해줘",
      "GPT-5.2-Codex가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-5.2-Codex 모델입니다. 추론, 코딩, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "툴사용"
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
    "id": "or-openai-gpt-5-2-pro",
    "name": "GPT-5.2 Pro",
    "nameKo": "GPT-5.2 Pro",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-5.2-pro",
    "description": "GPT-5.2 Pro: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 OpenAI 모델",
    "quote": "GPT-5.2 Pro 기준으로 근거 정리·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "GPT-5.2 Pro가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-5.2 Pro 모델입니다. 추론, 코딩, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "툴사용"
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
    "description": "GPT-5.2: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 OpenAI 모델",
    "quote": "GPT-5.2 기준으로 문맥 해석·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "GPT-5.2가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-5.2 모델입니다. 추론, 코딩, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "툴사용"
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
    "id": "or-anthropic-claude-sonnet-4",
    "name": "Claude Sonnet 4",
    "nameKo": "Claude Sonnet 4",
    "icon": "🧠",
    "avatarUrl": "/logos/claude.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "anthropic/claude-sonnet-4",
    "description": "Claude Sonnet 4: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Anthropic 모델",
    "quote": "Claude Sonnet 4 기준으로 전제 점검·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "Claude Sonnet 4가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Anthropic의 Claude Sonnet 4 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "description": "Claude Opus 4.8 (Fast): 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Anthropic 모델",
    "quote": "Claude Opus 4.8 (Fast) 기준으로 실행 순서·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "Claude Opus 4.8 (Fast)로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.8 (Fast) 모델입니다. 추론, 시각입력, 장문맥, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "고속"
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
    "description": "Claude Opus 4.8: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Anthropic 모델",
    "quote": "Claude Opus 4.8 기준으로 비용 균형·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "표나 차트의 핵심만 설명해줘",
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "Claude Opus 4.8로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.8 모델입니다. 추론, 시각입력, 장문맥, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "툴사용"
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
    "description": "Claude Opus 4.7 (Fast): 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Anthropic 모델",
    "quote": "Claude Opus 4.7 (Fast) 기준으로 응답 속도·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "이미지에서 중요한 정보를 뽑아줘",
      "Claude Opus 4.7 (Fast)로 이미지와 문서를 함께 분석해줘",
      "Claude Opus 4.7 (Fast)로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.7 (Fast) 모델입니다. 추론, 시각입력, 장문맥, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "고속"
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
    "description": "Claude Opus 4.5: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Anthropic 모델",
    "quote": "Claude Opus 4.5 기준으로 도구 활용·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Claude Opus 4.5가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Claude Opus 4.5가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.5 모델입니다. 추론, 코딩, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "툴사용"
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
    "description": "Claude Opus 4.6 (Fast): 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Anthropic 모델",
    "quote": "Claude Opus 4.6 (Fast) 기준으로 코드 경계·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "Claude Opus 4.6 (Fast)로 이미지와 문서를 함께 분석해줘",
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "Claude Opus 4.6 (Fast)로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.6 (Fast) 모델입니다. 추론, 시각입력, 장문맥, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "고속"
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
    "description": "Claude Opus 4.1: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Anthropic 모델",
    "quote": "Claude Opus 4.1 기준으로 자료 요약·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "버그 원인을 재현 단계부터 찾아줘",
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Claude Opus 4.1가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4.1 모델입니다. 추론, 코딩, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "툴사용"
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
    "description": "Gemini 2.5 Pro: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Google 모델",
    "quote": "Gemini 2.5 Pro 기준으로 대안 비교·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "API 응답 형식을 검토하고 개선안을 줘",
      "Gemini 2.5 Pro가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Google의 Gemini 2.5 Pro 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "description": "Claude Opus 4: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Anthropic 모델",
    "quote": "Claude Opus 4 기준으로 리스크 확인·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Claude Opus 4가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Anthropic의 Claude Opus 4 모델입니다. 추론, 코딩, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "툴사용"
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
    "description": "Gemma 4 26B A4B: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Google 모델",
    "quote": "Gemma 4 26B A4B 기준으로 긴 문서 흐름·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "Gemma 4 26B A4B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Google의 Gemma 4 26B A4B 모델입니다. 추론, 오픈웨이트, 시각입력, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "저비용"
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
    "description": "Gemma 4 26B A4B Free: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Google 모델",
    "quote": "Gemma 4 26B A4B Free 기준으로 언어 뉘앙스·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Gemma 4 26B A4B Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Google의 Gemma 4 26B A4B Free 모델입니다. 추론, 오픈웨이트, 시각입력, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "무료"
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
    "description": "Gemma 4 31B Free: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Google 모델",
    "quote": "Gemma 4 31B Free 기준으로 표현 다듬기·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Gemma 4 31B Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Google의 Gemma 4 31B Free 모델입니다. 추론, 오픈웨이트, 시각입력, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "무료"
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
    "description": "Gemini 2.5 Pro Preview 06-05: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Google 모델",
    "quote": "Gemini 2.5 Pro Preview 06-05 기준으로 수치 검증·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Gemini 2.5 Pro Preview 06-05가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Google의 Gemini 2.5 Pro Preview 06-05 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "description": "Gemini 2.5 Pro Preview 05-06: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Google 모델",
    "quote": "Gemini 2.5 Pro Preview 05-06 기준으로 문서 화면·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Gemini 2.5 Pro Preview 05-06가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Gemini 2.5 Pro Preview 05-06가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Google의 Gemini 2.5 Pro Preview 05-06 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "id": "or-qwen-qwen3-7-plus",
    "name": "Qwen3.7 Plus",
    "nameKo": "Qwen3.7 Plus",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.7-plus",
    "description": "Qwen3.7 Plus: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Alibaba Qwen 모델",
    "quote": "Qwen3.7 Plus 기준으로 오픈 활용·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "이미지에서 중요한 정보를 뽑아줘",
      "Qwen3.7 Plus로 이미지와 문서를 함께 분석해줘",
      "Qwen3.7 Plus로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.7 Plus 모델입니다. 추론, 오픈웨이트, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "장문맥"
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
    "id": "or-x-ai-grok-4-20-multi-agent",
    "name": "Grok 4.20 Multi-Agent",
    "nameKo": "Grok 4.20 Multi-Agent",
    "icon": "⚡",
    "avatarUrl": "/logos/grok.svg",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "x-ai/grok-4.20-multi-agent",
    "description": "Grok 4.20 Multi-Agent: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 xAI 모델",
    "quote": "Grok 4.20 Multi-Agent 기준으로 실무 적용·사용 사례까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "표나 차트의 핵심만 설명해줘",
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "Grok 4.20 Multi-Agent로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "xAI의 Grok 4.20 Multi-Agent 모델입니다. 추론, 시각입력, 장문맥, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "구조화"
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
    "description": "Kimi K2.6: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Moonshot AI 모델",
    "quote": "Kimi K2.6 기준으로 핵심 압축·사용 사례까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Kimi K2.6가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Kimi K2.6가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2.6 모델입니다. 추론, 코딩, 시각입력, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "중국어"
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
    "id": "or-qwen-qwen3-5-plus-20260420",
    "name": "Qwen3.5 Plus 2026-04-20",
    "nameKo": "Qwen3.5 Plus 2026-04-20",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.5-plus-20260420",
    "description": "Qwen3.5 Plus 2026-04-20: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Alibaba Qwen 모델",
    "quote": "Qwen3.5 Plus 2026-04-20 기준으로 구조 검토·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "Qwen3.5 Plus 2026-04-20로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.5 Plus 2026-04-20 모델입니다. 추론, 오픈웨이트, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "장문맥"
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
    "description": "Qwen3.6 Flash: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Alibaba Qwen 모델",
    "quote": "Qwen3.6 Flash 기준으로 근거 정리·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Qwen3.6 Flash로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.6 Flash 모델입니다. 추론, 오픈웨이트, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "장문맥"
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
    "description": "Qwen3.6 35B A3B: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Alibaba Qwen 모델",
    "quote": "Qwen3.6 35B A3B 기준으로 문맥 해석·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "Qwen3.6 35B A3B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.6 35B A3B 모델입니다. 추론, 오픈웨이트, 시각입력, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "저비용"
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
    "id": "or-qwen-qwen3-6-max-preview",
    "name": "Qwen3.6 Max Preview",
    "nameKo": "Qwen3.6 Max Preview",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3.6-max-preview",
    "description": "Qwen3.6 Max Preview: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Alibaba Qwen 모델",
    "quote": "Qwen3.6 Max Preview 기준으로 전제 점검·작업 흐름까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Qwen3.6 Max Preview가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Qwen3.6 Max Preview가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.6 Max Preview 모델입니다. 추론, 코딩, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
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
      "priceTier": "standard",
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
    "description": "Qwen3.6 27B: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Alibaba Qwen 모델",
    "quote": "Qwen3.6 27B 기준으로 실행 순서·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "Qwen3.6 27B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.6 27B 모델입니다. 추론, 오픈웨이트, 시각입력, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "중국어"
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
    "id": "or-google-gemini-3-1-pro-preview-customtools",
    "name": "Gemini 3.1 Pro Preview Custom Tools",
    "nameKo": "Gemini 3.1 Pro Preview Custom Tools",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemini-3.1-pro-preview-customtools",
    "description": "Gemini 3.1 Pro Preview Custom Tools: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Google 모델",
    "quote": "Gemini 3.1 Pro Preview Custom Tools 기준으로 비용 균형·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "Gemini 3.1 Pro Preview Custom Tools로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Google의 Gemini 3.1 Pro Preview Custom Tools 모델입니다. 추론, 시각입력, 장문맥, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "고속"
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
    "description": "Gemini 2.5 Flash Lite Preview 09-2025: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Google 모델",
    "quote": "Gemini 2.5 Flash Lite Preview 09-2025 기준으로 응답 속도·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "표나 차트의 핵심만 설명해줘",
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "Gemini 2.5 Flash Lite Preview 09-2025로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Google의 Gemini 2.5 Flash Lite Preview 09-2025 모델입니다. 추론, 시각입력, 장문맥, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "저비용"
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
    "description": "DeepSeek V4 Flash: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 DeepSeek 모델",
    "quote": "DeepSeek V4 Flash 기준으로 도구 활용·작업 흐름까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "DeepSeek V4 Flash로 복잡한 판단을 단계별로 풀어줘",
      "의사결정 트레이드오프를 정리해줘",
      "DeepSeek V4 Flash로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V4 Flash 모델입니다. 추론, 오픈웨이트, 장문맥, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
    "id": "or-deepseek-deepseek-v3-2",
    "name": "DeepSeek V3.2",
    "nameKo": "DeepSeek V3.2",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-v3.2",
    "description": "DeepSeek V3.2: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 DeepSeek 모델",
    "quote": "DeepSeek V3.2 기준으로 코드 경계·작업 흐름까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "버그 원인을 재현 단계부터 찾아줘",
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "DeepSeek V3.2가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.2 모델입니다. 추론, 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "description": "Claude 3.5 Haiku: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Anthropic 모델",
    "quote": "Claude 3.5 Haiku 기준으로 자료 요약·작업 흐름까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "API 응답 형식을 검토하고 개선안을 줘",
      "Claude 3.5 Haiku가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Anthropic의 Claude 3.5 Haiku 모델입니다. 코딩, 시각입력, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-google-gemma-3-4b-it",
    "name": "Gemma 3 4B",
    "nameKo": "Gemma 3 4B",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-3-4b-it",
    "description": "Gemma 3 4B: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Google 모델",
    "quote": "Gemma 3 4B 기준으로 대안 비교·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "Gemma 3 4B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Google의 Gemma 3 4B 모델입니다. 추론, 오픈웨이트, 시각입력, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "저비용"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 131072,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-03-13",
      "openWeight": true
    }
  },
  {
    "id": "or-google-gemma-3-12b-it",
    "name": "Gemma 3 12B",
    "nameKo": "Gemma 3 12B",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-3-12b-it",
    "description": "Gemma 3 12B: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Google 모델",
    "quote": "Gemma 3 12B 기준으로 리스크 확인·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Gemma 3 12B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Google의 Gemma 3 12B 모델입니다. 추론, 오픈웨이트, 시각입력, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "저비용"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 131072,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-03-13",
      "openWeight": true
    }
  },
  {
    "id": "or-google-gemma-3-27b-it",
    "name": "Gemma 3 27B",
    "nameKo": "Gemma 3 27B",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-3-27b-it",
    "description": "Gemma 3 27B: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Google 모델",
    "quote": "Gemma 3 27B 기준으로 긴 문서 흐름·작업 흐름까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Gemma 3 27B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Google의 Gemma 3 27B 모델입니다. 추론, 오픈웨이트, 시각입력, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "저비용"
    ],
    "modelInfo": {
      "provider": "Google",
      "contextLength": 131072,
      "inputModalities": [
        "text",
        "image"
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
    "id": "or-xiaomi-mimo-v2-5",
    "name": "MiMo-V2.5",
    "nameKo": "MiMo-V2.5",
    "icon": "📱",
    "avatarUrl": "/logos/xiaomi.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "xiaomi/mimo-v2.5",
    "description": "MiMo-V2.5: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Xiaomi 모델",
    "quote": "MiMo-V2.5 기준으로 언어 뉘앙스·작업 흐름까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "MiMo-V2.5가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Xiaomi의 MiMo-V2.5 모델입니다. 추론, 코딩, 시각입력, 장문맥 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    "id": "or-nvidia-nemotron-3-ultra-550b-a55b",
    "name": "Nemotron 3 Ultra",
    "nameKo": "Nemotron 3 Ultra",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-ultra-550b-a55b",
    "description": "Nemotron 3 Ultra: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 NVIDIA 모델",
    "quote": "Nemotron 3 Ultra 기준으로 표현 다듬기·작업 흐름까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "의사결정 트레이드오프를 정리해줘",
      "반례를 먼저 생각하고 답해줘",
      "Nemotron 3 Ultra로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Ultra 모델입니다. 추론, 오픈웨이트, 장문맥, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "장문맥",
      "툴사용"
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
    "description": "Trinity Large Thinking: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Arcee AI 모델",
    "quote": "Trinity Large Thinking 기준으로 수치 검증·작업 흐름까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "Trinity Large Thinking가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Arcee AI의 Trinity Large Thinking 모델입니다. 추론, 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "description": "GLM 4.7 Flash: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Z.ai 모델",
    "quote": "GLM 4.7 Flash 기준으로 문서 화면·작업 흐름까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "GLM 4.7 Flash가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "GLM 4.7 Flash가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Z.ai의 GLM 4.7 Flash 모델입니다. 추론, 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "description": "Ring-2.6-1T: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 InclusionAI 모델",
    "quote": "Ring-2.6-1T 기준으로 오픈 활용·작업 흐름까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Ring-2.6-1T가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Ring-2.6-1T가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "InclusionAI의 Ring-2.6-1T 모델입니다. 추론, 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "description": "DeepSeek V3.2 Exp: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 DeepSeek 모델",
    "quote": "DeepSeek V3.2 Exp 기준으로 실무 적용·작업 흐름까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "반례를 먼저 생각하고 답해줘",
      "선택지를 기준별로 점수화해줘",
      "DeepSeek V3.2 Exp로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.2 Exp 모델입니다. 추론, 오픈웨이트, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "툴사용"
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
    "description": "MiniMax M2.5: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 MiniMax 모델",
    "quote": "MiniMax M2.5 기준으로 핵심 압축·작업 흐름까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "MiniMax M2.5가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "MiniMax의 MiniMax M2.5 모델입니다. 추론, 코딩, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "고속"
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
    "description": "Nemotron 3 Ultra Free: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 NVIDIA 모델",
    "quote": "Nemotron 3 Ultra Free 기준으로 구조 검토·품질 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "선택지를 기준별로 점수화해줘",
      "이 결론의 논리적 약점을 찾아줘",
      "Nemotron 3 Ultra Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Ultra Free 모델입니다. 추론, 오픈웨이트, 장문맥, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "장문맥",
      "무료"
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
    "description": "DeepSeek V3.1 Terminus: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 DeepSeek 모델",
    "quote": "DeepSeek V3.1 Terminus 기준으로 근거 정리·품질 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "선택지를 기준별로 점수화해줘",
      "이 결론의 논리적 약점을 찾아줘",
      "DeepSeek V3.1 Terminus로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.1 Terminus 모델입니다. 추론, 오픈웨이트, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "툴사용"
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
    "description": "GLM 4.7: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Z.ai 모델",
    "quote": "GLM 4.7 기준으로 문맥 해석·품질 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "GLM 4.7가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Z.ai의 GLM 4.7 모델입니다. 추론, 코딩, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "중국어"
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
    "description": "Sonar Reasoning Pro: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Perplexity 계열 검색 모델",
    "quote": "Sonar Reasoning Pro 기준으로 전제 점검·품질 기준까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "이 주장에 대한 출처를 비교해줘",
      "최신 자료를 근거와 함께 요약해줘",
      "Sonar Reasoning Pro로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Perplexity의 Sonar Reasoning Pro 모델입니다. 추론, 검색, 시각입력 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "시각입력"
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
    "description": "Llama 3.3 Nemotron Super 49B V1.5: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 NVIDIA 모델",
    "quote": "Llama 3.3 Nemotron Super 49B V1.5 기준으로 실행 순서·품질 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Llama 3.3 Nemotron Super 49B V1.5가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Llama 3.3 Nemotron Super 49B V1.5가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "NVIDIA의 Llama 3.3 Nemotron Super 49B V1.5 모델입니다. 추론, 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "description": "DeepSeek V3.1: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 DeepSeek 모델",
    "quote": "DeepSeek V3.1 기준으로 비용 균형·품질 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "반례를 먼저 생각하고 답해줘",
      "선택지를 기준별로 점수화해줘",
      "DeepSeek V3.1로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.1 모델입니다. 추론, 오픈웨이트, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "툴사용"
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
    "description": "Nemotron 3 Nano 30B A3B Free: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 NVIDIA 모델",
    "quote": "Nemotron 3 Nano 30B A3B Free 기준으로 응답 속도·품질 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "Nemotron 3 Nano 30B A3B Free가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Nano 30B A3B Free 모델입니다. 추론, 코딩, 오픈웨이트, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "무료"
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
    "description": "Laguna XS.2 Free: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Poolside 모델",
    "quote": "Laguna XS.2 Free 기준으로 도구 활용·품질 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Laguna XS.2 Free가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Poolside의 Laguna XS.2 Free 모델입니다. 추론, 코딩, 무료, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료",
      "툴사용"
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
    "description": "Laguna M.1 Free: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Poolside 모델",
    "quote": "Laguna M.1 Free 기준으로 코드 경계·품질 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Laguna M.1 Free가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Laguna M.1 Free가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Poolside의 Laguna M.1 Free 모델입니다. 추론, 코딩, 무료, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료",
      "툴사용"
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
    "description": "Ministral 3 14B 2512: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Mistral AI 모델",
    "quote": "Ministral 3 14B 2512 기준으로 자료 요약·품질 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "Ministral 3 14B 2512로 이미지와 문서를 함께 분석해줘",
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "Ministral 3 14B 2512로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "Mistral AI의 Ministral 3 14B 2512 모델입니다. 오픈웨이트, 시각입력, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-mistralai-ministral-8b-2512",
    "name": "Ministral 3 8B 2512",
    "nameKo": "Ministral 3 8B 2512",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/ministral-8b-2512",
    "description": "Ministral 3 8B 2512: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Mistral AI 모델",
    "quote": "Ministral 3 8B 2512 기준으로 대안 비교·품질 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "Ministral 3 8B 2512로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "Mistral AI의 Ministral 3 8B 2512 모델입니다. 오픈웨이트, 시각입력, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-nvidia-nemotron-3-5-content-safety-free",
    "name": "Nemotron 3.5 Content Safety Free",
    "nameKo": "Nemotron 3.5 Content Safety Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3.5-content-safety:free",
    "description": "Nemotron 3.5 Content Safety Free: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 NVIDIA 모델",
    "quote": "Nemotron 3.5 Content Safety Free 기준으로 리스크 확인·품질 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "표나 차트의 핵심만 설명해줘",
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "Nemotron 3.5 Content Safety Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3.5 Content Safety Free 모델입니다. 추론, 오픈웨이트, 시각입력, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "무료"
    ],
    "modelInfo": {
      "provider": "NVIDIA",
      "contextLength": 128000,
      "inputModalities": [
        "text",
        "image"
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
    "id": "or-minimax-minimax-m2-1",
    "name": "MiniMax M2.1",
    "nameKo": "MiniMax M2.1",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m2.1",
    "description": "MiniMax M2.1: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 MiniMax 모델",
    "quote": "MiniMax M2.1 기준으로 긴 문서 흐름·품질 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "MiniMax M2.1가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "MiniMax의 MiniMax M2.1 모델입니다. 추론, 코딩, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "고속"
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
    "description": "Mistral Large 2407: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Mistral AI 모델",
    "quote": "Mistral Large 2407 기준으로 언어 뉘앙스·품질 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "API 응답 형식을 검토하고 개선안을 줘",
      "Mistral Large 2407가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Mistral AI의 Mistral Large 2407 모델입니다. 추론, 코딩, 오픈웨이트, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "툴사용"
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
    "description": "GLM 5 Turbo: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Z.ai 모델",
    "quote": "GLM 5 Turbo 기준으로 표현 다듬기·품질 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "이 결론의 논리적 약점을 찾아줘",
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "GLM 5 Turbo로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Z.ai의 GLM 5 Turbo 모델입니다. 추론, 오픈웨이트, 고속, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "고속",
      "중국어"
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
    "description": "Mistral Medium 3: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Mistral AI 모델",
    "quote": "Mistral Medium 3 기준으로 수치 검증·품질 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Mistral Medium 3로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Mistral AI의 Mistral Medium 3 모델입니다. 추론, 오픈웨이트, 시각입력, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "툴사용"
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
    "description": "Nemotron 3 Nano Omni Free: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 NVIDIA 모델",
    "quote": "Nemotron 3 Nano Omni Free 기준으로 문서 화면·품질 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "Nemotron 3 Nano Omni Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Nano Omni Free 모델입니다. 추론, 오픈웨이트, 시각입력, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "무료"
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
    "description": "Nemotron 3 Super Free: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 NVIDIA 모델",
    "quote": "Nemotron 3 Super Free 기준으로 오픈 활용·품질 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "Nemotron 3 Super Free로 복잡한 판단을 단계별로 풀어줘",
      "의사결정 트레이드오프를 정리해줘",
      "Nemotron 3 Super Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Super Free 모델입니다. 추론, 오픈웨이트, 장문맥, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "장문맥",
      "무료"
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
    "description": "MiniMax M2: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 MiniMax 모델",
    "quote": "MiniMax M2 기준으로 실무 적용·품질 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "MiniMax M2가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "MiniMax M2가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "MiniMax의 MiniMax M2 모델입니다. 추론, 코딩, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "고속"
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
    "description": "R1 0528: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 DeepSeek 모델",
    "quote": "R1 0528 기준으로 핵심 압축·품질 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "이 결론의 논리적 약점을 찾아줘",
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "R1 0528로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "DeepSeek의 R1 0528 모델입니다. 추론, 오픈웨이트, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "툴사용",
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
    "description": "Mistral Small 3.1 24B: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Mistral AI 모델",
    "quote": "Mistral Small 3.1 24B 기준으로 구조 검토·비교 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "Mistral Small 3.1 24B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Mistral AI의 Mistral Small 3.1 24B 모델입니다. 추론, 오픈웨이트, 시각입력, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "저비용"
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
    "description": "Seed 1.6: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 ByteDance Seed 모델",
    "quote": "Seed 1.6 기준으로 근거 정리·비교 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Seed 1.6로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "ByteDance Seed의 Seed 1.6 모델입니다. 추론, 시각입력, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "시각입력",
      "툴사용",
      "구조화"
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
    "description": "GLM 4.6V: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Z.ai 모델",
    "quote": "GLM 4.6V 기준으로 문맥 해석·비교 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "GLM 4.6V로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Z.ai의 GLM 4.6V 모델입니다. 추론, 오픈웨이트, 시각입력, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "저비용"
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
    "description": "R1 Distill Qwen 32B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 DeepSeek 모델",
    "quote": "R1 Distill Qwen 32B 기준으로 전제 점검·비교 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "반례를 먼저 생각하고 답해줘",
      "선택지를 기준별로 점수화해줘",
      "R1 Distill Qwen 32B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "DeepSeek의 R1 Distill Qwen 32B 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "중국어"
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
    "description": "R1 Distill Llama 70B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 DeepSeek 모델",
    "quote": "R1 Distill Llama 70B 기준으로 실행 순서·비교 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "이 결론의 논리적 약점을 찾아줘",
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "R1 Distill Llama 70B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "DeepSeek의 R1 Distill Llama 70B 모델입니다. 추론, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "범용"
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
    "description": "Sonar Deep Research: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Perplexity 계열 검색 모델",
    "quote": "Sonar Deep Research 기준으로 비용 균형·비교 기준까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "팩트체크할 쟁점을 먼저 나눠줘",
      "서로 다른 자료의 관점 차이를 정리해줘",
      "Sonar Deep Research로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Perplexity의 Sonar Deep Research 모델입니다. 추론, 검색, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "범용"
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
    "id": "or-nvidia-nemotron-nano-12b-v2-vl-free",
    "name": "Nemotron Nano 12B 2 VL Free",
    "nameKo": "Nemotron Nano 12B 2 VL Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-nano-12b-v2-vl:free",
    "description": "Nemotron Nano 12B 2 VL Free: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 NVIDIA 모델",
    "quote": "Nemotron Nano 12B 2 VL Free 기준으로 응답 속도·비교 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Nemotron Nano 12B 2 VL Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "NVIDIA의 Nemotron Nano 12B 2 VL Free 모델입니다. 추론, 오픈웨이트, 시각입력, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "무료"
    ],
    "modelInfo": {
      "provider": "NVIDIA",
      "contextLength": 128000,
      "inputModalities": [
        "image",
        "text",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "free",
      "createdAt": "2025-10-28",
      "openWeight": true
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
    "description": "DeepSeek V3: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 DeepSeek 모델",
    "quote": "DeepSeek V3 기준으로 도구 활용·비교 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "DeepSeek V3가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3 모델입니다. 코딩, 오픈웨이트, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-z-ai-glm-4-5v",
    "name": "GLM 4.5V",
    "nameKo": "GLM 4.5V",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.5v",
    "description": "GLM 4.5V: 일반 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Z.ai 모델",
    "quote": "GLM 4.5V 기준으로 코드 경계·비교 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "스크린샷 속 문제점을 찾아줘",
      "GLM 4.5V로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Z.ai의 GLM 4.5V 모델입니다. 추론, 오픈웨이트, 시각입력, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "중국어"
    ],
    "modelInfo": {
      "provider": "Z.ai",
      "contextLength": 65536,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-08-11",
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
    "description": "Mistral Large: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Mistral AI 모델",
    "quote": "Mistral Large 기준으로 자료 요약·비교 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Mistral Large가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Mistral Large가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Mistral AI의 Mistral Large 모델입니다. 추론, 코딩, 오픈웨이트, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "툴사용"
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
    "id": "or-mistralai-ministral-3b-2512",
    "name": "Ministral 3 3B 2512",
    "nameKo": "Ministral 3 3B 2512",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/ministral-3b-2512",
    "description": "Ministral 3 3B 2512: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Mistral AI 모델",
    "quote": "Ministral 3 3B 2512 기준으로 대안 비교·비교 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "Ministral 3 3B 2512로 이미지와 문서를 함께 분석해줘",
      "문서 이미지에서 결정해야 할 항목을 뽑아줘",
      "Ministral 3 3B 2512로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "Mistral AI의 Ministral 3 3B 2512 모델입니다. 오픈웨이트, 시각입력, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "Mistral AI",
      "contextLength": 131072,
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
    "id": "or-liquid-lfm-2-5-1-2b-thinking-free",
    "name": "LFM2.5-1.2B-Thinking Free",
    "nameKo": "LFM2.5-1.2B-Thinking Free",
    "icon": "💧",
    "avatarUrl": "/logos/openrouter/liquid.png",
    "color": "cyan",
    "category": "ai",
    "openrouterModel": "liquid/lfm-2.5-1.2b-thinking:free",
    "description": "LFM2.5-1.2B-Thinking Free: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Liquid AI 모델",
    "quote": "LFM2.5-1.2B-Thinking Free 기준으로 리스크 확인·비교 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "LFM2.5-1.2B-Thinking Free가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "LFM2.5-1.2B-Thinking Free가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Liquid AI의 LFM2.5-1.2B-Thinking Free 모델입니다. 추론, 코딩, 오픈웨이트, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "무료"
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
    "description": "Claude 3 Haiku: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Anthropic 모델",
    "quote": "Claude 3 Haiku 기준으로 긴 문서 흐름·비교 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "표나 차트의 핵심만 설명해줘",
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "Claude 3 Haiku로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "Anthropic의 Claude 3 Haiku 모델입니다. 시각입력, 저비용, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
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
    "description": "MiniMax M1: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 MiniMax 모델",
    "quote": "MiniMax M1 기준으로 언어 뉘앙스·비교 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "MiniMax M1로 복잡한 판단을 단계별로 풀어줘",
      "MiniMax M1로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "MiniMax의 MiniMax M1 모델입니다. 추론, 장문맥, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "장문맥",
      "고속",
      "툴사용"
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
    "description": "Gemma 3n 4B: 배포 유연성과 커스터마이징 여지가 있는 Google 오픈웨이트 모델",
    "quote": "Gemma 3n 4B 기준으로 표현 다듬기·비교 기준까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "우선순위를 정하고 이유를 말해줘",
      "장단점을 표로 비교해줘",
      "Gemma 3n 4B의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Google의 Gemma 3n 4B 모델입니다. 오픈웨이트, 저비용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용"
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
    "description": "Mistral Small 3.2 24B: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Mistral AI 모델",
    "quote": "Mistral Small 3.2 24B 기준으로 수치 검증·비교 기준까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "스크린샷 속 문제점을 찾아줘",
      "표나 차트의 핵심만 설명해줘",
      "Mistral Small 3.2 24B로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "Mistral AI의 Mistral Small 3.2 24B 모델입니다. 오픈웨이트, 시각입력, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
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
    "description": "GLM 4.6: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Z.ai 모델",
    "quote": "GLM 4.6 기준으로 문서 화면·비교 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "반례를 먼저 생각하고 답해줘",
      "선택지를 기준별로 점수화해줘",
      "GLM 4.6로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Z.ai의 GLM 4.6 모델입니다. 추론, 오픈웨이트, 중국어, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "중국어",
      "툴사용"
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
    "description": "KAT-Coder-Pro V2: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 KwaiPilot 모델",
    "quote": "KAT-Coder-Pro V2 기준으로 오픈 활용·비교 기준까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "KAT-Coder-Pro V2가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "KwaiPilot의 KAT-Coder-Pro V2 모델입니다. 추론, 코딩, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "툴사용"
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
    "description": "Llama 3.2 3B Instruct Free: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Meta 모델",
    "quote": "Llama 3.2 3B Instruct Free 기준으로 실무 적용·비교 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "의사결정 트레이드오프를 정리해줘",
      "반례를 먼저 생각하고 답해줘",
      "Llama 3.2 3B Instruct Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Meta의 Llama 3.2 3B Instruct Free 모델입니다. 추론, 오픈웨이트, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "무료"
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
    "description": "Nemotron Nano 9B V2 Free: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 NVIDIA 모델",
    "quote": "Nemotron Nano 9B V2 Free 기준으로 핵심 압축·비교 기준까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "선택지를 기준별로 점수화해줘",
      "이 결론의 논리적 약점을 찾아줘",
      "Nemotron Nano 9B V2 Free로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "NVIDIA의 Nemotron Nano 9B V2 Free 모델입니다. 추론, 오픈웨이트, 무료, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "무료",
      "고속"
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
    "description": "GLM 4.5: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Z.ai 모델",
    "quote": "GLM 4.5 기준으로 구조 검토·안전한 선택지까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "선택지를 기준별로 점수화해줘",
      "이 결론의 논리적 약점을 찾아줘",
      "GLM 4.5로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Z.ai의 GLM 4.5 모델입니다. 추론, 오픈웨이트, 중국어, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "중국어",
      "툴사용"
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
    "description": "GLM 4.5 Air: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Z.ai 모델",
    "quote": "GLM 4.5 Air 기준으로 근거 정리·안전한 선택지까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "GLM 4.5 Air로 복잡한 판단을 단계별로 풀어줘",
      "의사결정 트레이드오프를 정리해줘",
      "GLM 4.5 Air로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Z.ai의 GLM 4.5 Air 모델입니다. 추론, 오픈웨이트, 저비용, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "중국어"
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
    "description": "Kimi K2 0905: Moonshot AI의 대용량 문맥 기반 범용 대화 모델",
    "quote": "Kimi K2 0905 기준으로 문맥 해석·안전한 선택지까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "Kimi K2 0905의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "Moonshot AI의 Kimi K2 0905를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2 0905 모델입니다. 중국어, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "중국어",
      "툴사용",
      "구조화"
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
    "description": "Voxtral Small 24B 2507: 빠른 응답과 낮은 비용을 우선한 Mistral AI 경량 모델",
    "quote": "Voxtral Small 24B 2507 기준으로 전제 점검·안전한 선택지까지 빠르게 정리하겠습니다",
    "sampleQuestions": [
      "우선순위를 정하고 이유를 말해줘",
      "장단점을 표로 비교해줘",
      "Voxtral Small 24B 2507의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Mistral AI의 Voxtral Small 24B 2507 모델입니다. 오픈웨이트, 저비용, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
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
    "description": "Rnj 1 Instruct: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Essential AI 모델",
    "quote": "Rnj 1 Instruct 기준으로 실행 순서·안전한 선택지까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "Rnj 1 Instruct가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Essential AI의 Rnj 1 Instruct 모델입니다. 추론, 코딩, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "툴사용"
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
    "description": "Command R7B (12-2024): 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Cohere 모델",
    "quote": "Command R7B (12-2024) 기준으로 비용 균형·안전한 선택지까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "이 결론의 논리적 약점을 찾아줘",
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "Command R7B (12-2024)로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Cohere의 Command R7B (12-2024) 모델입니다. 추론, 저비용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "구조화"
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
    "description": "Reka Flash 3: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Reka AI 모델",
    "quote": "Reka Flash 3 기준으로 응답 속도·안전한 선택지까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "API 응답 형식을 검토하고 개선안을 줘",
      "버그 원인을 재현 단계부터 찾아줘",
      "Reka Flash 3가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Reka AI의 Reka Flash 3 모델입니다. 추론, 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "id": "or-meta-llama-llama-3-2-11b-vision-instruct",
    "name": "Llama 3.2 11B Vision Instruct",
    "nameKo": "Llama 3.2 11B Vision Instruct",
    "icon": "🌐",
    "avatarUrl": "/logos/meta.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "meta-llama/llama-3.2-11b-vision-instruct",
    "description": "Llama 3.2 11B Vision Instruct: 128K급 장문에서 이미지, 표, 문서 화면을 함께 읽어내는 Meta 모델",
    "quote": "Llama 3.2 11B Vision Instruct 기준으로 도구 활용·안전한 선택지까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "이미지에서 중요한 정보를 뽑아줘",
      "Llama 3.2 11B Vision Instruct로 이미지와 문서를 함께 분석해줘",
      "Llama 3.2 11B Vision Instruct로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "Meta의 Llama 3.2 11B Vision Instruct 모델입니다. 오픈웨이트, 시각입력, 저비용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Meta",
      "contextLength": 131072,
      "inputModalities": [
        "text",
        "image"
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
    "id": "or-amazon-nova-lite-v1",
    "name": "Nova Lite 1.0",
    "nameKo": "Nova Lite 1.0",
    "icon": "📦",
    "avatarUrl": "/logos/amazon.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "amazon/nova-lite-v1",
    "description": "Nova Lite 1.0: 대용량 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Amazon 모델",
    "quote": "Nova Lite 1.0 기준으로 코드 경계·안전한 선택지까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "이미지에서 중요한 정보를 뽑아줘",
      "Nova Lite 1.0로 이미지와 문서를 함께 분석해줘",
      "Nova Lite 1.0로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "Amazon의 Nova Lite 1.0 모델입니다. 시각입력, 저비용, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
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
    "description": "Gemma 2 27B: 배포 유연성과 커스터마이징 여지가 있는 Google 오픈웨이트 모델",
    "quote": "Gemma 2 27B 기준으로 자료 요약·안전한 선택지까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "Gemma 2 27B의 추천 사용 사례를 정리해줘",
      "Gemma 2 27B의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Google의 Gemma 2 27B 모델입니다. 오픈웨이트, 저비용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화"
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
    "description": "Mixtral 8x22B Instruct: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Mistral AI 모델",
    "quote": "Mixtral 8x22B Instruct 기준으로 대안 비교·안전한 선택지까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Mixtral 8x22B Instruct가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Mixtral 8x22B Instruct가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Mistral AI의 Mixtral 8x22B Instruct 모델입니다. 코딩, 오픈웨이트, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-minimax-minimax-01",
    "name": "MiniMax-01",
    "nameKo": "MiniMax-01",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-01",
    "description": "MiniMax-01: 1M급 초장문에서 이미지, 표, 문서 화면을 함께 읽어내는 MiniMax 모델",
    "quote": "MiniMax-01 기준으로 리스크 확인·안전한 선택지까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "MiniMax-01로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "MiniMax의 MiniMax-01 모델입니다. 시각입력, 장문맥, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "시각입력",
      "장문맥",
      "저비용",
      "고속"
    ],
    "modelInfo": {
      "provider": "MiniMax",
      "contextLength": 1000192,
      "inputModalities": [
        "text",
        "image"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-01-15",
      "openWeight": false
    }
  },
  {
    "id": "or-aion-labs-aion-1-0",
    "name": "Aion-1.0",
    "nameKo": "Aion-1.0",
    "icon": "🧠",
    "avatarUrl": "/logos/openrouter/aion-labs.png",
    "color": "violet",
    "category": "ai",
    "openrouterModel": "aion-labs/aion-1.0",
    "description": "Aion-1.0: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Aion Labs 모델",
    "quote": "Aion-1.0 기준으로 긴 문서 흐름·안전한 선택지까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Aion-1.0가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Aion Labs의 Aion-1.0 모델입니다. 추론, 코딩, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "범용"
    ],
    "modelInfo": {
      "provider": "Aion Labs",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "premium",
      "createdAt": "2025-02-04",
      "openWeight": false
    }
  },
  {
    "id": "or-aion-labs-aion-1-0-mini",
    "name": "Aion-1.0-Mini",
    "nameKo": "Aion-1.0-Mini",
    "icon": "🧠",
    "avatarUrl": "/logos/openrouter/aion-labs.png",
    "color": "violet",
    "category": "ai",
    "openrouterModel": "aion-labs/aion-1.0-mini",
    "description": "Aion-1.0-Mini: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Aion Labs 모델",
    "quote": "Aion-1.0-Mini 기준으로 언어 뉘앙스·안전한 선택지까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Aion-1.0-Mini가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Aion-1.0-Mini가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Aion Labs의 Aion-1.0-Mini 모델입니다. 추론, 코딩, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "고속"
    ],
    "modelInfo": {
      "provider": "Aion Labs",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-02-04",
      "openWeight": false
    }
  },
  {
    "id": "or-nousresearch-hermes-3-llama-3-1-70b",
    "name": "Hermes 3 70B Instruct",
    "nameKo": "Hermes 3 70B Instruct",
    "icon": "🧪",
    "avatarUrl": "/logos/nous.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "nousresearch/hermes-3-llama-3.1-70b",
    "description": "Hermes 3 70B Instruct: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Nous Research 계열 검색 모델",
    "quote": "Hermes 3 70B Instruct 기준으로 표현 다듬기·안전한 선택지까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 요약해줘",
      "Hermes 3 70B Instruct로 최신 이슈를 출처와 함께 점검해줘",
      "Hermes 3 70B Instruct로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Nous Research의 Hermes 3 70B Instruct 모델입니다. 추론, 검색, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "오픈웨이트",
      "저비용"
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
      "createdAt": "2024-08-18",
      "openWeight": true
    }
  },
  {
    "id": "or-nousresearch-hermes-3-llama-3-1-405b",
    "name": "Hermes 3 405B Instruct",
    "nameKo": "Hermes 3 405B Instruct",
    "icon": "🧪",
    "avatarUrl": "/logos/nous.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "nousresearch/hermes-3-llama-3.1-405b",
    "description": "Hermes 3 405B Instruct: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Nous Research 계열 검색 모델",
    "quote": "Hermes 3 405B Instruct 기준으로 수치 검증·안전한 선택지까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 요약해줘",
      "Hermes 3 405B Instruct로 최신 이슈를 출처와 함께 점검해줘",
      "Hermes 3 405B Instruct로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Nous Research의 Hermes 3 405B Instruct 모델입니다. 추론, 검색, 오픈웨이트, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "오픈웨이트",
      "구조화"
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
      "createdAt": "2024-08-16",
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
    "description": "Trinity Mini: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Arcee AI 모델",
    "quote": "Trinity Mini 기준으로 문서 화면·안전한 선택지까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "Trinity Mini로 복잡한 판단을 단계별로 풀어줘",
      "의사결정 트레이드오프를 정리해줘",
      "Trinity Mini로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Arcee AI의 Trinity Mini 모델입니다. 추론, 오픈웨이트, 저비용, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "고속"
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
    "id": "or-aion-labs-aion-2-0",
    "name": "Aion-2.0",
    "nameKo": "Aion-2.0",
    "icon": "🧠",
    "avatarUrl": "/logos/openrouter/aion-labs.png",
    "color": "violet",
    "category": "ai",
    "openrouterModel": "aion-labs/aion-2.0",
    "description": "Aion-2.0: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Aion Labs 모델",
    "quote": "Aion-2.0 기준으로 오픈 활용·안전한 선택지까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "Aion-2.0로 복잡한 판단을 단계별로 풀어줘",
      "의사결정 트레이드오프를 정리해줘",
      "Aion-2.0로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Aion Labs의 Aion-2.0 모델입니다. 추론, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Aion Labs",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2026-02-23",
      "openWeight": false
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
    "description": "Hermes 4 70B: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Nous Research 계열 검색 모델",
    "quote": "Hermes 4 70B 기준으로 실무 적용·안전한 선택지까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "시장 동향을 핵심 수치 중심으로 찾아줘",
      "팩트체크할 쟁점을 먼저 나눠줘",
      "Hermes 4 70B로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Nous Research의 Hermes 4 70B 모델입니다. 추론, 검색, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "오픈웨이트",
      "저비용"
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
    "description": "Hermes 4 405B: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Nous Research 계열 검색 모델",
    "quote": "Hermes 4 405B 기준으로 핵심 압축·안전한 선택지까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 요약해줘",
      "Hermes 4 405B로 최신 이슈를 출처와 함께 점검해줘",
      "Hermes 4 405B로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Nous Research의 Hermes 4 405B 모델입니다. 추론, 검색, 오픈웨이트, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "오픈웨이트",
      "구조화"
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
    "description": "Morph V3 Large: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Morph 모델",
    "quote": "Morph V3 Large 기준으로 구조 검토·결론의 근거까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "Morph V3 Large가 잘 맞는 개발 작업을 예시로 비교해줘",
      "성능 병목 가능성을 짚어줘",
      "Morph V3 Large가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Morph의 Morph V3 Large 모델입니다. 코딩, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "범용",
      "업무"
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
    "id": "or-mistralai-mistral-saba",
    "name": "Saba",
    "nameKo": "Saba",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-saba",
    "description": "Saba: 배포 유연성과 커스터마이징 여지가 있는 Mistral AI 오픈웨이트 모델",
    "quote": "Saba 기준으로 근거 정리·결론의 근거까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "우선순위를 정하고 이유를 말해줘",
      "장단점을 표로 비교해줘",
      "Saba의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Mistral AI의 Saba 모델입니다. 오픈웨이트, 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-nousresearch-hermes-3-llama-3-1-405b-free",
    "name": "Hermes 3 405B Instruct Free",
    "nameKo": "Hermes 3 405B Instruct Free",
    "icon": "🧪",
    "avatarUrl": "/logos/nous.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "nousresearch/hermes-3-llama-3.1-405b:free",
    "description": "Hermes 3 405B Instruct Free: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Nous Research 계열 검색 모델",
    "quote": "Hermes 3 405B Instruct Free 기준으로 문맥 해석·결론의 근거까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 요약해줘",
      "Hermes 3 405B Instruct Free로 최신 이슈를 출처와 함께 점검해줘",
      "Hermes 3 405B Instruct Free로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Nous Research의 Hermes 3 405B Instruct Free 모델입니다. 추론, 검색, 오픈웨이트, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "검색",
      "오픈웨이트",
      "무료"
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
      "priceTier": "free",
      "createdAt": "2024-08-16",
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
    "description": "Llama 3.3 70B Instruct: 배포 유연성과 커스터마이징 여지가 있는 Meta 오픈웨이트 모델",
    "quote": "Llama 3.3 70B Instruct 기준으로 전제 점검·결론의 근거까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "우선순위를 정하고 이유를 말해줘",
      "장단점을 표로 비교해줘",
      "Llama 3.3 70B Instruct의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Meta의 Llama 3.3 70B Instruct 모델입니다. 오픈웨이트, 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "description": "Mistral Small 3: 빠른 응답과 낮은 비용을 우선한 Mistral AI 경량 모델",
    "quote": "Mistral Small 3 기준으로 실행 순서·결론의 근거까지 빠르게 정리하겠습니다",
    "sampleQuestions": [
      "장단점을 표로 비교해줘",
      "실행 가능한 계획으로 정리해줘",
      "Mistral Small 3의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Mistral AI의 Mistral Small 3 모델입니다. 오픈웨이트, 저비용, 고속, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "description": "Ling-2.6-1T: 배포 유연성과 커스터마이징 여지가 있는 InclusionAI 오픈웨이트 모델",
    "quote": "Ling-2.6-1T 기준으로 비용 균형·결론의 근거까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "Ling-2.6-1T의 추천 사용 사례를 정리해줘",
      "Ling-2.6-1T의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "InclusionAI의 Ling-2.6-1T 모델입니다. 오픈웨이트, 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "description": "Ling-2.6-flash: 빠른 응답과 낮은 비용을 우선한 InclusionAI 경량 모델",
    "quote": "Ling-2.6-flash 기준으로 응답 속도·결론의 근거까지 빠르게 정리하겠습니다",
    "sampleQuestions": [
      "우선순위를 정하고 이유를 말해줘",
      "장단점을 표로 비교해줘",
      "Ling-2.6-flash의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "InclusionAI의 Ling-2.6-flash 모델입니다. 오픈웨이트, 저비용, 고속, 툴사용 작업에 맞춰 도와드리겠습니다",
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
    "id": "or-rekaai-reka-edge",
    "name": "Reka Edge",
    "nameKo": "Reka Edge",
    "icon": "✨",
    "avatarUrl": "/logos/openrouter/rekaai.png",
    "color": "pink",
    "category": "ai",
    "openrouterModel": "rekaai/reka-edge",
    "description": "Reka Edge: 일반 문맥에서 이미지, 표, 문서 화면을 함께 읽어내는 Reka AI 모델",
    "quote": "Reka Edge 기준으로 도구 활용·결론의 근거까지 보이는 정보와 함께 읽겠습니다",
    "sampleQuestions": [
      "화면 내용을 읽고 작업 순서로 정리해줘",
      "이미지에서 중요한 정보를 뽑아줘",
      "Reka Edge로 이미지와 문서를 함께 분석해줘"
    ],
    "greeting": "Reka AI의 Reka Edge 모델입니다. 오픈웨이트, 시각입력, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "시각입력",
      "저비용",
      "툴사용"
    ],
    "modelInfo": {
      "provider": "Reka AI",
      "contextLength": 16384,
      "inputModalities": [
        "image",
        "text",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-03-20",
      "openWeight": true
    }
  },
  {
    "id": "or-minimax-minimax-m2-her",
    "name": "MiniMax M2-her",
    "nameKo": "MiniMax M2-her",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m2-her",
    "description": "MiniMax M2-her: 빠른 응답과 낮은 비용을 우선한 MiniMax 경량 모델",
    "quote": "MiniMax M2-her 기준으로 코드 경계·결론의 근거까지 빠르게 정리하겠습니다",
    "sampleQuestions": [
      "실행 가능한 계획으로 정리해줘",
      "핵심만 빠르게 요약해줘",
      "MiniMax의 MiniMax M2-her를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "MiniMax의 MiniMax M2-her 모델입니다. 저비용, 고속, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "고속",
      "범용"
    ],
    "modelInfo": {
      "provider": "MiniMax",
      "contextLength": 65536,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2026-01-23",
      "openWeight": false
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
    "description": "Kimi K2 0711: Moonshot AI의 128K급 장문 기반 범용 대화 모델",
    "quote": "Kimi K2 0711 기준으로 자료 요약·결론의 근거까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "Kimi K2 0711의 추천 사용 사례를 정리해줘",
      "Moonshot AI의 Kimi K2 0711를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2 0711 모델입니다. 중국어, 툴사용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "중국어",
      "툴사용",
      "범용"
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
    "description": "INTELLECT-3: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Prime Intellect 모델",
    "quote": "INTELLECT-3 기준으로 대안 비교·결론의 근거까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "반례를 먼저 생각하고 답해줘",
      "선택지를 기준별로 점수화해줘",
      "INTELLECT-3로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Prime Intellect의 INTELLECT-3 모델입니다. 추론, 오픈웨이트, 저비용, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "툴사용"
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
    "description": "Olmo 3 32B Think: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Ai2 모델",
    "quote": "Olmo 3 32B Think 기준으로 리스크 확인·결론의 근거까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "이 결론의 논리적 약점을 찾아줘",
      "복잡한 문제를 전제부터 단계별로 풀어줘",
      "Olmo 3 32B Think로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Ai2의 Olmo 3 32B Think 모델입니다. 추론, 오픈웨이트, 저비용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "구조화"
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
    "description": "Llama 3.3 70B Instruct Free: 배포 유연성과 커스터마이징 여지가 있는 Meta 오픈웨이트 모델",
    "quote": "Llama 3.3 70B Instruct Free 기준으로 긴 문서 흐름·결론의 근거까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "Llama 3.3 70B Instruct Free의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "Llama 3.3 70B Instruct Free의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Meta의 Llama 3.3 70B Instruct Free 모델입니다. 오픈웨이트, 무료, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "무료",
      "툴사용"
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
    "description": "Llama 3.2 1B Instruct: 배포 유연성과 커스터마이징 여지가 있는 Meta 오픈웨이트 모델",
    "quote": "Llama 3.2 1B Instruct 기준으로 언어 뉘앙스·결론의 근거까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "Llama 3.2 1B Instruct의 추천 사용 사례를 정리해줘",
      "Llama 3.2 1B Instruct의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Meta의 Llama 3.2 1B Instruct 모델입니다. 오픈웨이트, 저비용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용"
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
    "description": "Cogito v2.1 671B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Deep Cogito 모델",
    "quote": "Cogito v2.1 671B 기준으로 표현 다듬기·결론의 근거까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "선택지를 기준별로 점수화해줘",
      "이 결론의 논리적 약점을 찾아줘",
      "Cogito v2.1 671B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Deep Cogito의 Cogito v2.1 671B 모델입니다. 추론, 오픈웨이트, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "구조화"
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
    "description": "Llama 3.1 8B Instruct: 배포 유연성과 커스터마이징 여지가 있는 Meta 오픈웨이트 모델",
    "quote": "Llama 3.1 8B Instruct 기준으로 수치 검증·결론의 근거까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "Llama 3.1 8B Instruct의 추천 사용 사례를 정리해줘",
      "Llama 3.1 8B Instruct의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Meta의 Llama 3.1 8B Instruct 모델입니다. 오픈웨이트, 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "description": "Llama 3.1 70B Instruct: 배포 유연성과 커스터마이징 여지가 있는 Meta 오픈웨이트 모델",
    "quote": "Llama 3.1 70B Instruct 기준으로 문서 화면·결론의 근거까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "Llama 3.1 70B Instruct의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "Llama 3.1 70B Instruct의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Meta의 Llama 3.1 70B Instruct 모델입니다. 오픈웨이트, 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "description": "Virtuoso Large: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Arcee AI 모델",
    "quote": "Virtuoso Large 기준으로 오픈 활용·결론의 근거까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "반례를 먼저 생각하고 답해줘",
      "선택지를 기준별로 점수화해줘",
      "Virtuoso Large로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Arcee AI의 Virtuoso Large 모델입니다. 추론, 오픈웨이트, 툴사용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "툴사용"
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
    "description": "Relace Search: 출처 확인, 최신 이슈 비교, 근거 요약에 맞춘 Relace 계열 검색 모델",
    "quote": "Relace Search 기준으로 실무 적용·결론의 근거까지 근거 중심으로 보겠습니다",
    "sampleQuestions": [
      "서로 다른 자료의 관점 차이를 정리해줘",
      "이 주장에 대한 출처를 비교해줘",
      "Relace Search로 최신 이슈를 출처와 함께 점검해줘"
    ],
    "greeting": "Relace의 Relace Search 모델입니다. 검색, 툴사용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "검색",
      "툴사용",
      "범용"
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
    "description": "Coder Large: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Arcee AI 모델",
    "quote": "Coder Large 기준으로 핵심 압축·결론의 근거까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "버그 원인을 재현 단계부터 찾아줘",
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Coder Large가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Arcee AI의 Coder Large 모델입니다. 코딩, 오픈웨이트, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "오픈웨이트",
      "저비용"
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
    "description": "Mistral Nemo: 배포 유연성과 커스터마이징 여지가 있는 Mistral AI 오픈웨이트 모델",
    "quote": "Mistral Nemo 기준으로 구조 검토·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "우선순위를 정하고 이유를 말해줘",
      "장단점을 표로 비교해줘",
      "Mistral Nemo의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Mistral AI의 Mistral Nemo 모델입니다. 오픈웨이트, 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
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
    "description": "Llama 3 8B Instruct: 배포 유연성과 커스터마이징 여지가 있는 Meta 오픈웨이트 모델",
    "quote": "Llama 3 8B Instruct 기준으로 근거 정리·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "실행 가능한 계획으로 정리해줘",
      "핵심만 빠르게 요약해줘",
      "Llama 3 8B Instruct의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Meta의 Llama 3 8B Instruct 모델입니다. 오픈웨이트, 저비용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용"
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
    "description": "Llama 3 70B Instruct: 배포 유연성과 커스터마이징 여지가 있는 Meta 오픈웨이트 모델",
    "quote": "Llama 3 70B Instruct 기준으로 문맥 해석·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "장단점을 표로 비교해줘",
      "실행 가능한 계획으로 정리해줘",
      "Llama 3 70B Instruct의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Meta의 Llama 3 70B Instruct 모델입니다. 오픈웨이트, 저비용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화"
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
    "description": "Morph V3 Fast: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Morph 모델",
    "quote": "Morph V3 Fast 기준으로 전제 점검·다음 행동까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 더 단순하게 리팩터링해줘",
      "Morph V3 Fast가 잘 맞는 개발 작업을 예시로 비교해줘",
      "Morph V3 Fast가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Morph의 Morph V3 Fast 모델입니다. 코딩, 고속, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "고속",
      "범용"
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
    "description": "Relace Apply 3: 코드 구조 파악, 수정안 제안, 테스트 관점 점검에 강한 Relace 모델",
    "quote": "Relace Apply 3 기준으로 실행 순서·다음 행동까지 개발 맥락에서 짚겠습니다",
    "sampleQuestions": [
      "성능 병목 가능성을 짚어줘",
      "테스트 케이스에서 빠진 경계를 찾아줘",
      "Relace Apply 3가 잘 맞는 개발 작업을 예시로 비교해줘"
    ],
    "greeting": "Relace의 Relace Apply 3 모델입니다. 코딩, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "범용",
      "업무"
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
    "description": "LFM2-24B-A2B: 배포 유연성과 커스터마이징 여지가 있는 Liquid AI 오픈웨이트 모델",
    "quote": "LFM2-24B-A2B 기준으로 비용 균형·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "LFM2-24B-A2B의 추천 사용 사례를 정리해줘",
      "LFM2-24B-A2B의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Liquid AI의 LFM2-24B-A2B 모델입니다. 오픈웨이트, 저비용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용"
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
    "description": "Nova Micro 1.0: Amazon의 128K급 장문 기반 범용 대화 모델",
    "quote": "Nova Micro 1.0 기준으로 응답 속도·다음 행동까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "장단점을 표로 비교해줘",
      "실행 가능한 계획으로 정리해줘",
      "Amazon의 Nova Micro 1.0를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "Amazon의 Nova Micro 1.0 모델입니다. 저비용, 툴사용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "툴사용",
      "범용"
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
    "id": "or-switchpoint-router",
    "name": "Switchpoint Router",
    "nameKo": "Switchpoint Router",
    "icon": "🔀",
    "avatarUrl": "/logos/openrouter/switchpoint.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "switchpoint/router",
    "description": "Switchpoint Router: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Switchpoint 모델",
    "quote": "Switchpoint Router 기준으로 도구 활용·다음 행동까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "선택지를 기준별로 점수화해줘",
      "이 결론의 논리적 약점을 찾아줘",
      "Switchpoint Router로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Switchpoint의 Switchpoint Router 모델입니다. 추론, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Switchpoint",
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
    "id": "or-liquid-lfm-2-5-1-2b-instruct-free",
    "name": "LFM2.5-1.2B-Instruct Free",
    "nameKo": "LFM2.5-1.2B-Instruct Free",
    "icon": "💧",
    "avatarUrl": "/logos/openrouter/liquid.png",
    "color": "cyan",
    "category": "ai",
    "openrouterModel": "liquid/lfm-2.5-1.2b-instruct:free",
    "description": "LFM2.5-1.2B-Instruct Free: 배포 유연성과 커스터마이징 여지가 있는 Liquid AI 오픈웨이트 모델",
    "quote": "LFM2.5-1.2B-Instruct Free 기준으로 코드 경계·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "LFM2.5-1.2B-Instruct Free의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "LFM2.5-1.2B-Instruct Free의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Liquid AI의 LFM2.5-1.2B-Instruct Free 모델입니다. 오픈웨이트, 무료, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "무료",
      "범용"
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
    "description": "WizardLM-2 8x22B: 배포 유연성과 커스터마이징 여지가 있는 Microsoft 오픈웨이트 모델",
    "quote": "WizardLM-2 8x22B 기준으로 자료 요약·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "WizardLM-2 8x22B의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "WizardLM-2 8x22B의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Microsoft의 WizardLM-2 8x22B 모델입니다. 오픈웨이트, 저비용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화"
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
    "id": "or-anthracite-org-magnum-v4-72b",
    "name": "Magnum v4 72B",
    "nameKo": "Magnum v4 72B",
    "icon": "🧲",
    "avatarUrl": "/logos/openrouter/anthracite-org.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "anthracite-org/magnum-v4-72b",
    "description": "Magnum v4 72B: 전제 정리, 대안 비교, 단계적 판단에 초점을 둔 Anthracite 모델",
    "quote": "Magnum v4 72B 기준으로 대안 비교·다음 행동까지 차근히 따져보겠습니다",
    "sampleQuestions": [
      "반례를 먼저 생각하고 답해줘",
      "선택지를 기준별로 점수화해줘",
      "Magnum v4 72B로 복잡한 판단을 단계별로 풀어줘"
    ],
    "greeting": "Anthracite의 Magnum v4 72B 모델입니다. 추론, 오픈웨이트, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Anthracite",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2024-10-22",
      "openWeight": true
    }
  },
  {
    "id": "or-aion-labs-aion-rp-llama-3-1-8b",
    "name": "Aion-RP 1.0 (8B)",
    "nameKo": "Aion-RP 1.0 (8B)",
    "icon": "🧠",
    "avatarUrl": "/logos/openrouter/aion-labs.png",
    "color": "violet",
    "category": "ai",
    "openrouterModel": "aion-labs/aion-rp-llama-3.1-8b",
    "description": "Aion-RP 1.0 (8B): 배포 유연성과 커스터마이징 여지가 있는 Aion Labs 오픈웨이트 모델",
    "quote": "Aion-RP 1.0 (8B) 기준으로 리스크 확인·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "실행 가능한 계획으로 정리해줘",
      "핵심만 빠르게 요약해줘",
      "Aion-RP 1.0 (8B)의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Aion Labs의 Aion-RP 1.0 (8B) 모델입니다. 오픈웨이트, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Aion Labs",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-02-04",
      "openWeight": true
    }
  },
  {
    "id": "or-thedrummer-cydonia-24b-v4-1",
    "name": "Cydonia 24B V4.1",
    "nameKo": "Cydonia 24B V4.1",
    "icon": "🎭",
    "avatarUrl": "/logos/openrouter/thedrummer.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "thedrummer/cydonia-24b-v4.1",
    "description": "Cydonia 24B V4.1: TheDrummer의 128K급 장문 기반 범용 대화 모델",
    "quote": "Cydonia 24B V4.1 기준으로 긴 문서 흐름·다음 행동까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "장단점을 표로 비교해줘",
      "실행 가능한 계획으로 정리해줘",
      "TheDrummer의 Cydonia 24B V4.1를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "TheDrummer의 Cydonia 24B V4.1 모델입니다. 저비용, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "TheDrummer",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-09-27",
      "openWeight": false
    }
  },
  {
    "id": "or-thedrummer-skyfall-36b-v2",
    "name": "Skyfall 36B V2",
    "nameKo": "Skyfall 36B V2",
    "icon": "🎭",
    "avatarUrl": "/logos/openrouter/thedrummer.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "thedrummer/skyfall-36b-v2",
    "description": "Skyfall 36B V2: TheDrummer의 일반 문맥 기반 범용 대화 모델",
    "quote": "Skyfall 36B V2 기준으로 언어 뉘앙스·다음 행동까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "Skyfall 36B V2의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "TheDrummer의 Skyfall 36B V2를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "TheDrummer의 Skyfall 36B V2 모델입니다. 저비용, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "TheDrummer",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2025-03-10",
      "openWeight": false
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
    "description": "Inflection 3 Productivity: Inflection AI의 일반 문맥 기반 범용 대화 모델",
    "quote": "Inflection 3 Productivity 기준으로 표현 다듬기·다음 행동까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "장단점을 표로 비교해줘",
      "실행 가능한 계획으로 정리해줘",
      "Inflection AI의 Inflection 3 Productivity를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "Inflection AI의 Inflection 3 Productivity 모델입니다. 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "범용",
      "업무"
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
    "id": "or-inflection-inflection-3-pi",
    "name": "Inflection 3 Pi",
    "nameKo": "Inflection 3 Pi",
    "icon": "💬",
    "avatarUrl": "/logos/openrouter/inflection.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "inflection/inflection-3-pi",
    "description": "Inflection 3 Pi: Inflection AI의 일반 문맥 기반 범용 대화 모델",
    "quote": "Inflection 3 Pi 기준으로 수치 검증·다음 행동까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "Inflection 3 Pi의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "Inflection AI의 Inflection 3 Pi를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "Inflection AI의 Inflection 3 Pi 모델입니다. 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "범용",
      "업무"
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
    "id": "or-sao10k-l3-1-70b-hanami-x1",
    "name": "Llama 3.1 70B Hanami x1",
    "nameKo": "Llama 3.1 70B Hanami x1",
    "icon": "🎨",
    "avatarUrl": "/logos/openrouter/sao10k.png",
    "color": "pink",
    "category": "ai",
    "openrouterModel": "sao10k/l3.1-70b-hanami-x1",
    "description": "Llama 3.1 70B Hanami x1: 배포 유연성과 커스터마이징 여지가 있는 Sao10K 오픈웨이트 모델",
    "quote": "Llama 3.1 70B Hanami x1 기준으로 문서 화면·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "Llama 3.1 70B Hanami x1의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "Llama 3.1 70B Hanami x1의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Sao10K의 Llama 3.1 70B Hanami x1 모델입니다. 오픈웨이트, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "Sao10K",
      "contextLength": 16000,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-01-08",
      "openWeight": true
    }
  },
  {
    "id": "or-sao10k-l3-3-euryale-70b",
    "name": "Llama 3.3 Euryale 70B",
    "nameKo": "Llama 3.3 Euryale 70B",
    "icon": "🎨",
    "avatarUrl": "/logos/openrouter/sao10k.png",
    "color": "pink",
    "category": "ai",
    "openrouterModel": "sao10k/l3.3-euryale-70b",
    "description": "Llama 3.3 Euryale 70B: 배포 유연성과 커스터마이징 여지가 있는 Sao10K 오픈웨이트 모델",
    "quote": "Llama 3.3 Euryale 70B 기준으로 오픈 활용·다음 행동까지 오픈 활용 관점에서 보겠습니다",
    "sampleQuestions": [
      "회의 전에 볼 브리핑으로 만들어줘",
      "우선순위를 정하고 이유를 말해줘",
      "Llama 3.3 Euryale 70B의 오픈웨이트 활용 장단점을 정리해줘"
    ],
    "greeting": "Sao10K의 Llama 3.3 Euryale 70B 모델입니다. 오픈웨이트, 저비용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "오픈웨이트",
      "저비용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "Sao10K",
      "contextLength": 131072,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-12-18",
      "openWeight": true
    }
  },
  {
    "id": "or-thedrummer-unslopnemo-12b",
    "name": "UnslopNemo 12B",
    "nameKo": "UnslopNemo 12B",
    "icon": "🎭",
    "avatarUrl": "/logos/openrouter/thedrummer.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "thedrummer/unslopnemo-12b",
    "description": "UnslopNemo 12B: TheDrummer의 일반 문맥 기반 범용 대화 모델",
    "quote": "UnslopNemo 12B 기준으로 실무 적용·다음 행동까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "UnslopNemo 12B의 추천 사용 사례를 정리해줘",
      "TheDrummer의 UnslopNemo 12B를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "TheDrummer의 UnslopNemo 12B 모델입니다. 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "TheDrummer",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-11-08",
      "openWeight": false
    }
  },
  {
    "id": "or-thedrummer-rocinante-12b",
    "name": "Rocinante 12B",
    "nameKo": "Rocinante 12B",
    "icon": "🎭",
    "avatarUrl": "/logos/openrouter/thedrummer.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "thedrummer/rocinante-12b",
    "description": "Rocinante 12B: TheDrummer의 일반 문맥 기반 범용 대화 모델",
    "quote": "Rocinante 12B 기준으로 핵심 압축·다음 행동까지 균형 있게 정리하겠습니다",
    "sampleQuestions": [
      "Rocinante 12B의 추천 사용 사례를 정리해줘",
      "회의 전에 볼 브리핑으로 만들어줘",
      "TheDrummer의 Rocinante 12B를 언제 쓰면 좋은지 알려줘"
    ],
    "greeting": "TheDrummer의 Rocinante 12B 모델입니다. 저비용, 툴사용, 구조화 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "툴사용",
      "구조화"
    ],
    "modelInfo": {
      "provider": "TheDrummer",
      "contextLength": 32768,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "low",
      "createdAt": "2024-09-30",
      "openWeight": false
    }
  }
] satisfies Expert[];

export const OPENROUTER_ADDED_ABILITIES = {
  "or-google-gemini-3-1-flash-lite": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 98,
    "math": 95,
    "multilingual": 76,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 98
  },
  "or-openai-gpt-5-mini": {
    "coding": 90,
    "creativity": 77,
    "reasoning": 98,
    "math": 88,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 88
  },
  "or-openai-gpt-5-5-pro": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 98
  },
  "or-openai-gpt-5-5": {
    "coding": 98,
    "creativity": 93,
    "reasoning": 98,
    "math": 97,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 98
  },
  "or-openai-gpt-5-4-pro": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 98
  },
  "or-openai-gpt-5-4": {
    "coding": 98,
    "creativity": 88,
    "reasoning": 98,
    "math": 95,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 98
  },
  "or-openai-gpt-5-1": {
    "coding": 98,
    "creativity": 82,
    "reasoning": 98,
    "math": 91,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 88
  },
  "or-openai-gpt-chat-latest": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 88
  },
  "or-openai-o3-pro": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-openai-o3-deep-research": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-openai-o4-mini-deep-research": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 78
  },
  "or-openai-o4-mini-high": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 78
  },
  "or-openai-o3-mini-high": {
    "coding": 75,
    "creativity": 66,
    "reasoning": 93,
    "math": 81,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 78
  },
  "or-openai-o3-mini": {
    "coding": 88,
    "creativity": 66,
    "reasoning": 98,
    "math": 95,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 78
  },
  "or-openai-o1-pro": {
    "coding": 72,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-openai-o1": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 83,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-openai-gpt-4o": {
    "coding": 68,
    "creativity": 57,
    "reasoning": 94,
    "math": 79,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 68
  },
  "or-openai-gpt-4o-mini": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 68
  },
  "or-openai-gpt-4o-search-preview": {
    "coding": 72,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 68
  },
  "or-openai-gpt-4o-mini-search-preview": {
    "coding": 72,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 68
  },
  "or-qwen-qwen3-coder-plus": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 94,
    "math": 84,
    "multilingual": 85,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 98
  },
  "or-qwen-qwen3-coder-flash": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 94,
    "math": 84,
    "multilingual": 85,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 98
  },
  "or-qwen-qwen3-coder": {
    "coding": 98,
    "creativity": 84,
    "reasoning": 98,
    "math": 95,
    "multilingual": 85,
    "speed": 55,
    "costEfficiency": 65,
    "contextWindow": 98
  },
  "or-qwen-qwen3-coder-free": {
    "coding": 98,
    "creativity": 84,
    "reasoning": 98,
    "math": 91,
    "multilingual": 85,
    "speed": 63,
    "costEfficiency": 91,
    "contextWindow": 98
  },
  "or-qwen-qwen3-coder-30b-a3b-instruct": {
    "coding": 93,
    "creativity": 77,
    "reasoning": 84,
    "math": 76,
    "multilingual": 85,
    "speed": 81,
    "costEfficiency": 90,
    "contextWindow": 78
  },
  "or-qwen-qwen3-next-80b-a3b-instruct": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 93,
    "math": 87,
    "multilingual": 85,
    "speed": 81,
    "costEfficiency": 90,
    "contextWindow": 88
  },
  "or-qwen-qwen3-next-80b-a3b-instruct-free": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 93,
    "math": 87,
    "multilingual": 85,
    "speed": 81,
    "costEfficiency": 98,
    "contextWindow": 88
  },
  "or-qwen-qwen3-235b-a22b-thinking-2507": {
    "coding": 87,
    "creativity": 70,
    "reasoning": 98,
    "math": 90,
    "multilingual": 85,
    "speed": 65,
    "costEfficiency": 83,
    "contextWindow": 88
  },
  "or-qwen-qwen3-30b-a3b-thinking-2507": {
    "coding": 77,
    "creativity": 60,
    "reasoning": 95,
    "math": 83,
    "multilingual": 85,
    "speed": 81,
    "costEfficiency": 90,
    "contextWindow": 78
  },
  "or-qwen-qwen3-235b-a22b-2507": {
    "coding": 86,
    "creativity": 70,
    "reasoning": 91,
    "math": 77,
    "multilingual": 85,
    "speed": 65,
    "costEfficiency": 83,
    "contextWindow": 88
  },
  "or-qwen-qwen3-30b-a3b-instruct-2507": {
    "coding": 77,
    "creativity": 66,
    "reasoning": 88,
    "math": 80,
    "multilingual": 85,
    "speed": 81,
    "costEfficiency": 90,
    "contextWindow": 78
  },
  "or-qwen-qwen3-235b-a22b": {
    "coding": 82,
    "creativity": 62,
    "reasoning": 96,
    "math": 85,
    "multilingual": 85,
    "speed": 57,
    "costEfficiency": 67,
    "contextWindow": 78
  },
  "or-qwen-qwen3-32b": {
    "coding": 76,
    "creativity": 66,
    "reasoning": 90,
    "math": 81,
    "multilingual": 85,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 78
  },
  "or-qwen-qwen3-14b": {
    "coding": 73,
    "creativity": 66,
    "reasoning": 87,
    "math": 77,
    "multilingual": 85,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 78
  },
  "or-qwen-qwen3-8b": {
    "coding": 66,
    "creativity": 66,
    "reasoning": 82,
    "math": 73,
    "multilingual": 85,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-qwen-qwen3-30b-a3b": {
    "coding": 74,
    "creativity": 62,
    "reasoning": 89,
    "math": 80,
    "multilingual": 85,
    "speed": 81,
    "costEfficiency": 90,
    "contextWindow": 78
  },
  "or-qwen-qwen-2-5-coder-32b-instruct": {
    "coding": 88,
    "creativity": 66,
    "reasoning": 98,
    "math": 95,
    "multilingual": 85,
    "speed": 60,
    "costEfficiency": 69,
    "contextWindow": 68
  },
  "or-openai-gpt-5-4-mini": {
    "coding": 98,
    "creativity": 66,
    "reasoning": 98,
    "math": 96,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 88
  },
  "or-anthropic-claude-fable-5": {
    "coding": 98,
    "creativity": 98,
    "reasoning": 98,
    "math": 98,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 98
  },
  "or-google-gemini-3-5-flash": {
    "coding": 98,
    "creativity": 95,
    "reasoning": 98,
    "math": 98,
    "multilingual": 76,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-x-ai-grok-build-0-1": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 98,
    "math": 95,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-perplexity-sonar-pro-search": {
    "coding": 84,
    "creativity": 77,
    "reasoning": 98,
    "math": 95,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-deepseek-deepseek-v4-pro": {
    "coding": 98,
    "creativity": 90,
    "reasoning": 98,
    "math": 98,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 98
  },
  "or-qwen-qwen3-7-max": {
    "coding": 98,
    "creativity": 94,
    "reasoning": 98,
    "math": 98,
    "multilingual": 85,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 98
  },
  "or-meta-llama-llama-3-2-3b-instruct": {
    "coding": 67,
    "creativity": 66,
    "reasoning": 95,
    "math": 81,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-mistralai-mistral-medium-3-5": {
    "coding": 98,
    "creativity": 66,
    "reasoning": 98,
    "math": 92,
    "multilingual": 77,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 88
  },
  "or-cohere-command-r-08-2024": {
    "coding": 86,
    "creativity": 64,
    "reasoning": 98,
    "math": 95,
    "multilingual": 77,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 68
  },
  "or-microsoft-phi-4-mini-instruct": {
    "coding": 54,
    "creativity": 64,
    "reasoning": 74,
    "math": 73,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-amazon-nova-pro-v1": {
    "coding": 66,
    "creativity": 49,
    "reasoning": 74,
    "math": 71,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 88
  },
  "or-nvidia-nemotron-3-nano-30b-a3b": {
    "coding": 89,
    "creativity": 64,
    "reasoning": 93,
    "math": 89,
    "multilingual": 68,
    "speed": 81,
    "costEfficiency": 90,
    "contextWindow": 88
  },
  "or-moonshotai-kimi-k2-7-code": {
    "coding": 86,
    "creativity": 64,
    "reasoning": 98,
    "math": 95,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 88
  },
  "or-z-ai-glm-5": {
    "coding": 98,
    "creativity": 87,
    "reasoning": 98,
    "math": 97,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-minimax-minimax-m3": {
    "coding": 98,
    "creativity": 93,
    "reasoning": 98,
    "math": 98,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 98
  },
  "or-baidu-ernie-4-5-vl-424b-a47b": {
    "coding": 74,
    "creativity": 62,
    "reasoning": 98,
    "math": 96,
    "multilingual": 77,
    "speed": 68,
    "costEfficiency": 70,
    "contextWindow": 78
  },
  "or-tencent-hy3-preview": {
    "coding": 95,
    "creativity": 62,
    "reasoning": 98,
    "math": 89,
    "multilingual": 77,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 88
  },
  "or-ibm-granite-granite-4-1-8b": {
    "coding": 57,
    "creativity": 62,
    "reasoning": 63,
    "math": 62,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-stepfun-step-3-7-flash": {
    "coding": 83,
    "creativity": 76,
    "reasoning": 98,
    "math": 89,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-bytedance-seed-seed-1-6-flash": {
    "coding": 70,
    "creativity": 62,
    "reasoning": 96,
    "math": 90,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 88
  },
  "or-anthropic-claude-opus-4-7": {
    "coding": 98,
    "creativity": 96,
    "reasoning": 98,
    "math": 98,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 98
  },
  "or-openai-gpt-5-3-codex": {
    "coding": 98,
    "creativity": 80,
    "reasoning": 98,
    "math": 98,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 88
  },
  "or-openai-gpt-5-2-codex": {
    "coding": 98,
    "creativity": 81,
    "reasoning": 98,
    "math": 97,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 88
  },
  "or-openai-gpt-5-2-pro": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 98,
    "math": 95,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 88
  },
  "or-openai-gpt-5-2": {
    "coding": 98,
    "creativity": 83,
    "reasoning": 98,
    "math": 98,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 88
  },
  "or-anthropic-claude-sonnet-4": {
    "coding": 98,
    "creativity": 82,
    "reasoning": 98,
    "math": 88,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-8-fast": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-8": {
    "coding": 98,
    "creativity": 92,
    "reasoning": 98,
    "math": 97,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-7-fast": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-5": {
    "coding": 98,
    "creativity": 91,
    "reasoning": 98,
    "math": 97,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-anthropic-claude-opus-4-6-fast": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4-1": {
    "coding": 98,
    "creativity": 87,
    "reasoning": 98,
    "math": 95,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-google-gemini-2-5-pro": {
    "coding": 98,
    "creativity": 82,
    "reasoning": 98,
    "math": 90,
    "multilingual": 76,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-anthropic-claude-opus-4": {
    "coding": 98,
    "creativity": 85,
    "reasoning": 98,
    "math": 91,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-google-gemma-4-26b-a4b-it": {
    "coding": 80,
    "creativity": 66,
    "reasoning": 98,
    "math": 84,
    "multilingual": 76,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 88
  },
  "or-google-gemma-4-26b-a4b-it-free": {
    "coding": 80,
    "creativity": 66,
    "reasoning": 98,
    "math": 84,
    "multilingual": 76,
    "speed": 70,
    "costEfficiency": 97,
    "contextWindow": 88
  },
  "or-google-gemma-4-31b-it-free": {
    "coding": 97,
    "creativity": 66,
    "reasoning": 98,
    "math": 91,
    "multilingual": 76,
    "speed": 68,
    "costEfficiency": 95,
    "contextWindow": 88
  },
  "or-google-gemini-2-5-pro-preview": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 98,
    "math": 95,
    "multilingual": 76,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-google-gemini-2-5-pro-preview-05-06": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 98,
    "math": 95,
    "multilingual": 76,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-qwen-qwen3-7-plus": {
    "coding": 98,
    "creativity": 66,
    "reasoning": 98,
    "math": 94,
    "multilingual": 85,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 98
  },
  "or-x-ai-grok-4-20-multi-agent": {
    "coding": 72,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 98
  },
  "or-moonshotai-kimi-k2-6": {
    "coding": 98,
    "creativity": 93,
    "reasoning": 98,
    "math": 98,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 88
  },
  "or-qwen-qwen3-5-plus-20260420": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 85,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 98
  },
  "or-qwen-qwen3-6-flash": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 85,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 98
  },
  "or-qwen-qwen3-6-35b-a3b": {
    "coding": 94,
    "creativity": 66,
    "reasoning": 98,
    "math": 93,
    "multilingual": 85,
    "speed": 81,
    "costEfficiency": 90,
    "contextWindow": 88
  },
  "or-qwen-qwen3-6-max-preview": {
    "coding": 98,
    "creativity": 66,
    "reasoning": 98,
    "math": 98,
    "multilingual": 85,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 88
  },
  "or-qwen-qwen3-6-27b": {
    "coding": 92,
    "creativity": 66,
    "reasoning": 98,
    "math": 91,
    "multilingual": 85,
    "speed": 75,
    "costEfficiency": 76,
    "contextWindow": 88
  },
  "or-google-gemini-3-1-pro-preview-customtools": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 76,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 98
  },
  "or-google-gemini-2-5-flash-lite-preview-09-2025": {
    "coding": 76,
    "creativity": 71,
    "reasoning": 89,
    "math": 79,
    "multilingual": 76,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 98
  },
  "or-deepseek-deepseek-v4-flash": {
    "coding": 93,
    "creativity": 87,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 98
  },
  "or-deepseek-deepseek-v3-2": {
    "coding": 98,
    "creativity": 79,
    "reasoning": 98,
    "math": 93,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-anthropic-claude-3-5-haiku": {
    "coding": 82,
    "creativity": 66,
    "reasoning": 74,
    "math": 68,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 78
  },
  "or-google-gemma-3-4b-it": {
    "coding": 55,
    "creativity": 66,
    "reasoning": 75,
    "math": 70,
    "multilingual": 76,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-google-gemma-3-12b-it": {
    "coding": 67,
    "creativity": 66,
    "reasoning": 80,
    "math": 74,
    "multilingual": 76,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 78
  },
  "or-google-gemma-3-27b-it": {
    "coding": 70,
    "creativity": 66,
    "reasoning": 81,
    "math": 75,
    "multilingual": 76,
    "speed": 83,
    "costEfficiency": 92,
    "contextWindow": 78
  },
  "or-xiaomi-mimo-v2-5": {
    "coding": 98,
    "creativity": 84,
    "reasoning": 98,
    "math": 97,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 98
  },
  "or-nvidia-nemotron-3-ultra-550b-a55b": {
    "coding": 98,
    "creativity": 64,
    "reasoning": 98,
    "math": 98,
    "multilingual": 68,
    "speed": 55,
    "costEfficiency": 65,
    "contextWindow": 98
  },
  "or-arcee-ai-trinity-large-thinking": {
    "coding": 87,
    "creativity": 71,
    "reasoning": 94,
    "math": 89,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 88
  },
  "or-z-ai-glm-4-7-flash": {
    "coding": 90,
    "creativity": 79,
    "reasoning": 97,
    "math": 88,
    "multilingual": 77,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-inclusionai-ring-2-6-1t": {
    "coding": 92,
    "creativity": 62,
    "reasoning": 98,
    "math": 92,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 88
  },
  "or-deepseek-deepseek-v3-2-exp": {
    "coding": 88,
    "creativity": 82,
    "reasoning": 98,
    "math": 84,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-minimax-minimax-m2-5": {
    "coding": 96,
    "creativity": 85,
    "reasoning": 98,
    "math": 93,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-nvidia-nemotron-3-ultra-550b-a55b-free": {
    "coding": 98,
    "creativity": 64,
    "reasoning": 98,
    "math": 97,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 91,
    "contextWindow": 98
  },
  "or-deepseek-deepseek-v3-1-terminus": {
    "coding": 89,
    "creativity": 83,
    "reasoning": 98,
    "math": 85,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-z-ai-glm-4-7": {
    "coding": 98,
    "creativity": 86,
    "reasoning": 98,
    "math": 93,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-perplexity-sonar-reasoning-pro": {
    "coding": 72,
    "creativity": 77,
    "reasoning": 98,
    "math": 86,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 68
  },
  "or-nvidia-llama-3-3-nemotron-super-49b-v1-5": {
    "coding": 85,
    "creativity": 64,
    "reasoning": 87,
    "math": 87,
    "multilingual": 68,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 78
  },
  "or-deepseek-deepseek-chat-v3-1": {
    "coding": 84,
    "creativity": 74,
    "reasoning": 97,
    "math": 82,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-nvidia-nemotron-3-nano-30b-a3b-free": {
    "coding": 89,
    "creativity": 64,
    "reasoning": 89,
    "math": 85,
    "multilingual": 68,
    "speed": 81,
    "costEfficiency": 98,
    "contextWindow": 78
  },
  "or-poolside-laguna-xs-2-free": {
    "coding": 82,
    "creativity": 62,
    "reasoning": 92,
    "math": 91,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 98,
    "contextWindow": 88
  },
  "or-poolside-laguna-m-1-free": {
    "coding": 82,
    "creativity": 62,
    "reasoning": 92,
    "math": 91,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 98,
    "contextWindow": 88
  },
  "or-mistralai-ministral-14b-2512": {
    "coding": 71,
    "creativity": 71,
    "reasoning": 77,
    "math": 66,
    "multilingual": 77,
    "speed": 83,
    "costEfficiency": 92,
    "contextWindow": 88
  },
  "or-mistralai-ministral-8b-2512": {
    "coding": 67,
    "creativity": 72,
    "reasoning": 73,
    "math": 63,
    "multilingual": 77,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 88
  },
  "or-nvidia-nemotron-3-5-content-safety-free": {
    "coding": 68,
    "creativity": 64,
    "reasoning": 96,
    "math": 86,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 98,
    "contextWindow": 68
  },
  "or-minimax-minimax-m2-1": {
    "coding": 92,
    "creativity": 83,
    "reasoning": 98,
    "math": 92,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-mistralai-mistral-large-2407": {
    "coding": 84,
    "creativity": 66,
    "reasoning": 85,
    "math": 81,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-z-ai-glm-5-turbo": {
    "coding": 87,
    "creativity": 91,
    "reasoning": 98,
    "math": 91,
    "multilingual": 77,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 88
  },
  "or-mistralai-mistral-medium-3": {
    "coding": 72,
    "creativity": 77,
    "reasoning": 88,
    "math": 78,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-nvidia-nemotron-3-nano-omni-30b-a3b-reasoning-free": {
    "coding": 73,
    "creativity": 64,
    "reasoning": 87,
    "math": 79,
    "multilingual": 68,
    "speed": 81,
    "costEfficiency": 98,
    "contextWindow": 78
  },
  "or-nvidia-nemotron-3-super-120b-a12b-free": {
    "coding": 90,
    "creativity": 64,
    "reasoning": 98,
    "math": 93,
    "multilingual": 68,
    "speed": 65,
    "costEfficiency": 93,
    "contextWindow": 98
  },
  "or-minimax-minimax-m2": {
    "coding": 89,
    "creativity": 77,
    "reasoning": 98,
    "math": 91,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-deepseek-deepseek-r1-0528": {
    "coding": 81,
    "creativity": 80,
    "reasoning": 95,
    "math": 81,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-mistralai-mistral-small-3-1-24b-instruct": {
    "coding": 73,
    "creativity": 66,
    "reasoning": 98,
    "math": 87,
    "multilingual": 77,
    "speed": 83,
    "costEfficiency": 92,
    "contextWindow": 68
  },
  "or-bytedance-seed-seed-1-6": {
    "coding": 70,
    "creativity": 62,
    "reasoning": 96,
    "math": 90,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 88
  },
  "or-z-ai-glm-4-6v": {
    "coding": 73,
    "creativity": 64,
    "reasoning": 88,
    "math": 80,
    "multilingual": 77,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-deepseek-deepseek-r1-distill-qwen-32b": {
    "coding": 76,
    "creativity": 66,
    "reasoning": 98,
    "math": 94,
    "multilingual": 77,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 68
  },
  "or-deepseek-deepseek-r1-distill-llama-70b": {
    "coding": 68,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 68,
    "speed": 60,
    "costEfficiency": 69,
    "contextWindow": 68
  },
  "or-perplexity-sonar-deep-research": {
    "coding": 72,
    "creativity": 77,
    "reasoning": 98,
    "math": 86,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 68
  },
  "or-nvidia-nemotron-nano-12b-v2-vl-free": {
    "coding": 68,
    "creativity": 64,
    "reasoning": 77,
    "math": 73,
    "multilingual": 68,
    "speed": 83,
    "costEfficiency": 98,
    "contextWindow": 68
  },
  "or-deepseek-deepseek-chat": {
    "coding": 98,
    "creativity": 75,
    "reasoning": 94,
    "math": 84,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-z-ai-glm-4-5v": {
    "coding": 66,
    "creativity": 64,
    "reasoning": 81,
    "math": 76,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 68
  },
  "or-mistralai-mistral-large": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 98,
    "math": 95,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 68
  },
  "or-mistralai-ministral-3b-2512": {
    "coding": 60,
    "creativity": 66,
    "reasoning": 67,
    "math": 58,
    "multilingual": 77,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-liquid-lfm-2-5-1-2b-thinking-free": {
    "coding": 55,
    "creativity": 62,
    "reasoning": 62,
    "math": 69,
    "multilingual": 67,
    "speed": 84,
    "costEfficiency": 98,
    "contextWindow": 58
  },
  "or-anthropic-claude-3-haiku": {
    "coding": 66,
    "creativity": 66,
    "reasoning": 68,
    "math": 60,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-minimax-minimax-m1": {
    "coding": 65,
    "creativity": 62,
    "reasoning": 82,
    "math": 76,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 98
  },
  "or-google-gemma-3n-e4b-it": {
    "coding": 56,
    "creativity": 66,
    "reasoning": 61,
    "math": 55,
    "multilingual": 75,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 58
  },
  "or-mistralai-mistral-small-3-2-24b-instruct": {
    "coding": 71,
    "creativity": 58,
    "reasoning": 95,
    "math": 80,
    "multilingual": 77,
    "speed": 83,
    "costEfficiency": 92,
    "contextWindow": 68
  },
  "or-z-ai-glm-4-6": {
    "coding": 81,
    "creativity": 82,
    "reasoning": 98,
    "math": 84,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-kwaipilot-kat-coder-pro-v2": {
    "coding": 98,
    "creativity": 62,
    "reasoning": 98,
    "math": 94,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-meta-llama-llama-3-2-3b-instruct-free": {
    "coding": 67,
    "creativity": 66,
    "reasoning": 95,
    "math": 81,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 98,
    "contextWindow": 78
  },
  "or-nvidia-nemotron-nano-9b-v2-free": {
    "coding": 65,
    "creativity": 64,
    "reasoning": 81,
    "math": 77,
    "multilingual": 68,
    "speed": 83,
    "costEfficiency": 98,
    "contextWindow": 68
  },
  "or-z-ai-glm-4-5": {
    "coding": 79,
    "creativity": 83,
    "reasoning": 90,
    "math": 81,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-z-ai-glm-4-5-air": {
    "coding": 77,
    "creativity": 79,
    "reasoning": 88,
    "math": 80,
    "multilingual": 77,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-moonshotai-kimi-k2-0905": {
    "coding": 78,
    "creativity": 74,
    "reasoning": 86,
    "math": 72,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 88
  },
  "or-mistralai-voxtral-small-24b-2507": {
    "coding": 79,
    "creativity": 66,
    "reasoning": 95,
    "math": 80,
    "multilingual": 76,
    "speed": 83,
    "costEfficiency": 92,
    "contextWindow": 45
  },
  "or-essentialai-rnj-1-instruct": {
    "coding": 82,
    "creativity": 62,
    "reasoning": 96,
    "math": 95,
    "multilingual": 67,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 58
  },
  "or-cohere-command-r7b-12-2024": {
    "coding": 66,
    "creativity": 64,
    "reasoning": 98,
    "math": 88,
    "multilingual": 77,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 68
  },
  "or-rekaai-reka-flash-3": {
    "coding": 66,
    "creativity": 62,
    "reasoning": 67,
    "math": 74,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 68
  },
  "or-meta-llama-llama-3-2-11b-vision-instruct": {
    "coding": 59,
    "creativity": 66,
    "reasoning": 70,
    "math": 63,
    "multilingual": 68,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 78
  },
  "or-amazon-nova-lite-v1": {
    "coding": 61,
    "creativity": 64,
    "reasoning": 64,
    "math": 60,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 88
  },
  "or-google-gemma-2-27b-it": {
    "coding": 73,
    "creativity": 66,
    "reasoning": 95,
    "math": 80,
    "multilingual": 74,
    "speed": 83,
    "costEfficiency": 92,
    "contextWindow": 45
  },
  "or-mistralai-mixtral-8x22b-instruct": {
    "coding": 91,
    "creativity": 66,
    "reasoning": 95,
    "math": 85,
    "multilingual": 77,
    "speed": 62,
    "costEfficiency": 71,
    "contextWindow": 68
  },
  "or-minimax-minimax-01": {
    "coding": 64,
    "creativity": 62,
    "reasoning": 82,
    "math": 75,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 98
  },
  "or-aion-labs-aion-1-0": {
    "coding": 76,
    "creativity": 62,
    "reasoning": 92,
    "math": 91,
    "multilingual": 68,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 78
  },
  "or-aion-labs-aion-1-0-mini": {
    "coding": 76,
    "creativity": 62,
    "reasoning": 92,
    "math": 91,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 78
  },
  "or-nousresearch-hermes-3-llama-3-1-70b": {
    "coding": 71,
    "creativity": 62,
    "reasoning": 79,
    "math": 84,
    "multilingual": 68,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 78
  },
  "or-nousresearch-hermes-3-llama-3-1-405b": {
    "coding": 84,
    "creativity": 62,
    "reasoning": 89,
    "math": 92,
    "multilingual": 68,
    "speed": 55,
    "costEfficiency": 65,
    "contextWindow": 78
  },
  "or-arcee-ai-trinity-mini": {
    "coding": 70,
    "creativity": 62,
    "reasoning": 96,
    "math": 90,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-aion-labs-aion-2-0": {
    "coding": 64,
    "creativity": 62,
    "reasoning": 92,
    "math": 86,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-nousresearch-hermes-4-70b": {
    "coding": 63,
    "creativity": 62,
    "reasoning": 81,
    "math": 80,
    "multilingual": 68,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 78
  },
  "or-nousresearch-hermes-4-405b": {
    "coding": 70,
    "creativity": 62,
    "reasoning": 89,
    "math": 88,
    "multilingual": 68,
    "speed": 55,
    "costEfficiency": 65,
    "contextWindow": 78
  },
  "or-morph-morph-v3-large": {
    "coding": 76,
    "creativity": 73,
    "reasoning": 82,
    "math": 80,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 88
  },
  "or-mistralai-mistral-saba": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 76,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 58
  },
  "or-nousresearch-hermes-3-llama-3-1-405b-free": {
    "coding": 84,
    "creativity": 62,
    "reasoning": 85,
    "math": 88,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 91,
    "contextWindow": 78
  },
  "or-meta-llama-llama-3-3-70b-instruct": {
    "coding": 74,
    "creativity": 66,
    "reasoning": 78,
    "math": 69,
    "multilingual": 68,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 78
  },
  "or-mistralai-mistral-small-24b-instruct-2501": {
    "coding": 73,
    "creativity": 66,
    "reasoning": 95,
    "math": 80,
    "multilingual": 76,
    "speed": 83,
    "costEfficiency": 92,
    "contextWindow": 58
  },
  "or-inclusionai-ling-2-6-1t": {
    "coding": 80,
    "creativity": 62,
    "reasoning": 86,
    "math": 73,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 88
  },
  "or-inclusionai-ling-2-6-flash": {
    "coding": 72,
    "creativity": 62,
    "reasoning": 79,
    "math": 70,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 88
  },
  "or-rekaai-reka-edge": {
    "coding": 70,
    "creativity": 62,
    "reasoning": 86,
    "math": 79,
    "multilingual": 66,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 45
  },
  "or-minimax-minimax-m2-her": {
    "coding": 64,
    "creativity": 62,
    "reasoning": 82,
    "math": 75,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 68
  },
  "or-moonshotai-kimi-k2": {
    "coding": 75,
    "creativity": 71,
    "reasoning": 77,
    "math": 66,
    "multilingual": 77,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-prime-intellect-intellect-3": {
    "coding": 69,
    "creativity": 68,
    "reasoning": 83,
    "math": 79,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-allenai-olmo-3-32b-think": {
    "coding": 60,
    "creativity": 62,
    "reasoning": 77,
    "math": 79,
    "multilingual": 68,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 68
  },
  "or-meta-llama-llama-3-3-70b-instruct-free": {
    "coding": 74,
    "creativity": 66,
    "reasoning": 74,
    "math": 65,
    "multilingual": 68,
    "speed": 68,
    "costEfficiency": 95,
    "contextWindow": 78
  },
  "or-meta-llama-llama-3-2-1b-instruct": {
    "coding": 50,
    "creativity": 66,
    "reasoning": 58,
    "math": 52,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-deepcogito-cogito-v2-1-671b": {
    "coding": 77,
    "creativity": 62,
    "reasoning": 98,
    "math": 98,
    "multilingual": 68,
    "speed": 55,
    "costEfficiency": 65,
    "contextWindow": 68
  },
  "or-meta-llama-llama-3-1-8b-instruct": {
    "coding": 63,
    "creativity": 66,
    "reasoning": 69,
    "math": 61,
    "multilingual": 68,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-meta-llama-llama-3-1-70b-instruct": {
    "coding": 74,
    "creativity": 66,
    "reasoning": 76,
    "math": 68,
    "multilingual": 68,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 78
  },
  "or-arcee-ai-virtuoso-large": {
    "coding": 70,
    "creativity": 62,
    "reasoning": 92,
    "math": 86,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-relace-relace-search": {
    "coding": 82,
    "creativity": 62,
    "reasoning": 82,
    "math": 80,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-arcee-ai-coder-large": {
    "coding": 76,
    "creativity": 62,
    "reasoning": 82,
    "math": 80,
    "multilingual": 67,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 58
  },
  "or-mistralai-mistral-nemo": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 77,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 78
  },
  "or-meta-llama-llama-3-8b-instruct": {
    "coding": 56,
    "creativity": 66,
    "reasoning": 61,
    "math": 55,
    "multilingual": 66,
    "speed": 84,
    "costEfficiency": 93,
    "contextWindow": 45
  },
  "or-meta-llama-llama-3-70b-instruct": {
    "coding": 65,
    "creativity": 66,
    "reasoning": 72,
    "math": 66,
    "multilingual": 66,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 45
  },
  "or-morph-morph-v3-fast": {
    "coding": 76,
    "creativity": 73,
    "reasoning": 82,
    "math": 80,
    "multilingual": 68,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 68
  },
  "or-relace-relace-apply-3": {
    "coding": 76,
    "creativity": 62,
    "reasoning": 82,
    "math": 80,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-liquid-lfm-2-24b-a2b": {
    "coding": 51,
    "creativity": 62,
    "reasoning": 59,
    "math": 60,
    "multilingual": 68,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 68
  },
  "or-amazon-nova-micro-v1": {
    "coding": 60,
    "creativity": 64,
    "reasoning": 62,
    "math": 59,
    "multilingual": 68,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 68
  },
  "or-switchpoint-router": {
    "coding": 64,
    "creativity": 62,
    "reasoning": 92,
    "math": 86,
    "multilingual": 68,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 78
  },
  "or-liquid-lfm-2-5-1-2b-instruct-free": {
    "coding": 43,
    "creativity": 62,
    "reasoning": 51,
    "math": 53,
    "multilingual": 67,
    "speed": 84,
    "costEfficiency": 98,
    "contextWindow": 58
  },
  "or-microsoft-wizardlm-2-8x22b": {
    "coding": 69,
    "creativity": 64,
    "reasoning": 91,
    "math": 80,
    "multilingual": 68,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 68
  },
  "or-anthracite-org-magnum-v4-72b": {
    "coding": 68,
    "creativity": 73,
    "reasoning": 98,
    "math": 94,
    "multilingual": 67,
    "speed": 60,
    "costEfficiency": 69,
    "contextWindow": 58
  },
  "or-aion-labs-aion-rp-llama-3-1-8b": {
    "coding": 62,
    "creativity": 73,
    "reasoning": 80,
    "math": 73,
    "multilingual": 67,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 58
  },
  "or-thedrummer-cydonia-24b-v4-1": {
    "coding": 65,
    "creativity": 62,
    "reasoning": 83,
    "math": 76,
    "multilingual": 68,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 78
  },
  "or-thedrummer-skyfall-36b-v2": {
    "coding": 68,
    "creativity": 62,
    "reasoning": 86,
    "math": 79,
    "multilingual": 67,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 58
  },
  "or-inflection-inflection-3-productivity": {
    "coding": 64,
    "creativity": 62,
    "reasoning": 82,
    "math": 75,
    "multilingual": 66,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 45
  },
  "or-inflection-inflection-3-pi": {
    "coding": 64,
    "creativity": 62,
    "reasoning": 82,
    "math": 75,
    "multilingual": 66,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 45
  },
  "or-sao10k-l3-1-70b-hanami-x1": {
    "coding": 68,
    "creativity": 62,
    "reasoning": 86,
    "math": 79,
    "multilingual": 66,
    "speed": 60,
    "costEfficiency": 69,
    "contextWindow": 45
  },
  "or-sao10k-l3-3-euryale-70b": {
    "coding": 68,
    "creativity": 73,
    "reasoning": 90,
    "math": 83,
    "multilingual": 68,
    "speed": 68,
    "costEfficiency": 85,
    "contextWindow": 78
  },
  "or-thedrummer-unslopnemo-12b": {
    "coding": 71,
    "creativity": 62,
    "reasoning": 87,
    "math": 80,
    "multilingual": 67,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 58
  },
  "or-thedrummer-rocinante-12b": {
    "coding": 71,
    "creativity": 62,
    "reasoning": 87,
    "math": 80,
    "multilingual": 67,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 58
  }
} satisfies Record<string, AIAbilityStats>;

export const OPENROUTER_ADDED_BRANDS = {
  "or-google-gemini-3-1-flash-lite": "gemini",
  "or-openai-gpt-5-mini": "gpt",
  "or-openai-gpt-5-5-pro": "gpt",
  "or-openai-gpt-5-5": "gpt",
  "or-openai-gpt-5-4-pro": "gpt",
  "or-openai-gpt-5-4": "gpt",
  "or-openai-gpt-5-1": "gpt",
  "or-openai-gpt-chat-latest": "gpt",
  "or-openai-o3-pro": "gpt",
  "or-openai-o3-deep-research": "gpt",
  "or-openai-o4-mini-deep-research": "gpt",
  "or-openai-o4-mini-high": "gpt",
  "or-openai-o3-mini-high": "gpt",
  "or-openai-o3-mini": "gpt",
  "or-openai-o1-pro": "gpt",
  "or-openai-o1": "gpt",
  "or-openai-gpt-4o": "gpt",
  "or-openai-gpt-4o-mini": "gpt",
  "or-openai-gpt-4o-search-preview": "gpt",
  "or-openai-gpt-4o-mini-search-preview": "gpt",
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
  "or-baidu-ernie-4-5-vl-424b-a47b": "other",
  "or-tencent-hy3-preview": "other",
  "or-ibm-granite-granite-4-1-8b": "other",
  "or-stepfun-step-3-7-flash": "other",
  "or-bytedance-seed-seed-1-6-flash": "other",
  "or-anthropic-claude-opus-4-7": "claude",
  "or-openai-gpt-5-3-codex": "gpt",
  "or-openai-gpt-5-2-codex": "gpt",
  "or-openai-gpt-5-2-pro": "gpt",
  "or-openai-gpt-5-2": "gpt",
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
  "or-qwen-qwen3-7-plus": "qwen",
  "or-x-ai-grok-4-20-multi-agent": "grok",
  "or-moonshotai-kimi-k2-6": "other",
  "or-qwen-qwen3-5-plus-20260420": "qwen",
  "or-qwen-qwen3-6-flash": "qwen",
  "or-qwen-qwen3-6-35b-a3b": "qwen",
  "or-qwen-qwen3-6-max-preview": "qwen",
  "or-qwen-qwen3-6-27b": "qwen",
  "or-google-gemini-3-1-pro-preview-customtools": "gemini",
  "or-google-gemini-2-5-flash-lite-preview-09-2025": "gemini",
  "or-deepseek-deepseek-v4-flash": "deepseek",
  "or-deepseek-deepseek-v3-2": "deepseek",
  "or-anthropic-claude-3-5-haiku": "claude",
  "or-google-gemma-3-4b-it": "gemini",
  "or-google-gemma-3-12b-it": "gemini",
  "or-google-gemma-3-27b-it": "gemini",
  "or-xiaomi-mimo-v2-5": "other",
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
  "or-mistralai-ministral-8b-2512": "other",
  "or-nvidia-nemotron-3-5-content-safety-free": "other",
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
  "or-nvidia-nemotron-nano-12b-v2-vl-free": "other",
  "or-deepseek-deepseek-chat": "deepseek",
  "or-z-ai-glm-4-5v": "other",
  "or-mistralai-mistral-large": "other",
  "or-mistralai-ministral-3b-2512": "other",
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
  "or-meta-llama-llama-3-2-11b-vision-instruct": "other",
  "or-amazon-nova-lite-v1": "other",
  "or-google-gemma-2-27b-it": "gemini",
  "or-mistralai-mixtral-8x22b-instruct": "other",
  "or-minimax-minimax-01": "other",
  "or-aion-labs-aion-1-0": "other",
  "or-aion-labs-aion-1-0-mini": "other",
  "or-nousresearch-hermes-3-llama-3-1-70b": "other",
  "or-nousresearch-hermes-3-llama-3-1-405b": "other",
  "or-arcee-ai-trinity-mini": "other",
  "or-aion-labs-aion-2-0": "other",
  "or-nousresearch-hermes-4-70b": "other",
  "or-nousresearch-hermes-4-405b": "other",
  "or-morph-morph-v3-large": "other",
  "or-mistralai-mistral-saba": "other",
  "or-nousresearch-hermes-3-llama-3-1-405b-free": "other",
  "or-meta-llama-llama-3-3-70b-instruct": "other",
  "or-mistralai-mistral-small-24b-instruct-2501": "other",
  "or-inclusionai-ling-2-6-1t": "other",
  "or-inclusionai-ling-2-6-flash": "other",
  "or-rekaai-reka-edge": "other",
  "or-minimax-minimax-m2-her": "other",
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
  "or-switchpoint-router": "other",
  "or-liquid-lfm-2-5-1-2b-instruct-free": "other",
  "or-microsoft-wizardlm-2-8x22b": "other",
  "or-anthracite-org-magnum-v4-72b": "other",
  "or-aion-labs-aion-rp-llama-3-1-8b": "other",
  "or-thedrummer-cydonia-24b-v4-1": "other",
  "or-thedrummer-skyfall-36b-v2": "other",
  "or-inflection-inflection-3-productivity": "other",
  "or-inflection-inflection-3-pi": "other",
  "or-sao10k-l3-1-70b-hanami-x1": "other",
  "or-sao10k-l3-3-euryale-70b": "other",
  "or-thedrummer-unslopnemo-12b": "other",
  "or-thedrummer-rocinante-12b": "other"
} satisfies Record<string, ModelBrand>;

export const OPENROUTER_ADDED_OPENSOURCE_IDS = [
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
  "or-qwen-qwen3-7-plus",
  "or-qwen-qwen3-5-plus-20260420",
  "or-qwen-qwen3-6-flash",
  "or-qwen-qwen3-6-35b-a3b",
  "or-qwen-qwen3-6-max-preview",
  "or-qwen-qwen3-6-27b",
  "or-deepseek-deepseek-v4-flash",
  "or-deepseek-deepseek-v3-2",
  "or-google-gemma-3-4b-it",
  "or-google-gemma-3-12b-it",
  "or-google-gemma-3-27b-it",
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
  "or-mistralai-ministral-8b-2512",
  "or-nvidia-nemotron-3-5-content-safety-free",
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
  "or-nvidia-nemotron-nano-12b-v2-vl-free",
  "or-deepseek-deepseek-chat",
  "or-z-ai-glm-4-5v",
  "or-mistralai-mistral-large",
  "or-mistralai-ministral-3b-2512",
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
  "or-meta-llama-llama-3-2-11b-vision-instruct",
  "or-google-gemma-2-27b-it",
  "or-mistralai-mixtral-8x22b-instruct",
  "or-nousresearch-hermes-3-llama-3-1-70b",
  "or-nousresearch-hermes-3-llama-3-1-405b",
  "or-arcee-ai-trinity-mini",
  "or-nousresearch-hermes-4-70b",
  "or-nousresearch-hermes-4-405b",
  "or-mistralai-mistral-saba",
  "or-nousresearch-hermes-3-llama-3-1-405b-free",
  "or-meta-llama-llama-3-3-70b-instruct",
  "or-mistralai-mistral-small-24b-instruct-2501",
  "or-inclusionai-ling-2-6-1t",
  "or-inclusionai-ling-2-6-flash",
  "or-rekaai-reka-edge",
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
  "or-anthracite-org-magnum-v4-72b",
  "or-aion-labs-aion-rp-llama-3-1-8b",
  "or-sao10k-l3-1-70b-hanami-x1",
  "or-sao10k-l3-3-euryale-70b"
] as const;

export const OPENROUTER_ADDED_REASONING_IDS = [
  "or-google-gemini-3-1-flash-lite",
  "or-openai-gpt-5-mini",
  "or-openai-gpt-5-5-pro",
  "or-openai-gpt-5-5",
  "or-openai-gpt-5-4-pro",
  "or-openai-gpt-5-4",
  "or-openai-gpt-5-1",
  "or-openai-o3-pro",
  "or-openai-o3-deep-research",
  "or-openai-o4-mini-deep-research",
  "or-openai-o4-mini-high",
  "or-openai-o3-mini",
  "or-openai-o1-pro",
  "or-openai-o1",
  "or-qwen-qwen3-coder",
  "or-qwen-qwen3-coder-free"
] as const;

export const OPENROUTER_ADDED_FAST_IDS = [] as const;

export const OPENROUTER_ADDED_FLAGSHIP_IDS = [
  "or-google-gemini-3-1-flash-lite",
  "or-openai-gpt-5-mini",
  "or-openai-gpt-5-5-pro",
  "or-openai-gpt-5-5",
  "or-openai-gpt-5-4-pro",
  "or-openai-gpt-5-4",
  "or-openai-gpt-5-1",
  "or-openai-gpt-chat-latest",
  "or-openai-o3-pro",
  "or-openai-o3-deep-research",
  "or-openai-o4-mini-deep-research",
  "or-openai-o4-mini-high",
  "or-openai-o3-mini-high",
  "or-openai-o3-mini",
  "or-openai-o1-pro",
  "or-openai-o1",
  "or-openai-gpt-4o",
  "or-openai-gpt-4o-mini",
  "or-openai-gpt-4o-search-preview",
  "or-openai-gpt-4o-mini-search-preview"
] as const;

export type { ModelInfo };
