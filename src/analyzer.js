import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import { execSync } from 'child_process';
import os from 'os';

/**
 * Analyzes an MCP server source code to extract tools, resources, and prompts
 */
export class MCPAnalyzer {
  constructor(sourcePath) {
    this.sourcePath = sourcePath;
    this.tools = [];
    this.resources = [];
    this.prompts = [];
  }

  /**
   * Analyze local MCP server directory
   */
  async analyzeLocal() {
    const files = await this.findSourceFiles(this.sourcePath);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      this.extractFromSource(content, file);
    }

    return this.getAnalysisResult();
  }

  /**
   * Clone and analyze GitHub repository
   */
  async analyzeGithub(repoUrl) {
    const tempDir = path.join(os.tmpdir(), `mcp-hatchery-${Date.now()}`);
    
    try {
      console.log(`Cloning repository to ${tempDir}...`);
      execSync(`git clone ${repoUrl} "${tempDir}"`, { stdio: 'inherit' });
      
      this.sourcePath = tempDir;
      await this.analyzeLocal();
      
      return this.getAnalysisResult();
    } finally {
      // Clean up temp directory
      await fs.remove(tempDir);
    }
  }

  /**
   * Find all JavaScript and TypeScript source files
   */
  async findSourceFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Skip node_modules and hidden directories
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await this.findSourceFiles(fullPath);
        files.push(...subFiles);
      } else if (/\.(ts|js|mjs)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Extract MCP registrations from source code
   */
  extractFromSource(content, filePath) {
    // Extract tools
    this.extractTools(content, filePath);
    
    // Extract resources
    this.extractResources(content, filePath);
    
    // Extract prompts
    this.extractPrompts(content, filePath);
  }

  /**
   * Extract tool registrations
   */
  extractTools(content, filePath) {
    // Match registerTool patterns
    const registerToolPattern = /(?:server|mcpServer)\.registerTool\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([^}]*)\}/gs;
    
    let match;
    while ((match = registerToolPattern.exec(content)) !== null) {
      const toolName = match[1];
      const configBlock = match[2];
      
      const tool = {
        name: toolName,
        description: this.extractField(configBlock, 'description') || `${toolName} tool`,
        inputSchema: this.extractSchema(content, match.index, 'inputSchema'),
        file: path.basename(filePath)
      };
      
      this.tools.push(tool);
    }

    // Also match legacy tool() pattern
    const legacyToolPattern = /(?:server|mcpServer)\.tool\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]*)['"`]/gs;
    
    while ((match = legacyToolPattern.exec(content)) !== null) {
      const toolName = match[1];
      const description = match[2];
      
      if (!this.tools.find(t => t.name === toolName)) {
        this.tools.push({
          name: toolName,
          description: description || `${toolName} tool`,
          inputSchema: {},
          file: path.basename(filePath)
        });
      }
    }
  }

  /**
   * Extract resource registrations
   */
  extractResources(content, filePath) {
    const registerResourcePattern = /(?:server|mcpServer)\.registerResource\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/gs;
    
    let match;
    while ((match = registerResourcePattern.exec(content)) !== null) {
      this.resources.push({
        name: match[1],
        uri: match[2],
        file: path.basename(filePath)
      });
    }
  }

  /**
   * Extract prompt registrations
   */
  extractPrompts(content, filePath) {
    const registerPromptPattern = /(?:server|mcpServer)\.(?:registerPrompt|prompt)\s*\(\s*['"`]([^'"`]+)['"`]/gs;
    
    let match;
    while ((match = registerPromptPattern.exec(content)) !== null) {
      this.prompts.push({
        name: match[1],
        file: path.basename(filePath)
      });
    }
  }

  /**
   * Extract a field value from config block
   */
  extractField(configBlock, fieldName) {
    const pattern = new RegExp(`${fieldName}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`);
    const match = pattern.exec(configBlock);
    return match ? match[1] : null;
  }

  /**
   * Extract schema object (simplified version)
   */
  extractSchema(content, startIndex, schemaName) {
    const schemaPattern = new RegExp(`${schemaName}\\s*:\\s*\\{([^}]+)\\}`);
    const match = schemaPattern.exec(content.slice(startIndex, startIndex + 1000));
    
    if (match) {
      // Try to parse field names from zod schema
      const fields = {};
      const zodFieldPattern = /(\w+)\s*:\s*z\.(string|number|boolean|array|object)/g;
      let fieldMatch;
      
      while ((fieldMatch = zodFieldPattern.exec(match[1])) !== null) {
        fields[fieldMatch[1]] = fieldMatch[2];
      }
      
      return fields;
    }
    
    return {};
  }

  /**
   * Get the analysis result
   */
  getAnalysisResult() {
    return {
      tools: this.tools,
      resources: this.resources,
      prompts: this.prompts,
      summary: {
        toolCount: this.tools.length,
        resourceCount: this.resources.length,
        promptCount: this.prompts.length
      }
    };
  }
}

/**
 * Analyze an MCP server from various sources
 */
export async function analyzeServer(config) {
  const analyzer = new MCPAnalyzer(config.sourcePath);

  if (config.sourceType === 'github') {
    return await analyzer.analyzeGithub(config.githubUrl);
  } else if (config.sourceType === 'local') {
    return await analyzer.analyzeLocal();
  }

  // Bare bones - return empty analysis
  return {
    tools: [],
    resources: [],
    prompts: [],
    summary: { toolCount: 0, resourceCount: 0, promptCount: 0 }
  };
}
