import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
  generatePackageJson,
  generateToolDefinitions,
  generateIndexFile,
  generateNetlifyFunction,
  generateReadme,
  generateEnvExample,
  generateGitignore,
  generateTsConfig,
  generateNetlifyConfig
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

  // Create directory structure
  await fs.ensureDir(path.join(targetDir, 'src'));
  await fs.ensureDir(path.join(targetDir, 'netlify', 'functions'));

  // Generate and write files
  const files = [
    {
      path: 'package.json',
      content: JSON.stringify(generatePackageJson(config, analysis), null, 2),
      description: 'package.json'
    },
    {
      path: 'src/tools.ts',
      content: generateToolDefinitions(config, analysis),
      description: 'Tool definitions'
    },
    {
      path: 'src/index.ts',
      content: generateIndexFile(config, analysis),
      description: 'Main MCP server (stdio)'
    },
    {
      path: 'netlify/functions/api.js',
      content: generateNetlifyFunction(config),
      description: 'Netlify Function (HTTP/SSE)'
    },
    {
      path: 'netlify.toml',
      content: generateNetlifyConfig(config),
      description: 'Netlify configuration'
    },
    {
      path: 'tsconfig.json',
      content: JSON.stringify(generateTsConfig(), null, 2),
      description: 'TypeScript configuration'
    },
    {
      path: '.env.example',
      content: generateEnvExample(config),
      description: 'Environment variables template'
    },
    {
      path: '.gitignore',
      content: generateGitignore(),
      description: '.gitignore'
    },
    {
      path: 'README.md',
      content: generateReadme(config, analysis),
      description: 'README.md'
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
  console.log(chalk.white('  Language:'), chalk.bold('TypeScript'));
  console.log(chalk.white('  Local transport:'), chalk.bold('stdio'));
  console.log(chalk.white('  Remote transport:'), chalk.bold('Netlify Functions (SSE)'));
  
  if (analysis.summary.toolCount > 0) {
    console.log(chalk.white('  Tools:'), chalk.bold(analysis.summary.toolCount));
  } else {
    console.log(chalk.white('  Tools:'), chalk.bold('2 (sample tools)'));
  }

  // Print next steps
  console.log(chalk.cyan('\n📝 Next Steps:\n'));
  console.log(chalk.white('  1. Navigate to your project:'));
  console.log(chalk.gray(`     cd ${path.basename(targetDir)}`));
  console.log(chalk.white('\n  2. Install dependencies:'));
  console.log(chalk.gray('     npm install'));
  console.log(chalk.white('\n  3. Build the project:'));
  console.log(chalk.gray('     npm run build'));
  console.log(chalk.white('\n  4. Run locally (for Claude Desktop):'));
  console.log(chalk.gray('     npm run dev'));
  console.log(chalk.white('\n  5. Deploy to Netlify:'));
  console.log(chalk.gray('     netlify deploy --prod'));
  console.log(chalk.white('\n  6. Edit your tools:'));
  console.log(chalk.gray('     Open src/tools.ts and customize your tools\n'));
}
