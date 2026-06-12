import type { AIAbilityStats, Expert, ModelInfo } from '@/types/expert';
import type { ModelBrand } from '@/lib/modelTaxonomy';

export const OPENROUTER_ADDED_EXPERTS = [
  {
    "id": "or-openai-gpt-oss-120b",
    "name": "gpt-oss-120b",
    "nameKo": "gpt-oss-120b",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-oss-120b",
    "description": "OpenAI의 gpt-oss-120b 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "OpenAI의 gpt-oss-120b 모델입니다. 추론, 코딩, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용"
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
    "id": "or-google-gemma-2-27b-it",
    "name": "Gemma 2 27B",
    "nameKo": "Gemma 2 27B",
    "icon": "💎",
    "avatarUrl": "/logos/gemini.svg",
    "color": "emerald",
    "category": "ai",
    "openrouterModel": "google/gemma-2-27b-it",
    "description": "Google의 일반 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Google의 Gemma 2 27B 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
      "범용"
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
      "openWeight": false
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
    "description": "Perplexity의 출처 기반 검색 및 리서치 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 정리해줘",
      "이 주장에 대한 출처를 찾아줘",
      "여러 자료의 차이를 비교해줘"
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
    "id": "or-deepseek-deepseek-v4-pro",
    "name": "DeepSeek V4 Pro",
    "nameKo": "DeepSeek V4 Pro",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-v4-pro",
    "description": "DeepSeek의 DeepSeek V4 Pro 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V4 Pro 모델입니다. 추론, 코딩, 장문맥, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
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
    "description": "Alibaba Qwen의 Qwen3.7 Max 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3.7 Max 모델입니다. 추론, 코딩, 장문맥, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "장문맥",
      "오픈웨이트"
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
    "description": "Meta의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3.2 3B Instruct 모델입니다. 추론, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트"
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
    "id": "or-mistralai-mistral-large-2407",
    "name": "Mistral Large 2407",
    "nameKo": "Mistral Large 2407",
    "icon": "🌬️",
    "avatarUrl": "/logos/mistral.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "mistralai/mistral-large-2407",
    "description": "Mistral AI의 Mistral Large 2407 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Mistral AI의 Mistral Large 2407 모델입니다. 추론, 코딩, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트"
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
    "id": "or-cohere-command-r-08-2024",
    "name": "Command R (08-2024)",
    "nameKo": "Command R (08-2024)",
    "icon": "📚",
    "avatarUrl": "/logos/cohere.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "cohere/command-r-08-2024",
    "description": "Cohere의 Command R (08-2024) 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Cohere의 Command R (08-2024) 모델입니다. 추론, 코딩, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용"
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
    "description": "Microsoft의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Microsoft의 Phi 4 Mini Instruct 모델입니다. 추론, 저비용, 오픈웨이트, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "id": "or-amazon-nova-micro-v1",
    "name": "Nova Micro 1.0",
    "nameKo": "Nova Micro 1.0",
    "icon": "📦",
    "avatarUrl": "/logos/amazon.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "amazon/nova-micro-v1",
    "description": "Amazon의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Amazon의 Nova Micro 1.0 모델입니다. 저비용, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "범용",
      "업무"
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
    "id": "or-nvidia-nemotron-3-nano-30b-a3b",
    "name": "Nemotron 3 Nano 30B A3B",
    "nameKo": "Nemotron 3 Nano 30B A3B",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-nano-30b-a3b",
    "description": "NVIDIA의 Nemotron 3 Nano 30B A3B 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Nano 30B A3B 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "id": "or-moonshotai-kimi-k2-0905",
    "name": "Kimi K2 0905",
    "nameKo": "Kimi K2 0905",
    "icon": "🌙",
    "avatarUrl": "/logos/moonshot.png",
    "color": "slate",
    "category": "ai",
    "openrouterModel": "moonshotai/kimi-k2-0905",
    "description": "Moonshot AI의 대용량 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2 0905 모델입니다. 중국어, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "중국어",
      "범용",
      "업무"
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
    "id": "or-z-ai-glm-5",
    "name": "GLM 5",
    "nameKo": "GLM 5",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-5",
    "description": "Z.ai의 GLM 5 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "id": "or-minimax-minimax-m2-5",
    "name": "MiniMax M2.5",
    "nameKo": "MiniMax M2.5",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m2.5",
    "description": "MiniMax의 MiniMax M2.5 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "id": "or-tencent-hy3-preview",
    "name": "Hy3 preview",
    "nameKo": "Hy3 preview",
    "icon": "💬",
    "avatarUrl": "/logos/tencent.png",
    "color": "teal",
    "category": "ai",
    "openrouterModel": "tencent/hy3-preview",
    "description": "Tencent의 Hy3 preview 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "description": "IBM의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "IBM의 Granite 4.1 8B 모델입니다. 저비용, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "범용",
      "업무"
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
      "openWeight": false
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
    "description": "Alibaba Qwen의 Qwen3.6 Max Preview 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "id": "or-openai-gpt-oss-120b-free",
    "name": "gpt-oss-120b Free",
    "nameKo": "gpt-oss-120b Free",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-oss-120b:free",
    "description": "OpenAI의 gpt-oss-120b Free 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "OpenAI의 gpt-oss-120b Free 모델입니다. 추론, 코딩, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료"
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
    "id": "or-qwen-qwen3-next-80b-a3b-thinking",
    "name": "Qwen3 Next 80B A3B Thinking",
    "nameKo": "Qwen3 Next 80B A3B Thinking",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-next-80b-a3b-thinking",
    "description": "Alibaba Qwen의 Qwen3 Next 80B A3B Thinking 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Next 80B A3B Thinking 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "id": "or-qwen-qwen3-next-80b-a3b-instruct",
    "name": "Qwen3 Next 80B A3B Instruct",
    "nameKo": "Qwen3 Next 80B A3B Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-next-80b-a3b-instruct",
    "description": "Alibaba Qwen의 Qwen3 Next 80B A3B Instruct 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Next 80B A3B Instruct 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "id": "or-qwen-qwen3-coder",
    "name": "Qwen3 Coder 480B A35B",
    "nameKo": "Qwen3 Coder 480B A35B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder",
    "description": "Alibaba Qwen의 Qwen3 Coder 480B A35B 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 480B A35B 모델입니다. 추론, 코딩, 장문맥, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "장문맥",
      "오픈웨이트"
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
    "id": "or-qwen-qwen3-next-80b-a3b-instruct-free",
    "name": "Qwen3 Next 80B A3B Instruct Free",
    "nameKo": "Qwen3 Next 80B A3B Instruct Free",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-next-80b-a3b-instruct:free",
    "description": "Alibaba Qwen의 Qwen3 Next 80B A3B Instruct Free 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Next 80B A3B Instruct Free 모델입니다. 추론, 코딩, 무료, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료",
      "오픈웨이트"
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
    "id": "or-openai-o3-mini",
    "name": "o3 Mini",
    "nameKo": "o3 Mini",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/o3-mini",
    "description": "OpenAI의 o3 Mini 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "OpenAI의 o3 Mini 모델입니다. 추론, 코딩, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "고속"
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
    "id": "or-qwen-qwen3-coder-free",
    "name": "Qwen3 Coder 480B A35B Free",
    "nameKo": "Qwen3 Coder 480B A35B Free",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder:free",
    "description": "Alibaba Qwen의 Qwen3 Coder 480B A35B Free 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 480B A35B Free 모델입니다. 추론, 코딩, 장문맥, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
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
    "id": "or-deepseek-deepseek-v4-flash",
    "name": "DeepSeek V4 Flash",
    "nameKo": "DeepSeek V4 Flash",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-v4-flash",
    "description": "DeepSeek의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V4 Flash 모델입니다. 추론, 장문맥, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "장문맥",
      "저비용",
      "오픈웨이트"
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
    "description": "DeepSeek의 DeepSeek V3.2 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.2 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "id": "or-qwen-qwen3-coder-next",
    "name": "Qwen3 Coder Next",
    "nameKo": "Qwen3 Coder Next",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder-next",
    "description": "Alibaba Qwen의 Qwen3 Coder Next 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder Next 모델입니다. 코딩, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "저비용",
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
      "priceTier": "low",
      "createdAt": "2026-02-04",
      "openWeight": true
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
    "description": "OpenAI의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "OpenAI의 gpt-oss-20b 모델입니다. 추론, 저비용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "범용"
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
    "id": "or-qwen-qwen3-max",
    "name": "Qwen3 Max",
    "nameKo": "Qwen3 Max",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-max",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Max 모델입니다. 추론, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
      "createdAt": "2025-09-23",
      "openWeight": true
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
    "description": "OpenAI의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "OpenAI의 gpt-oss-20b Free 모델입니다. 추론, 무료, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "무료",
      "범용"
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
    "id": "or-qwen-qwen-plus-2025-07-28-thinking",
    "name": "Qwen Plus 0728 (thinking)",
    "nameKo": "Qwen Plus 0728 (thinking)",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen-plus-2025-07-28:thinking",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen Plus 0728 (thinking) 모델입니다. 추론, 장문맥, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "장문맥",
      "저비용",
      "오픈웨이트"
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
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen Plus 0728 모델입니다. 추론, 장문맥, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "장문맥",
      "저비용",
      "오픈웨이트"
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
    "description": "Alibaba Qwen의 Qwen3 Coder Plus 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder Plus 모델입니다. 코딩, 장문맥, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "장문맥",
      "오픈웨이트",
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
    "description": "Alibaba Qwen의 Qwen3 Coder Flash 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder Flash 모델입니다. 코딩, 장문맥, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "장문맥",
      "저비용",
      "오픈웨이트"
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
    "id": "or-qwen-qwen3-235b-a22b-thinking-2507",
    "name": "Qwen3 235B A22B Thinking 2507",
    "nameKo": "Qwen3 235B A22B Thinking 2507",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-235b-a22b-thinking-2507",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B Thinking 2507 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
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
      "priceTier": "low",
      "createdAt": "2025-07-25",
      "openWeight": true
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
    "description": "OpenAI의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "OpenAI의 o3 Mini High 모델입니다. 추론, 고속, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "고속",
      "범용"
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
    "id": "or-qwen-qwen-2-5-coder-32b-instruct",
    "name": "Qwen2.5 Coder 32B Instruct",
    "nameKo": "Qwen2.5 Coder 32B Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen-2.5-coder-32b-instruct",
    "description": "Alibaba Qwen의 Qwen2.5 Coder 32B Instruct 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "id": "or-nvidia-nemotron-3-ultra-550b-a55b",
    "name": "Nemotron 3 Ultra",
    "nameKo": "Nemotron 3 Ultra",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-ultra-550b-a55b",
    "description": "NVIDIA의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Ultra 모델입니다. 추론, 장문맥, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "장문맥",
      "오픈웨이트"
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
    "description": "Arcee AI의 Trinity Large Thinking 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Arcee AI의 Trinity Large Thinking 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "description": "Z.ai의 GLM 4.7 Flash 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Z.ai의 GLM 4.7 Flash 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "description": "InclusionAI의 Ring-2.6-1T 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "InclusionAI의 Ring-2.6-1T 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "description": "DeepSeek의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.2 Exp 모델입니다. 추론, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트"
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
    "id": "or-nvidia-nemotron-3-ultra-550b-a55b-free",
    "name": "Nemotron 3 Ultra Free",
    "nameKo": "Nemotron 3 Ultra Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-ultra-550b-a55b:free",
    "description": "NVIDIA의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Ultra Free 모델입니다. 추론, 장문맥, 무료, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "장문맥",
      "무료",
      "오픈웨이트"
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
    "description": "DeepSeek의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.1 Terminus 모델입니다. 추론, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트"
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
    "id": "or-qwen-qwen3-30b-a3b-thinking-2507",
    "name": "Qwen3 30B A3B Thinking 2507",
    "nameKo": "Qwen3 30B A3B Thinking 2507",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-30b-a3b-thinking-2507",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B Thinking 2507 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "id": "or-z-ai-glm-4-7",
    "name": "GLM 4.7",
    "nameKo": "GLM 4.7",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.7",
    "description": "Z.ai의 GLM 4.7 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "id": "or-nvidia-llama-3-3-nemotron-super-49b-v1-5",
    "name": "Llama 3.3 Nemotron Super 49B V1.5",
    "nameKo": "Llama 3.3 Nemotron Super 49B V1.5",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    "description": "NVIDIA의 Llama 3.3 Nemotron Super 49B V1.5 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "NVIDIA의 Llama 3.3 Nemotron Super 49B V1.5 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "id": "or-qwen-qwen3-30b-a3b-instruct-2507",
    "name": "Qwen3 30B A3B Instruct 2507",
    "nameKo": "Qwen3 30B A3B Instruct 2507",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-30b-a3b-instruct-2507",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B Instruct 2507 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "id": "or-deepseek-deepseek-chat-v3-1",
    "name": "DeepSeek V3.1",
    "nameKo": "DeepSeek V3.1",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-chat-v3.1",
    "description": "DeepSeek의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3.1 모델입니다. 추론, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트"
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
    "description": "NVIDIA의 Nemotron 3 Nano 30B A3B Free 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Nano 30B A3B Free 모델입니다. 추론, 코딩, 무료, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료",
      "오픈웨이트"
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
    "description": "Poolside의 Laguna XS.2 Free 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Poolside의 Laguna XS.2 Free 모델입니다. 추론, 코딩, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료"
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
    "description": "Poolside의 Laguna M.1 Free 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Poolside의 Laguna M.1 Free 모델입니다. 추론, 코딩, 무료 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료"
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
    "id": "or-minimax-minimax-m2-1",
    "name": "MiniMax M2.1",
    "nameKo": "MiniMax M2.1",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m2.1",
    "description": "MiniMax의 MiniMax M2.1 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "id": "or-z-ai-glm-5-turbo",
    "name": "GLM 5 Turbo",
    "nameKo": "GLM 5 Turbo",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-5-turbo",
    "description": "Z.ai의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
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
    "id": "or-qwen-qwen3-coder-30b-a3b-instruct",
    "name": "Qwen3 Coder 30B A3B Instruct",
    "nameKo": "Qwen3 Coder 30B A3B Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-coder-30b-a3b-instruct",
    "description": "Alibaba Qwen의 Qwen3 Coder 30B A3B Instruct 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 Coder 30B A3B Instruct 모델입니다. 코딩, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "저비용",
      "오픈웨이트",
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
    "id": "or-nvidia-nemotron-3-super-120b-a12b-free",
    "name": "Nemotron 3 Super Free",
    "nameKo": "Nemotron 3 Super Free",
    "icon": "⚙️",
    "avatarUrl": "/logos/nvidia.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "nvidia/nemotron-3-super-120b-a12b:free",
    "description": "NVIDIA의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "NVIDIA의 Nemotron 3 Super Free 모델입니다. 추론, 장문맥, 무료, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "장문맥",
      "무료",
      "오픈웨이트"
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
    "description": "MiniMax의 MiniMax M2 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "description": "DeepSeek의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "DeepSeek의 R1 0528 모델입니다. 추론, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "범용"
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
    "id": "or-qwen-qwen3-30b-a3b",
    "name": "Qwen3 30B A3B",
    "nameKo": "Qwen3 30B A3B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-30b-a3b",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 30B A3B 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "id": "or-qwen-qwen3-8b",
    "name": "Qwen3 8B",
    "nameKo": "Qwen3 8B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-8b",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 8B 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 14B 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "id": "or-qwen-qwen3-32b",
    "name": "Qwen3 32B",
    "nameKo": "Qwen3 32B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-32b",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 32B 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "id": "or-qwen-qwen3-235b-a22b",
    "name": "Qwen3 235B A22B",
    "nameKo": "Qwen3 235B A22B",
    "icon": "🧩",
    "avatarUrl": "/logos/qwen.png",
    "color": "amber",
    "category": "ai",
    "openrouterModel": "qwen/qwen3-235b-a22b",
    "description": "Alibaba Qwen의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B 모델입니다. 추론, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
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
      "priceTier": "standard",
      "createdAt": "2025-04-28",
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
    "description": "Alibaba Qwen의 대용량 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Alibaba Qwen의 Qwen3 235B A22B Instruct 2507 모델입니다. 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
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
      "priceTier": "low",
      "createdAt": "2025-07-21",
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
    "description": "DeepSeek의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "DeepSeek의 R1 Distill Qwen 32B 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "id": "or-openai-gpt-3-5-turbo-0613",
    "name": "GPT-3.5 Turbo (older v0613)",
    "nameKo": "GPT-3.5 Turbo (older v0613)",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-3.5-turbo-0613",
    "description": "OpenAI의 GPT-3.5 Turbo (older v0613) 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "OpenAI의 GPT-3.5 Turbo (older v0613) 모델입니다. 코딩, 고속, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "고속",
      "범용"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 4095,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2024-01-25",
      "openWeight": false
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
    "description": "DeepSeek의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
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
    "id": "or-openai-gpt-4",
    "name": "GPT-4",
    "nameKo": "GPT-4",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4",
    "description": "OpenAI의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-4 모델입니다. 추론, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "범용",
      "업무"
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
    "description": "OpenAI의 GPT-3.5 Turbo 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "OpenAI의 GPT-3.5 Turbo 모델입니다. 코딩, 고속, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "고속",
      "범용"
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
    "id": "or-deepseek-deepseek-chat",
    "name": "DeepSeek V3",
    "nameKo": "DeepSeek V3",
    "icon": "🧭",
    "avatarUrl": "/logos/deepseek.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "deepseek/deepseek-chat",
    "description": "DeepSeek의 DeepSeek V3 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "DeepSeek의 DeepSeek V3 모델입니다. 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "description": "Mistral AI의 Mistral Large 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Mistral AI의 Mistral Large 모델입니다. 추론, 코딩, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트"
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
    "description": "Liquid AI의 LFM2.5-1.2B-Thinking Free 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Liquid AI의 LFM2.5-1.2B-Thinking Free 모델입니다. 추론, 코딩, 무료, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료",
      "오픈웨이트"
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
    "id": "or-minimax-minimax-m1",
    "name": "MiniMax M1",
    "nameKo": "MiniMax M1",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m1",
    "description": "MiniMax의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "MiniMax의 MiniMax M1 모델입니다. 추론, 장문맥, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "장문맥",
      "고속"
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
    "id": "or-openai-gpt-4o-mini-search-preview",
    "name": "GPT-4o-mini Search Preview",
    "nameKo": "GPT-4o-mini Search Preview",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4o-mini-search-preview",
    "description": "OpenAI의 출처 기반 검색 및 리서치 모델",
    "quote": "가볍고 빠르게 처리합니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 정리해줘",
      "이 주장에 대한 출처를 찾아줘",
      "여러 자료의 차이를 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-4o-mini Search Preview 모델입니다. 저비용, 검색, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "검색",
      "고속"
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
    "id": "or-openai-gpt-4o-search-preview",
    "name": "GPT-4o Search Preview",
    "nameKo": "GPT-4o Search Preview",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4o-search-preview",
    "description": "OpenAI의 출처 기반 검색 및 리서치 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 정리해줘",
      "이 주장에 대한 출처를 찾아줘",
      "여러 자료의 차이를 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-4o Search Preview 모델입니다. 검색, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "검색",
      "범용",
      "업무"
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
    "id": "or-z-ai-glm-4-6",
    "name": "GLM 4.6",
    "nameKo": "GLM 4.6",
    "icon": "🧠",
    "avatarUrl": "/logos/glm.png",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "z-ai/glm-4.6",
    "description": "Z.ai의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Z.ai의 GLM 4.6 모델입니다. 추론, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
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
    "description": "KwaiPilot의 KAT-Coder-Pro V2 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "KwaiPilot의 KAT-Coder-Pro V2 모델입니다. 추론, 코딩, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용"
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
    "description": "Meta의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3.2 3B Instruct Free 모델입니다. 추론, 무료, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "무료",
      "오픈웨이트"
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
    "description": "NVIDIA의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "NVIDIA의 Nemotron Nano 9B V2 Free 모델입니다. 추론, 무료, 오픈웨이트, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "무료",
      "오픈웨이트",
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
    "description": "Z.ai의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Z.ai의 GLM 4.5 모델입니다. 추론, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
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
    "description": "Z.ai의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Z.ai의 GLM 4.5 Air 모델입니다. 추론, 저비용, 오픈웨이트, 중국어 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "id": "or-essentialai-rnj-1-instruct",
    "name": "Rnj 1 Instruct",
    "nameKo": "Rnj 1 Instruct",
    "icon": "🧩",
    "avatarUrl": "/logos/openrouter/essentialai.png",
    "color": "orange",
    "category": "ai",
    "openrouterModel": "essentialai/rnj-1-instruct",
    "description": "Essential AI의 Rnj 1 Instruct 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Essential AI의 Rnj 1 Instruct 모델입니다. 추론, 코딩, 저비용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용"
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
    "description": "Cohere의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Cohere의 Command R7B (12-2024) 모델입니다. 추론, 저비용, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "범용"
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
    "description": "Reka AI의 Reka Flash 3 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Reka AI의 Reka Flash 3 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "id": "or-openai-gpt-3-5-turbo-instruct",
    "name": "GPT-3.5 Turbo Instruct",
    "nameKo": "GPT-3.5 Turbo Instruct",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-3.5-turbo-instruct",
    "description": "OpenAI의 빠른 응답과 비용 효율 중심 모델",
    "quote": "가볍고 빠르게 처리합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-3.5 Turbo Instruct 모델입니다. 고속, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "고속",
      "범용",
      "업무"
    ],
    "modelInfo": {
      "provider": "OpenAI",
      "contextLength": 4095,
      "inputModalities": [
        "text"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2023-09-28",
      "openWeight": false
    }
  },
  {
    "id": "or-openai-gpt-3-5-turbo-16k",
    "name": "GPT-3.5 Turbo 16k",
    "nameKo": "GPT-3.5 Turbo 16k",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-3.5-turbo-16k",
    "description": "OpenAI의 빠른 응답과 비용 효율 중심 모델",
    "quote": "가볍고 빠르게 처리합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-3.5 Turbo 16k 모델입니다. 고속, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "고속",
      "범용",
      "업무"
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
      "createdAt": "2023-08-28",
      "openWeight": false
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
    "description": "Mistral AI의 Mixtral 8x22B Instruct 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Mistral AI의 Mixtral 8x22B Instruct 모델입니다. 코딩, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "오픈웨이트",
      "범용"
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
    "id": "or-aion-labs-aion-1-0",
    "name": "Aion-1.0",
    "nameKo": "Aion-1.0",
    "icon": "🧠",
    "avatarUrl": "/logos/openrouter/aion-labs.png",
    "color": "violet",
    "category": "ai",
    "openrouterModel": "aion-labs/aion-1.0",
    "description": "Aion Labs의 Aion-1.0 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "description": "Aion Labs의 Aion-1.0-Mini 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "description": "Nous Research의 Hermes 3 70B Instruct 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Nous Research의 Hermes 3 70B Instruct 모델입니다. 추론, 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "description": "Nous Research의 Hermes 3 405B Instruct 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Nous Research의 Hermes 3 405B Instruct 모델입니다. 추론, 코딩, 오픈웨이트, 검색 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "검색"
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
    "description": "Arcee AI의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Arcee AI의 Trinity Mini 모델입니다. 추론, 저비용, 오픈웨이트, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
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
    "description": "Aion Labs의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
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
    "description": "Nous Research의 출처 기반 검색 및 리서치 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 정리해줘",
      "이 주장에 대한 출처를 찾아줘",
      "여러 자료의 차이를 비교해줘"
    ],
    "greeting": "Nous Research의 Hermes 4 70B 모델입니다. 추론, 저비용, 오픈웨이트, 검색 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트",
      "검색"
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
    "description": "Nous Research의 출처 기반 검색 및 리서치 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "최신 자료를 근거와 함께 정리해줘",
      "이 주장에 대한 출처를 찾아줘",
      "여러 자료의 차이를 비교해줘"
    ],
    "greeting": "Nous Research의 Hermes 4 405B 모델입니다. 추론, 오픈웨이트, 검색 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "검색"
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
    "description": "Morph의 Morph V3 Large 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "id": "or-openai-gpt-4-turbo-preview",
    "name": "GPT-4 Turbo Preview",
    "nameKo": "GPT-4 Turbo Preview",
    "icon": "🤖",
    "avatarUrl": "/logos/gpt.svg",
    "color": "blue",
    "category": "ai",
    "openrouterModel": "openai/gpt-4-turbo-preview",
    "description": "OpenAI의 빠른 응답과 비용 효율 중심 모델",
    "quote": "가볍고 빠르게 처리합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "OpenAI의 GPT-4 Turbo Preview 모델입니다. 고속, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "고속",
      "범용",
      "업무"
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
    "description": "Mistral AI의 일반 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Mistral AI의 Saba 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
      "범용"
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
    "description": "Nous Research의 Hermes 3 405B Instruct Free 코딩 및 에이전트 작업 특화 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Nous Research의 Hermes 3 405B Instruct Free 모델입니다. 추론, 코딩, 무료, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "코딩",
      "무료",
      "오픈웨이트"
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
    "description": "Meta의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3.3 70B Instruct 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
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
    "description": "Mistral AI의 빠른 응답과 비용 효율 중심 모델",
    "quote": "가볍고 빠르게 처리합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Mistral AI의 Mistral Small 3 모델입니다. 저비용, 오픈웨이트, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
      "고속"
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
    "description": "InclusionAI의 대용량 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "InclusionAI의 Ling-2.6-1T 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
      "범용"
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
    "description": "InclusionAI의 빠른 응답과 비용 효율 중심 모델",
    "quote": "가볍고 빠르게 처리합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "InclusionAI의 Ling-2.6-flash 모델입니다. 저비용, 오픈웨이트, 고속 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
      "고속"
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
    "id": "or-minimax-minimax-m2-her",
    "name": "MiniMax M2-her",
    "nameKo": "MiniMax M2-her",
    "icon": "🧬",
    "avatarUrl": "/logos/minimax.png",
    "color": "purple",
    "category": "ai",
    "openrouterModel": "minimax/minimax-m2-her",
    "description": "MiniMax의 빠른 응답과 비용 효율 중심 모델",
    "quote": "가볍고 빠르게 처리합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
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
    "description": "Moonshot AI의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Moonshot AI의 Kimi K2 0711 모델입니다. 중국어, 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "중국어",
      "범용",
      "업무"
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
    "description": "Prime Intellect의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Prime Intellect의 INTELLECT-3 모델입니다. 추론, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트"
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
    "description": "Ai2의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Ai2의 Olmo 3 32B Think 모델입니다. 추론, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "저비용",
      "오픈웨이트"
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
    "description": "Meta의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3.3 70B Instruct Free 모델입니다. 무료, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "무료",
      "오픈웨이트",
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
    "description": "Meta의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3.2 1B Instruct 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
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
    "description": "Deep Cogito의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Deep Cogito의 Cogito v2.1 671B 모델입니다. 추론, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "범용"
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
    "description": "Meta의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3.1 8B Instruct 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
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
    "description": "Meta의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3.1 70B Instruct 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
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
    "description": "Arcee AI의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
    ],
    "greeting": "Arcee AI의 Virtuoso Large 모델입니다. 추론, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "추론",
      "오픈웨이트",
      "범용"
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
    "description": "Relace의 Relace Search 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Relace의 Relace Search 모델입니다. 코딩, 검색, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "검색",
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
    "description": "Arcee AI의 Coder Large 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
    ],
    "greeting": "Arcee AI의 Coder Large 모델입니다. 코딩, 저비용, 오픈웨이트 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "코딩",
      "저비용",
      "오픈웨이트"
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
    "description": "Mistral AI의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Mistral AI의 Mistral Nemo 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
      "범용"
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
    "description": "Meta의 일반 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3 8B Instruct 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
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
    "description": "Meta의 일반 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Meta의 Llama 3 70B Instruct 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
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
    "id": "or-morph-morph-v3-fast",
    "name": "Morph V3 Fast",
    "nameKo": "Morph V3 Fast",
    "icon": "🧬",
    "avatarUrl": "/logos/openrouter/morph.png",
    "color": "indigo",
    "category": "ai",
    "openrouterModel": "morph/morph-v3-fast",
    "description": "Morph의 Morph V3 Fast 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "description": "Relace의 Relace Apply 3 코딩 및 에이전트 작업 특화 모델",
    "quote": "코드와 작업 흐름에 강합니다",
    "sampleQuestions": [
      "이 코드 구조를 리팩터링해줘",
      "버그 원인을 단계별로 찾아줘",
      "API 설계를 검토해줘"
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
    "description": "Liquid AI의 128K급 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Liquid AI의 LFM2-24B-A2B 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
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
    "id": "or-switchpoint-router",
    "name": "Switchpoint Router",
    "nameKo": "Switchpoint Router",
    "icon": "🔀",
    "avatarUrl": "/logos/openrouter/switchpoint.png",
    "color": "green",
    "category": "ai",
    "openrouterModel": "switchpoint/router",
    "description": "Switchpoint의 복잡한 추론과 분석에 강한 모델",
    "quote": "깊게 따져보고 정리하겠습니다",
    "sampleQuestions": [
      "복잡한 문제를 단계별로 풀어줘",
      "논리의 약점을 찾아줘",
      "선택지를 기준별로 비교해줘"
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
    "description": "Liquid AI의 일반 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Liquid AI의 LFM2.5-1.2B-Instruct Free 모델입니다. 무료, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "무료",
      "오픈웨이트",
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
    "description": "Microsoft의 일반 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Microsoft의 WizardLM-2 8x22B 모델입니다. 저비용, 오픈웨이트, 범용 작업에 맞춰 도와드리겠습니다",
    "tags": [
      "저비용",
      "오픈웨이트",
      "범용"
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
    "id": "or-aion-labs-aion-rp-llama-3-1-8b",
    "name": "Aion-RP 1.0 (8B)",
    "nameKo": "Aion-RP 1.0 (8B)",
    "icon": "🧠",
    "avatarUrl": "/logos/openrouter/aion-labs.png",
    "color": "violet",
    "category": "ai",
    "openrouterModel": "aion-labs/aion-rp-llama-3.1-8b",
    "description": "Aion Labs의 일반 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
    ],
    "greeting": "Aion Labs의 Aion-RP 1.0 (8B) 모델입니다. 범용, 업무 작업에 맞춰 도와드리겠습니다",
    "tags": [
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
    "description": "Inflection AI의 일반 문맥 범용 대화 모델",
    "quote": "상황에 맞게 균형 있게 답합니다",
    "sampleQuestions": [
      "핵심만 빠르게 요약해줘",
      "실행 가능한 계획으로 정리해줘",
      "장단점을 표로 비교해줘"
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
  }
] satisfies Expert[];

export const OPENROUTER_ADDED_ABILITIES = {
  "or-openai-gpt-oss-120b": {
    "coding": 98,
    "creativity": 61,
    "reasoning": 98,
    "math": 96,
    "multilingual": 68,
    "speed": 65,
    "costEfficiency": 83,
    "contextWindow": 78
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
  "or-openai-gpt-oss-120b-free": {
    "coding": 98,
    "creativity": 61,
    "reasoning": 98,
    "math": 92,
    "multilingual": 68,
    "speed": 65,
    "costEfficiency": 93,
    "contextWindow": 78
  },
  "or-qwen-qwen3-next-80b-a3b-thinking": {
    "coding": 93,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 85,
    "speed": 81,
    "costEfficiency": 90,
    "contextWindow": 88
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
  "or-qwen-qwen3-coder-next": {
    "coding": 92,
    "creativity": 66,
    "reasoning": 89,
    "math": 76,
    "multilingual": 85,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 88
  },
  "or-openai-gpt-oss-20b": {
    "coding": 77,
    "creativity": 53,
    "reasoning": 95,
    "math": 81,
    "multilingual": 68,
    "speed": 70,
    "costEfficiency": 87,
    "contextWindow": 78
  },
  "or-qwen-qwen3-max": {
    "coding": 83,
    "creativity": 76,
    "reasoning": 98,
    "math": 83,
    "multilingual": 85,
    "speed": 63,
    "costEfficiency": 72,
    "contextWindow": 88
  },
  "or-openai-gpt-oss-20b-free": {
    "coding": 77,
    "creativity": 53,
    "reasoning": 91,
    "math": 77,
    "multilingual": 68,
    "speed": 70,
    "costEfficiency": 97,
    "contextWindow": 78
  },
  "or-qwen-qwen-plus-2025-07-28-thinking": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 85,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 98
  },
  "or-qwen-qwen-plus-2025-07-28": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 85,
    "speed": 71,
    "costEfficiency": 88,
    "contextWindow": 98
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
  "or-openai-gpt-3-5-turbo-0613": {
    "coding": 90,
    "creativity": 66,
    "reasoning": 94,
    "math": 84,
    "multilingual": 66,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 45
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
  "or-openai-gpt-4": {
    "coding": 72,
    "creativity": 66,
    "reasoning": 98,
    "math": 90,
    "multilingual": 66,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 45
  },
  "or-openai-gpt-3-5-turbo": {
    "coding": 82,
    "creativity": 66,
    "reasoning": 94,
    "math": 84,
    "multilingual": 66,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 45
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
  "or-openai-gpt-3-5-turbo-instruct": {
    "coding": 72,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 66,
    "speed": 76,
    "costEfficiency": 77,
    "contextWindow": 45
  },
  "or-openai-gpt-3-5-turbo-16k": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 66,
    "speed": 76,
    "costEfficiency": 77,
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
  "or-openai-gpt-4-turbo-preview": {
    "coding": 78,
    "creativity": 66,
    "reasoning": 94,
    "math": 79,
    "multilingual": 68,
    "speed": 72,
    "costEfficiency": 55,
    "contextWindow": 68
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
  "or-inflection-inflection-3-productivity": {
    "coding": 64,
    "creativity": 62,
    "reasoning": 82,
    "math": 75,
    "multilingual": 66,
    "speed": 59,
    "costEfficiency": 50,
    "contextWindow": 45
  }
} satisfies Record<string, AIAbilityStats>;

export const OPENROUTER_ADDED_BRANDS = {
  "or-openai-gpt-oss-120b": "gpt",
  "or-google-gemma-2-27b-it": "gemini",
  "or-perplexity-sonar-deep-research": "perplexity",
  "or-deepseek-deepseek-v4-pro": "deepseek",
  "or-qwen-qwen3-7-max": "qwen",
  "or-meta-llama-llama-3-2-3b-instruct": "other",
  "or-mistralai-mistral-large-2407": "other",
  "or-cohere-command-r-08-2024": "other",
  "or-microsoft-phi-4-mini-instruct": "other",
  "or-amazon-nova-micro-v1": "other",
  "or-nvidia-nemotron-3-nano-30b-a3b": "other",
  "or-moonshotai-kimi-k2-0905": "other",
  "or-z-ai-glm-5": "other",
  "or-minimax-minimax-m2-5": "other",
  "or-tencent-hy3-preview": "other",
  "or-ibm-granite-granite-4-1-8b": "other",
  "or-qwen-qwen3-6-max-preview": "qwen",
  "or-openai-gpt-oss-120b-free": "gpt",
  "or-qwen-qwen3-next-80b-a3b-thinking": "qwen",
  "or-qwen-qwen3-next-80b-a3b-instruct": "qwen",
  "or-qwen-qwen3-coder": "qwen",
  "or-qwen-qwen3-next-80b-a3b-instruct-free": "qwen",
  "or-openai-o3-mini": "gpt",
  "or-qwen-qwen3-coder-free": "qwen",
  "or-deepseek-deepseek-v4-flash": "deepseek",
  "or-deepseek-deepseek-v3-2": "deepseek",
  "or-qwen-qwen3-coder-next": "qwen",
  "or-openai-gpt-oss-20b": "gpt",
  "or-qwen-qwen3-max": "qwen",
  "or-openai-gpt-oss-20b-free": "gpt",
  "or-qwen-qwen-plus-2025-07-28-thinking": "qwen",
  "or-qwen-qwen-plus-2025-07-28": "qwen",
  "or-qwen-qwen3-coder-plus": "qwen",
  "or-qwen-qwen3-coder-flash": "qwen",
  "or-qwen-qwen3-235b-a22b-thinking-2507": "qwen",
  "or-openai-o3-mini-high": "gpt",
  "or-qwen-qwen-2-5-coder-32b-instruct": "qwen",
  "or-nvidia-nemotron-3-ultra-550b-a55b": "other",
  "or-arcee-ai-trinity-large-thinking": "other",
  "or-z-ai-glm-4-7-flash": "other",
  "or-inclusionai-ring-2-6-1t": "other",
  "or-deepseek-deepseek-v3-2-exp": "deepseek",
  "or-nvidia-nemotron-3-ultra-550b-a55b-free": "other",
  "or-deepseek-deepseek-v3-1-terminus": "deepseek",
  "or-qwen-qwen3-30b-a3b-thinking-2507": "qwen",
  "or-z-ai-glm-4-7": "other",
  "or-nvidia-llama-3-3-nemotron-super-49b-v1-5": "other",
  "or-qwen-qwen3-30b-a3b-instruct-2507": "qwen",
  "or-deepseek-deepseek-chat-v3-1": "deepseek",
  "or-nvidia-nemotron-3-nano-30b-a3b-free": "other",
  "or-poolside-laguna-xs-2-free": "other",
  "or-poolside-laguna-m-1-free": "other",
  "or-minimax-minimax-m2-1": "other",
  "or-z-ai-glm-5-turbo": "other",
  "or-qwen-qwen3-coder-30b-a3b-instruct": "qwen",
  "or-nvidia-nemotron-3-super-120b-a12b-free": "other",
  "or-minimax-minimax-m2": "other",
  "or-deepseek-deepseek-r1-0528": "deepseek",
  "or-qwen-qwen3-30b-a3b": "qwen",
  "or-qwen-qwen3-8b": "qwen",
  "or-qwen-qwen3-14b": "qwen",
  "or-qwen-qwen3-32b": "qwen",
  "or-qwen-qwen3-235b-a22b": "qwen",
  "or-qwen-qwen3-235b-a22b-2507": "qwen",
  "or-deepseek-deepseek-r1-distill-qwen-32b": "deepseek",
  "or-openai-gpt-3-5-turbo-0613": "gpt",
  "or-deepseek-deepseek-r1-distill-llama-70b": "deepseek",
  "or-openai-gpt-4": "gpt",
  "or-openai-gpt-3-5-turbo": "gpt",
  "or-deepseek-deepseek-chat": "deepseek",
  "or-mistralai-mistral-large": "other",
  "or-liquid-lfm-2-5-1-2b-thinking-free": "other",
  "or-minimax-minimax-m1": "other",
  "or-openai-gpt-4o-mini-search-preview": "gpt",
  "or-openai-gpt-4o-search-preview": "gpt",
  "or-z-ai-glm-4-6": "other",
  "or-kwaipilot-kat-coder-pro-v2": "other",
  "or-meta-llama-llama-3-2-3b-instruct-free": "other",
  "or-nvidia-nemotron-nano-9b-v2-free": "other",
  "or-z-ai-glm-4-5": "other",
  "or-z-ai-glm-4-5-air": "other",
  "or-essentialai-rnj-1-instruct": "other",
  "or-cohere-command-r7b-12-2024": "other",
  "or-rekaai-reka-flash-3": "other",
  "or-openai-gpt-3-5-turbo-instruct": "gpt",
  "or-openai-gpt-3-5-turbo-16k": "gpt",
  "or-mistralai-mixtral-8x22b-instruct": "other",
  "or-aion-labs-aion-1-0": "other",
  "or-aion-labs-aion-1-0-mini": "other",
  "or-nousresearch-hermes-3-llama-3-1-70b": "other",
  "or-nousresearch-hermes-3-llama-3-1-405b": "other",
  "or-arcee-ai-trinity-mini": "other",
  "or-aion-labs-aion-2-0": "other",
  "or-nousresearch-hermes-4-70b": "other",
  "or-nousresearch-hermes-4-405b": "other",
  "or-morph-morph-v3-large": "other",
  "or-openai-gpt-4-turbo-preview": "gpt",
  "or-mistralai-mistral-saba": "other",
  "or-nousresearch-hermes-3-llama-3-1-405b-free": "other",
  "or-meta-llama-llama-3-3-70b-instruct": "other",
  "or-mistralai-mistral-small-24b-instruct-2501": "other",
  "or-inclusionai-ling-2-6-1t": "other",
  "or-inclusionai-ling-2-6-flash": "other",
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
  "or-switchpoint-router": "other",
  "or-liquid-lfm-2-5-1-2b-instruct-free": "other",
  "or-microsoft-wizardlm-2-8x22b": "other",
  "or-aion-labs-aion-rp-llama-3-1-8b": "other",
  "or-inflection-inflection-3-productivity": "other"
} satisfies Record<string, ModelBrand>;

export const OPENROUTER_ADDED_OPENSOURCE_IDS = [
  "or-deepseek-deepseek-v4-pro",
  "or-qwen-qwen3-7-max",
  "or-meta-llama-llama-3-2-3b-instruct",
  "or-mistralai-mistral-large-2407",
  "or-microsoft-phi-4-mini-instruct",
  "or-nvidia-nemotron-3-nano-30b-a3b",
  "or-z-ai-glm-5",
  "or-qwen-qwen3-6-max-preview",
  "or-qwen-qwen3-next-80b-a3b-thinking",
  "or-qwen-qwen3-next-80b-a3b-instruct",
  "or-qwen-qwen3-coder",
  "or-qwen-qwen3-next-80b-a3b-instruct-free",
  "or-qwen-qwen3-coder-free",
  "or-deepseek-deepseek-v4-flash",
  "or-deepseek-deepseek-v3-2",
  "or-qwen-qwen3-coder-next",
  "or-qwen-qwen3-max",
  "or-qwen-qwen-plus-2025-07-28-thinking",
  "or-qwen-qwen-plus-2025-07-28",
  "or-qwen-qwen3-coder-plus",
  "or-qwen-qwen3-coder-flash",
  "or-qwen-qwen3-235b-a22b-thinking-2507",
  "or-qwen-qwen-2-5-coder-32b-instruct",
  "or-nvidia-nemotron-3-ultra-550b-a55b",
  "or-arcee-ai-trinity-large-thinking",
  "or-z-ai-glm-4-7-flash",
  "or-inclusionai-ring-2-6-1t",
  "or-deepseek-deepseek-v3-2-exp",
  "or-nvidia-nemotron-3-ultra-550b-a55b-free",
  "or-deepseek-deepseek-v3-1-terminus",
  "or-qwen-qwen3-30b-a3b-thinking-2507",
  "or-z-ai-glm-4-7",
  "or-nvidia-llama-3-3-nemotron-super-49b-v1-5",
  "or-qwen-qwen3-30b-a3b-instruct-2507",
  "or-deepseek-deepseek-chat-v3-1",
  "or-nvidia-nemotron-3-nano-30b-a3b-free",
  "or-z-ai-glm-5-turbo",
  "or-qwen-qwen3-coder-30b-a3b-instruct",
  "or-nvidia-nemotron-3-super-120b-a12b-free",
  "or-deepseek-deepseek-r1-0528",
  "or-qwen-qwen3-30b-a3b",
  "or-qwen-qwen3-8b",
  "or-qwen-qwen3-14b",
  "or-qwen-qwen3-32b",
  "or-qwen-qwen3-235b-a22b",
  "or-qwen-qwen3-235b-a22b-2507",
  "or-deepseek-deepseek-r1-distill-qwen-32b",
  "or-deepseek-deepseek-r1-distill-llama-70b",
  "or-deepseek-deepseek-chat",
  "or-mistralai-mistral-large",
  "or-liquid-lfm-2-5-1-2b-thinking-free",
  "or-z-ai-glm-4-6",
  "or-meta-llama-llama-3-2-3b-instruct-free",
  "or-nvidia-nemotron-nano-9b-v2-free",
  "or-z-ai-glm-4-5",
  "or-z-ai-glm-4-5-air",
  "or-rekaai-reka-flash-3",
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
  "or-microsoft-wizardlm-2-8x22b"
] as const;

export const OPENROUTER_ADDED_REASONING_IDS = [
  "or-openai-gpt-oss-120b",
  "or-perplexity-sonar-deep-research",
  "or-deepseek-deepseek-v4-pro",
  "or-qwen-qwen3-7-max",
  "or-cohere-command-r-08-2024",
  "or-z-ai-glm-5",
  "or-minimax-minimax-m2-5",
  "or-tencent-hy3-preview",
  "or-qwen-qwen3-6-max-preview",
  "or-openai-gpt-oss-120b-free",
  "or-qwen-qwen3-next-80b-a3b-thinking",
  "or-qwen-qwen3-coder",
  "or-openai-o3-mini",
  "or-qwen-qwen3-coder-free",
  "or-deepseek-deepseek-v4-flash",
  "or-deepseek-deepseek-v3-2"
] as const;

export const OPENROUTER_ADDED_FAST_IDS = [] as const;

export const OPENROUTER_ADDED_FLAGSHIP_IDS = [
  "or-openai-gpt-oss-120b",
  "or-google-gemma-2-27b-it",
  "or-perplexity-sonar-deep-research",
  "or-deepseek-deepseek-v4-pro",
  "or-qwen-qwen3-7-max",
  "or-meta-llama-llama-3-2-3b-instruct",
  "or-mistralai-mistral-large-2407",
  "or-cohere-command-r-08-2024",
  "or-nvidia-nemotron-3-nano-30b-a3b",
  "or-z-ai-glm-5",
  "or-minimax-minimax-m2-5",
  "or-tencent-hy3-preview",
  "or-qwen-qwen3-6-max-preview",
  "or-openai-gpt-oss-120b-free",
  "or-qwen-qwen3-next-80b-a3b-thinking",
  "or-qwen-qwen3-next-80b-a3b-instruct",
  "or-qwen-qwen3-coder",
  "or-qwen-qwen3-next-80b-a3b-instruct-free",
  "or-openai-o3-mini",
  "or-qwen-qwen3-coder-free"
] as const;

export type { ModelInfo };
