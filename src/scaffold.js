import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import {
  generatePackageJson,
  generateToolDefinitions,
  generateIndexFile,
  generateNetlifyFunction,
  generateReadme,
  generateGitignore,
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
  
  // Only create netlify directory if needed
  if (config.deployment === 'remote' || config.deployment === 'both') {
    await fs.ensureDir(path.join(targetDir, 'netlify', 'functions'));
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

  // Add common files
  files.push(
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
    console.log(chalk.white('  Deployment:'), chalk.bold('Local (stdio) + Remote (Netlify)'));
  } else if (config.deployment === 'local') {
    console.log(chalk.white('  Deployment:'), chalk.bold('Local only (stdio)'));
  } else {
    console.log(chalk.white('  Deployment:'), chalk.bold('Remote only (Netlify)'));
  }
  
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
  
  const hasRemote = config.deployment === 'remote' || config.deployment === 'both';
  const editStepNum = hasRemote ? '4' : '3';
  
  console.log(chalk.white(`\n  3. Edit your tools:`));
  console.log(chalk.gray('     Open src/tools.js and customize your tools'));
  
  if (hasRemote) {
    console.log(chalk.white('\n  4. Deploy to Netlify:'));
    console.log(chalk.gray('     Push to GitHub and connect to Netlify'));
  }
  
  console.log();
}
