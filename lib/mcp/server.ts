import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TOOLS, dispatchTool } from '@/lib/assistant/tools';

/**
 * MCP server exposing the assistant's read-only tools to external clients.
 *
 * Every tool in `TOOLS` only runs SELECTs, so the whole surface is read-only.
 * If a write tool is ever added to that registry it must be filtered out here.
 */
export function createMcpServer(): Server {
  const server = new Server(
    { name: 'budget-tracker', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const outcome = await dispatchTool(name, args ?? {});
    if (!outcome.ok) {
      return {
        isError: true,
        content: [{ type: 'text' as const, text: outcome.error }],
      };
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(outcome.result, null, 2),
        },
      ],
    };
  });

  return server;
}
