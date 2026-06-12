import type { Expert } from '@/types/expert';

export const OPENROUTER_EXISTING_MODEL_OVERRIDES = {
  "developer-yjh": {
    "description": "Claude Sonnet 4.6: Anthropic의 코드 작성·리팩터링 중심 모델",
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
      "createdAt": "2026-02-17",
      "openWeight": false
    }
  },
  "ancano-pro": {
    "description": "Auto Router: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "저비용"
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
    }
  },
  "auto-gpt": {
    "description": "Claude Sonnet 4.6: Anthropic의 코드 작성·리팩터링 중심 모델",
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
      "createdAt": "2026-02-17",
      "openWeight": false
    }
  },
  "gpt": {
    "name": "GPT-4.1",
    "nameKo": "GPT-4.1",
    "description": "GPT-4.1: OpenAI의 코드 작성·리팩터링 중심 모델",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    }
  },
  "gpt-mini": {
    "name": "GPT-4.1 Mini",
    "nameKo": "GPT-4.1 Mini",
    "description": "GPT-4.1 Mini: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
    }
  },
  "gpt-nano": {
    "name": "GPT-4.1 Nano",
    "nameKo": "GPT-4.1 Nano",
    "description": "GPT-4.1 Nano: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
    }
  },
  "claude": {
    "name": "Claude Opus 4.6",
    "nameKo": "Claude Opus 4.6",
    "description": "Claude Opus 4.6: Anthropic의 코드 작성·리팩터링 중심 모델",
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
      "createdAt": "2026-02-04",
      "openWeight": false
    }
  },
  "claude-sonnet": {
    "name": "Claude Sonnet 4.5",
    "nameKo": "Claude Sonnet 4.5",
    "description": "Claude Sonnet 4.5: Anthropic의 코드 작성·리팩터링 중심 모델",
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
      "createdAt": "2025-09-29",
      "openWeight": false
    }
  },
  "claude-sonnet-4.6": {
    "name": "Claude Sonnet 4.6",
    "nameKo": "Claude Sonnet 4.6",
    "description": "Claude Sonnet 4.6: Anthropic의 코드 작성·리팩터링 중심 모델",
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
      "createdAt": "2026-02-17",
      "openWeight": false
    }
  },
  "claude-haiku": {
    "name": "Claude Haiku 4.5",
    "nameKo": "Claude Haiku 4.5",
    "description": "Claude Haiku 4.5: 128K급 문맥에서 이미지·문서 이해를 곁들인 대화 모델",
    "tags": [
      "추론",
      "시각입력",
      "고속",
      "툴사용"
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
    }
  },
  "gemini": {
    "name": "Gemini 2.5 Flash",
    "nameKo": "Gemini 2.5 Flash",
    "description": "Gemini 2.5 Flash: Google의 코드 작성·리팩터링 중심 모델",
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
        "audio",
        "video"
      ],
      "outputModalities": [
        "text"
      ],
      "priceTier": "standard",
      "createdAt": "2025-06-17",
      "openWeight": false
    }
  },
  "gemini-3-flash": {
    "name": "Gemini 3 Flash Preview",
    "nameKo": "Gemini 3 Flash Preview",
    "description": "Gemini 3 Flash Preview: Google의 코드 작성·리팩터링 중심 모델",
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
      "priceTier": "standard",
      "createdAt": "2025-12-17",
      "openWeight": false
    }
  },
  "gemini-3.1": {
    "name": "Gemini 3.1 Flash Lite Preview",
    "nameKo": "Gemini 3.1 Flash Lite Preview",
    "description": "Gemini 3.1 Flash Lite Preview: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "고속"
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
    }
  },
  "gemini-pro": {
    "name": "Gemini 3.1 Pro Preview",
    "nameKo": "Gemini 3.1 Pro Preview",
    "description": "Gemini 3.1 Pro Preview: Google의 코드 작성·리팩터링 중심 모델",
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
    }
  },
  "gemini-flash-lite": {
    "name": "Gemini 2.5 Flash Lite",
    "nameKo": "Gemini 2.5 Flash Lite",
    "description": "Gemini 2.5 Flash Lite: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
      "createdAt": "2025-07-22",
      "openWeight": false
    }
  },
  "perplexity": {
    "name": "Sonar",
    "nameKo": "Sonar",
    "description": "Sonar: 출처 확인과 최신 정보 정리에 강한 검색형 모델",
    "tags": [
      "검색",
      "시각입력",
      "범용"
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
    }
  },
  "perplexity-pro": {
    "name": "Sonar Pro",
    "nameKo": "Sonar Pro",
    "description": "Sonar Pro: 출처 확인과 최신 정보 정리에 강한 검색형 모델",
    "tags": [
      "추론",
      "검색",
      "시각입력"
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
    }
  },
  "grok": {
    "name": "Grok 4.3",
    "nameKo": "Grok 4.3",
    "description": "Grok 4.3: xAI의 코드 작성·리팩터링 중심 모델",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
    }
  },
  "grok-4.2": {
    "name": "Grok 4.20",
    "nameKo": "Grok 4.20",
    "description": "Grok 4.20: xAI의 코드 작성·리팩터링 중심 모델",
    "tags": [
      "추론",
      "코딩",
      "시각입력",
      "장문맥"
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
  "deepseek": {
    "name": "DeepSeek V3 0324",
    "nameKo": "DeepSeek V3 0324",
    "description": "DeepSeek V3 0324: DeepSeek의 128K급 문맥 범용 대화 모델",
    "tags": [
      "오픈웨이트",
      "저비용",
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
      "priceTier": "low",
      "createdAt": "2025-03-24",
      "openWeight": true
    }
  },
  "deepseek-r1": {
    "name": "R1",
    "nameKo": "R1",
    "description": "R1: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
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
      "createdAt": "2025-01-20",
      "openWeight": true
    }
  },
  "qwen": {
    "name": "Qwen3.5-Flash",
    "nameKo": "Qwen3.5-Flash",
    "description": "Qwen3.5-Flash: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
      "createdAt": "2026-02-25",
      "openWeight": true
    }
  },
  "qwen-9b": {
    "name": "Qwen3.5-9B",
    "nameKo": "Qwen3.5-9B",
    "description": "Qwen3.5-9B: Alibaba Qwen의 코드 작성·리팩터링 중심 모델",
    "tags": [
      "추론",
      "코딩",
      "오픈웨이트",
      "시각입력"
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
    }
  },
  "qwen-plus": {
    "name": "Qwen3.6 Plus",
    "nameKo": "Qwen3.6 Plus",
    "description": "Qwen3.6 Plus: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
      "createdAt": "2026-04-02",
      "openWeight": true
    }
  },
  "qwen-thinking": {
    "name": "Qwen3 Max Thinking",
    "nameKo": "Qwen3 Max Thinking",
    "description": "Qwen3 Max Thinking: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
    "tags": [
      "추론",
      "오픈웨이트",
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
      "priceTier": "standard",
      "createdAt": "2026-02-09",
      "openWeight": true
    }
  },
  "llama-maverick": {
    "name": "Llama 4 Maverick",
    "nameKo": "Llama 4 Maverick",
    "description": "Llama 4 Maverick: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
    }
  },
  "llama-scout": {
    "name": "Llama 4 Scout",
    "nameKo": "Llama 4 Scout",
    "description": "Llama 4 Scout: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
    }
  },
  "mistral-large": {
    "name": "Mistral Large 3 2512",
    "nameKo": "Mistral Large 3 2512",
    "description": "Mistral Large 3 2512: 대용량 문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
    }
  },
  "mistral-medium": {
    "name": "Mistral Medium 3.1",
    "nameKo": "Mistral Medium 3.1",
    "description": "Mistral Medium 3.1: 128K급 문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
    }
  },
  "mistral-small": {
    "name": "Mistral Small 4",
    "nameKo": "Mistral Small 4",
    "description": "Mistral Small 4: 대용량 문맥에서 이미지·문서 이해를 곁들인 대화 모델",
    "tags": [
      "추론",
      "오픈웨이트",
      "시각입력",
      "저비용"
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
    }
  },
  "codestral": {
    "name": "Codestral 2508",
    "nameKo": "Codestral 2508",
    "description": "Codestral 2508: Mistral AI의 코드 작성·리팩터링 중심 모델",
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
    }
  },
  "devstral": {
    "name": "Devstral 2 2512",
    "nameKo": "Devstral 2 2512",
    "description": "Devstral 2 2512: Mistral AI의 코드 작성·리팩터링 중심 모델",
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
    }
  },
  "gemma": {
    "name": "Gemma 4 31B",
    "nameKo": "Gemma 4 31B",
    "description": "Gemma 4 31B: 대용량 문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
      "createdAt": "2026-04-02",
      "openWeight": true
    }
  },
  "phi": {
    "name": "Phi 4",
    "nameKo": "Phi 4",
    "description": "Phi 4: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
    "tags": [
      "추론",
      "오픈웨이트",
      "저비용",
      "구조화"
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
    }
  },
  "command-r-plus": {
    "name": "Command R+ (08-2024)",
    "nameKo": "Command R+ (08-2024)",
    "description": "Command R+ (08-2024): Cohere의 128K급 문맥 범용 대화 모델",
    "tags": [
      "툴사용",
      "구조화",
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
      "priceTier": "premium",
      "createdAt": "2024-08-30",
      "openWeight": false
    }
  },
  "command-a": {
    "name": "Command A",
    "nameKo": "Command A",
    "description": "Command A: Cohere의 코드 작성·리팩터링 중심 모델",
    "tags": [
      "코딩",
      "구조화",
      "범용"
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
    }
  },
  "nova-premier": {
    "name": "Nova Premier 1.0",
    "nameKo": "Nova Premier 1.0",
    "description": "Nova Premier 1.0: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "툴사용"
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
    }
  },
  "nova-2-lite": {
    "name": "Nova 2 Lite",
    "nameKo": "Nova 2 Lite",
    "description": "Nova 2 Lite: 1M 장문맥에서 이미지·문서 이해를 곁들인 대화 모델",
    "tags": [
      "추론",
      "시각입력",
      "장문맥",
      "고속"
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
    }
  },
  "dolphin": {
    "name": "Uncensored Free",
    "nameKo": "Uncensored Free",
    "description": "Uncensored Free: Cognitive Computations의 일반 문맥 범용 대화 모델",
    "tags": [
      "오픈웨이트",
      "무료",
      "구조화"
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
    }
  },
  "glm": {
    "name": "GLM 5.1",
    "nameKo": "GLM 5.1",
    "description": "GLM 5.1: Z.ai의 코드 작성·리팩터링 중심 모델",
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
      "createdAt": "2026-04-07",
      "openWeight": true
    }
  },
  "mimo": {
    "name": "MiMo-V2.5-Pro",
    "nameKo": "MiMo-V2.5-Pro",
    "description": "MiMo-V2.5-Pro: Xiaomi의 코드 작성·리팩터링 중심 모델",
    "tags": [
      "추론",
      "코딩",
      "장문맥",
      "저비용"
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
    }
  },
  "mimo-flash": {
    "name": "MiMo-V2-Flash",
    "nameKo": "MiMo-V2-Flash",
    "description": "MiMo-V2-Flash: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
    "tags": [
      "추론",
      "저비용",
      "고속",
      "툴사용"
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
    }
  },
  "nemotron": {
    "name": "Nemotron 3 Super",
    "nameKo": "Nemotron 3 Super",
    "description": "Nemotron 3 Super: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
    "tags": [
      "추론",
      "오픈웨이트",
      "장문맥",
      "저비용"
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
    }
  },
  "seed": {
    "name": "Seed-2.0-Lite",
    "nameKo": "Seed-2.0-Lite",
    "description": "Seed-2.0-Lite: 대용량 문맥에서 이미지·문서 이해를 곁들인 대화 모델",
    "tags": [
      "추론",
      "시각입력",
      "고속",
      "툴사용"
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
    }
  },
  "seed-mini": {
    "name": "Seed-2.0-Mini",
    "nameKo": "Seed-2.0-Mini",
    "description": "Seed-2.0-Mini: 대용량 문맥에서 이미지·문서 이해를 곁들인 대화 모델",
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
    }
  },
  "minimax": {
    "name": "MiniMax M2.7",
    "nameKo": "MiniMax M2.7",
    "description": "MiniMax M2.7: MiniMax의 코드 작성·리팩터링 중심 모델",
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
      "createdAt": "2026-03-18",
      "openWeight": false
    }
  },
  "kimi": {
    "name": "Kimi K2.5",
    "nameKo": "Kimi K2.5",
    "description": "Kimi K2.5: Moonshot AI의 코드 작성·리팩터링 중심 모델",
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
      "createdAt": "2026-01-27",
      "openWeight": false
    }
  },
  "kimi-thinking": {
    "name": "Kimi K2 Thinking",
    "nameKo": "Kimi K2 Thinking",
    "description": "Kimi K2 Thinking: Moonshot AI의 코드 작성·리팩터링 중심 모델",
    "tags": [
      "추론",
      "코딩",
      "중국어",
      "툴사용"
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
    }
  },
  "solar": {
    "name": "Solar Pro 3",
    "nameKo": "Solar Pro 3",
    "description": "Solar Pro 3: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
    "tags": [
      "추론",
      "저비용",
      "한국어",
      "툴사용"
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
    }
  },
  "mercury": {
    "name": "Mercury 2",
    "nameKo": "Mercury 2",
    "description": "Mercury 2: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
    "tags": [
      "추론",
      "저비용",
      "툴사용",
      "구조화"
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
    }
  },
  "hunyuan": {
    "name": "Hunyuan A13B Instruct",
    "nameKo": "Hunyuan A13B Instruct",
    "description": "Hunyuan A13B Instruct: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
    "tags": [
      "추론",
      "저비용",
      "중국어",
      "구조화"
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
    }
  },
  "jamba": {
    "name": "Jamba Large 1.7",
    "nameKo": "Jamba Large 1.7",
    "description": "Jamba Large 1.7: AI21 Labs의 128K급 문맥 범용 대화 모델",
    "tags": [
      "툴사용",
      "구조화",
      "범용"
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
    }
  },
  "granite": {
    "name": "Granite 4.0 Micro",
    "nameKo": "Granite 4.0 Micro",
    "description": "Granite 4.0 Micro: IBM의 128K급 문맥 범용 대화 모델",
    "tags": [
      "오픈웨이트",
      "저비용",
      "범용"
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
    }
  },
  "step": {
    "name": "Step 3.5 Flash",
    "nameKo": "Step 3.5 Flash",
    "description": "Step 3.5 Flash: 복잡한 판단과 단계별 분석에 초점을 둔 모델",
    "tags": [
      "추론",
      "저비용",
      "고속",
      "툴사용"
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
    }
  },
  "palmyra": {
    "name": "Palmyra X5",
    "nameKo": "Palmyra X5",
    "description": "Palmyra X5: Writer의 1M 장문맥 범용 대화 모델",
    "tags": [
      "장문맥",
      "창작",
      "범용"
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
    }
  }
} satisfies Partial<Record<string, Pick<Expert, 'name' | 'nameKo' | 'description' | 'tags' | 'modelInfo'>>>;
