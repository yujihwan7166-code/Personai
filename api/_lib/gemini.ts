export interface GeminiCandidatePayload {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

export interface GeminiStreamParseResult {
  done: boolean;
  texts: string[];
  remainder: string;
}

export function buildGeminiUrl(model: string, apiKey: string, stream = false) {
  if (stream) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
  }

  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

export function extractGeminiText(payload: GeminiCandidatePayload): string {
  return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
}

export function extractJsonObject<T>(text: string): T | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]) as T;
  } catch {
    return null;
  }
}

export function parseGeminiStreamBuffer(buffer: string): GeminiStreamParseResult {
  const texts: string[] = [];
  const lines = buffer.split('\n');
  let remainder = lines.pop() || '';
  let done = false;

  for (const rawLine of lines) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    if (!line.startsWith('data: ')) {
      continue;
    }

    const jsonStr = line.slice(6).trim();
    if (!jsonStr) {
      continue;
    }

    if (jsonStr === '[DONE]') {
      done = true;
      continue;
    }

    try {
      const parsed = JSON.parse(jsonStr) as GeminiCandidatePayload;
      const text = extractGeminiText(parsed);

      if (text) {
        texts.push(text);
      }
    } catch {
      remainder = `${line}\n${remainder}`;
      break;
    }
  }

  return { done, texts, remainder };
}
