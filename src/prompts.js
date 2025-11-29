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
        { name: 'Analyze an existing local MCP server', value: 'local' },
        { name: 'Clone and analyze a GitHub MCP server', value: 'github' }
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
    },
    {
      type: 'input',
      name: 'githubUrl',
      message: 'Enter the GitHub repository URL:',
      when: (answers) => answers.sourceType === 'github',
      validate: (input) => {
        if (/^https?:\/\/github\.com\/[\w-]+\/[\w-]+/.test(input)) return true;
        return 'Please enter a valid GitHub repository URL';
      }
    },
    {
      type: 'checkbox',
      name: 'transports',
      message: 'Which transports do you want to support?',
      choices: [
        { name: 'Stdio (for local MCP clients like Claude Desktop)', value: 'stdio', checked: true },
        { name: 'HTTP (for remote access via Express server)', value: 'http', checked: true }
      ],
      validate: (input) => {
        if (input.length > 0) return true;
        return 'Please select at least one transport';
      }
    },
    {
      type: 'number',
      name: 'port',
      message: 'HTTP server port:',
      default: 3000,
      when: (answers) => answers.transports.includes('http')
    },
    {
      type: 'list',
      name: 'language',
      message: 'Project language:',
      choices: [
        { name: 'JavaScript', value: 'javascript' },
        { name: 'TypeScript', value: 'typescript' }
      ],
      default: 'javascript'
    },
    {
      type: 'list',
      name: 'deployment',
      message: 'Deployment platform (for HTTP transport):',
      choices: [
        { name: 'None - Generic Node.js deployment', value: 'none' },
        { name: 'Netlify - Node.js hosting', value: 'netlify' },
        { name: 'Vercel - Node.js hosting', value: 'vercel' }
      ],
      default: 'none',
      when: (answers) => answers.transports.includes('http')
    }
  ]);

  return answers;
}
