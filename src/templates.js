/**
 * Generate package.json for the scaffolded project
 */
export function generatePackageJson(config, analysis) {
  const dependencies = {
    '@modelcontextprotocol/sdk': '^1.0.4',
    '@types/node': '^20.0.0',
    'typescript': '^5.3.0',
    'serverless-http': '^3.2.0',
    'zod': '^3.22.4'
  };

  const scripts = {
    start: 'node build/index.js',
    build: 'tsc',
    'build:watch': 'tsc --watch',
    dev: 'tsc && node build/index.js'
  };

  return {
    name: config.projectName,
    version: '1.0.0',
    description: config.description,
    type: 'module',
    main: 'build/index.js',
    scripts,
    dependencies,
    engines: {
      node: '>=18.0.0'
    }
  };
}

/**
 * Generate tool definitions file
 */
export function generateToolDefinitions(config, analysis) {
  let toolsList = '';
  
  if (analysis.tools.length > 0) {
    // Generate from analyzed tools
    toolsList = analysis.tools.map(tool => {
      const schemaFields = Object.keys(tool.inputSchema).length > 0
        ? Object.entries(tool.inputSchema).map(([key, type]) => {
            return `      ${key}: z.${type}().describe('${key}')`;
          }).join(',\n')
        : '      // No input parameters';
      
      return `  {
    name: '${tool.name}',
    description: '${tool.description}',
    inputSchema: z.object({
${schemaFields}
    }),
    handler: async (args: any) => {
      // TODO: Implement ${tool.name} logic
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(args, null, 2)
          }
        ]
      };
    }
  }`;
    }).join(',\n');
  } else {
    // Generate sample tools
    toolsList = `  {
    name: 'echo',
    description: 'Echoes back the provided message',
    inputSchema: z.object({
      message: z.string().describe('Message to echo back')
    }),
    handler: async (args: { message: string }) => {
      return {
        content: [
          {
            type: 'text' as const,
            text: \`Echo: \${args.message}\`
          }
        ]
      };
    }
  },
  {
    name: 'get-greeting',
    description: 'Returns a personalized greeting',
    inputSchema: z.object({
      name: z.string().describe('Name to greet')
    }),
    handler: async (args: { name: string }) => {
      return {
        content: [
          {
            type: 'text' as const,
            text: \`Hello, \${args.name}! Welcome to ${config.projectName}.\`
          }
        ]
      };
    }
  }`;
  }

  return `import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (args: any) => Promise<{
    content: Array<{ type: 'text' | 'image' | 'resource'; text?: string; [key: string]: any }>;
  }>;
}

/**
 * Tool definitions for ${config.projectName}
 */
export const tools: ToolDefinition[] = [
${toolsList}
];
`;
}

/**
 * Generate the main server (index.ts for local stdio use)
 */
export function generateIndexFile(config, analysis) {
  return `#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools } from './tools.js';

/**
 * Create and configure the MCP server for local (stdio) use
 */
const server = new Server(
  {
    name: '${config.projectName}',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Handler for listing available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema.shape
    }))
  };
});

/**
 * Handler for calling tools
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.name === request.params.name);
  
  if (!tool) {
    throw new Error(\`Unknown tool: \${request.params.name}\`);
  }

  // Validate arguments against schema
  const validatedArgs = tool.inputSchema.parse(request.params.arguments);
  
  // Execute tool handler
  return await tool.handler(validatedArgs);
});

/**
 * Start the server with stdio transport
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('${config.projectName} MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
`;
}

/**
 * Generate Netlify Function handler (api.js)
 */
export function generateNetlifyFunction(config) {
  return `import serverless from 'serverless-http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools } from '../../build/tools.js';

/**
 * Create MCP server for HTTP/SSE transport (Netlify Functions)
 */
const createServer = () => {
  const server = new Server(
    {
      name: '${config.projectName}',
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
        inputSchema: tool.inputSchema.shape
      }))
    };
  });

  // Handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    
    if (!tool) {
      throw new Error(\`Unknown tool: \${request.params.name}\`);
    }

    const validatedArgs = tool.inputSchema.parse(request.params.arguments);
    return await tool.handler(validatedArgs);
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
      name: '${config.projectName}',
      version: '1.0.0',
      status: 'healthy',
      endpoints: {
        sse: '/sse',
        message: '/message'
      }
    }),
  };
};
`;
}

/**
 * Generate README.md
 */
export function generateReadme(config, analysis) {
  let toolsList = '';
  if (analysis.tools.length > 0) {
    toolsList = '\n## Tools\n\n' + analysis.tools.map(tool => 
      `- **${tool.name}**: ${tool.description}`
    ).join('\n');
  }

  return `# ${config.projectName}

${config.description}

A Model Context Protocol (MCP) server that works both locally (stdio) and remotely (Netlify Functions).

## Installation

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
${toolsList}

## Local Development

Run locally with stdio transport (for Claude Desktop):

\`\`\`bash
npm run dev
\`\`\`

### Configuring Claude Desktop

Add this to your Claude Desktop MCP settings:

\`\`\`json
{
  "mcpServers": {
    "${config.projectName}": {
      "command": "node",
      "args": ["/absolute/path/to/${config.projectName}/build/index.js"]
    }
  }
}
\`\`\`

## Deploy to Netlify

This project is configured to deploy as a Netlify Function.

### Option 1: Deploy with Netlify CLI

\`\`\`bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
\`\`\`

### Option 2: Deploy via GitHub

1. Push this repository to GitHub
2. Connect it to Netlify via the Netlify dashboard
3. Netlify will automatically build and deploy

### Using the Remote Server

Once deployed, your MCP server will be available at:

- **SSE Endpoint**: \`https://your-site.netlify.app/.netlify/functions/api/sse\`
- **Message Endpoint**: \`https://your-site.netlify.app/.netlify/functions/api/message\`
- **Health Check**: \`https://your-site.netlify.app/.netlify/functions/api\`

## Project Structure

- \`src/index.ts\` - Main MCP server with stdio transport (local use)
- \`src/tools.ts\` - Tool definitions and handlers
- \`netlify/functions/api.js\` - Netlify Function wrapper with SSE transport (remote use)
- \`build/\` - Compiled JavaScript output
- \`netlify.toml\` - Netlify configuration

## Adding New Tools

Edit \`src/tools.ts\` to add new tool definitions. Each tool needs:

- **name**: Unique identifier for the tool
- **description**: What the tool does
- **inputSchema**: Zod schema defining the input parameters
- **handler**: Async function that implements the tool logic

After adding tools, rebuild:

\`\`\`bash
npm run build
\`\`\`

## Learn More

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
`;
}

/**
 * Generate .env.example
 */
export function generateEnvExample(config) {
  return `# Environment variables

# Add your environment variables here
# API_KEY=your-api-key
# DATABASE_URL=your-database-url
`;
}

/**
 * Generate .gitignore
 */
export function generateGitignore() {
  return `node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
.netlify/
`;
}

/**
 * Generate TypeScript configuration
 */
export function generateTsConfig() {
  return {
    compilerOptions: {
      target: 'ES2022',
      module: 'ES2022',
      lib: ['ES2022'],
      moduleResolution: 'node',
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      outDir: './build',
      rootDir: './src',
      declaration: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'build', 'netlify']
  };
}

/**
 * Generate Netlify configuration (netlify.toml)
 */
export function generateNetlifyConfig(config) {
  return `[build]
  command = "npm install && npm run build"
  functions = "netlify/functions"
  publish = "."

[functions]
  node_bundler = "esbuild"
  included_files = ["build/**"]

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
`;
}
