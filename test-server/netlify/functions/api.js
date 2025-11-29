import serverless from 'serverless-http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools } from '../../src/tools.js';

/**
 * Create MCP server for HTTP/SSE transport (Netlify Functions)
 */
const createServer = () => {
  const server = new Server(
    {
      name: 'test-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Handler for listing available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
  });

  // Handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }

    return await tool.handler(request.params.arguments);
  });

  return server;
};

/**
 * Netlify Function handler
 * Supports both SSE transport for MCP and basic HTTP requests
 */
export const handler = async (event, context) => {
  // Handle SSE connection for MCP
  if (event.path === '/sse' || event.httpMethod === 'GET') {
    const server = createServer();
    const transport = new SSEServerTransport('/message', server);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: await transport.start(),
    };
  }

  // Handle message endpoint for MCP
  if (event.path === '/message' && event.httpMethod === 'POST') {
    const server = createServer();
    const transport = new SSEServerTransport('/message', server);
    
    try {
      const result = await transport.handleMessage(JSON.parse(event.body));
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.message }),
      };
    }
  }

  // Health check
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'test-server',
      version: '1.0.0',
      status: 'healthy',
      endpoints: {
        sse: '/sse',
        message: '/message'
      }
    }),
  };
};
