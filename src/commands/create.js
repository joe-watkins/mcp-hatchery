import path from 'path';
import chalk from 'chalk';
import { promptProjectConfig } from '../prompts.js';
import { scaffoldProject } from '../scaffold.js';

/**
 * Create command handler
 */
export async function createProject(projectName, options) {
  try {
    // Get configuration from user
    const config = await promptProjectConfig(projectName);

    // Empty analysis for bare-bones projects
    const analysis = {
      tools: [],
      resources: [],
      prompts: [],
      summary: { toolCount: 0, resourceCount: 0, promptCount: 0 }
    };

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
