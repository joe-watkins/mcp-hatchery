import path from 'path';

/**
 * Generate package.json for the scaffolded project
 */
export function generatePackageJson(config, analysis) {
  const dependencies = {
    '@modelcontextprotocol/sdk': '^1.0.4'
  };

  const scripts = {};
  
  // Only add start/dev scripts if deploying locally
  if (config.deployment === 'local' || config.deployment === 'both') {
    scripts.start = 'node src/index.js';
    scripts.dev = 'node src/index.js';
  }

  const packageJson = {
    name: config.projectName,
    version: '1.0.0',
    description: config.description,
    type: 'module',
    dependencies,
    engines: {
      node: '>=18.0.0'
    }
  };

  // Only add main and scripts if there's content
  if (config.deployment === 'local' || config.deployment === 'both') {
    packageJson.main = 'src/index.js';
  }
  
  if (Object.keys(scripts).length > 0) {
    packageJson.scripts = scripts;
  }

  return packageJson;
}

/**
 * Generate tool definitions file
 */
export function generateToolDefinitions(config, analysis) {
  let toolsList = '';
  
  if (analysis.tools.length > 0) {
    // Generate from analyzed tools
    toolsList = analysis.tools.map(tool => {
      const schemaProperties = Object.keys(tool.inputSchema).length > 0
        ? Object.entries(tool.inputSchema).map(([key, type]) => {
            return `        ${key}: {\n          type: '${type}',\n          description: '${key}'\n        }`;
          }).join(',\n')
        : '';
      
      const requiredFields = Object.keys(tool.inputSchema).length > 0
        ? `\n      required: [${Object.keys(tool.inputSchema).map(k => `'${k}'`).join(', ')}]`
        : '';
      
      return `  {
    name: '${tool.name}',
    description: '${tool.description}',
    inputSchema: {
      type: 'object',
      properties: {
${schemaProperties}
      }${requiredFields}
    },
    handler: async (args) => {
      // TODO: Implement ${tool.name} logic
      return {
        content: [
          {
            type: 'text',
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
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo back'
        }
      },
      required: ['message']
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: 'text',
            text: \`Echo: \${args.message}\`
          }
        ]
      };
    }
  },
  {
    name: 'get-greeting',
    description: 'Returns a personalized greeting',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet'
        }
      },
      required: ['name']
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: 'text',
            text: \`Hello, \${args.name}! Welcome to ${config.projectName}.\`
          }
        ]
      };
    }
  }`;
  }

  return `/**
 * Tool definitions for ${config.projectName}
 */
export const tools = [
${toolsList}
];
`;
}

/**
 * Generate the main server (index.js for local stdio use)
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
      inputSchema: tool.inputSchema
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
  
  // Execute tool handler
  return await tool.handler(request.params.arguments);
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
 * Generate Vercel Function handler (api/index.js)
 */
export function generateVercelFunction(config) {
  return `import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { tools } from '../src/tools.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
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

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    if (!tool) {
      throw new Error(\`Unknown tool: \${request.params.name}\`);
    }
    return await tool.handler(request.params.arguments);
  });

  // Use StreamableHTTPServerTransport which handles both SSE and direct HTTP
  // We enable JSON response for stateless operation on Vercel
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless
    enableJsonResponse: true,
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
};
`;
}

/**
 * Generate Netlify Function handler (api.js)
 * Uses stateless JSON-RPC handling for serverless compatibility
 */
export function generateNetlifyFunction(config) {
  return `import { tools } from '../../src/tools.js';

/**
 * Stateless JSON-RPC handler for serverless environments
 */
async function handleJsonRpcRequest(request) {
  const { method, params, id } = request;

  try {
    let result;

    if (method === 'initialize') {
      result = {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: '${config.projectName}', version: '1.0.0' }
      };
    } else if (method === 'tools/list') {
      result = {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    } else if (method === 'tools/call') {
      const tool = tools.find(t => t.name === params.name);
      if (!tool) throw new Error(\`Unknown tool: \${params.name}\`);
      result = await tool.handler(params.arguments || {});
    } else if (method === 'notifications/initialized') {
      return null; // Notifications don't get responses
    } else if (method === 'ping') {
      result = {};
    } else {
      throw new Error(\`Unknown method: \${method}\`);
    }

    return { jsonrpc: '2.0', id, result };
  } catch (error) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: error.message } };
  }
}

/**
 * Netlify Function handler
 */
export const handler = async (event, context) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id',
  };

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // MCP JSON-RPC requests
  if (event.httpMethod === 'POST') {
    try {
      const request = JSON.parse(event.body);
      
      // Handle batch requests
      if (Array.isArray(request)) {
        const responses = [];
        for (const req of request) {
          const response = await handleJsonRpcRequest(req);
          if (response !== null) responses.push(response);
        }
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(responses.length === 1 ? responses[0] : responses)
        };
      }
      
      // Single request
      const response = await handleJsonRpcRequest(request);
      if (response === null) {
        return { statusCode: 202, headers: corsHeaders, body: '' };
      }
      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(response)
      };
    } catch (error) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: null,
          error: { code: -32700, message: 'Parse error: ' + error.message }
        })
      };
    }
  }

  // Health check (GET)
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '${config.projectName}',
      version: '1.0.0',
      status: 'healthy',
      protocol: 'MCP JSON-RPC 2.0',
      tools: tools.length
    })
  };
};
`;
}

/**
 * Generate README.md
 */
export function generateReadme(config, analysis, targetDir) {
  let toolsList = '';
  if (analysis.tools.length > 0) {
    toolsList = '\n## Tools\n\n' + analysis.tools.map(tool => 
      `- **${tool.name}**: ${tool.description}`
    ).join('\n');
  }

  const deployment = config.deployment || 'both';
  
  let description = 'A Model Context Protocol (MCP) server';
  if (deployment === 'both') {
    const host = config.remoteHost === 'vercel' ? 'Vercel' : 'Netlify Functions';
    description += ` that works both locally (stdio) and remotely (${host}).`;
  } else if (deployment === 'local') {
    description += ' for local use (stdio transport).';
  } else {
    const host = config.remoteHost === 'vercel' ? 'Vercel' : 'Netlify Functions';
    description += ` for remote deployment (${host}).`;
  }

  let localSection = '';
  if (deployment === 'local' || deployment === 'both') {
    const scriptPath = targetDir 
      ? path.join(targetDir, 'src', 'index.js').replace(/\\/g, '/') 
      : `/absolute/path/to/${config.projectName}/src/index.js`;

    localSection = `
### Configure your IDE

Add this to your Claude Desktop MCP settings:

\`\`\`json
{
  "mcpServers": {
    "${config.projectName}": {
      "command": "node",
      "args": ["${scriptPath}"]
    }
  }
}
\`\`\`
`;
  }

  let remoteSection = '';
  if (deployment === 'remote' || deployment === 'both') {
    if (config.remoteHost === 'vercel') {
      remoteSection = `
## Deploy to Vercel

This project is configured to deploy as a Vercel Function.

### Deploy via GitHub

1. Push this repository to GitHub
2. Import the project in Vercel
3. Vercel will automatically detect the configuration and deploy

### Using the Remote Server

Once deployed, configure your Claude Desktop MCP settings to use the remote server:

\`\`\`json
{
  "mcpServers": {
    "${config.projectName}": {
      "command": "npx",
      "args": ["mcp-remote@next", "https://your-project.vercel.app/api"]
    }
  }
}
\`\`\`

Replace \`your-project.vercel.app\` with your actual Vercel URL.
`;
    } else {
      remoteSection = `
## Deploy to Netlify

This project is configured to deploy as a Netlify Function.

### Deploy via GitHub

1. Push this repository to GitHub
2. Connect it to Netlify via the Netlify dashboard
3. Netlify will automatically build and deploy

### Using the Remote Server

Once deployed, configure your Claude Desktop MCP settings to use the remote server:

\`\`\`json
{
  "mcpServers": {
    "${config.projectName}": {
      "command": "npx",
      "args": ["mcp-remote@next", "https://your-site.netlify.app/mcp"]
    }
  }
}
\`\`\`

Replace \`your-site.netlify.app\` with your actual Netlify URL.

The endpoint uses stateless JSON-RPC over HTTP for serverless compatibility.
`;
    }
  }

  let projectStructure = '## Project Structure\\n\\n';
  if (deployment === 'local') {
    projectStructure += `- \`src/index.js\` - Main MCP server with stdio transport
- \`src/tools.js\` - Tool definitions and handlers`;
  } else if (deployment === 'remote') {
    if (config.remoteHost === 'vercel') {
      projectStructure += `- \`src/tools.js\` - Tool definitions and handlers
- \`api/index.js\` - Vercel Function wrapper with SSE transport
- \`vercel.json\` - Vercel configuration`;
    } else {
      projectStructure += `- \`src/tools.js\` - Tool definitions and handlers
- \`netlify/functions/api.js\` - Netlify Function with stateless JSON-RPC handler
- \`netlify.toml\` - Netlify configuration`;
    }
  } else {
    projectStructure += `- \`src/index.js\` - Main MCP server with stdio transport (local use)
- \`src/tools.js\` - Tool definitions and handlers`;
    if (config.remoteHost === 'vercel') {
      projectStructure += `
- \`api/index.js\` - Vercel Function wrapper with SSE transport (remote use)
- \`vercel.json\` - Vercel configuration`;
    } else {
      projectStructure += `
- \`netlify/functions/api.js\` - Netlify Function with stateless JSON-RPC handler (remote use)
- \`netlify.toml\` - Netlify configuration`;
    }
  }

  return `# ${config.projectName}

${config.description}

${description}

## Installation

\`\`\`bash
npm install
\`\`\`
${toolsList}
${localSection}${remoteSection}
${projectStructure}

## Generating Tools from Data

You can use the \`data\` folder to store JSON files and use an LLM (like Claude or Copilot) to generate tools for them.

1. Place your JSON file in the \`data\` folder (e.g., \`data/products.json\`).
2. Use the following prompt with your LLM:

> I have a JSON file at \`data/products.json\` (or whatever your file is named). Please analyze the structure of this data and create new MCP tools in \`src/tools.js\` to interact with it.
>
> At a minimum, please create:
> 1. A tool to list all items (with optional filtering)
> 2. A tool to get a specific item by ID (or unique field)
> 3. A tool to search items by a keyword
>
> Please ensure the tools follow the existing pattern in \`src/tools.js\` and include proper error handling.

## Adding New Tools

Edit \`src/tools.js\` to add new tool definitions. Each tool needs:

- **name**: Unique identifier for the tool
- **description**: What the tool does
- **inputSchema**: JSON Schema object defining the input parameters
- **handler**: Async function that implements the tool logic

## Learn More

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
${config.remoteHost === 'vercel' ? '- [Vercel Functions](https://vercel.com/docs/functions)' : '- [Netlify Functions](https://docs.netlify.com/functions/overview/)'}
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
.env
.env.local
*.log
.DS_Store
.netlify/
`;
}

/**
 * Generate Netlify configuration (netlify.toml)
 */
export function generateNetlifyConfig(config) {
  return `[build]
  command = "npm install"
  functions = "netlify/functions"
  publish = "."

[functions]
  node_bundler = "esbuild"
  included_files = ["src/**"]

[[redirects]]
  from = "/mcp/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
`;
}

/**
 * Generate Vercel configuration (vercel.json)
 */
export function generateVercelConfig(config) {
  return `{
  "functions": {
    "api/index.js": {
      "maxDuration": 60
    }
  }
}
`;
}
