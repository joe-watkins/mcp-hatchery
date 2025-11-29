# Copilot Instructions for MCP Hatchery

## Project Overview
MCP Hatchery is a CLI tool that scaffolds Model Context Protocol (MCP) servers. It generates JavaScript projects with dual transport support (stdio for local, SSE/HTTP for remote) targeting Netlify or Vercel deployment.

## Architecture

### Code Flow
1. **Entry**: `bin/mcp-hatchery.js` → Commander CLI parses `create` command
2. **Prompts**: `src/prompts.js` → Inquirer collects project config (name, deployment target, remote host)
3. **Scaffold**: `src/scaffold.js` → Orchestrates file generation, creates directory structure
4. **Templates**: `src/templates.js` → Contains all code generation functions

### Key Design Decisions
- **Single source of truth for tools**: Generated projects define tools in `src/tools.js` with unified structure (name, description, inputSchema, handler)
- **Deployment flexibility**: Same tool logic works for both stdio (`src/index.js`) and HTTP/SSE transports (Netlify/Vercel functions)
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
1. Add choice to `remoteHost` prompt in `src/prompts.js`
2. Create `generateNewHostFunction()` and `generateNewHostConfig()` in `src/templates.js`
3. Update `scaffoldProject()` in `src/scaffold.js` to conditionally include new files
4. Update `generateReadme()` to document the new target

### Config Object Shape
```javascript
{
  projectName: 'my-server',      // lowercase, letters, numbers, hyphens
  description: 'My MCP server',
  deployment: 'both' | 'local' | 'remote',
  remoteHost: 'netlify' | 'vercel',  // only when deployment !== 'local'
  sourceType: 'bare-bones'           // always this value currently
}
```

## Development Commands
```bash
npm link              # Install CLI globally for testing
node bin/mcp-hatchery.js create test-server  # Test without global install
```

## Common Tasks

### Adding a new template file to generated projects
1. Create generator function in `src/templates.js`
2. Add file entry to `files` array in `src/scaffold.js`:
   ```javascript
   { path: 'new-file.js', content: generateNewFile(config), description: 'New file' }
   ```

### Modifying generated tool structure
Edit `generateToolDefinitions()` in `src/templates.js` - this affects the sample `echo` and `get-greeting` tools.

### Supporting new MCP SDK transports
- Local: Modify `generateIndexFile()` in `src/templates.js`
- Remote: Create new function like `generateVercelFunction()` or `generateNetlifyFunction()`
