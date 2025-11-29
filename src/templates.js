/**
 * Generate package.json for the scaffolded project
 */
export function generatePackageJson(config, analysis) {
  const dependencies = {
    '@modelcontextprotocol/sdk': '^1.0.4'
  };

  // Only add serverless-http if deploying remotely
  if (config.deployment === 'remote' || config.deployment === 'both') {
    dependencies['serverless-http'] = '^3.2.0';
  }

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
 * Generate Netlify Function handler (api.js)
 */
export function generateNetlifyFunction(config) {
  return `import serverless from 'serverless-http';
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
        inputSchema: tool.inputSchema
      }))
    };
  });

  // Handler for calling tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find(t => t.name === request.params.name);
    
    if (!tool) {
      throw new Error(\`Unknown tool: \${request.params.name}\`);
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

  const deployment = config.deployment || 'both';
  
  let description = 'A Model Context Protocol (MCP) server';
  if (deployment === 'both') {
    description += ' that works both locally (stdio) and remotely (Netlify Functions).';
  } else if (deployment === 'local') {
    description += ' for local use (stdio transport).';
  } else {
    description += ' for remote deployment (Netlify Functions).';
  }

  let localSection = '';
  if (deployment === 'local' || deployment === 'both') {
    localSection = `
### Configure your IDE

Add this to your Claude Desktop MCP settings:

\`\`\`json
{
  "mcpServers": {
    "${config.projectName}": {
      "command": "node",
      "args": ["/absolute/path/to/${config.projectName}/src/index.js"]
    }
  }
}
\`\`\`
`;
  }

  let remoteSection = '';
  if (deployment === 'remote' || deployment === 'both') {
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

#### Available Endpoints:

- **MCP Endpoint**: \`https://your-site.netlify.app/mcp\`
- **Health Check**: \`https://your-site.netlify.app/mcp\`
`;
  }

  let projectStructure = '## Project Structure\n\n';
  if (deployment === 'local') {
    projectStructure += `- \`src/index.js\` - Main MCP server with stdio transport
- \`src/tools.js\` - Tool definitions and handlers`;
  } else if (deployment === 'remote') {
    projectStructure += `- \`src/tools.js\` - Tool definitions and handlers
- \`netlify/functions/api.js\` - Netlify Function wrapper with SSE transport
- \`netlify.toml\` - Netlify configuration`;
  } else {
    projectStructure += `- \`src/index.js\` - Main MCP server with stdio transport (local use)
- \`src/tools.js\` - Tool definitions and handlers
- \`netlify/functions/api.js\` - Netlify Function wrapper with SSE transport (remote use)
- \`netlify.toml\` - Netlify configuration`;
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
