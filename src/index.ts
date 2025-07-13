#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

const server = new Server(
  {
    name: 'mcp-kaggle-tool',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper function to execute kaggle CLI commands
async function runKaggleCommand(args: string[]): Promise<any> {
  try {
    const { stdout, stderr } = await execAsync(`kaggle ${args.join(' ')}`);
    if (stderr) {
      console.error('Kaggle stderr:', stderr);
    }
    
    // Try to parse as JSON if possible
    try {
      return JSON.parse(stdout);
    } catch {
      return stdout;
    }
  } catch (error: any) {
    throw new Error(`Kaggle command failed: ${error.message}`);
  }
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'kaggle_auth_check',
        description: 'Check if Kaggle API credentials are configured',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'kaggle_list_notebooks',
        description: 'List your Kaggle notebooks (kernels)',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
              default: 1,
            },
            pageSize: {
              type: 'number',
              description: 'Page size (default: 20)',
              default: 20,
            },
          },
        },
      },
      {
        name: 'kaggle_create_notebook',
        description: 'Create a new Kaggle notebook',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Notebook title',
            },
            code: {
              type: 'string',
              description: 'Python code for the notebook',
            },
            language: {
              type: 'string',
              description: 'Programming language (python or r)',
              default: 'python',
              enum: ['python', 'r'],
            },
            isPrivate: {
              type: 'boolean',
              description: 'Make notebook private',
              default: true,
            },
            enableGpu: {
              type: 'boolean',
              description: 'Enable GPU acceleration',
              default: false,
            },
            enableInternet: {
              type: 'boolean',
              description: 'Enable internet access',
              default: true,
            },
            datasetSources: {
              type: 'array',
              description: 'Dataset slugs to attach (e.g., ["username/dataset-name"])',
              items: {
                type: 'string',
              },
              default: [],
            },
          },
          required: ['title', 'code'],
        },
      },
      {
        name: 'kaggle_run_notebook',
        description: 'Run/execute a Kaggle notebook',
        inputSchema: {
          type: 'object',
          properties: {
            kernelSlug: {
              type: 'string',
              description: 'Notebook identifier (username/notebook-slug)',
            },
          },
          required: ['kernelSlug'],
        },
      },
      {
        name: 'kaggle_get_notebook_status',
        description: 'Get the status of a notebook execution',
        inputSchema: {
          type: 'object',
          properties: {
            kernelSlug: {
              type: 'string',
              description: 'Notebook identifier (username/notebook-slug)',
            },
          },
          required: ['kernelSlug'],
        },
      },
      {
        name: 'kaggle_download_notebook_output',
        description: 'Download the output of a completed notebook',
        inputSchema: {
          type: 'object',
          properties: {
            kernelSlug: {
              type: 'string',
              description: 'Notebook identifier (username/notebook-slug)',
            },
            outputPath: {
              type: 'string',
              description: 'Local directory to save outputs',
              default: './kaggle-outputs',
            },
          },
          required: ['kernelSlug'],
        },
      },
      {
        name: 'kaggle_search_datasets',
        description: 'Search for Kaggle datasets',
        inputSchema: {
          type: 'object',
          properties: {
            search: {
              type: 'string',
              description: 'Search query',
            },
            page: {
              type: 'number',
              description: 'Page number',
              default: 1,
            },
          },
          required: ['search'],
        },
      },
      {
        name: 'kaggle_list_competitions',
        description: 'List Kaggle competitions',
        inputSchema: {
          type: 'object',
          properties: {
            group: {
              type: 'string',
              description: 'Competition group (general, entered, inClass)',
              default: 'general',
              enum: ['general', 'entered', 'inClass'],
            },
            category: {
              type: 'string',
              description: 'Competition category (all, featured, research, recruitment, gettingStarted, masters, playground)',
              default: 'all',
            },
            sortBy: {
              type: 'string',
              description: 'Sort by (grouped, prize, earliestDeadline, latestDeadline, numberOfTeams, recentlyCreated)',
              default: 'recentlyCreated',
            },
          },
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'kaggle_auth_check': {
        // Check if kaggle.json exists
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const kaggleConfigPath = path.join(homeDir, '.kaggle', 'kaggle.json');
        
        try {
          await fs.access(kaggleConfigPath);
          const config = JSON.parse(await fs.readFile(kaggleConfigPath, 'utf-8'));
          return {
            content: [
              {
                type: 'text',
                text: `✅ Kaggle API credentials found for user: ${config.username}`,
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: 'text',
                text: '❌ Kaggle API credentials not found. Please set up your Kaggle API key:\n\n1. Go to https://www.kaggle.com/account\n2. Create New API Token\n3. Place the downloaded kaggle.json in ~/.kaggle/',
              },
            ],
          };
        }
      }

      case 'kaggle_list_notebooks': {
        const result = await runKaggleCommand([
          'kernels', 'list', '--mine',
          '--page', (args.page || 1).toString(),
          '--page-size', (args.pageSize || 20).toString(),
          '-v'  // verbose for JSON output
        ]);
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'kaggle_create_notebook': {
        // Create a temporary directory for the notebook
        const tempDir = await fs.mkdtemp(path.join(process.env.TMPDIR || '/tmp', 'kaggle-'));
        const notebookPath = path.join(tempDir, 'notebook.ipynb');
        const metadataPath = path.join(tempDir, 'kernel-metadata.json');
        
        // Create notebook structure
        const notebook = {
          cells: [
            {
              cell_type: 'code',
              source: args.code,
              execution_count: null,
              outputs: [],
            },
          ],
          metadata: {
            kernelspec: {
              language: args.language || 'python',
              display_name: args.language === 'r' ? 'R' : 'Python 3',
              name: args.language === 'r' ? 'ir' : 'python3',
            },
          },
          nbformat: 4,
          nbformat_minor: 4,
        };
        
        // Create metadata
        const metadata = {
          id: `new-notebook-${Date.now()}`,
          title: args.title,
          code_file: 'notebook.ipynb',
          language: args.language || 'python',
          kernel_type: 'notebook',
          is_private: args.isPrivate !== false,
          enable_gpu: args.enableGpu || false,
          enable_internet: args.enableInternet !== false,
          dataset_sources: args.datasetSources || [],
          competition_sources: [],
          kernel_sources: [],
        };
        
        // Write files
        await fs.writeFile(notebookPath, JSON.stringify(notebook, null, 2));
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
        
        // Push to Kaggle
        const result = await runKaggleCommand(['kernels', 'push', '-p', tempDir]);
        
        // Cleanup
        await fs.rm(tempDir, { recursive: true });
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Notebook created: ${args.title}\n${result}`,
            },
          ],
        };
      }

      case 'kaggle_run_notebook': {
        const result = await runKaggleCommand(['kernels', 'push', args.kernelSlug, '--new']);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Notebook execution started: ${args.kernelSlug}\n${result}`,
            },
          ],
        };
      }

      case 'kaggle_get_notebook_status': {
        const result = await runKaggleCommand(['kernels', 'status', args.kernelSlug]);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'kaggle_download_notebook_output': {
        await fs.mkdir(args.outputPath || './kaggle-outputs', { recursive: true });
        const result = await runKaggleCommand([
          'kernels', 'output', args.kernelSlug,
          '-p', args.outputPath || './kaggle-outputs'
        ]);
        
        return {
          content: [
            {
              type: 'text',
              text: `✅ Notebook output downloaded to: ${args.outputPath || './kaggle-outputs'}\n${result}`,
            },
          ],
        };
      }

      case 'kaggle_search_datasets': {
        const result = await runKaggleCommand([
          'datasets', 'list',
          '-s', args.search,
          '--page', (args.page || 1).toString(),
          '-v'
        ]);
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'kaggle_list_competitions': {
        const cmdArgs = ['competitions', 'list'];
        
        if (args.group && args.group !== 'general') {
          cmdArgs.push('--group', args.group);
        }
        if (args.category && args.category !== 'all') {
          cmdArgs.push('--category', args.category);
        }
        if (args.sortBy) {
          cmdArgs.push('--sort-by', args.sortBy);
        }
        
        cmdArgs.push('-v'); // verbose for JSON output
        
        const result = await runKaggleCommand(cmdArgs);
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);
console.error('mcp-kaggle-tool MCP server running on stdio');
