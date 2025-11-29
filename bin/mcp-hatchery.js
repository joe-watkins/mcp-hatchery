#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createProject } from '../src/commands/create.js';

const program = new Command();

program
  .name('mcp-hatchery')
  .description('Scaffold Model Context Protocol (MCP) servers for local and remote deployment')
  .version('1.3.0');

program
  .command('create [project-name]')
  .description('Create a new MCP server project')
  .option('-d, --directory <path>', 'Target directory for the new project')
  .action(async (projectName, options) => {
    try {
      console.log(chalk.blue.bold('\n🥚 MCP Hatchery - Scaffold Your MCP Server\n'));
      await createProject(projectName, options);
      console.log(chalk.green.bold('\n✨ Project created successfully!\n'));
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error creating project:'), error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
