import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { api: { bodyParser: { sizeLimit: '25mb' } } };

interface ReqBody {
  audioBase64?: string;
  mimeType?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const apiKey = process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY;
  if (!apiKey) {
    return res.status(501).json({
      error:
        '전사 서비스가 아직 연결되지 않았어요. 서버에 OPENAI_API_KEY를 설정해 주세요.',
    });
  }
  const { audioBase64, mimeType } = (req.body || {}) as ReqBody;
  if (!audioBase64) {
    return res.status(400).json({ error: '오디오 데이터가 없어요.' });
  }
  try {
    const buf = Buffer.from(audioBase64, 'base64');
    const ext = mimeType?.includes('webm')
      ? 'webm'
      : mimeType?.includes('mp4')
      ? 'mp4'
      : mimeType?.includes('wav')
      ? 'wav'
      : 'webm';
    const blob = new Blob([buf], { type: mimeType || 'audio/webm' });
    const form = new FormData();
    form.append('file', blob, `recording.${ext}`);
    form.append('model', 'whisper-1');
    form.append('language', 'ko');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: t || '전사 실패' });
    }
    const data = await r.json();
    return res.status(200).json({ text: data.text || '' });
  } catch (err) {
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : '오류' });
  }
}
