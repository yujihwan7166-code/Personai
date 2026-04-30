// 이미지 OCR + 표 OCR + AI 도우미 — 기존 /api/chat (OpenRouter vision) 재활용

async function streamChatText(
  systemPrompt: string,
  question: string,
  files: Array<{ name: string; mimeType: string; base64: string }>,
  signal?: AbortSignal,
  maxTokens = 3000,
): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt,
      question,
      openrouterModel: 'google/gemini-2.5-flash-lite',
      searchPolicy: 'never',
      maxTokens,
      files,
    }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error('AI 요청 실패. 잠시 후 다시 시도해주세요.');
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
  return text;
}

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
  const text = await streamChatText(
    `당신은 OCR 전문가입니다. 이미지의 모든 텍스트를 정확히 읽어 그대로 출력하세요.
- 원문 언어 그대로 (번역 금지)
- 줄바꿈·문단 구조 최대한 유지
- 설명·해설 추가 금지, 텍스트만 출력
- 글자가 흐리거나 판독 불가면 [?] 로 표시`,
    '이 이미지의 텍스트를 읽어주세요.',
    [{ name: file.name, mimeType: file.type || 'image/png', base64 }],
    signal,
  );
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}.txt`, previewText: text.slice(0, 500) };
}

// ───── 영수증 인식 — 금액·날짜·항목 자동 추출 ─────
export async function ocrReceipt(
  file: File,
  signal?: AbortSignal,
): Promise<{ blob: Blob; suggestedName: string; previewText: string }> {
  const base64 = await fileToBase64(file);
  const text = await streamChatText(
    `당신은 영수증 분석 전문가입니다. 이미지에서 다음 정보를 추출해 마크다운으로 정리하세요.

# 결제 정보
- 가게: (가게명)
- 날짜: YYYY-MM-DD HH:mm
- 결제 수단: (카드/현금/간편결제)
- 총액: NNN원

# 항목
| 항목 | 수량 | 단가 | 금액 |
| --- | ---: | ---: | ---: |
| ... | ... | ... | ... |

# 요약
- 카테고리 추정: (음식점/마트/카페 등)
- 한 줄 요약: ...

판독 안 되는 정보는 [?] 표기. 추측 금지. 마크다운만 출력.`,
    '이 영수증을 분석해주세요.',
    [{ name: file.name, mimeType: file.type || 'image/png', base64 }],
    signal,
    2500,
  );
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}-receipt.md`, previewText: text.slice(0, 500) };
}

// ───── 표 OCR — 마크다운 표 ─────
export async function ocrImageToTable(
  file: File,
  signal?: AbortSignal,
): Promise<{ blob: Blob; suggestedName: string; previewText: string }> {
  const base64 = await fileToBase64(file);
  const text = await streamChatText(
    `당신은 표 OCR 전문가입니다. 이미지 안의 표를 마크다운 표 형식으로 정확히 변환하세요.
- 첫 줄 = 헤더, 둘째 줄 = 구분선 (| --- | --- |)
- 셀 안 줄바꿈은 <br>
- 빈 셀은 공백
- 표 외 텍스트는 무시
- 설명·해설 추가 금지, 마크다운 표만 출력
- 표가 여러 개면 \\n\\n 으로 구분`,
    '이 이미지의 표를 마크다운 표로 변환해주세요.',
    [{ name: file.name, mimeType: file.type || 'image/png', base64 }],
    signal,
    4000,
  );
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}-table.md`, previewText: text.slice(0, 500) };
}

// ───── PDF 요약 ─────
// pdfjs로 텍스트 추출 → AI 요약 (3줄 + 5 bullet)
export async function summarizePdf(
  file: File,
  signal?: AbortSignal,
  onProgress?: (msg: string) => void,
): Promise<{ blob: Blob; suggestedName: string; previewText: string }> {
  // pdf 텍스트 추출
  onProgress?.('PDF 텍스트 추출 중...');
  const pdfMod = await import('pdfjs-dist');
  // 워커 경로 설정
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfMod.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfMod.getDocument({ data: buf.slice(0) }).promise;
  let fullText = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = (content.items as any[]).map((it) => (typeof it.str === 'string' ? it.str : '')).join(' ');
    fullText += pageText + '\n\n';
  }
  // 너무 길면 앞 12000자 만 (Gemini Flash 안정성)
  const trimmed = fullText.length > 12000 ? fullText.slice(0, 12000) + '\n\n[...이하 생략]' : fullText;
  if (trimmed.trim().length < 50) {
    throw new Error('PDF에서 텍스트를 추출하지 못했어요. 스캔 PDF는 OCR 도구를 먼저 써주세요.');
  }
  onProgress?.('AI 요약 중... (10~30초)');
  // AI 호출 (이미지 없이 텍스트만)
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: `당신은 문서 요약 전문가입니다. 다음 PDF 본문을 다음 형식으로 정리하세요.

# 한 줄 요약
(20단어 이내)

# 3줄 요약
(각 줄 50자 이내, 핵심만)

# 핵심 포인트 5개
- (한 줄씩)

# 키워드
(쉼표로 구분, 5~10개)

원문 언어 (한국어/영어 등) 그대로 사용. 추측·과장 금지.`,
      question: trimmed,
      openrouterModel: 'google/gemini-2.5-flash-lite',
      searchPolicy: 'never',
      maxTokens: 1500,
    }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error('AI 요약 요청 실패');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let summary = '';
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
        if (delta) summary += delta;
      } catch { /* skip */ }
    }
  }
  const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}-summary.md`, previewText: summary.slice(0, 500) };
}
