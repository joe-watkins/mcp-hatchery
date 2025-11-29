import path from 'path';
import chalk from 'chalk';
import { promptProjectConfig } from '../prompts.js';
import { analyzeServer } from '../analyzer.js';
import { scaffoldProject } from '../scaffold.js';

/**
 * Create command handler
 */
export async function createProject(projectName, options) {
  try {
    // Get configuration from user
    const config = await promptProjectConfig(projectName);

    // Analyze source if needed
    console.log(chalk.cyan('\n🔍 Analyzing MCP server...\n'));
    const analysis = await analyzeServer(config);

    if (analysis.summary.toolCount > 0) {
      console.log(chalk.green(`Found ${analysis.summary.toolCount} tool(s)`));
    }
    if (analysis.summary.resourceCount > 0) {
      console.log(chalk.green(`Found ${analysis.summary.resourceCount} resource(s)`));
    }
    if (analysis.summary.promptCount > 0) {
      console.log(chalk.green(`Found ${analysis.summary.promptCount} prompt(s)`));
    }

    // Determine target directory
    const targetDir = options.directory 
      ? path.resolve(process.cwd(), options.directory)
      : path.resolve(process.cwd(), config.projectName);

    // Scaffold the project
    await scaffoldProject(config, analysis, targetDir);

  } catch (error) {
    throw error;
  }
}
