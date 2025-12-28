# Copilot Instructions for MCP Hatchery

## Project Overview
MCP Hatchery is a CLI tool that scaffolds Model Context Protocol (MCP) servers with support for multiple languages and deployment targets:
- **JavaScript**: Using @modelcontextprotocol/sdk with Netlify or Vercel deployment
- **Python**: Using FastMCP framework with optional FastMCP Cloud deployment

Both project types support local stdio and remote HTTP/SSE transports.

## Architecture

### Code Flow
1. **Entry**: `bin/mcp-hatchery.js` → Commander CLI parses `create` command
2. **Prompts**: `src/prompts.js` → Inquirer collects project config (name, deployment target, remote host)
3. **Scaffold**: `src/scaffold.js` → Orchestrates file generation, creates directory structure
4. **Templates**: `src/templates.js` → Contains all code generation functions

### Key Design Decisions
- **Multi-language support**: Generates both JavaScript and Python MCP servers
- **JavaScript projects**: Single source of truth for tools in `src/tools.js` with unified structure (name, description, inputSchema, handler)
- **Python projects**: FastMCP-based servers with data-driven tools defined in `server.py`
- **Deployment flexibility**: Same tool logic works for both stdio and HTTP/SSE transports
- **Framework separation**: JavaScript uses @modelcontextprotocol/sdk, Python uses fastmcp
- **No TypeScript in CLI**: Despite generating TypeScript-ready patterns, the CLI itself is pure JavaScript ESM

## File Responsibilities

| File | Purpose |
|------|---------|
| `src/templates.js` | All `generate*` functions that output file content as strings |
| `src/scaffold.js` | Directory creation, file writing, console output |
| `src/prompts.js` | Inquirer prompts and input validation |
| `src/commands/create.js` | Thin wrapper connecting prompts → scaffold |

## Conventions

### Template Functions
All template generators in `src/templates.js` follow this pattern:
```javascript
export function generateSomething(config, analysis) {
  // config: { projectName, description, deployment, remoteHost }
  // analysis: { tools: [], resources: [], summary: {...} }
  return `file content as template literal`;
}
```

### Adding New Deployment Targets
1. Add choice to `remoteHost` prompt in `src/prompts.js` (within the choices function for the appropriate sourceType)
2. Create `generateNewHostFunction()` and `generateNewHostConfig()` in `src/templates.js`
3. Update `scaffoldProject()` or `scaffoldFastMCPProject()` in `src/scaffold.js` to conditionally include new files
4. Update appropriate `generateReadme()` function to document the new target

### Config Object Shape
```javascript
{
  projectName: 'my-server',           // lowercase, letters, numbers, hyphens
  description: 'My MCP server',
  sourceType: 'bare-bones' | 'fastmcp',  // server type
  deployment: 'both' | 'local' | 'remote',
  remoteHost: 'netlify' | 'vercel' | 'fastmcp-cloud'  // based on sourceType
}
```

### Project Type Structure

**JavaScript (bare-bones):**
- `src/index.js` - stdio server
- `src/tools.js` - tool definitions
- `netlify/functions/api.js` or `vercel/api/index.js` - remote functions
- `package.json`, config files

**Python (fastmcp):**
- `server.py` - FastMCP server (handles both stdio and HTTP)
- `test_server.py` - validation script
- `requirements.txt` - Python dependencies
- `data/` - sample data files
- `README.md` - deployment guide

## Development Commands
```bash
npm link              # Install CLI globally for testing
node bin/mcp-hatchery.js create test-server  # Test without global install
```

## Common Tasks

### Adding a new template file to generated projects

**For JavaScript projects:**
1. Create generator function in `src/templates.js`
2. Add file entry to `files` array in `scaffoldProject()` in `src/scaffold.js`:
   ```javascript
   { path: 'new-file.js', content: generateNewFile(config), description: 'New file' }
   ```

**For Python projects:**
1. Create generator function in `src/templates.js` (prefix with `generateFastMCP`)
2. Add file entry to `files` array in `scaffoldFastMCPProject()` in `src/scaffold.js`

### Modifying generated tool structure
- **JavaScript**: Edit `generateToolDefinitions()` in `src/templates.js` - affects sample tools
- **Python**: Edit `generateFastMCPServer()` in `src/templates.js` - includes tool definitions

### Supporting new MCP SDK transports
- **JavaScript Local**: Modify `generateIndexFile()` in `src/templates.js`
- **JavaScript Remote**: Create new function like `generateVercelFunction()` or `generateNetlifyFunction()`
- **Python**: FastMCP handles transport automatically via `mcp.run()`
