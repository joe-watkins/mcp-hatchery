/**
 * Generate package.json for the scaffolded project
 */
export function generatePackageJson(config, analysis) {
  const dependencies = {
    '@modelcontextprotocol/sdk': '^1.0.4'
  };

  if (config.transports.includes('http')) {
    dependencies.express = '^4.19.2';
    dependencies.cors = '^2.8.5';
  }

  // No additional dependencies needed for deployment platforms
  // Both Netlify and Vercel can run standard Express servers

  const scripts = {};
  
  if (config.language === 'typescript') {
    dependencies['@types/node'] = '^20.0.0';
    dependencies['@types/express'] = '^4.17.21';
    dependencies['typescript'] = '^5.3.0';
    dependencies['tsx'] = '^4.7.0';
    
    if (config.transports.includes('stdio')) {
      scripts.start = 'tsx src/stdio.ts';
    }
    if (config.transports.includes('http')) {
      scripts['start:http'] = 'tsx src/http.ts';
      scripts.dev = 'tsx watch src/http.ts';
    }
    scripts.build = 'tsc';
  } else {
    if (config.transports.includes('stdio')) {
      scripts.start = 'node src/stdio.js';
    }
    if (config.transports.includes('http')) {
      scripts['start:http'] = 'node src/http.js';
      scripts.dev = 'node --watch src/http.js';
    }
  }

  return {
    name: config.projectName,
    version: '1.0.0',
    description: config.description,
    type: 'module',
    main: config.transports.includes('stdio') ? 'src/stdio.js' : 'src/http.js',
    scripts,
    dependencies,
    engines: {
      node: '>=18.0.0'
    }
  };
}

/**
 * Generate the main server factory with MCP server configuration
 */
export function generateServerFactory(config, analysis) {
  const ext = config.language === 'typescript' ? 'ts' : 'js';
  const importZod = config.language === 'typescript' ? "import { z } from 'zod';" : "import { z } from 'zod/v4';";
  
  let toolRegistrations = '';
  
  if (analysis.tools.length > 0) {
    // Generate tool registrations from analyzed tools
    toolRegistrations = analysis.tools.map(tool => {
      const schemaFields = Object.keys(tool.inputSchema).length > 0
        ? Object.entries(tool.inputSchema).map(([key, type]) => {
            return `    ${key}: z.${type}()`;
          }).join(',\n')
        : '    // No input parameters';
      
      return `  server.registerTool(
    '${tool.name}',
    {
      title: '${tool.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}',
      description: '${tool.description}',
      inputSchema: {
${schemaFields}
      }
    },
    async (args) => {
      // TODO: Implement ${tool.name} logic
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(args)
          }
        ]
      };
    }
  );`;
    }).join('\n\n');
  } else {
    // Generate a sample tool for bare-bones projects
    toolRegistrations = `  // Example tool - replace with your own
  server.registerTool(
    'echo',
    {
      title: 'Echo Tool',
      description: 'Echoes back the provided message',
      inputSchema: {
        message: z.string().describe('Message to echo')
      }
    },
    async ({ message }) => {
      return {
        content: [
          {
            type: 'text',
            text: \`Echo: \${message}\`
          }
        ]
      };
    }
  );`;
  }

  let resourceRegistrations = '';
  if (analysis.resources.length > 0) {
    resourceRegistrations = '\n\n' + analysis.resources.map(resource => {
      return `  server.registerResource(
    '${resource.name}',
    '${resource.uri}',
    {
      title: '${resource.name}',
      mimeType: 'text/plain'
    },
    async (uri) => {
      // TODO: Implement ${resource.name} resource
      return {
        contents: [
          {
            uri: uri.href,
            text: 'Resource content here'
          }
        ]
      };
    }
  );`;
    }).join('\n\n');
  }

  return `import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
${importZod}

/**
 * Create and configure the MCP server
 */
export function createMCPServer() {
  const server = new McpServer({
    name: '${config.projectName}',
    version: '1.0.0'
  }, {
    capabilities: {
      tools: {},
      resources: {}
    }
  });

${toolRegistrations}${resourceRegistrations}

  return server;
}
`;
}

/**
 * Generate stdio entry point
 */
export function generateStdioEntry(config) {
  const ext = config.language === 'typescript' ? 'ts' : 'js';
  
  return `#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from './server.${ext}';

/**
 * Start the MCP server with stdio transport
 * This allows the server to communicate with MCP clients like Claude Desktop
 */
async function main() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  
  await server.connect(transport);
  
  console.error('MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
`;
}

/**
 * Generate HTTP entry point with Express
 */
export function generateHttpEntry(config) {
  const ext = config.language === 'typescript' ? 'ts' : 'js';
  
  return `#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from './server.${ext}';

const PORT = process.env.PORT || ${config.port || 3000};

/**
 * Start the MCP server with HTTP transport
 * This allows the server to be accessed remotely via HTTP
 */
async function main() {
  const app = express();
  
  // Middleware
  app.use(cors({
    origin: '*',
    exposedHeaders: ['Mcp-Session-Id']
  }));
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Create MCP server instance (can be reused across requests)
  const mcpServer = createMCPServer();

  // MCP endpoint using StreamableHTTPServerTransport
  app.post('/mcp', async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdHeader: 'mcp-session-id'
      });

      // Handle the request through the transport
      await transport.handleRequest(req, res, async (serverTransport) => {
        await mcpServer.connect(serverTransport);
      });
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // Start server
  app.listen(PORT, () => {
    console.log(\`MCP HTTP server listening on port \${PORT}\`);
    console.log(\`Health check: http://localhost:\${PORT}/health\`);
    console.log(\`MCP endpoint: http://localhost:\${PORT}/mcp\`);
  });
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
`;
}

/**
 * Generate README.md
 */
export function generateReadme(config, analysis) {
  const hasStdio = config.transports.includes('stdio');
  const hasHttp = config.transports.includes('http');
  const ext = config.language === 'typescript' ? 'ts' : 'js';
  
  let toolsList = '';
  if (analysis.tools.length > 0) {
    toolsList = '\n## Tools\n\n' + analysis.tools.map(tool => 
      `- **${tool.name}**: ${tool.description}`
    ).join('\n');
  }

  let stdioInstructions = '';
  if (hasStdio) {
    stdioInstructions = `
## Running with Stdio Transport

For use with MCP clients like Claude Desktop:

\`\`\`bash
npm start
\`\`\`

### Configuring Claude Desktop

Add this to your Claude Desktop configuration:

\`\`\`json
{
  "mcpServers": {
    "${config.projectName}": {
      "command": "node",
      "args": ["${process.cwd()}/src/stdio.${ext}"]
    }
  }
}
\`\`\`
`;
  }

  let httpInstructions = '';
  if (hasHttp) {
    const deploymentSection = config.deployment === 'netlify' 
      ? `
### Deploying to Netlify

This project uses Netlify Functions with a wrapped Express server.

1. Install the Netlify CLI:
\`\`\`bash
npm install -g netlify-cli
\`\`\`

2. Login to Netlify:
\`\`\`bash
netlify login
\`\`\`

3. Deploy to Netlify:
\`\`\`bash
netlify deploy --prod
\`\`\`

Your MCP server will be available at: \`https://your-site.netlify.app/mcp\`

#### Environment Variables

Set environment variables in the Netlify dashboard under Site configuration > Environment variables.
`
      : config.deployment === 'vercel'
      ? `
### Deploying to Vercel

This project is configured to deploy the Express server to Vercel.

1. Install the Vercel CLI:
\`\`\`bash
npm install -g vercel
\`\`\`

2. Deploy to Vercel:
\`\`\`bash
vercel
\`\`\`

3. For production:
\`\`\`bash
vercel --prod
\`\`\`

Your MCP server will be available at: \`https://your-project.vercel.app/mcp\`

#### Environment Variables

Set environment variables using:
\`\`\`bash
vercel env add VARIABLE_NAME
\`\`\`

Or configure them in the Vercel dashboard under Project Settings > Environment Variables.
`
      : `
### Deployment

This server can be deployed to any Node.js hosting platform:

- **Railway**: Connect your GitHub repo and deploy
- **Fly.io**: Use \`fly launch\` to create and deploy
- **Render**: Connect your GitHub repo and deploy as a web service
- **Heroku**: Use \`heroku create\` and \`git push heroku main\`
- **Netlify**: Add \`netlify.toml\` and use \`netlify deploy\`
- **Vercel**: Add \`vercel.json\` and use \`vercel deploy\`

Set the environment variable \`PORT\` if required by your hosting platform.
`;

    httpInstructions = `
## Running with HTTP Transport

For remote access via HTTP:

\`\`\`bash
npm run start:http
\`\`\`

Or for development with auto-reload:

\`\`\`bash
npm run dev
\`\`\`

The server will be available at \`http://localhost:${config.port || 3000}/mcp\`

### Testing the HTTP Endpoint

\`\`\`bash
curl -X POST http://localhost:${config.port || 3000}/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
\`\`\`
${deploymentSection}
`;
  }

  return `# ${config.projectName}

${config.description}

## Installation

\`\`\`bash
npm install
\`\`\`
${toolsList}
${stdioInstructions}
${httpInstructions}

## Development

${config.language === 'typescript' ? '### Building\n\n```bash\nnpm run build\n```\n\n' : ''}Edit the server configuration in \`src/server.${ext}\` to add your own tools, resources, and prompts.

## Project Structure

- \`src/server.${ext}\` - Main MCP server configuration and tool definitions
${hasStdio ? `- \`src/stdio.${ext}\` - Stdio transport entry point\n` : ''}${hasHttp ? `- \`src/http.${ext}\` - HTTP transport entry point with Express server\n` : ''}${config.deployment === 'netlify' ? `- \`netlify/functions/server.${ext}\` - Netlify function wrapping Express app\n- \`netlify.toml\` - Netlify configuration\n` : ''}${config.deployment === 'vercel' ? `- \`vercel.json\` - Vercel configuration (uses src/http.${ext} directly)\n` : ''}

## Learn More

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
`;
}

/**
 * Generate .env.example
 */
export function generateEnvExample(config) {
  let content = '# Environment variables\n\n';
  
  if (config.transports.includes('http')) {
    content += `PORT=${config.port || 3000}\n`;
  }
  
  content += '\n# Add your environment variables here\n';
  
  return content;
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
      outDir: './dist',
      rootDir: './src',
      declaration: true
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist']
  };
}

/**
 * Generate Netlify configuration (netlify.toml)
 */
export function generateNetlifyConfig(config) {
  const startScript = config.language === 'typescript' ? 'tsx src/http.ts' : 'node src/http.js';
  
  return `[build]
  command = "npm install"
  publish = "."

# Redirect all traffic through the Express server
[[redirects]]
  from = "/*"
  to = "/.netlify/functions/server/:splat"
  status = 200
  force = true

# Netlify Functions configuration
[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  
# Define the server function
[[functions]]
  path = "/.netlify/functions/server"
  included_files = ["src/**/*"]
`;
}

/**
 * Generate Netlify Function handler that wraps Express
 */
export function generateNetlifyFunction(config) {
  const ext = config.language === 'typescript' ? 'ts' : 'js';
  
  return `import serverless from 'serverless-http';
import express from 'express';
import cors from 'cors';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer } from '../../src/server.${ext}';

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  exposedHeaders: ['Mcp-Session-Id']
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Create MCP server instance
const mcpServer = createMCPServer();

// MCP endpoint
app.post('/mcp', async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdHeader: 'mcp-session-id'
    });

    await transport.handleRequest(req, res, async (serverTransport) => {
      await mcpServer.connect(serverTransport);
    });
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Export for Netlify Functions
export const handler = serverless(app);
`;
}

/**
 * Generate Vercel configuration (vercel.json)
 */
export function generateVercelConfig(config) {
  const ext = config.language === 'typescript' ? 'ts' : 'js';
  
  return {
    version: 2,
    builds: [
      {
        src: `src/http.${ext}`,
        use: '@vercel/node'
      }
    ],
    routes: [
      {
        src: '/(.*)',
        dest: `src/http.${ext}`
      }
    ]
  };
}

/**
 * Generate Vercel deployment note (no separate function needed)
 */
export function generateVercelFunction(config) {
  // Vercel will use the existing http.ts/js file directly
  // No separate function file needed
  return null;
}
