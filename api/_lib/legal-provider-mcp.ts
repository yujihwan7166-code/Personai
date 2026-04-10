import type { LegalResearchInput, LegalResearchProvider, LegalResearchResult } from './legal-provider-types.js';

interface McpBridgeResponse {
  citations?: LegalResearchResult['citations'];
  rawContext?: string;
  error?: string;
}

export function resolveLegalMcpBridgeUrl(
  bridgeUrl = process.env.LEGAL_MCP_BRIDGE_URL,
  nodeEnv = process.env.NODE_ENV,
  vercelUrl = process.env.VERCEL_URL
): string | undefined {
  const trimmed = bridgeUrl?.trim();
  if (trimmed) return trimmed;

  const isProduction = nodeEnv === 'production';
  if (isProduction || vercelUrl) return undefined;

  return 'http://127.0.0.1:8788';
}

export class McpLegalResearchProvider implements LegalResearchProvider {
  readonly name = 'mcp' as const;

  constructor(
    private readonly bridgeUrl = resolveLegalMcpBridgeUrl(),
    private readonly bridgeToken = process.env.LEGAL_MCP_BRIDGE_TOKEN
  ) {}

  async search(input: LegalResearchInput): Promise<LegalResearchResult> {
    if (!this.bridgeUrl) {
      return {
        provider: this.name,
        citations: [],
        rawContext: '',
        error: 'LEGAL_MCP_BRIDGE_URL is not configured.',
      };
    }

    const targetUrl = new URL('/legal/search', this.bridgeUrl).toString();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.bridgeToken) {
      headers.Authorization = `Bearer ${this.bridgeToken}`;
    }

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        return {
          provider: this.name,
          citations: [],
          rawContext: '',
          error: `MCP bridge request failed: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as McpBridgeResponse;

      return {
        provider: this.name,
        citations: Array.isArray(data.citations) ? data.citations : [],
        rawContext: typeof data.rawContext === 'string' ? data.rawContext : '',
        error: typeof data.error === 'string' ? data.error : undefined,
      };
    } catch (error) {
      return {
        provider: this.name,
        citations: [],
        rawContext: '',
        error: `MCP bridge is unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
      };
    }
  }
}

export function createMcpLegalResearchProvider(bridgeUrl?: string, bridgeToken?: string): LegalResearchProvider {
  return new McpLegalResearchProvider(bridgeUrl, bridgeToken);
}
