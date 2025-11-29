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
    }
  ]);

  // Always use bare-bones
  answers.sourceType = 'bare-bones';

  return answers;
}
