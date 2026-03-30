import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { systemPrompt, question, previousResponses, files } = req.body || {};

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'question is required and must be a string' });
  }
  if (typeof systemPrompt !== 'string') {
    return res.status(400).json({ error: 'systemPrompt must be a string' });
  }
  if (question.length > 10000) {
    return res.status(400).json({ error: 'question is too long' });
  }

  // Build conversation contents
  const contents: any[] = [];

  // Build user message parts
  let fullPrompt: string;
  if (previousResponses && previousResponses.length > 0) {
    const context = previousResponses
      .map((r: { name: string; content: string }) => `[${r.name}]: ${r.content}`)
      .join('\n\n');
    fullPrompt = `이전 대화:\n${context}\n\n새 질문: ${question}`;
  } else {
    fullPrompt = question;
  }

  const userParts: any[] = [{ text: fullPrompt }];

  // Add file attachments if present
  if (files && Array.isArray(files)) {
    for (const file of files) {
      if (file.extractedText) {
        // Word/Excel: add extracted text
        userParts.push({ text: `\n[첨부 파일: ${file.name}]\n${file.extractedText}` });
      } else if (file.base64 && file.mimeType) {
        // Image/PDF: add as inline_data
        userParts.push({
          inline_data: {
            mime_type: file.mimeType,
            data: file.base64,
          }
        });
      }
    }
  }

  contents.push({ role: 'user', parts: userParts });

  const model = 'gemini-2.5-flash-lite';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const abortCtrl = new AbortController();
    const hasFiles = files && Array.isArray(files) && files.length > 0;
    const timeoutId = setTimeout(() => abortCtrl.abort(), hasFiles ? 60000 : 30000); // 60s for files, 30s otherwise

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }),
      signal: abortCtrl.signal,
    });

    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      if (geminiRes.status === 429) {
        return res.status(429).json({ error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' });
      }
      return res.status(geminiRes.status).json({ error: errorText });
    }

    // Stream SSE response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const reader = geminiRes.body?.getReader();
    if (!reader) {
      return res.status(500).json({ error: 'No response body' });
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            // Convert to OpenAI-compatible SSE format (frontend expects this)
            res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
