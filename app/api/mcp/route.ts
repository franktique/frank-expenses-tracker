import { timingSafeEqual } from 'crypto';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from '@/lib/mcp/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function unauthorized(status: number, message: string) {
  return Response.json(
    { jsonrpc: '2.0', error: { code: -32001, message }, id: null },
    {
      status,
      headers:
        status === 401 ? { 'WWW-Authenticate': 'Bearer realm="mcp"' } : {},
    }
  );
}

function isAuthorized(req: Request): boolean | null {
  const expected = process.env.MCP_API_KEY;
  if (!expected) return null; // endpoint disabled
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(req: Request): Promise<Response> {
  const auth = isAuthorized(req);
  if (auth === null) {
    return unauthorized(503, 'MCP deshabilitado: define MCP_API_KEY.');
  }
  if (!auth) return unauthorized(401, 'Token inválido.');

  // Stateless: a fresh server + transport per request, plain JSON responses.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer();
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
