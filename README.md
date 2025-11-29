# MCP Hatchery 🥚

A CLI tool to scaffold Model Context Protocol (MCP) servers for both local and remote deployment.

## Features

- 🚀 **Quick Start**: Create MCP servers in seconds with interactive prompts
- 🔄 **Dual Transport**: Support both stdio (local) and HTTP (remote) transports
- 📦 **Code Analysis**: Analyze existing MCP servers and replicate their architecture
- 🎨 **Language Support**: Generate JavaScript or TypeScript projects
- 🌐 **Deployment Ready**: Express servers ready for Vercel, Railway, Fly.io, etc.

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

This will guide you through an interactive setup:

1. **Project Name**: Choose a name for your server
2. **Description**: Brief description of what your server does
3. **Source Type**: 
   - Create a bare-bones MCP server
   - Analyze an existing local MCP server
   - Clone and analyze a GitHub MCP server
4. **Transports**: Select stdio, HTTP, or both
5. **Language**: JavaScript or TypeScript

### Quick Create

```bash
mcp-hatchery create my-server
```

### Specify Target Directory

```bash
mcp-hatchery create my-server --directory ./projects/my-server
```

## Project Types

### Bare-Bones Server

Creates a minimal MCP server with example tools. Perfect for starting from scratch.

```bash
mcp-hatchery create
# Select "Create a bare-bones MCP server"
```

### Clone from GitHub

Analyzes an existing GitHub MCP server and generates a project with similar tools and structure.

```bash
mcp-hatchery create
# Select "Clone and analyze a GitHub MCP server"
# Enter: https://github.com/username/mcp-server-repo
```

### Analyze Local Server

Analyzes an existing local MCP server directory and generates a new project based on its tools.

```bash
mcp-hatchery create
# Select "Analyze an existing local MCP server"
# Enter: /path/to/existing/mcp-server
```

## Generated Project Structure

### JavaScript Project

```
my-mcp-server/
├── src/
│   ├── server.js       # Main MCP server configuration
│   ├── stdio.js        # Stdio transport entry point
│   └── http.js         # HTTP transport entry point
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

### TypeScript Project

```
my-mcp-server/
├── src/
│   ├── server.ts       # Main MCP server configuration
│   ├── stdio.ts        # Stdio transport entry point
│   └── http.ts         # HTTP transport entry point
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## Transport Options

### Stdio Transport

For local use with MCP clients like Claude Desktop:

```bash
npm start
```

Configure in Claude Desktop:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/src/stdio.js"]
    }
  }
}
```

### HTTP Transport

For remote access via Express server:

```bash
npm run start:http
```

Or for development with auto-reload:

```bash
npm run dev
```

Test the endpoint:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Deployment

Generated HTTP servers can be deployed to:

- **Vercel**: Serverless functions
- **Railway**: Full Node.js deployment
- **Fly.io**: Global edge deployment
- **Render**: Web services
- **AWS Lambda**: Serverless
- Any Node.js hosting platform

## Examples

### Create a Bare-Bones Server

```bash
npx mcp-hatchery create weather-server
# Select: Bare-bones
# Transports: Both stdio and HTTP
# Language: JavaScript
```

### Clone from GitHub

```bash
npx mcp-hatchery create my-clone
# Select: GitHub
# Enter: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
```

### Analyze Local Project

```bash
npx mcp-hatchery create enhanced-server
# Select: Local
# Enter: ../existing-mcp-server
```

## Development

### Building from Source

```bash
git clone https://github.com/your-org/mcp-hatchery.git
cd mcp-hatchery
npm install
npm link
```

### Testing Locally

```bash
node bin/mcp-hatchery.js create test-server
```

## Requirements

- Node.js >= 18.0.0
- npm or yarn

## How It Works

1. **Interactive Prompts**: Uses Inquirer to gather project configuration
2. **Code Analysis**: Parses existing MCP servers to extract tool definitions
3. **Template Generation**: Creates server files with proper MCP SDK integration
4. **Project Scaffolding**: Writes all files with correct structure and configuration

## Learn More

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)

## Publishing to npm

### First Time Setup

1. Create an npm account at https://www.npmjs.com/signup (if you don't have one)

2. Login to npm from the terminal:
```bash
npm login
```

3. Verify you're logged in:
```bash
npm whoami
```

### Publishing Steps

1. Test your package locally first:
```bash
npm install
node bin/mcp-hatchery.js create test-project
```

2. Check what will be published:
```bash
npm pack --dry-run
```

3. Publish to npm:
```bash
npm publish
```

### Publishing Updates

When you make changes and want to publish a new version:

```bash
# Update version (choose one based on your changes)
npm version patch  # 1.0.0 -> 1.0.1 (bug fixes)
npm version minor  # 1.0.0 -> 1.1.0 (new features)
npm version major  # 1.0.0 -> 2.0.0 (breaking changes)

# Then publish
npm publish
```

### Verify Publication

- Visit: https://www.npmjs.com/package/mcp-hatchery
- Test install: `npm install -g mcp-hatchery`
- Test CLI: `mcp-hatchery create my-test-server`

### Tips

- **Scoped packages**: To publish as `@username/mcp-hatchery`, update package name and use `npm publish --access public`
- **Beta versions**: Use `npm publish --tag beta` for pre-release versions
- **Unpublish**: Within 72 hours, you can unpublish with `npm unpublish mcp-hatchery@version`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

## Support

For issues and questions:
- GitHub Issues: https://github.com/joe-watkins/mcp-hatchery/issues
- Documentation: https://github.com/joe-watkins/mcp-hatchery#readme
