import type { ApiSourceCitation } from './api-enrichment.js';

export type LegalSearchType = 'statute' | 'precedent' | 'both';
export type LegalResearchProviderName = 'direct' | 'mcp';
export type LegalResearchMode = 'auto' | LegalResearchProviderName;

export interface LegalResearchInput {
  keywords: string[];
  searchType?: LegalSearchType;
  limit?: number;
  question?: string;
  articleHint?: string | number;
}

export interface LegalResearchResult {
  citations: ApiSourceCitation[];
  rawContext: string;
  provider: LegalResearchProviderName;
  error?: string;
}

export interface LegalResearchProvider {
  readonly name: LegalResearchProviderName;
  search(input: LegalResearchInput): Promise<LegalResearchResult>;
}
