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
      return textResponse(JSON.stringify(args, null, 2));
    }
  }`;
    }).join(',\n');
  } else {
    // Generate sample data-driven tools
    toolsList = `  {
    name: 'echo',
    description: 'Echoes back a message. Use a preset key (helloWorld, welcome, goodbye) or provide a custom message.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo back, or a preset key (helloWorld, welcome, goodbye)'
        }
      },
      required: ['message']
    },
    handler: async (args) => {
      const presetMessage = data.echoMessages[args.message];
      const outputMessage = presetMessage || args.message;
      return textResponse(\`Echo: \${outputMessage}\`);
    }
  },
  {
    name: 'get-greeting',
    description: 'Returns a personalized greeting. Styles: default, morning, evening, formal, casual.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet'
        },
        style: {
          type: 'string',
          description: 'Greeting style (default, morning, evening, formal, casual)',
          enum: ['default', 'morning', 'evening', 'formal', 'casual']
        }
      },
      required: ['name']
    },
    handler: async (args) => {
      const style = args.style || 'default';
      const template = data.greetings[style] || data.greetings.default;
      const greeting = template.replace('{name}', args.name);
      return textResponse(greeting);
    }
  },
  {
    name: 'list-items',
    description: 'Lists all items from the data source, optionally filtered by category.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by category (widgets, gadgets, tools, components)',
          enum: ['widgets', 'gadgets', 'tools', 'components']
        }
      },
      required: []
    },
    handler: async (args) => {
      let items = data.items;
      if (args.category) {
        items = items.filter(item => item.category === args.category);
      }
      const itemList = items.map(item => 
        \`• \${item.name} (\${item.category}): \${item.description}\`
      ).join('\\n');
      return textResponse(
        items.length > 0 
          ? \`Found \${items.length} item(s):\\n\\n\${itemList}\`
          : 'No items found.'
      );
    }
  },
  {
    name: 'get-item',
    description: 'Gets detailed information about a specific item by ID or name.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Item ID (e.g., item-001) or name to search for'
        }
      },
      required: ['query']
    },
    handler: async (args) => {
      const query = args.query.toLowerCase();
      const item = data.items.find(i => 
        i.id.toLowerCase() === query || 
        i.name.toLowerCase().includes(query)
      );
      if (!item) {
        return textResponse(\`No item found matching "\${args.query}".\`);
      }
      return textResponse(
        \`**\${item.name}** (\${item.id})\\n\\nCategory: \${item.category}\\nDescription: \${item.description}\\nTags: \${item.tags.join(', ')}\`
      );
    }
  },
  {
    name: 'list-categories',
    description: 'Lists all available categories.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async () => {
      return textResponse(
        \`Available categories:\\n\\n\${data.categories.map(c => \`• \${c}\`).join('\\n')}\`
      );
    }
  },
  {
    name: 'get-server-info',
    description: 'Returns information about this MCP server.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    handler: async () => {
      const info = data.serverInfo;
      return textResponse(\`**\${info.name}** v\${info.version}\\n\\n\${info.description}\`);
    }
  }`;
  }

  return `// Import content.json directly - works with bundlers (esbuild, webpack) and Node.js
// This approach is compatible with Netlify Functions bundling
import data from '../data/content.json' with { type: 'json' };

/**
 * Helper to create text response
 */
function textResponse(text) {
  return {
    content: [{ type: 'text', text }]
  };
}

/**
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

  // Generate tools section
  let toolsSection = '';
  if (analysis.tools.length > 0) {
    toolsSection = '\n## Available Tools\n\n| Tool | Description |\n|------|-------------|\n' + 
      analysis.tools.map(tool => `| \`${tool.name}\` | ${tool.description} |`).join('\n');
  } else {
    // Default sample tools
    toolsSection = `
## Available Tools

This server includes the following tools:

| Tool | Description |
|------|-------------|
| \`echo\` | Echoes back a message. Use a preset key (\`helloWorld\`, \`welcome\`, \`goodbye\`) or provide a custom message. |
| \`get-greeting\` | Returns a personalized greeting with style options: \`default\`, \`morning\`, \`evening\`, \`formal\`, \`casual\`. |
| \`list-items\` | Lists all items from the data source, optionally filtered by category (\`widgets\`, \`gadgets\`, \`tools\`, \`components\`). |
| \`get-item\` | Gets detailed information about a specific item by ID (e.g., \`item-001\`) or name. |
| \`list-categories\` | Lists all available categories. |
| \`get-server-info\` | Returns information about this MCP server. |

## Data Source

Tools are powered by a JSON data file at \`data/content.json\`. This file contains:

- **greetings**: Message templates for different greeting styles
- **echoMessages**: Preset messages for the echo tool
- **items**: Sample items with id, name, category, description, and tags
- **categories**: List of available categories
- **serverInfo**: Server metadata

You can modify this file to customize the data returned by the tools.`;
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

  let projectStructure = '## Project Structure\n\n';
  if (deployment === 'local') {
    projectStructure += `- \`src/index.js\` - Main MCP server with stdio transport
- \`src/tools.js\` - Tool definitions and handlers
- \`data/content.json\` - JSON data source for tools`;
  } else if (deployment === 'remote') {
    if (config.remoteHost === 'vercel') {
      projectStructure += `- \`src/tools.js\` - Tool definitions and handlers
- \`data/content.json\` - JSON data source for tools
- \`api/index.js\` - Vercel Function wrapper with SSE transport
- \`vercel.json\` - Vercel configuration`;
    } else {
      projectStructure += `- \`src/tools.js\` - Tool definitions and handlers
- \`data/content.json\` - JSON data source for tools
- \`netlify/functions/api.js\` - Netlify Function with stateless JSON-RPC handler
- \`netlify.toml\` - Netlify configuration`;
    }
  } else {
    projectStructure += `- \`src/index.js\` - Main MCP server with stdio transport (local use)
- \`src/tools.js\` - Tool definitions and handlers
- \`data/content.json\` - JSON data source for tools`;
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
${toolsSection}

## Installation

\`\`\`bash
npm install
\`\`\`
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
 * Generate sample content.json data file
 */
export function generateContentJson(config) {
  return JSON.stringify({
    greetings: {
      default: "Hello, {name}! Welcome to " + config.projectName + ".",
      morning: "Good morning, {name}! Hope you have a great day!",
      evening: "Good evening, {name}! Thanks for stopping by.",
      formal: "Greetings, {name}. We are pleased to have you here.",
      casual: "Hey {name}! What's up?"
    },
    echoMessages: {
      helloWorld: "Hello, World!",
      welcome: "Welcome to the MCP server!",
      goodbye: "Goodbye and thanks for using " + config.projectName + "!"
    },
    items: [
      {
        id: "item-001",
        name: "Widget Alpha",
        category: "widgets",
        description: "A versatile widget for everyday use",
        tags: ["utility", "beginner-friendly"]
      },
      {
        id: "item-002",
        name: "Gadget Beta",
        category: "gadgets",
        description: "An advanced gadget with multiple features",
        tags: ["advanced", "multi-purpose"]
      },
      {
        id: "item-003",
        name: "Tool Gamma",
        category: "tools",
        description: "A powerful tool for complex tasks",
        tags: ["professional", "high-performance"]
      },
      {
        id: "item-004",
        name: "Component Delta",
        category: "components",
        description: "A modular component for building systems",
        tags: ["modular", "extensible"]
      },
      {
        id: "item-005",
        name: "Widget Epsilon",
        category: "widgets",
        description: "A specialized widget for specific tasks",
        tags: ["specialized", "efficient"]
      }
    ],
    categories: ["widgets", "gadgets", "tools", "components"],
    serverInfo: {
      name: config.projectName,
      version: "1.0.0",
      description: config.description || "A sample MCP server demonstrating data-driven tools"
    }
  }, null, 2);
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
  included_files = ["src/**", "data/**"]

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
