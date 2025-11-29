import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';

export async function promptProjectConfig(initialProjectName) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: initialProjectName || 'my-mcp-server',
      validate: (input) => {
        if (/^[a-z0-9-]+$/.test(input)) return true;
        return 'Project name must be lowercase and can only contain letters, numbers, and hyphens';
      }
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'My MCP server'
    },
    {
      type: 'list',
      name: 'sourceType',
      message: 'How would you like to start?',
      choices: [
        { name: 'Create a bare-bones MCP server', value: 'bare-bones' },
        { name: 'Analyze an existing local MCP server', value: 'local' }
      ]
    },
    {
      type: 'input',
      name: 'sourcePath',
      message: 'Enter the local path to the MCP server:',
      when: (answers) => answers.sourceType === 'local',
      validate: async (input) => {
        const exists = await fs.pathExists(input);
        if (exists) return true;
        return 'Path does not exist';
      }
    }
  ]);

  return answers;
}
