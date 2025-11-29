# MCP Hatchery 🥚

A CLI tool to scaffold Model Context Protocol (MCP) servers that work both locally (stdio) and remotely (Netlify Functions).

## Features

- 🚀 **Quick Start**: Create MCP servers in seconds with a simple 2-question prompt
- 🔄 **Dual Transport**: Supports both stdio (local) and SSE (remote via Netlify)
- 🎨 **TypeScript-First**: All projects use TypeScript with Zod schema validation
- 🌐 **Netlify Ready**: Automatically configured for Netlify Functions deployment
- 🛠️ **Clean Architecture**: Tools defined separately from server setup for easy maintenance

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

You'll be prompted for:

1. **Project Name**: Your server name (lowercase, letters, numbers, hyphens only)
2. **Description**: Brief description of your server's purpose

That's it! The tool creates a complete MCP server with two example tools (echo and get-greeting) ready for customization.

### Quick Create

```bash
mcp-hatchery create my-server
```

### Specify Target Directory

```bash
mcp-hatchery create my-server --directory ./projects/my-server
```

## What You Get

Every generated project includes:

### Project Structure
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

### Two Example Tools
- **echo**: Echoes back a message (demonstrates string input/output)
- **get-greeting**: Returns a personalized greeting (demonstrates parameter usage)

These examples show you the pattern—just customize or replace them with your own tools!

## How It Works

Your generated MCP server uses a clean, maintainable architecture:

### Tool Definitions (`src/tools.ts`)
All tools are defined in one file using a simple, consistent structure:
- **name**: Unique identifier
- **description**: What the tool does
- **inputSchema**: Zod schema for runtime validation
- **handler**: Async function implementing the logic

### Local Server (`src/index.ts`)
- Uses stdio transport for Claude Desktop and other local MCP clients
- Imports and registers all tools from `tools.ts`
- Handles MCP protocol communication

### Remote Server (`netlify/functions/api.js`)
- Netlify Function using SSE (Server-Sent Events) transport
- Imports the same compiled tool definitions from `build/tools.js`
- Enables remote access via HTTP

### Key Benefit
Both local and remote servers use **identical tool logic**—write once, run anywhere!

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

## Customizing Your Server

### Adding New Tools

Edit `src/tools.ts` in your generated project. Each tool follows this structure:

```typescript
{
  name: 'my-tool',                    // Unique identifier
  description: 'What this tool does', // User-facing description
  inputSchema: z.object({             // Zod schema for validation
    param: z.string().describe('Parameter description')
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

**After editing**, rebuild the project:

```bash
npm run build
```

### Modifying Example Tools

Simply edit the `echo` and `get-greeting` tools in `src/tools.ts` to suit your needs, or remove them entirely and add your own.

## Why Zod?

[Zod](https://zod.dev/) is a TypeScript-first schema validation library that provides:

- **Runtime Validation**: Ensures incoming data matches your schema
- **Type Safety**: TypeScript automatically infers types from schemas
- **Documentation**: Descriptions become part of the tool's API
- **Error Messages**: Clear validation errors when inputs don't match

Perfect for MCP servers where tool inputs come from external clients!

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

## Architecture

### Separated Concerns
- **Tool definitions** isolated in `src/tools.ts` for easy discovery and modification
- **Server logic** in `src/index.ts` handles MCP protocol communication
- **Deployment wrapper** in `netlify/functions/api.js` adapts for serverless

### Type Safety
- Full TypeScript support with strict type checking
- Zod schemas provide both compile-time and runtime validation
- Type inference flows from schemas through to handlers

### Dual Transport
- **Stdio**: Direct process communication for local MCP clients (fast!)
- **SSE**: Server-Sent Events over HTTP for remote access (flexible!)
- Same tool definitions work seamlessly with both transports

### Build Process
- TypeScript compiles from `src/` to `build/`
- Both local and remote servers import from `build/`
- Single source of truth ensures consistency

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
