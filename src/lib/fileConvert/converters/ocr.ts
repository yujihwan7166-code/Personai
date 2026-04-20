// 이미지 OCR — 기존 /api/chat (OpenRouter vision) 재활용

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요.'));
    reader.readAsDataURL(file);
  });
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export async function ocrImageToText(
  file: File,
  signal?: AbortSignal,
): Promise<{ blob: Blob; suggestedName: string; previewText: string }> {
  const base64 = await fileToBase64(file);
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: `당신은 OCR 전문가입니다. 이미지의 모든 텍스트를 정확히 읽어 그대로 출력하세요.
- 원문 언어 그대로 (번역 금지)
- 줄바꿈·문단 구조 최대한 유지
- 설명·해설 추가 금지, 텍스트만 출력
- 글자가 흐리거나 판독 불가면 [?] 로 표시`,
      question: '이 이미지의 텍스트를 읽어주세요.',
      openrouterModel: 'google/gemini-2.5-flash-lite',
      searchPolicy: 'never',
      maxTokens: 3000,
      files: [{ name: file.name, mimeType: file.type || 'image/png', base64 }],
    }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error('OCR 요청 실패. 잠시 후 다시 시도해주세요.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content ?? json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (delta) text += delta;
      } catch { /* skip */ }
    }
  }

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}.txt`, previewText: text.slice(0, 500) };
}
