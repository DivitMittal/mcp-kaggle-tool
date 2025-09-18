# mcp-kaggle-tool

MCP server for Kaggle API integration - create, run, and manage Kaggle notebooks programmatically.

## 🚀 Features

- ✅ Authentication check for Kaggle API
- 📝 Create and manage Kaggle notebooks
- 🚀 Push and execute notebooks with GPU support
- 📊 Search datasets and competitions
- 💾 Download notebook outputs and metadata
- 🔍 Monitor execution status
- 🗂️ Local notebook management (save/pull metadata)

## 📋 Prerequisites

1. **Kaggle Account**: You need a Kaggle account
2. **Kaggle API Token**:
   - Go to https://www.kaggle.com/account
   - Click "Create New API Token"
   - Save the downloaded `kaggle.json` to `~/.kaggle/`
   - **Alternative**: Set `KAGGLE_CONFIG_DIR` environment variable to directory containing `kaggle.json`
3. **Kaggle CLI**: Install the Kaggle CLI:
   ```bash
   pip install kaggle
   ```

## 🛠️ Installation

Currently, this package is not published to npm and must be built from source.

### From source

```bash
git clone https://github.com/yourusername/mcp-kaggle-tool.git
cd mcp-kaggle-tool
npm install
npm run build
```

## 🔧 Configuration

### Kaggle API Credentials

By default, the Kaggle CLI looks for credentials in `~/.kaggle/kaggle.json`. You can override this location by setting the `KAGGLE_CONFIG_DIR` environment variable:

```bash
# Example: Use credentials from a custom directory
export KAGGLE_CONFIG_DIR="/path/to/my/kaggle/config"
# The kaggle.json file should be in this directory
```

### For Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "kaggle": {
      "command": "node",
      "args": ["/path/to/mcp-kaggle-tool/dist/index.js"]
    }
  }
}
```

Replace `/path/to/mcp-kaggle-tool` with the actual path where you cloned and built this project.

### Using Custom Kaggle Config Directory

If you need to use a custom location for your Kaggle credentials, you can set the environment variable in your MCP server configuration:

```json
{
  "mcpServers": {
    "kaggle": {
      "command": "node",
      "args": ["/path/to/mcp-kaggle-tool/dist/index.js"],
      "env": {
        "KAGGLE_CONFIG_DIR": "/path/to/your/kaggle/config"
      }
    }
  }
}
```

## 📚 Available Tools

### Authentication

- `auth_check` - Verify Kaggle API credentials are configured

### Notebooks

- `list_notebooks` - List your Kaggle notebooks
- `create_notebook` - Create a new notebook with code
- `push_notebook` - Push and execute a notebook (replaces run_notebook)
- `get_notebook_status` - Check execution status
- `download_notebook_output` - Download notebook outputs
- `save_notebook_metadata` - Save notebook metadata and files locally
- `pull_notebook` - Pull/download notebook metadata and files

### Data & Competitions

- `search_datasets` - Search for datasets
- `list_competitions` - List active competitions

## 💡 Usage Examples

### Check Authentication

```
Use auth_check to verify your credentials are set up
```

### Create and Push a Notebook

```
1. Create a notebook with create_notebook:
   - title: "My ARC Experiment"
   - code: "print('Hello from Kaggle!')"
   - enableGpu: true

2. Push/execute with push_notebook:
   - notebookSlug: "username/my-arc-experiment"
   - mode: "slug"

3. Monitor with get_notebook_status
4. Download results with download_notebook_output
```

### Work with Local Notebooks

```
1. Save notebook locally with save_notebook_metadata:
   - notebookSlug: "username/existing-notebook"
   - localPath: "./my-notebook"

2. Push from local directory with push_notebook:
   - mode: "local"
   - localPath: "./my-notebook"

3. Pull existing notebooks with pull_notebook:
   - notebookSlug: "username/existing-notebook"
   - localPath: "./downloaded-notebook"
```

### Search ARC Dataset

```
Use search_datasets with search: "abstraction reasoning corpus"
```

## 🚧 Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please open an issue or submit a PR.

## 🐛 Known Issues

- Kaggle API sometimes returns HTML instead of JSON for certain commands
- Notebook execution status may take time to update
- GPU availability depends on Kaggle quota

## 🔗 Resources

- [Kaggle API Documentation](https://github.com/Kaggle/kaggle-api)
- [MCP Documentation](https://modelcontextprotocol.io)
- [Kaggle Notebooks Guide](https://www.kaggle.com/docs/notebooks)
