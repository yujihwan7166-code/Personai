import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

loadEnvFiles();

const PORT = Number(process.env.PORT || 8788);
const BRIDGE_TOKEN = process.env.LEGAL_MCP_BRIDGE_TOKEN;
const MCP_COMMAND = process.env.KOREAN_LAW_MCP_COMMAND || resolveDefaultMcpCommand();
const MCP_ARGS = parseArgs(process.env.KOREAN_LAW_MCP_ARGS, resolveDefaultMcpArgs(MCP_COMMAND));
const MCP_CWD = process.env.KOREAN_LAW_MCP_CWD || REPO_ROOT;
const OPEN_LAW_ID = process.env.OPEN_LAW_ID || process.env.LAW_OC || process.env.LAW_API_KEY;

const ID_PATTERN = /\b(statute|prec|admrul|ordin|const|interp|term):([A-Za-z0-9_-]+)\b/g;
const KOREAN_ARTICLE_PATTERN = /(?:\uC81C\s*)?\d+\s*\uC870(?:\s*\uC758\s*\d+)?/;

function loadEnvFiles() {
  const candidates = [
    path.join(REPO_ROOT, '.env.local'),
    path.join(REPO_ROOT, '.env'),
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
    }
  }
}

function resolveDefaultMcpCommand() {
  const candidates = [
    path.join(__dirname, '.venv', 'Scripts', 'korean-law-mcp.exe'),
    path.join(__dirname, '.venv', 'Scripts', 'korean-law-mcp.cmd'),
    path.join(__dirname, '.venv', 'bin', 'korean-law-mcp'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'uvx';
}

function resolveDefaultMcpArgs(command) {
  const normalized = command.toLowerCase();
  if (
    normalized.endsWith('korean-law-mcp.exe') ||
    normalized.endsWith('korean-law-mcp.cmd') ||
    normalized.endsWith('korean-law-mcp')
  ) {
    return [];
  }

  return ['korean-law-mcp'];
}

function parseArgs(raw, fallback) {
  if (!raw || !raw.trim()) return fallback;

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    // Fall back to line/comma parsing below.
  }

  return raw
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(body));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });

    req.on('error', reject);
  });
}

function ensureAuthorized(req) {
  if (!BRIDGE_TOKEN) return true;
  const auth = req.headers.authorization || '';
  return auth === `Bearer ${BRIDGE_TOKEN}`;
}

function extractToolText(result) {
  if (!result) return '';
  if (typeof result.content === 'string') return result.content;

  if (Array.isArray(result.content)) {
    return result.content
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (typeof item.text === 'string') return item.text;
        if (typeof item.content === 'string') return item.content;
        return JSON.stringify(item);
      })
      .filter(Boolean)
      .join('\n\n');
  }

  if (result.structuredContent) {
    return JSON.stringify(result.structuredContent, null, 2);
  }

  return '';
}

function buildSearchQuery(payload) {
  const question = typeof payload.question === 'string' ? payload.question.trim() : '';
  if (question) return question;

  if (Array.isArray(payload.keywords)) {
    return payload.keywords
      .filter((item) => typeof item === 'string' && item.trim())
      .join(' ');
  }

  return '';
}

function hasSpecificArticleRequest(payload, query) {
  if (payload.articleHint != null) return true;
  return KOREAN_ARTICLE_PATTERN.test(query) || /\bArticle\s+\d+/i.test(query);
}

function extractTypedIds(text) {
  const seen = new Set();
  const matches = [];

  for (const match of text.matchAll(ID_PATTERN)) {
    const typedId = `${match[1]}:${match[2]}`;
    if (!seen.has(typedId)) {
      seen.add(typedId);
      matches.push(typedId);
    }
  }

  return matches;
}

function extractHeading(text) {
  const heading = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading;

  const firstLine = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || undefined;
}

function extractFirstUrl(markdown) {
  const match = markdown.match(/\((https?:\/\/[^)]+)\)/);
  return match?.[1];
}

function toCitationType(typedId) {
  return typedId.startsWith('prec:') ? 'precedent' : 'law_article';
}

function toSourceType(typedId) {
  if (typedId.startsWith('prec:')) return 'precedent';
  if (typedId.startsWith('statute:')) return 'statute';
  if (typedId.startsWith('admrul:')) return 'administrative_rule';
  if (typedId.startsWith('ordin:')) return 'ordinance';
  if (typedId.startsWith('interp:')) return 'interpretation';
  if (typedId.startsWith('term:')) return 'legal_term';
  return 'legal_resource';
}

function buildRawContext(citations, fallback) {
  if (citations.length === 0) return fallback;

  return citations
    .map((citation) => `[${citation.label}] ${citation.rawData || ''}`.trim())
    .join('\n\n');
}

class KoreanLawMcpBridge {
  constructor() {
    this.client = null;
    this.transport = null;
    this.toolNames = [];
    this.connectPromise = null;
  }

  async connect() {
    if (this.client && this.transport) return;
    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.connectPromise = (async () => {
      const env = {
        ...process.env,
      };

      if (OPEN_LAW_ID) {
        env.OPEN_LAW_ID = OPEN_LAW_ID;
      }

      this.transport = new StdioClientTransport({
        command: MCP_COMMAND,
        args: MCP_ARGS,
        env,
        cwd: MCP_CWD,
      });

      this.client = new Client({ name: 'legal-mcp-bridge', version: '0.1.0' });
      await this.client.connect(this.transport);
      const toolsResult = await this.client.listTools();
      this.toolNames = toolsResult.tools.map((tool) => tool.name);
      if (this.toolNames.length === 0) {
        throw new Error('No MCP tools available. Check OPEN_LAW_ID and korean-law-mcp startup.');
      }
    })();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async callTool(name, args) {
    await this.connect();

    try {
      const result = await this.client.callTool({
        name,
        arguments: args,
      });

      return extractToolText(result);
    } catch (error) {
      await this.reset();
      throw error;
    }
  }

  async reset() {
    try {
      if (this.client) {
        await this.client.close();
      }
    } catch {
      // Ignore close failures.
    }

    this.client = null;
    this.transport = null;
    this.toolNames = [];
    this.connectPromise = null;
  }

  async health() {
    try {
      await this.connect();
      return {
        ok: true,
        tools: this.toolNames,
        command: MCP_COMMAND,
        args: MCP_ARGS,
      };
    } catch (error) {
      return {
        ok: false,
        tools: [],
        command: MCP_COMMAND,
        args: MCP_ARGS,
        error: error instanceof Error ? error.message : 'unknown',
      };
    }
  }

  async search(payload) {
    const query = buildSearchQuery(payload);
    if (!query) {
      return {
        citations: [],
        rawContext: '',
        error: 'Question or keywords are required.',
      };
    }

    if (hasSpecificArticleRequest(payload, query)) {
      const chain = await this.callTool('explore_legal_chain', { query });
      return {
        citations: [
          {
            id: `mcp-chain-${Date.now()}`,
            type: 'law_article',
            label: extractHeading(chain) || query,
            source: 'Korean Law MCP',
            sourceType: 'deep_chain',
            rawData: chain,
            fetchedAt: new Date().toISOString(),
          },
        ],
        rawContext: chain,
      };
    }

    const searchText = await this.callTool('search_korean_law', { query });
    const typedIds = extractTypedIds(searchText).slice(0, 3);

    if (typedIds.length === 0) {
      return {
        citations: [
          {
            id: `mcp-search-${Date.now()}`,
            type: 'law_article',
            label: extractHeading(searchText) || query,
            source: 'Korean Law MCP',
            sourceType: 'search_summary',
            rawData: searchText,
            fetchedAt: new Date().toISOString(),
          },
        ],
        rawContext: searchText,
      };
    }

    const citations = [];
    for (const typedId of typedIds) {
      const detailText = await this.callTool('read_legal_resource', { resource_id: typedId });
      let externalLink = '';

      try {
        externalLink = await this.callTool('get_external_links', { resource_id: typedId });
      } catch {
        externalLink = '';
      }

      citations.push({
        id: `mcp-${typedId}`,
        type: toCitationType(typedId),
        label: extractHeading(detailText) || typedId,
        source: 'Korean Law MCP',
        sourceType: toSourceType(typedId),
        url: extractFirstUrl(externalLink),
        rawData: detailText,
        fetchedAt: new Date().toISOString(),
      });
    }

    return {
      citations,
      rawContext: buildRawContext(citations, searchText),
    };
  }
}

const bridge = new KoreanLawMcpBridge();

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (!ensureAuthorized(req)) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        service: 'legal-mcp-bridge',
        requiresOpenLawId: !OPEN_LAW_ID,
        ...(await bridge.health()),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/legal/search') {
      const payload = await getRequestBody(req);
      const result = await bridge.search(payload);
      sendJson(res, 200, result);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'unknown',
    });
  }
});

server.listen(PORT, () => {
  console.log(`[legal-mcp-bridge] listening on http://localhost:${PORT}`);
  console.log(`[legal-mcp-bridge] command=${MCP_COMMAND} args=${JSON.stringify(MCP_ARGS)}`);
  console.log(`[legal-mcp-bridge] openLawId=${OPEN_LAW_ID ? 'present' : 'missing'}`);
});

process.on('SIGINT', async () => {
  await bridge.reset();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', async () => {
  await bridge.reset();
  server.close(() => process.exit(0));
});
