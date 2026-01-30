/**
 * MCP Prompt Handlers
 *
 * Provides workflow templates via MCP prompts.
 * Prompts are loaded from external markdown files in this directory.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
/* eslint-disable import/extensions */
import type { McpPrompt, McpPromptMessage } from '../types.js';
/* eslint-enable import/extensions */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Helper to resolve the prompts directory path
 * When bundled, the MCP server is at dist/mcp-server.js and prompts are at dist/mcp/prompts/
 * When running from source, prompts are at src/mcp/prompts/
 */
function getPromptsDir(): string {
    // Check if we're running from a bundled file (dist/mcp-server.js)
    // When bundled, __dirname will be the 'dist' directory
    const isBundled = __dirname.includes('/dist') || __dirname.endsWith('dist') ||
                      __filename.includes('dist/mcp-server.js') || __filename.includes('dist\\mcp-server.js');

    if (isBundled) {
        // When bundled, prompts are at dist/mcp/prompts/
        const promptsDir = resolve(__dirname, 'mcp/prompts');
        return promptsDir;
    }
    // When running from source, prompts are in the same directory as this file
    return __dirname;
}

/**
 * Helper to load a prompt template from a markdown file
 */
async function loadTemplate(name: string): Promise<string> {
    const promptsDir = getPromptsDir();
    const path = resolve(promptsDir, `${name}.md`);
    try {
        const content = await readFile(path, 'utf-8');
        return content.trim();
    } catch (error) {
        throw new Error(`Failed to load prompt template "${name}" from ${path}: ${error}`);
    }
}

/**
 * Helper to replace placeholders in a template
 */
function fillTemplate(template: string, args: Record<string, string>): string {
    return template.replace(/\${(\w+)}/g, (_, key) => {
        return args[key] || `[${key}]`;
    });
}

/**
 * Get all available prompts
 */
export function getPrompts(): McpPrompt[] {
    return [
        {
            name: 'create_and_execute',
            description: 'Create a new prompt structure and execute it',
            arguments: [
                {
                    name: 'promptName',
                    description: 'Name of the prompt to create',
                    required: true,
                },
                {
                    name: 'model',
                    description: 'Model to use for execution (e.g., gpt-4, claude-3-opus)',
                    required: false,
                },
                {
                    name: 'path',
                    description: 'Path where to create the prompt',
                    required: false,
                },
            ],
        },
        {
            name: 'process_and_export',
            description: 'Process an existing prompt and export to different format',
            arguments: [
                {
                    name: 'promptPath',
                    description: 'Path to the prompt directory or file',
                    required: true,
                },
                {
                    name: 'model',
                    description: 'Model to format for',
                    required: false,
                },
                {
                    name: 'format',
                    description: 'Output format (text, json, xml)',
                    required: false,
                },
            ],
        },
    ];
}

/**
 * Get a prompt by name
 */
export async function getPrompt(
    name: string,
    args: Record<string, string>
): Promise<McpPromptMessage[]> {
    // Validate prompt exists
    const prompts = getPrompts();
    if (!prompts.find(p => p.name === name)) {
        throw new Error(`Unknown prompt: ${name}`);
    }

    // Load and fill template
    const template = await loadTemplate(name);

    // Set default values for common arguments if missing
    const filledArgs = { ...args };
    if (name === 'create_and_execute') {
        if (!filledArgs.model) filledArgs.model = 'gpt-4';
        if (!filledArgs.path) filledArgs.path = 'current directory';
    }
    if (name === 'process_and_export') {
        if (!filledArgs.model) filledArgs.model = 'gpt-4';
        if (!filledArgs.format) filledArgs.format = 'text';
    }

    const content = fillTemplate(template, filledArgs);

    return [
        {
            role: 'user',
            content: {
                type: 'text',
                text: content,
            },
        },
    ];
}
