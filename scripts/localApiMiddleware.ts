import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

type QueryValue = string | string[];

type VercelLikeRequest = IncomingMessage & {
  body?: unknown;
  query: Record<string, QueryValue>;
};

type VercelLikeResponse = ServerResponse & {
  status: (code: number) => VercelLikeResponse;
  json: (payload: unknown) => VercelLikeResponse;
  send: (payload?: unknown) => VercelLikeResponse;
};

function toQueryRecord(searchParams: URLSearchParams) {
  const query: Record<string, QueryValue> = {};

  for (const [key, value] of searchParams.entries()) {
    const existing = query[key];
    if (existing === undefined) {
      query[key] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    query[key] = [existing, value];
  }

  return query;
}

async function readRequestBody(req: IncomingMessage) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw.trim()) {
    return undefined;
  }

  const contentType = Array.isArray(req.headers['content-type'])
    ? req.headers['content-type'].join('; ')
    : req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    return JSON.parse(raw);
  }

  return raw;
}

function enhanceResponse(res: ServerResponse) {
  const response = res as VercelLikeResponse;

  response.status = (code: number) => {
    response.statusCode = code;
    return response;
  };

  response.json = (payload: unknown) => {
    if (!response.headersSent && !response.getHeader('Content-Type')) {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    response.end(JSON.stringify(payload));
    return response;
  };

  response.send = (payload?: unknown) => {
    if (payload === undefined) {
      response.end();
      return response;
    }

    if (Buffer.isBuffer(payload) || typeof payload === 'string') {
      response.end(payload);
      return response;
    }

    return response.json(payload);
  };

  return response;
}

function resolveApiModuleId(root: string, pathname: string) {
  if (!pathname.startsWith('/api/')) {
    return null;
  }

  const relativePath = pathname.replace(/^\/api\//, '').replace(/\/+$/, '');
  if (!relativePath) {
    return null;
  }

  const normalized = path.posix.normalize(relativePath);
  if (normalized.startsWith('..')) {
    return null;
  }

  const apiRoot = path.resolve(root, 'api');
  const filePath = path.resolve(apiRoot, `${normalized}.ts`);

  if (!filePath.startsWith(apiRoot) || !fs.existsSync(filePath)) {
    return null;
  }

  return `/${path.relative(root, filePath).split(path.sep).join('/')}`;
}

export function localApiMiddleware(): Plugin {
  return {
    name: 'local-api-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api')) {
          next();
          return;
        }

        const parsedUrl = new URL(req.url, 'http://127.0.0.1');
        const moduleId = resolveApiModuleId(server.config.root, parsedUrl.pathname);

        if (!moduleId) {
          enhanceResponse(res).status(404).json({ error: 'API route not found' });
          return;
        }

        let body: unknown;
        try {
          body = await readRequestBody(req);
        } catch {
          enhanceResponse(res).status(400).json({ error: 'Invalid JSON body' });
          return;
        }

        const request = req as VercelLikeRequest;
        request.body = body;
        request.query = toQueryRecord(parsedUrl.searchParams);

        const response = enhanceResponse(res);

        try {
          const apiModule = await server.ssrLoadModule(moduleId);
          if (typeof apiModule.default !== 'function') {
            throw new Error(`API handler "${moduleId}" does not export a default function.`);
          }

          await Promise.resolve(apiModule.default(request, response));

          if (!res.writableEnded && !res.headersSent) {
            res.statusCode ||= 204;
            res.end();
          }
        } catch (error) {
          if (error instanceof Error) {
            server.ssrFixStacktrace(error);
          }

          console.error(`[local-api] ${parsedUrl.pathname} failed`, error);

          if (!res.headersSent) {
            enhanceResponse(res)
              .status(500)
              .json({ error: error instanceof Error ? error.message : 'Local API handler failed' });
            return;
          }

          if (!res.writableEnded) {
            res.end();
          }
        }
      });
    },
  };
}
