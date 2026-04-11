import type { SearchResult, KnowledgeGraph } from './types.js';

interface SerperOrganicResult {
  title?: string;
  snippet?: string;
  link?: string;
}

interface SerperKnowledgeGraph {
  title?: string;
  type?: string;
  description?: string;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
  knowledgeGraph?: SerperKnowledgeGraph;
}

export async function searchSerper(
  query: string
): Promise<{ results: SearchResult[]; knowledgeGraph?: KnowledgeGraph }> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('SERPER_API_KEY not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: 'kr',
        hl: 'ko',
        num: 5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = (await response.json()) as SerperResponse;

    const results: SearchResult[] = (data.organic || [])
      .filter((r): r is Required<Pick<SerperOrganicResult, 'title' | 'snippet' | 'link'>> & SerperOrganicResult =>
        Boolean(r.title && r.snippet && r.link)
      )
      .slice(0, 5)
      .map((r) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link,
      }));

    const knowledgeGraph: KnowledgeGraph | undefined = data.knowledgeGraph?.title
      ? {
          title: data.knowledgeGraph.title,
          type: data.knowledgeGraph.type,
          description: data.knowledgeGraph.description,
        }
      : undefined;

    return { results, knowledgeGraph };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}
