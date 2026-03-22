import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { systemPrompt, question, previousResponses } = req.body;

  // Build conversation contents
  const contents: any[] = [];

  // Add previous responses as context
  if (previousResponses && previousResponses.length > 0) {
    const context = previousResponses
      .map((r: { name: string; content: string }) => `[${r.name}]: ${r.content}`)
      .join('\n\n');
    contents.push({ role: 'user', parts: [{ text: `이전 대화:\n${context}\n\n새 질문: ${question}` }] });
  } else {
    contents.push({ role: 'user', parts: [{ text: question }] });
  }

  const model = 'gemini-2.5-flash-preview-04-17';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
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
    });

    if (!geminiRes.ok) {
      const error = await geminiRes.text();
      return res.status(geminiRes.status).json({ error });
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
