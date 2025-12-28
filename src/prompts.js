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
      message: 'Server type:',
      choices: [
        { name: 'JavaScript (Node.js with MCP SDK)', value: 'bare-bones' },
        { name: 'Python (FastMCP for FastMCP Cloud)', value: 'fastmcp' }
      ],
      default: 'bare-bones'
    },
    {
      type: 'list',
      name: 'deployment',
      message: 'Deployment target:',
      choices: [
        { name: 'Both (Local + Remote)', value: 'both' },
        { name: 'Local only (stdio)', value: 'local' },
        { name: 'Remote only', value: 'remote' }
      ],
      default: 'both',
      when: (answers) => answers.sourceType === 'bare-bones'
    },
    {
      type: 'list',
      name: 'remoteHost',
      message: 'Remote host:',
      choices: [
        { name: 'Netlify', value: 'netlify' },
        { name: 'Vercel', value: 'vercel' }
      ],
      default: 'netlify',
      when: (answers) => answers.sourceType === 'bare-bones' && (answers.deployment === 'remote' || answers.deployment === 'both')
    }
  ]);

  // Set deployment for FastMCP (always both local and cloud)
  if (answers.sourceType === 'fastmcp') {
    answers.deployment = 'both';
    answers.remoteHost = 'fastmcp-cloud';
  }

  return answers;
}
