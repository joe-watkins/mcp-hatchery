# MCP Hatchery 🥚

A CLI tool to scaffold Model Context Protocol (MCP) servers that work both locally (stdio) and remotely (Netlify Functions).

## Features

- 🚀 **Quick Start**: Create MCP servers in seconds with interactive prompts
- 🔄 **Dual Transport**: Supports both stdio (local) and SSE (remote via Netlify)
- 📦 **Code Analysis**: Analyze existing local MCP servers and replicate their tool structure
- 🎨 **TypeScript**: All projects use TypeScript with proper type definitions
- 🌐 **Netlify Ready**: Automatically configured for Netlify Functions deployment
- 🛠️ **Separated Tools**: Clean architecture with tools defined separately from server setup

## Installation

### Global Installation (Recommended)

```bash
npm install -g mcp-hatchery
```

### Using npx (No Installation)

```bash
npx mcp-hatchery create my-mcp-server
```

## Usage

### Interactive Mode

```bash
mcp-hatchery create
```

This will guide you through:

1. **Project Name**: Choose a name for your server (lowercase, letters, numbers, hyphens)
2. **Description**: Brief description of what your server does
3. **Source Type**: 
   - **Bare-bones**: Start with sample tools (echo and get-greeting)
   - **Analyze local**: Extract tools from an existing local MCP server

### Quick Create

```bash
mcp-hatchery create my-server
```

### Specify Target Directory

```bash
mcp-hatchery create my-server --directory ./projects/my-server
```

## Generated Project Structure

```
my-mcp-server/
├── src/
│   ├── index.ts           # Main MCP server with stdio transport (local use)
│   └── tools.ts           # Tool definitions with Zod schemas and handlers
├── netlify/
│   └── functions/
│       └── api.js         # Netlify Function with SSE transport (remote use)
├── build/                 # Compiled TypeScript output (gitignored)
├── package.json
├── tsconfig.json
├── netlify.toml          # Netlify deployment configuration
├── .env.example
├── .gitignore
└── README.md
```

## How It Works

The generated MCP server follows a clean, separated architecture:

1. **Tool Definitions** (`src/tools.ts`): All tools are defined in one file with:
   - Name and description
   - Zod schemas for input validation
   - Handler functions with business logic

2. **Local Server** (`src/index.ts`): 
   - Uses stdio transport for local MCP clients like Claude Desktop
   - Imports and registers tools from `tools.ts`

3. **Remote Server** (`netlify/functions/api.js`): 
   - Netlify Function using SSE transport for remote access
   - Imports the same tool definitions from compiled `build/tools.js`

4. **Shared Logic**: Both transports use identical tool definitions, ensuring consistency between local and remote deployments.

## Local Development

After scaffolding your project:

```bash
cd my-mcp-server
npm install
npm run build       # Compile TypeScript
npm run dev         # Run locally with stdio transport
```

### Configuring Claude Desktop

Add to your Claude Desktop MCP settings (typically at `%APPDATA%\Claude\claude_desktop_config.json` on Windows or `~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\my-mcp-server\\build\\index.js"]
    }
  }
}
```

**Note**: Use absolute paths and escape backslashes on Windows.

## Deploy to Netlify

Your generated project is ready to deploy to Netlify:

### Option 1: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Option 2: GitHub Integration

1. Push your project to GitHub
2. Go to [Netlify](https://app.netlify.com/)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Netlify will auto-detect the build settings from `netlify.toml`

### Remote Endpoints

Once deployed, your MCP server will be available at:

- **Health Check**: `https://your-site.netlify.app/.netlify/functions/api`
- **SSE Endpoint**: `https://your-site.netlify.app/.netlify/functions/api/sse`
- **Message Endpoint**: `https://your-site.netlify.app/.netlify/functions/api/message`

Configure remote MCP clients to use these endpoints for remote access.

## Project Types

### Bare-Bones Server

Creates a minimal MCP server with two example tools:
- **echo**: Echoes back a message
- **get-greeting**: Returns a personalized greeting

Perfect for starting from scratch and building your own tools.

```bash
mcp-hatchery create my-server
# Select "Create a bare-bones MCP server"
```

### Analyze Local Server

Analyzes an existing local MCP server directory and extracts its tool definitions to generate a new project with similar tools.

Useful for:
- Replicating an existing MCP server's structure
- Migrating to the Netlify-ready architecture
- Creating variations of existing servers

```bash
mcp-hatchery create enhanced-server
# Select "Analyze an existing local MCP server"
# Enter: C:\path\to\existing\mcp-server
```

## Development

### Building from Source

```bash
git clone https://github.com/joe-watkins/mcp-hatchery.git
cd mcp-hatchery
npm install
npm link
```

### Testing Locally

```bash
mcp-hatchery create test-server
cd test-server
npm install
npm run build
npm run dev
```

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## Adding Tools to Your Generated Project

Edit `src/tools.ts` in your generated project. Each tool needs:

```typescript
{
  name: 'my-tool',                    // Unique identifier
  description: 'What this tool does', // User-facing description
  inputSchema: z.object({             // Zod schema for validation
    param: z.string().describe('Description of param')
  }),
  handler: async (args) => {          // Implementation
    return {
      content: [{
        type: 'text' as const,
        text: `Result: ${args.param}`
      }]
    };
  }
}
```

After editing, rebuild:

```bash
npm run build
```

## Architecture

MCP Hatchery generates servers with this architecture:

### Separated Concerns
- **Tool definitions** are isolated in `src/tools.ts`, making them easy to find, modify, and test
- **Server setup** in `src/index.ts` handles MCP protocol details
- **Netlify wrapper** in `netlify/functions/api.js` adapts for serverless deployment

### Type Safety
- Full TypeScript support throughout
- Zod schemas provide runtime validation
- Type inference from schemas to handlers

### Dual Transport
- **Stdio**: Fast local communication for Claude Desktop
- **SSE**: Server-Sent Events for remote HTTP access via Netlify
- Same tool logic works for both transports seamlessly

### Build Process
TypeScript compiles to `build/` directory:
- Local stdio server imports from `build/index.js`
- Netlify function imports from `build/tools.js`
- Single source of truth for all tool definitions

## Learn More

- [Model Context Protocol](https://modelcontextprotocol.io/) - Official MCP documentation
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - SDK reference
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers) - Example MCP servers
- [Netlify Functions](https://docs.netlify.com/functions/overview/) - Serverless deployment docs
- [Zod](https://zod.dev/) - TypeScript-first schema validation

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/joe-watkins/mcp-hatchery/issues)
- **Discussions**: [GitHub Discussions](https://github.com/joe-watkins/mcp-hatchery/discussions)
- **Documentation**: [README.md](https://github.com/joe-watkins/mcp-hatchery#readme)
