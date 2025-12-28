# MCP Hatchery 🥚

A CLI tool to scaffold Model Context Protocol (MCP) servers with support for:
- **JavaScript**: Using @modelcontextprotocol/sdk with Netlify/Vercel hosting
- **Python**: Using FastMCP framework with optional FastMCP Cloud hosting

## Installation

```bash
npm install -g mcp-hatchery
```

## Usage

```bash
mcp-hatchery create my-server
```

Or use directly with npx:

```bash
npx mcp-hatchery create my-mcp-server
```

You'll be prompted for a project name and description. The tool generates a complete MCP server with example tools ready for customization.

## Project Types

### JavaScript (Bare Bones)
MCP server using the official JavaScript SDK:
- Local stdio transport for IDE integration
- Remote HTTP/SSE transport for Netlify or Vercel
- Example tools with Zod schema validation
- Uses @modelcontextprotocol/sdk

### Python (FastMCP)
MCP server using the FastMCP Python framework:
- Data-driven servers with sample query tools
- Local stdio support for IDE integration
- Optional remote deployment to FastMCP Cloud
- Includes test script and comprehensive README
- Uses fastmcp>=2.0.0

## Generated Project Structure

### JavaScript Projects

```
my-mcp-server/
├── src/
│   ├── index.js       # Local MCP server (stdio transport)
│   └── tools.js       # Tool definitions with Zod schemas
├── netlify/
│   └── functions/
│       └── api.js     # Netlify Function (SSE transport)
├── data/              # Optional data files for your tools
├── package.json
├── netlify.toml
└── README.md
```

- **src/tools.js** — Define your MCP tools here (name, description, schema, handler)
- **src/index.js** — Stdio server for local IDE integration
- **netlify/functions/api.js** — SSE server for remote deployment
- **data/** — Store static data files your tools need to access

### FastMCP Projects

```
my-fastmcp-server/
├── server.py          # FastMCP server with sample tools
├── requirements.txt   # Python dependencies
├── test_server.py     # Validation script
├── data/
│   └── sample.json    # Sample data file
└── README.md          # Deployment guide
```

- **server.py** — FastMCP server with example data query tools
- **test_server.py** — Test script to validate functionality
- **data/sample.json** — Example data structure
- **requirements.txt** — Python dependencies (fastmcp>=2.0.0)

### IDE Configuration

Add to your IDE's MCP settings:

**JavaScript (Local):**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/my-mcp-server/src/index.js"]
    }
  }
}
```

**Python (Local):**
```json
{
  "mcpServers": {
    "my-fastmcp-server": {
      "command": "python",
      "args": ["/absolute/path/to/my-fastmcp-server/server.py"]
    }
  }
}
```

**Remote (after Netlify deployment):**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["mcp-remote@next", "https://my-server.netlify.app/mcp"]
    }
  }
}
```

**Remote (after FastMCP Cloud deployment):**
```json
{
  "mcpServers": {
    "my-fastmcp-server": {
      "type": "http",
      "url": "https://your-project-name.fastmcp.app/mcp"
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

## Deploy to FastMCP Cloud

For Python projects generated with the FastMCP option:

1. Push your project to GitHub
2. Visit [fastmcp.cloud](https://fastmcp.cloud/) and sign in with GitHub
3. Create new project from your repository
4. Configure:
   - **Name**: Choose a unique name (creates URL)
   - **Entrypoint**: `server.py:mcp`
   - **Authentication**: Public or organization-only
5. Deploy (automatic)
6. Connect at: `https://your-project-name.fastmcp.app/mcp`

FastMCP Cloud automatically redeploys on every push to `main`.

## Requirements

- Node.js >= 18.0.0 (for JavaScript projects)
- Python >= 3.8 (for FastMCP projects)

## License

MIT
