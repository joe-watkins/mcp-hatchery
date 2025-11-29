# test-server

My MCP server

A Model Context Protocol (MCP) server that works both locally (stdio) and remotely (Netlify Functions).

## Installation

```bash
npm install
```


### Configure your IDE

Add this to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "test-server": {
      "command": "node",
      "args": ["/absolute/path/to/test-server/src/index.js"]
    }
  }
}
```

## Deploy to Netlify

This project is configured to deploy as a Netlify Function.

### Deploy via GitHub

1. Push this repository to GitHub
2. Connect it to Netlify via the Netlify dashboard
3. Netlify will automatically build and deploy

### Using the Remote Server

Once deployed, configure your Claude Desktop MCP settings to use the remote server:

```json
{
  "mcpServers": {
    "test-server": {
      "command": "npx",
      "args": ["mcp-remote@next", "https://your-site.netlify.app/mcp"]
    }
  }
}
```

Replace `your-site.netlify.app` with your actual Netlify URL.

#### Available Endpoints:

- **MCP Endpoint**: `https://your-site.netlify.app/mcp`
- **Health Check**: `https://your-site.netlify.app/mcp`

## Project Structure

- `src/index.js` - Main MCP server with stdio transport (local use)
- `src/tools.js` - Tool definitions and handlers
- `netlify/functions/api.js` - Netlify Function wrapper with SSE transport (remote use)
- `netlify.toml` - Netlify configuration

## Generating Tools from Data

You can use the `data` folder to store JSON files and use an LLM (like Claude or Copilot) to generate tools for them.

1. Place your JSON file in the `data` folder (e.g., `data/products.json`).
2. Use the following prompt with your LLM:

> I have a JSON file at `data/products.json` (or whatever your file is named). Please analyze the structure of this data and create new MCP tools in `src/tools.js` to interact with it.
>
> At a minimum, please create:
> 1. A tool to list all items (with optional filtering)
> 2. A tool to get a specific item by ID (or unique field)
> 3. A tool to search items by a keyword
>
> Please ensure the tools follow the existing pattern in `src/tools.js` and include proper error handling.

## Adding New Tools

Edit `src/tools.js` to add new tool definitions. Each tool needs:

- **name**: Unique identifier for the tool
- **description**: What the tool does
- **inputSchema**: JSON Schema object defining the input parameters
- **handler**: Async function that implements the tool logic

## Learn More

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
