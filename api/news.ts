/**
 * 오늘의 뉴스 헤드라인 — 브리핑 뉴스 섹션용 (2026-07-06).
 *
 * Google News RSS (키 불필요, 한국어)에서 상위 헤드라인. 실패하면 빈 배열 →
 * 클라가 섹션 생략. ?topic= 로 주제 전환 (기본: 헤드라인).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface NewsItem {
  title: string;
  url: string;
  source: string;
}

const TOPIC_FEEDS: Record<string, string> = {
  headline: 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko',
  business: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko',
  tech: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko',
  world: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko',
};

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

function parseItems(xml: string, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.split(/<item>/).slice(1);
  for (const block of blocks) {
    if (items.length >= limit) break;
    const titleRaw = block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
    const linkRaw = block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? '';
    const sourceRaw = block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? '';
    let title = decodeEntities(titleRaw);
    const url = decodeEntities(linkRaw);
    const source = decodeEntities(sourceRaw);
    // 구글 뉴스 제목은 "제목 - 언론사" 형태 → 언론사 중복 제거.
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3)).trim();
    if (title && /^https?:\/\//.test(url)) items.push({ title, url, source });
  }
  return items;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const topicParam = Array.isArray(req.query?.topic) ? req.query.topic[0] : req.query?.topic;
    const feed = TOPIC_FEEDS[String(topicParam ?? 'headline')] ?? TOPIC_FEEDS.headline;
    const r = await fetch(feed, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return res.status(200).json({ items: [] });
    const xml = await r.text();
    const items = parseItems(xml, 5);
    res.status(200).json({ items });
  } catch {
    res.status(200).json({ items: [] });
  }
}
