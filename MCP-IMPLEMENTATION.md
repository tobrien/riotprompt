# RiotPrompt MCP Implementation

This document describes the MCP (Model Context Protocol) implementation for RiotPrompt.

## Overview

The MCP server exposes RiotPrompt's CLI functionality through the Model Context Protocol, allowing AI assistants to programmatically create, process, and execute prompts.

## Architecture

The implementation follows the pattern established in kodrdriv's MCP server:

```
src/mcp/
├── index.ts              # Module entry point
├── server.ts             # Main MCP server implementation
├── types.ts              # Type definitions
├── tools/                # Tool implementations
│   ├── index.ts          # Tool registry and executor
│   ├── get-version.ts    # Version information tool
│   ├── create.ts         # Prompt creation tool
│   ├── process.ts        # Prompt processing tool
│   └── execute.ts        # Prompt execution tool
├── prompts/              # Workflow templates
│   ├── index.ts          # Prompt registry and loader
│   ├── create_and_execute.md
│   └── process_and_export.md
└── resources/            # Read-only resources
    ├── index.ts          # Resource registry
    ├── config.ts         # Configuration resource
    └── version.ts        # Version resource
```

## Tools

### 1. riotprompt_get_version
- **Purpose**: Get version information
- **Parameters**: None
- **Returns**: Version, name, description

### 2. riotprompt_create
- **Purpose**: Create new prompt structure or import from file
- **Parameters**:
  - `promptName` (required): Name of the prompt
  - `path` (optional): Base path for creation
  - `persona` (optional): Initial persona text
  - `instructions` (optional): Initial instructions text
  - `createContext` (optional): Create context directory
  - `importFile` (optional): Import from JSON/XML
- **Returns**: Path to created prompt, list of files

### 3. riotprompt_process
- **Purpose**: Process and format prompts
- **Parameters**:
  - `promptPath` (required): Path to prompt
  - `model` (optional): Target model
  - `format` (optional): Output format (text/json/xml)
  - `outputFile` (optional): Save to file
- **Returns**: Formatted output or file path

### 4. riotprompt_execute
- **Purpose**: Execute prompt using LLM provider
- **Parameters**:
  - `promptPath` (required): Path to prompt
  - `model` (optional): Model to use
  - `apiKey` (optional): API key override
  - `temperature` (optional): Temperature setting
  - `maxTokens` (optional): Max tokens
- **Returns**: LLM response, usage stats

## Resources

### riotprompt://config
Read-only access to riotprompt.yaml configuration

### riotprompt://version
Version information for the package

## Prompts

### create_and_execute
Workflow template for creating and executing a new prompt

### process_and_export
Workflow template for processing and exporting existing prompts

## Build Process

The MCP server is built separately from the main library:

1. Main library build: `vite build`
2. CLI build: `vite build -c vite.config.cli.ts`
3. MCP server build: `node scripts/build-mcp.js`
4. Copy prompt templates: `copyfiles -u 1 "src/mcp/prompts/*.md" dist`

The build script (`scripts/build-mcp.js`) uses esbuild to:
- Bundle the MCP server code
- Mark external dependencies (MCP SDK, RiotPrompt dependencies)
- Add shebang for executable
- Make the file executable

## Dependencies

### Runtime Dependencies
- `@modelcontextprotocol/sdk`: MCP protocol implementation
- All RiotPrompt dependencies (marked as external in build)

### Dev Dependencies
- `esbuild`: For bundling the MCP server
- `copyfiles`: For copying prompt templates
- `@modelcontextprotocol/inspector`: For testing

## Testing

```bash
# Build MCP server
npm run mcp:build

# Test with MCP inspector
npm run mcp:inspect

# Watch mode for development
npm run mcp:dev
```

## Usage

### In Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "riotprompt": {
      "command": "npx",
      "args": ["-y", "@riotprompt/riotprompt", "riotprompt-mcp"]
    }
  }
}
```

### In Other MCP Clients

Use the `riotprompt-mcp` command or the full path to `dist/mcp-server.js`.

## Environment Variables

The MCP server respects the same environment variables as the CLI:
- `OPENAI_API_KEY`: For OpenAI models
- `ANTHROPIC_API_KEY`: For Anthropic/Claude models
- `GEMINI_API_KEY`: For Google Gemini models
- `RIOTPROMPT_MCP_SERVER`: Set automatically when running as MCP server

## Error Handling

The server follows MCP best practices:
- Returns structured error responses
- Includes context and recovery suggestions
- Logs are captured and included in responses
- Undefined values are cleaned from JSON responses

## Future Enhancements

Potential additions:
- More workflow prompts
- Streaming support for long-running operations
- Progress notifications for execution
- Batch operations
- Template management tools
- Validation tools

## Comparison with kodrdriv

Similarities:
- Same MCP SDK and architecture pattern
- Similar tool/resource/prompt structure
- Same build process approach
- Same error handling patterns

Differences:
- Simpler tool set (4 tools vs 20+)
- No tree operations (single package focus)
- No git integration
- Focus on prompt operations vs workflow automation

## Notes

- The MCP server runs in a separate process from the CLI
- All file operations use `fs/promises` to comply with eslint rules
- The server is stateless - each tool call is independent
- Prompt templates are loaded from markdown files at runtime
