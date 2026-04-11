export interface SearchResult {
  title: string;
  snippet: string;
  link: string;
}

export interface KnowledgeGraph {
  title?: string;
  type?: string;
  description?: string;
}

export interface SearchContext {
  query: string;
  results: SearchResult[];
  knowledgeGraph?: KnowledgeGraph;
  cachedAt?: number;
}

export interface CacheEntry {
  query: string;
  results: SearchResult[];
  knowledgeGraph?: KnowledgeGraph;
  cachedAt: number;
  ttl: number;
}

export type SearchDecision = 'SEARCH_REQUIRED' | 'SEARCH_NOT_NEEDED' | 'UNCERTAIN';
