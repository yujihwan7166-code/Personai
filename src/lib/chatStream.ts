import { getExpertPrompt } from '@/lib/expertPromptLoader';
import type { ResponseProgress } from '@/lib/responseProgress';
import type { DiscussionRound, Expert } from '@/types/expert';

export type SearchSource = {
  title: string;
  link: string;
};

export type SearchSourcePayload = {
  query: string;
  sources: SearchSource[];
};

export type PreSearchContext = {
  query: string;
  sources: SearchSource[];
  formatted: string;
} | null;

export type SearchPolicy = 'auto' | 'always' | 'never';

export type StreamRequestFile = {
  name: string;
  mimeType: string;
  base64: string;
  extractedText?: string;
};

export type StreamExpertArgs = {
  question: string;
  expert: Expert;
  previousResponses: { name: string; content: string }[];
  round: DiscussionRound | 'summary';
  onDelta: (text: string) => void;
  onDone: () => void;
  onProgress?: (progress: ResponseProgress) => void;
  signal?: AbortSignal;
  files?: StreamRequestFile[];
  maxTokens?: number;
  searchPolicy?: SearchPolicy;
  onSearchSources?: (sources: SearchSourcePayload) => void;
  preSearchContext?: PreSearchContext;
};

export type StreamExpertFn = (args: StreamExpertArgs) => Promise<void>;

type CreateStreamExpertOptions = {
  chatUrl: string;
  safetyGuardrail: string;
  qualityGuardrail: string;
};

export async function fetchSearchContext(question: string): Promise<PreSearchContext> {
  try {
    const response = await fetch('/api/search-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.searchContext || null;
  } catch {
    return null;
  }
}

export function createStreamExpert({
  chatUrl,
  safetyGuardrail,
  qualityGuardrail,
}: CreateStreamExpertOptions): StreamExpertFn {
  return async function streamExpert({
    question,
    expert,
    previousResponses,
    round,
    onDelta,
    onDone,
    onProgress,
    signal,
    files,
    maxTokens,
    searchPolicy,
    onSearchSources,
    preSearchContext,
  }: StreamExpertArgs) {
    const basePrompt = await getExpertPrompt(expert);
    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: safetyGuardrail + qualityGuardrail + basePrompt,
        question,
        previousResponses,
        files: files && files.length > 0 ? files : undefined,
        openrouterModel: expert.openrouterModel,
        ...(typeof maxTokens === 'number' ? { maxTokens } : {}),
        ...(searchPolicy ? { searchPolicy } : {}),
        ...(preSearchContext !== undefined ? { preSearchContext } : {}),
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 429) {
        throw new Error('일일 사용 한도에 도달했어요. 내일 다시 이용해주세요.');
      }

      if (response.status >= 500) {
        throw new Error('서버에 일시적인 문제가 발생했어요. 잠시 후 다시 시도해주세요.');
      }

      throw new Error(errorData.error || '응답을 받아오지 못했어요. 네트워크를 확인해주세요.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let streamDone = false;
    let currentEvent = 'message';

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      textBuffer += decoder.decode(value, { stream: true });
      let newlineIndex: number;

      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith('\r')) {
          line = line.slice(0, -1);
        }

        if (line.trim() === '') {
          currentEvent = 'message';
          continue;
        }

        if (line.startsWith(':')) {
          continue;
        }

        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }

        if (!line.startsWith('data: ')) {
          continue;
        }

        const jsonString = line.slice(6).trim();
        if (jsonString === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          if (currentEvent === 'search') {
            const searchData = JSON.parse(jsonString);
            onSearchSources?.(searchData);
            continue;
          }

          if (currentEvent === 'progress') {
            onProgress?.(JSON.parse(jsonString));
            continue;
          }

          const parsed = JSON.parse(jsonString);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            onDelta(content);
          }
        } catch {
          textBuffer = `${line}\n${textBuffer}`;
          break;
        }
      }
    }

    onDone();
  };
}
