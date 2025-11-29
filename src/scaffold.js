import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
  generatePackageJson,
  generateServerFactory,
  generateStdioEntry,
  generateHttpEntry,
  generateReadme,
  generateEnvExample,
  generateGitignore,
  generateTsConfig,
  generateNetlifyConfig,
  generateNetlifyFunction,
  generateVercelConfig,
  generateVercelFunction
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

  // Create src directory
  await fs.ensureDir(path.join(targetDir, 'src'));

  const ext = config.language === 'typescript' ? 'ts' : 'js';

  // Generate and write files
  const files = [
    {
      path: 'package.json',
      content: JSON.stringify(generatePackageJson(config, analysis), null, 2),
      description: 'package.json'
    },
    {
      path: `src/server.${ext}`,
      content: generateServerFactory(config, analysis),
      description: 'Server factory'
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

  // Add stdio entry point if needed
  if (config.transports.includes('stdio')) {
    files.push({
      path: `src/stdio.${ext}`,
      content: generateStdioEntry(config),
      description: 'Stdio transport entry point'
    });
  }

  // Add HTTP entry point if needed
  if (config.transports.includes('http')) {
    files.push({
      path: `src/http.${ext}`,
      content: generateHttpEntry(config),
      description: 'HTTP transport entry point'
    });
  }

  // Add TypeScript config if needed
  if (config.language === 'typescript') {
    files.push({
      path: 'tsconfig.json',
      content: JSON.stringify(generateTsConfig(), null, 2),
      description: 'TypeScript configuration'
    });
  }

  // Add deployment platform files
  if (config.deployment === 'netlify') {
    // Add serverless-http dependency for Netlify
    const pkgJson = JSON.parse(files.find(f => f.path === 'package.json').content);
    pkgJson.dependencies['serverless-http'] = '^3.2.0';
    files.find(f => f.path === 'package.json').content = JSON.stringify(pkgJson, null, 2);
    
    files.push({
      path: 'netlify.toml',
      content: generateNetlifyConfig(config),
      description: 'Netlify configuration'
    });
    
    // Create Netlify function directory and handler
    await fs.ensureDir(path.join(targetDir, 'netlify', 'functions'));
    files.push({
      path: `netlify/functions/server.${ext}`,
      content: generateNetlifyFunction(config),
      description: 'Netlify function handler'
    });
  } else if (config.deployment === 'vercel') {
    files.push({
      path: 'vercel.json',
      content: JSON.stringify(generateVercelConfig(config), null, 2),
      description: 'Vercel configuration'
    });
    // Vercel uses the existing src/http.ts/js directly, no separate function needed
  }

  // Write all files
  for (const file of files) {
    const filePath = path.join(targetDir, file.path);
    await fs.writeFile(filePath, file.content);
    console.log(chalk.green('✓'), chalk.gray(file.description));
  }

  // Print summary
  console.log(chalk.cyan('\n📊 Project Summary:\n'));
  console.log(chalk.white('  Project name:'), chalk.bold(config.projectName));
  console.log(chalk.white('  Language:'), chalk.bold(config.language));
  console.log(chalk.white('  Transports:'), chalk.bold(config.transports.join(', ')));
  
  if (analysis.summary.toolCount > 0) {
    console.log(chalk.white('  Tools:'), chalk.bold(analysis.summary.toolCount));
  }
  if (analysis.summary.resourceCount > 0) {
    console.log(chalk.white('  Resources:'), chalk.bold(analysis.summary.resourceCount));
  }
  if (analysis.summary.promptCount > 0) {
    console.log(chalk.white('  Prompts:'), chalk.bold(analysis.summary.promptCount));
  }

  // Print next steps
  console.log(chalk.cyan('\n📝 Next Steps:\n'));
  console.log(chalk.white('  1. Navigate to your project:'));
  console.log(chalk.gray(`     cd ${path.basename(targetDir)}`));
  console.log(chalk.white('\n  2. Install dependencies:'));
  console.log(chalk.gray('     npm install'));
  
  if (config.transports.includes('stdio')) {
    console.log(chalk.white('\n  3. Run with stdio (for Claude Desktop):'));
    console.log(chalk.gray('     npm start'));
  }
  
  if (config.transports.includes('http')) {
    console.log(chalk.white('\n  3. Run with HTTP (for remote access):'));
    console.log(chalk.gray('     npm run start:http'));
  }

  console.log(chalk.white('\n  4. Edit your server:'));
  console.log(chalk.gray(`     Open src/server.${ext} and customize your tools\n`));
}
