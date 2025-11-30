# MCP Hatchery 🥚

A CLI tool to scaffold Model Context Protocol (MCP) servers with local (stdio) and remote (Netlify) support.

## Installation

```bash
npm install -g mcp-hatchery
```

Or use directly with npx:

```bash
npx mcp-hatchery create my-mcp-server
```

## Usage

```bash
mcp-hatchery create my-server
```

You'll be prompted for a project name and description. The tool generates a complete MCP server with example tools ready for customization.

## Generated Project Structure

```
my-mcp-server/
├── src/
│   ├── index.ts           # Local MCP server (stdio transport)
│   └── tools.ts           # Tool definitions with Zod schemas
├── netlify/
│   └── functions/
│       └── api.js         # Netlify Function (SSE transport)
├── package.json
├── tsconfig.json
├── netlify.toml
└── README.md
```

## Local Development

```bash
cd my-mcp-server
npm install
npm run build
npm run dev
```

### IDE Configuration

Add to your IDE's MCP settings:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/my-mcp-server/build/index.js"]
    }
  }
}
```

## Deploy to Netlify

### Via GitHub

1. Push your project to GitHub
2. Go to [Netlify](https://app.netlify.com/) → "Add new site" → "Import an existing project"
3. Connect your repository — Netlify auto-detects settings from `netlify.toml`

### Via CLI

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

### Endpoints

Once deployed:

- **SSE**: `https://your-site.netlify.app/.netlify/functions/api/sse`
- **Message**: `https://your-site.netlify.app/.netlify/functions/api/message`

Then rebuild: `npm run build`

## Requirements

- Node.js >= 18.0.0

## License

MIT
