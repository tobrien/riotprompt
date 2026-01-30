# RiotPrompt MCP Server

Model Context Protocol (MCP) server for RiotPrompt, providing AI assistants with tools to create, process, and execute prompts.

## Overview

The RiotPrompt MCP server exposes RiotPrompt's CLI functionality through the Model Context Protocol, allowing AI assistants to:

- Create new prompt structures
- Process prompts for different models
- Execute prompts using LLM providers
- Access configuration and version information

## Installation

```bash
npm install -g @riotprompt/riotprompt
```

## Configuration

Add to your MCP settings (e.g., Claude Desktop config):

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

Or if installed globally:

```json
{
  "mcpServers": {
    "riotprompt": {
      "command": "riotprompt-mcp"
    }
  }
}
```

## Tools

### riotprompt_get_version

Get version information for riotprompt.

**Parameters:** None

**Returns:**
- `version`: Package version
- `name`: Package name
- `description`: Package description

### riotprompt_create

Create a new prompt directory structure or import from file.

**Parameters:**
- `promptName` (required): Name of the prompt to create
- `path` (optional): Base path to create the prompt in
- `persona` (optional): Initial text for persona.md
- `instructions` (optional): Initial text for instructions.md
- `createContext` (optional): Create context directory (default: true)
- `importFile` (optional): Import from JSON or XML file

**Returns:**
- `path`: Full path to created prompt
- `files`: List of created files

### riotprompt_process

Process a prompt and format it for a specific model or export to JSON/XML.

**Parameters:**
- `promptPath` (required): Path to prompt directory or file
- `model` (optional): Model to format for (e.g., gpt-4, claude-3-opus)
- `format` (optional): Output format (text, json, xml)
- `outputFile` (optional): Path to save output

**Returns:**
- `output`: Formatted prompt (if no outputFile specified)
- `outputFile`: Path to saved file (if outputFile specified)
- `format`: Output format used

### riotprompt_execute

Execute a prompt using an LLM provider.

**Parameters:**
- `promptPath` (required): Path to prompt directory or file
- `model` (optional): Model to use (e.g., gpt-4, claude-3-opus, gemini-1.5-pro)
- `apiKey` (optional): API key (overrides environment variables)
- `temperature` (optional): Temperature (0-1)
- `maxTokens` (optional): Maximum tokens to generate

**Returns:**
- `content`: Response from the LLM
- `usage`: Token usage information
- `model`: Model used

**Environment Variables:**
- `OPENAI_API_KEY`: For OpenAI models
- `ANTHROPIC_API_KEY`: For Anthropic/Claude models
- `GEMINI_API_KEY`: For Google Gemini models

## Resources

### riotprompt://config

Read the current riotprompt configuration from `riotprompt.yaml`.

### riotprompt://version

Get version information for riotprompt.

## Prompts

### create_and_execute

Workflow template for creating a new prompt and executing it.

**Arguments:**
- `promptName` (required): Name of the prompt to create
- `model` (optional): Model to use for execution
- `path` (optional): Path where to create the prompt

### process_and_export

Workflow template for processing an existing prompt and exporting it.

**Arguments:**
- `promptPath` (required): Path to the prompt
- `model` (optional): Model to format for
- `format` (optional): Output format (text, json, xml)

## Example Usage

Once configured, you can ask your AI assistant:

- "Create a new prompt called 'summarizer' with a persona for summarizing text"
- "Process the prompt at ./my-prompt and format it for Claude"
- "Execute the prompt at ./my-prompt using GPT-4"
- "Show me the riotprompt configuration"

## Development

### Building

```bash
npm run mcp:build
```

### Testing

```bash
npm run mcp:inspect
```

### Local Development

```bash
# Watch mode
npm run mcp:dev

# Test with MCP inspector
npm run mcp:inspect
```

## Architecture

The MCP server is built using:

- `@modelcontextprotocol/sdk` for MCP protocol implementation
- RiotPrompt's core functionality for prompt operations
- Stdio transport for communication with MCP clients

## License

Apache-2.0
