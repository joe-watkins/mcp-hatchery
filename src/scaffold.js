import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
  generatePackageJson,
  generateToolDefinitions,
  generateIndexFile,
  generateNetlifyFunction,
  generateVercelFunction,
  generateReadme,
  generateGitignore,
  generateNetlifyConfig,
  generateVercelConfig,
  generateContentJson,
  generateFastMCPRequirements,
  generateFastMCPServer,
  generateFastMCPTestServer,
  generateFastMCPReadme
} from './templates.js';

/**
 * Scaffold a new MCP server project
 */
export async function scaffoldProject(config, analysis, targetDir) {
  console.log(chalk.cyan('\n📁 Creating project structure...\n'));

  // Create target directory
  await fs.ensureDir(targetDir);

  // Check if directory is empty
  const existingFiles = await fs.readdir(targetDir);
  if (existingFiles.length > 0) {
    throw new Error(`Target directory ${targetDir} is not empty`);
  }

  // Handle FastMCP projects differently
  if (config.sourceType === 'fastmcp') {
    await scaffoldFastMCPProject(config, analysis, targetDir);
    return;
  }

  // Original JavaScript scaffolding logic
  // Create directory structure
  await fs.ensureDir(path.join(targetDir, 'src'));
  await fs.ensureDir(path.join(targetDir, 'data'));
  
  // Only create netlify directory if needed
  if (config.deployment === 'remote' || config.deployment === 'both') {
    if (config.remoteHost === 'vercel') {
      await fs.ensureDir(path.join(targetDir, 'api'));
    } else {
      await fs.ensureDir(path.join(targetDir, 'netlify', 'functions'));
    }
  }

  // Generate and write files
  const files = [
    {
      path: 'package.json',
      content: JSON.stringify(generatePackageJson(config, analysis), null, 2),
      description: 'package.json'
    },
    {
      path: 'src/tools.js',
      content: generateToolDefinitions(config, analysis),
      description: 'Tool definitions'
    }
  ];

  // Add local server files if needed
  if (config.deployment === 'local' || config.deployment === 'both') {
    files.push({
      path: 'src/index.js',
      content: generateIndexFile(config, analysis),
      description: 'Main MCP server (stdio)'
    });
  }

  // Add remote server files if needed
  if (config.deployment === 'remote' || config.deployment === 'both') {
    if (config.remoteHost === 'vercel') {
      files.push(
        {
          path: 'api/index.js',
          content: generateVercelFunction(config),
          description: 'Vercel Function (HTTP/SSE)'
        },
        {
          path: 'vercel.json',
          content: generateVercelConfig(config),
          description: 'Vercel configuration'
        }
      );
    } else {
      files.push(
        {
          path: 'netlify/functions/api.js',
          content: generateNetlifyFunction(config),
          description: 'Netlify Function (HTTP/SSE)'
        },
        {
          path: 'netlify.toml',
          content: generateNetlifyConfig(config),
          description: 'Netlify configuration'
        }
      );
    }
  }

  // Add common files
  files.push(
    {
      path: '.gitignore',
      content: generateGitignore(),
      description: '.gitignore'
    },
    {
      path: 'README.md',
      content: generateReadme(config, analysis, targetDir),
      description: 'README.md'
    },
    {
      path: 'data/README.md',
      content: '# Data\n\nStore your JSON data files here. You can use these files to generate new tools using an LLM.',
      description: 'data/README.md'
    },
    {
      path: 'data/content.json',
      content: generateContentJson(config),
      description: 'data/content.json (sample data)'
    }
  );

  // Write all files
  for (const file of files) {
    const filePath = path.join(targetDir, file.path);
    await fs.writeFile(filePath, file.content);
    console.log(chalk.green('✓'), chalk.gray(file.description));
  }

  // Print summary
  console.log(chalk.cyan('\n📊 Project Summary:\n'));
  console.log(chalk.white('  Project name:'), chalk.bold(config.projectName));
  console.log(chalk.white('  Language:'), chalk.bold('JavaScript'));
  
  if (config.deployment === 'both') {
    console.log(chalk.white('  Deployment:'), chalk.bold(`Local (stdio) + Remote (${config.remoteHost === 'vercel' ? 'Vercel' : 'Netlify'})`));
  } else if (config.deployment === 'local') {
    console.log(chalk.white('  Deployment:'), chalk.bold('Local only (stdio)'));
  } else {
    console.log(chalk.white('  Deployment:'), chalk.bold(`Remote only (${config.remoteHost === 'vercel' ? 'Vercel' : 'Netlify'})`));
  }
  
  if (analysis.summary.toolCount > 0) {
    console.log(chalk.white('  Tools:'), chalk.bold(analysis.summary.toolCount));
  } else {
    console.log(chalk.white('  Tools:'), chalk.bold('6 (sample tools)'));
  }

  // Print next steps
  console.log(chalk.cyan('\n📝 Next Steps:\n'));
  console.log(chalk.white('  1. Navigate to your project:'));
  console.log(chalk.gray(`     cd ${path.basename(targetDir)}`));
  console.log(chalk.white('\n  2. Install dependencies:'));
  console.log(chalk.gray('     npm install'));
  
  const hasRemote = config.deployment === 'remote' || config.deployment === 'both';
  const editStepNum = hasRemote ? '4' : '3';
  
  console.log(chalk.white(`\n  3. Edit your tools:`));
  console.log(chalk.gray('     Open src/tools.js and customize your tools'));
  
  if (hasRemote) {
    const hostName = config.remoteHost === 'vercel' ? 'Vercel' : 'Netlify';
    console.log(chalk.white(`\n  4. Deploy to ${hostName}:`));
    console.log(chalk.gray(`     Push to GitHub and connect to ${hostName}`));
  }
  
  console.log();
}

/**
 * Scaffold a new FastMCP server project
 */
async function scaffoldFastMCPProject(config, analysis, targetDir) {
  // Create directory structure
  await fs.ensureDir(path.join(targetDir, 'data'));

  // Generate and write files
  const files = [
    {
      path: 'requirements.txt',
      content: generateFastMCPRequirements(),
      description: 'requirements.txt'
    },
    {
      path: 'server.py',
      content: generateFastMCPServer(config),
      description: 'server.py (FastMCP server)'
    },
    {
      path: 'test_server.py',
      content: generateFastMCPTestServer(config),
      description: 'test_server.py (validation script)'
    },
    {
      path: '.gitignore',
      content: generateFastMCPGitignore(),
      description: '.gitignore'
    },
    {
      path: 'README.md',
      content: generateFastMCPReadme(config),
      description: 'README.md'
    },
    {
      path: 'data/README.md',
      content: '# Data\n\nStore your JSON data files here. You can use these files to generate new tools using an LLM.',
      description: 'data/README.md'
    },
    {
      path: 'data/content.json',
      content: generateContentJson(config),
      description: 'data/content.json (sample data)'
    }
  ];

  // Write all files
  for (const file of files) {
    const filePath = path.join(targetDir, file.path);
    await fs.writeFile(filePath, file.content);
    console.log(chalk.green('✓'), chalk.gray(file.description));
  }

  // Print summary
  console.log(chalk.cyan('\n📊 Project Summary:\n'));
  console.log(chalk.white('  Project name:'), chalk.bold(config.projectName));
  console.log(chalk.white('  Language:'), chalk.bold('Python'));
  console.log(chalk.white('  Framework:'), chalk.bold('FastMCP 2.0'));
  console.log(chalk.white('  Deployment:'), chalk.bold('Local + FastMCP Cloud'));
  console.log(chalk.white('  Tools:'), chalk.bold('6 (sample tools)'));

  // Print next steps
  console.log(chalk.cyan('\n📝 Next Steps:\n'));
  console.log(chalk.white('  1. Navigate to your project:'));
  console.log(chalk.gray(`     cd ${path.basename(targetDir)}`));
  console.log(chalk.white('\n  2. Create a virtual environment (recommended):'));
  console.log(chalk.gray('     python -m venv venv'));
  console.log(chalk.gray('     venv\\Scripts\\activate  # Windows'));
  console.log(chalk.gray('     source venv/bin/activate  # macOS/Linux'));
  console.log(chalk.white('\n  3. Install dependencies:'));
  console.log(chalk.gray('     pip install -r requirements.txt'));
  console.log(chalk.white('\n  4. Test your server:'));
  console.log(chalk.gray('     python test_server.py'));
  console.log(chalk.white('\n  5. Run locally:'));
  console.log(chalk.gray('     python server.py'));
  console.log(chalk.white('\n  6. Deploy to FastMCP Cloud:'));
  console.log(chalk.gray('     - Push to GitHub'));
  console.log(chalk.gray('     - Visit https://fastmcp.cloud'));
  console.log(chalk.gray('     - Create project with entrypoint: server.py:mcp'));
  console.log();
}

/**
 * Generate .gitignore for FastMCP projects
 */
function generateFastMCPGitignore() {
  return `# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv

# Environment variables
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Distribution
dist/
build/
*.egg-info/
`;
}

