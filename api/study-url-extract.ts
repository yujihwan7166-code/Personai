import type { VercelRequest, VercelResponse } from '@vercel/node';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string): string {
  const ogt = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  if (ogt) return ogt[1];
  const t = html.match(/<title>([^<]+)<\/title>/i);
  if (t) return t[1].trim();
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { url } = (req.body || {}) as { url?: string };
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL이 필요해요.' });
  }

  const ytId = extractYouTubeId(url);
  if (ytId) {
    try {
      const tryLangs = ['ko', 'en'];
      for (const lang of tryLangs) {
        const apiUrl = `https://video.google.com/timedtext?lang=${lang}&v=${ytId}`;
        const r = await fetch(apiUrl);
        const xml = await r.text();
        if (xml && xml.includes('<text')) {
          const lines: string[] = [];
          const re = /<text[^>]*>([^<]+)<\/text>/g;
          let m;
          while ((m = re.exec(xml)) !== null) {
            lines.push(
              m[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'"),
            );
          }
          const text = lines.join(' ').replace(/\s+/g, ' ').trim();
          if (text.length > 100) {
            return res.status(200).json({
              kind: 'youtube',
              title: `YouTube: ${ytId}`,
              content: text,
              url,
            });
          }
        }
      }
      return res.status(422).json({
        error:
          '이 영상은 자막이 없거나 가져올 수 없어요. 스크립트를 직접 붙여넣어 주세요.',
      });
    } catch (e) {
      return res.status(502).json({
        error: '유튜브 자막을 가져오지 못했어요. 스크립트를 붙여넣어 주세요.',
      });
    }
  }

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 StudyBot/1.0' },
    });
    if (!r.ok) {
      return res
        .status(422)
        .json({ error: `페이지를 열 수 없어요 (${r.status}). URL을 확인해 주세요.` });
    }
    const html = await r.text();
    const text = stripHtml(html);
    if (text.length < 100) {
      return res
        .status(422)
        .json({ error: '페이지에서 텍스트를 찾지 못했어요. 내용을 직접 붙여넣어 주세요.' });
    }
    return res.status(200).json({
      kind: 'url',
      title: extractTitle(html) || url,
      content: text.slice(0, 30000),
      url,
    });
  } catch {
    return res.status(502).json({
      error: '페이지에 접근하지 못했어요 (차단/네트워크 문제). 내용을 직접 붙여넣어 주세요.',
    });
  }
}
