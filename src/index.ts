#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);

const server = new Server(
  {
    name: "kaggle",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Helper function to execute kaggle CLI commands
async function runKaggleCommand(args: string[]): Promise<any> {
  try {
    // Use kaggle from system PATH
    const { stdout, stderr } = await execAsync(`kaggle ${args.join(" ")}`);
    if (stderr) {
      console.error("Kaggle stderr:", stderr);
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
        name: "auth_check",
        description: "Check if Kaggle API credentials are configured",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_notebooks",
        description: "List your Kaggle notebooks (kernels)",
        inputSchema: {
          type: "object",
          properties: {
            page: {
              type: "number",
              description: "Page number (default: 1)",
              default: 1,
            },
            pageSize: {
              type: "number",
              description: "Page size (default: 20)",
              default: 20,
            },
          },
        },
      },
      {
        name: "create_notebook",
        description: "Create a new Kaggle notebook",
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Notebook title",
            },
            code: {
              type: "string",
              description: "Python code for the notebook",
            },
            language: {
              type: "string",
              description: "Programming language (python or r)",
              default: "python",
              enum: ["python", "r"],
            },
            isPrivate: {
              type: "boolean",
              description: "Make notebook private",
              default: true,
            },
            enableGpu: {
              type: "boolean",
              description: "Enable GPU acceleration",
              default: false,
            },
            enableInternet: {
              type: "boolean",
              description: "Enable internet access",
              default: true,
            },
            datasetSources: {
              type: "array",
              description:
                'Dataset slugs to attach (e.g., ["username/dataset-name"])',
              items: {
                type: "string",
              },
              default: [],
            },
            saveLocally: {
              type: "boolean",
              description: "Save metadata and notebook files locally for future use",
              default: false,
            },
            localSavePath: {
              type: "string",
              description: "Local directory to save files when saveLocally is true",
              default: "./kaggle-notebook",
            },
          },
          required: ["title", "code"],
        },
      },
      {
        name: "get_notebook_status",
        description: "Get the status of a notebook execution",
        inputSchema: {
          type: "object",
          properties: {
            notebookSlug: {
              type: "string",
              description: "Notebook identifier (username/notebook-slug)",
            },
          },
          required: ["notebookSlug"],
        },
      },
      {
        name: "download_notebook_output",
        description: "Download the output of a completed notebook",
        inputSchema: {
          type: "object",
          properties: {
            notebookSlug: {
              type: "string",
              description: "Notebook identifier (username/notebook-slug)",
            },
            outputPath: {
              type: "string",
              description: "Local directory to save outputs",
              default: "./kaggle-outputs",
            },
          },
          required: ["notebookSlug"],
        },
      },
      {
        name: "search_datasets",
        description: "Search for Kaggle datasets",
        inputSchema: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Search query",
            },
            page: {
              type: "number",
              description: "Page number",
              default: 1,
            },
          },
          required: ["search"],
        },
      },
      {
        name: "list_competitions",
        description: "List Kaggle competitions",
        inputSchema: {
          type: "object",
          properties: {
            group: {
              type: "string",
              description: "Competition group (general, entered, inClass)",
              default: "general",
              enum: ["general", "entered", "inClass"],
            },
            category: {
              type: "string",
              description:
                "Competition category (all, featured, research, recruitment, gettingStarted, masters, playground)",
              default: "all",
            },
            sortBy: {
              type: "string",
              description:
                "Sort by (grouped, prize, earliestDeadline, latestDeadline, numberOfTeams, recentlyCreated)",
              default: "recentlyCreated",
            },
          },
        },
      },
      {
        name: "push_notebook",
        description: "Push and execute a Kaggle notebook. This uploads the notebook to Kaggle's cloud infrastructure and triggers execution.",
        inputSchema: {
          type: "object",
          properties: {
            notebookSlug: {
              type: "string",
              description: "Notebook identifier (username/notebook-slug) - required when pushing by slug",
            },
            localPath: {
              type: "string",
              description: "Local directory containing notebook-metadata.json and notebook file - required when pushing from local directory",
            },
            mode: {
              type: "string",
              description: "Push mode: 'slug' to push by notebook slug, 'local' to push from local directory",
              enum: ["slug", "local"],
              default: "slug",
            },
          },
        },
      },
      {
        name: "save_notebook_metadata",
        description: "Save notebook metadata and files to local directory for later use",
        inputSchema: {
          type: "object",
          properties: {
            notebookSlug: {
              type: "string",
              description: "Notebook identifier (username/notebook-slug) to download metadata from",
            },
            localPath: {
              type: "string",
              description: "Local directory to save metadata and notebook files",
              default: "./kaggle-notebook",
            },
            includeNotebook: {
              type: "boolean",
              description: "Also download the notebook file",
              default: true,
            },
          },
          required: ["notebookSlug"],
        },
      },
      {
        name: "pull_notebook",
        description: "Pull/download a notebook's metadata and files to local directory",
        inputSchema: {
          type: "object",
          properties: {
            notebookSlug: {
              type: "string",
              description: "Notebook identifier (username/notebook-slug)",
            },
            localPath: {
              type: "string",
              description: "Local directory to save notebook files",
              default: "./kaggle-notebook",
            },
            metadata: {
              type: "boolean",
              description: "Download metadata file",
              default: true,
            },
          },
          required: ["notebookSlug"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("No arguments provided");
  }

  try {
    switch (name) {
      case "auth_check": {
        // Check if kaggle.json exists
        const homeDir = process.env.HOME || process.env.USERPROFILE || "";
        const kaggleConfigPath = path.join(homeDir, ".kaggle", "kaggle.json");

        try {
          await fs.access(kaggleConfigPath);
          const config = JSON.parse(
            await fs.readFile(kaggleConfigPath, "utf-8"),
          );
          return {
            content: [
              {
                type: "text",
                text: `✅ Kaggle API credentials found for user: ${config.username}`,
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: "text",
                text: "❌ Kaggle API credentials not found. Please set up your Kaggle API key:\n\n1. Go to https://www.kaggle.com/account\n2. Create New API Token\n3. Place the downloaded kaggle.json in ~/.kaggle/",
              },
            ],
          };
        }
      }

      case "list_notebooks": {
        const page = (args as any).page || 1;
        const pageSize = (args as any).pageSize || 20;
        const result = await runKaggleCommand([
          "kernels",
          "list",
          "--mine",
          "--page",
          page.toString(),
          "--page-size",
          pageSize.toString(),
          "-v", // verbose for JSON output
        ]);

        return {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "create_notebook": {
        const notebookArgs = args as any;
        // Create a temporary directory for the notebook
        const tempDir = await fs.mkdtemp(
          path.join(process.env.TMPDIR || "/tmp", "kaggle-"),
        );
        const notebookPath = path.join(tempDir, "notebook.ipynb");
        const metadataPath = path.join(tempDir, "notebook-metadata.json");

        // Create notebook structure
        const notebook = {
          cells: [
            {
              cell_type: "code",
              source: notebookArgs.code,
              execution_count: null,
              outputs: [],
            },
          ],
          metadata: {
            kernelspec: {
              language: notebookArgs.language || "python",
              display_name: notebookArgs.language === "r" ? "R" : "Python 3",
              name: notebookArgs.language === "r" ? "ir" : "python3",
            },
          },
          nbformat: 4,
          nbformat_minor: 4,
        };

        // Create metadata
        const metadata = {
          id: `new-notebook-${Date.now()}`,
          title: notebookArgs.title,
          code_file: "notebook.ipynb",
          language: notebookArgs.language || "python",
          kernel_type: "notebook",
          is_private: notebookArgs.isPrivate !== false,
          enable_gpu: notebookArgs.enableGpu || false,
          enable_internet: notebookArgs.enableInternet !== false,
          dataset_sources: notebookArgs.datasetSources || [],
          competition_sources: [],
          kernel_sources: [],
        };

        // Write files
        await fs.writeFile(notebookPath, JSON.stringify(notebook, null, 2));
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        // Push to Kaggle
        const result = await runKaggleCommand([
          "kernels",
          "push",
          "-p",
          tempDir,
        ]);

        let saveMessage = "";

        // Save locally if requested
        if (notebookArgs.saveLocally) {
          const localSavePath = notebookArgs.localSavePath || "./kaggle-notebook";
          await fs.mkdir(localSavePath, { recursive: true });

          // Copy files to local save directory
          const localNotebookPath = path.join(localSavePath, "notebook.ipynb");
          const localMetadataPath = path.join(localSavePath, "notebook-metadata.json");

          await fs.copyFile(notebookPath, localNotebookPath);
          await fs.copyFile(metadataPath, localMetadataPath);

          saveMessage = `\n📁 Files saved locally to: ${localSavePath}`;
        }

        // Cleanup temporary directory
        await fs.rm(tempDir, { recursive: true });

        return {
          content: [
            {
              type: "text",
              text: `✅ Notebook created: ${notebookArgs.title}\n${result}${saveMessage}`,
            },
          ],
        };
      }


      case "get_notebook_status": {
        const notebookSlug = (args as any).notebookSlug as string;
        const result = await runKaggleCommand([
          "kernels",
          "status",
          notebookSlug,
        ]);
        return {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "download_notebook_output": {
        const downloadArgs = args as any;
        const outputPath = downloadArgs.outputPath || "./kaggle-outputs";
        await fs.mkdir(outputPath, { recursive: true });
        const result = await runKaggleCommand([
          "kernels",
          "output",
          downloadArgs.notebookSlug as string,
          "-p",
          outputPath,
        ]);

        return {
          content: [
            {
              type: "text",
              text: `✅ Notebook output downloaded to: ${outputPath}\n${result}`,
            },
          ],
        };
      }

      case "search_datasets": {
        const searchArgs = args as any;
        const result = await runKaggleCommand([
          "datasets",
          "list",
          "-s",
          `"${searchArgs.search}"`,
          "--page",
          (searchArgs.page || 1).toString(),
          "-v",
        ]);

        return {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_competitions": {
        const compArgs = args as any;
        const cmdArgs = ["competitions", "list"];

        if (compArgs.group && compArgs.group !== "general") {
          cmdArgs.push("--group", compArgs.group as string);
        }
        if (compArgs.category && compArgs.category !== "all") {
          cmdArgs.push("--category", compArgs.category as string);
        }
        if (compArgs.sortBy) {
          cmdArgs.push("--sort-by", compArgs.sortBy as string);
        }

        cmdArgs.push("-v"); // verbose for JSON output

        const result = await runKaggleCommand(cmdArgs);

        return {
          content: [
            {
              type: "text",
              text:
                typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "push_notebook": {
        const pushArgs = args as any;
        const mode = pushArgs.mode || "slug";
        const notebookSlug = pushArgs.notebookSlug as string;
        const localPath = pushArgs.localPath as string;

        let cmdArgs: string[];
        let successMessage: string;

        switch (mode) {
          case "slug":
            if (!notebookSlug) {
              throw new Error("notebookSlug is required when mode is 'slug'");
            }
            cmdArgs = ["kernels", "push", notebookSlug];
            successMessage = `✅ Notebook pushed and execution started: ${notebookSlug}`;
            break;

          case "local":
            if (!localPath) {
              throw new Error("localPath is required when mode is 'local'");
            }
            // Verify metadata file exists
            const metadataPath = path.join(localPath, "notebook-metadata.json");
            try {
              await fs.access(metadataPath);
            } catch {
              throw new Error(`notebook-metadata.json not found in ${localPath}`);
            }
            cmdArgs = ["kernels", "push", "-p", localPath];
            successMessage = `✅ Notebook pushed and execution started from: ${localPath}`;
            break;

          default:
            throw new Error(`Invalid mode: ${mode}. Use 'slug' or 'local'`);
        }

        const result = await runKaggleCommand(cmdArgs);

        return {
          content: [
            {
              type: "text",
              text: `${successMessage}\n${result}`,
            },
          ],
        };
      }

      case "save_notebook_metadata": {
        const saveArgs = args as any;
        const notebookSlug = saveArgs.notebookSlug as string;
        const localPath = saveArgs.localPath || "./kaggle-notebook";
        const includeNotebook = saveArgs.includeNotebook !== false;

        // Create local directory
        await fs.mkdir(localPath, { recursive: true });

        // Pull notebook files
        const cmdArgs = ["kernels", "pull", notebookSlug, "-p", localPath];
        if (!includeNotebook) {
          cmdArgs.push("--metadata");
        }

        const result = await runKaggleCommand(cmdArgs);

        return {
          content: [
            {
              type: "text",
              text: `✅ Notebook metadata${includeNotebook ? ' and notebook' : ''} saved to ${localPath}:\n${result}`,
            },
          ],
        };
      }

      case "pull_notebook": {
        const pullArgs = args as any;
        const notebookSlug = pullArgs.notebookSlug as string;
        const localPath = pullArgs.localPath || "./kaggle-notebook";
        const metadata = pullArgs.metadata !== false;

        // Create local directory
        await fs.mkdir(localPath, { recursive: true });

        // Build pull command
        const cmdArgs = ["kernels", "pull", notebookSlug, "-p", localPath];
        if (metadata) {
          cmdArgs.push("--metadata");
        }

        const result = await runKaggleCommand(cmdArgs);

        return {
          content: [
            {
              type: "text",
              text: `✅ Notebook pulled to ${localPath}:\n${result}`,
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
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);
console.error("mcp-kaggle-tool MCP server running on stdio");
