import type { IncomingMessage, ServerResponse } from 'node:http';

type CallbackRequest = IncomingMessage & {
  body?: {
    status?: number;
    url?: string;
    key?: string;
    forcesavetype?: number;
  };
};

type JsonResponse = ServerResponse & {
  status?: (code: number) => JsonResponse;
  json?: (payload: unknown) => JsonResponse;
};

export default function handler(req: CallbackRequest, res: JsonResponse) {
  if (req.method !== 'POST') {
    res.status?.(405).json?.({ error: 1, message: 'Method not allowed' });
    return;
  }

  // Demo endpoint: acknowledge ONLYOFFICE save events.
  // The next integration step should download body.url on status 2/6 and store it.
  res.status?.(200).json?.({ error: 0 });
}
