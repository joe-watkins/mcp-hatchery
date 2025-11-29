/**
 * Tool definitions for test-server
 */
export const tools = [
  {
    name: 'echo',
    description: 'Echoes back the provided message',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo back'
        }
      },
      required: ['message']
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: 'text',
            text: `Echo: ${args.message}`
          }
        ]
      };
    }
  },
  {
    name: 'get-greeting',
    description: 'Returns a personalized greeting',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name to greet'
        }
      },
      required: ['name']
    },
    handler: async (args) => {
      return {
        content: [
          {
            type: 'text',
            text: `Hello, ${args.name}! Welcome to test-server.`
          }
        ]
      };
    }
  }
];
