import { createDirectLegalResearchProvider } from './legal-provider-direct.js';
import { createMcpLegalResearchProvider, resolveLegalMcpBridgeUrl } from './legal-provider-mcp.js';
import type {
  LegalResearchInput,
  LegalResearchMode,
  LegalResearchProvider,
  LegalResearchResult,
} from './legal-provider-types.js';

export function resolveLegalResearchMode(
  mode = process.env.LEGAL_RESEARCH_PROVIDER as LegalResearchMode | undefined,
  bridgeUrl = resolveLegalMcpBridgeUrl()
): LegalResearchMode {
  if (mode === 'direct' || mode === 'mcp') return mode;
  return bridgeUrl?.trim() ? 'auto' : 'direct';
}

export class AutoLegalResearchProvider implements LegalResearchProvider {
  readonly name = 'mcp' as const;

  constructor(
    private readonly mcpProvider = createMcpLegalResearchProvider(),
    private readonly directProvider = createDirectLegalResearchProvider()
  ) {}

  async search(input: LegalResearchInput): Promise<LegalResearchResult> {
    const mcpResult = await this.mcpProvider.search(input);

    if (!mcpResult.error || mcpResult.citations.length > 0 || mcpResult.rawContext.trim().length > 0) {
      return mcpResult;
    }

    const directResult = await this.directProvider.search(input);
    return directResult.error
      ? { ...directResult, error: `${mcpResult.error} / fallback: ${directResult.error}` }
      : directResult;
  }
}

export function createLegalResearchProvider(mode = resolveLegalResearchMode()): LegalResearchProvider {
  if (mode === 'mcp') return createMcpLegalResearchProvider();
  if (mode === 'direct') return createDirectLegalResearchProvider();
  return new AutoLegalResearchProvider();
}
