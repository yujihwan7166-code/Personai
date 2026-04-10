import { describe, expect, it } from 'vitest';
import { resolveLegalResearchMode } from '../../api/_lib/legal-provider';
import { resolveLegalMcpBridgeUrl } from '../../api/_lib/legal-provider-mcp';

describe('legal provider selection', () => {
  it('prefers direct mode in production when no bridge is configured', () => {
    expect(resolveLegalResearchMode(undefined, '')).toBe('direct');
    expect(resolveLegalMcpBridgeUrl(undefined, 'production', undefined)).toBeUndefined();
  });

  it('uses localhost bridge by default in local development', () => {
    expect(resolveLegalMcpBridgeUrl(undefined, 'development', undefined)).toBe('http://127.0.0.1:8788');
    expect(resolveLegalResearchMode(undefined, resolveLegalMcpBridgeUrl(undefined, 'development', undefined))).toBe('auto');
  });

  it('uses auto mode when an explicit bridge URL is available', () => {
    expect(resolveLegalResearchMode(undefined, 'https://legal-mcp.example.com')).toBe('auto');
  });

  it('respects explicit provider mode', () => {
    expect(resolveLegalResearchMode('mcp', undefined)).toBe('mcp');
    expect(resolveLegalResearchMode('direct', 'https://legal-mcp.example.com')).toBe('direct');
  });
});
