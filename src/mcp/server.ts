#!/usr/bin/env node
/**
 * RiotPrompt MCP Server
 *
 * Exposes riotprompt commands, resources, and prompts via MCP.
 *
 * This server provides:
 * - Tools: Prompt creation, processing, and execution commands
 * - Resources: Configuration and version information
 * - Prompts: Workflow templates for common prompt operations
 *
 * Uses McpServer high-level API for better progress notification support
 */

/* eslint-disable import/extensions */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { executeTool } from './tools/index.js';
import { getResources, readResource } from './resources/index.js';
import { getPrompts, getPrompt } from './prompts/index.js';
/* eslint-enable import/extensions */

/**
 * Recursively remove undefined values from an object to prevent JSON serialization issues
 * Preserves null values as they are valid in JSON
 * @internal - Exported for testing purposes
 */
export function removeUndefinedValues(obj: any): any {
    if (obj === undefined) {
        return undefined;
    }
    if (obj === null) {
        return null; // Preserve null as it's valid in JSON
    }
    if (Array.isArray(obj)) {
        return obj.map(removeUndefinedValues).filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
        const cleaned: Record<string, any> = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = removeUndefinedValues(value);
            if (cleanedValue !== undefined) {
                cleaned[key] = cleanedValue;
            }
        }
        return cleaned;
    }
    return obj;
}

async function main() {
    // Mark that we're running as MCP server
    process.env.RIOTPROMPT_MCP_SERVER = 'true';

    // Initialize MCP server with high-level API
    const server = new McpServer(
        {
            name: 'riotprompt',
            version: '1.0.0',
        },
        {
            capabilities: {
                tools: {},
                resources: {
                    subscribe: false,
                    listChanged: false,
                },
                prompts: {
                    listChanged: false,
                },
            },
        }
    );

    // ========================================================================
    // Tools Handlers
    // ========================================================================

    /**
     * Helper to register a tool with progress notification support
     */
    function registerTool(
        name: string,
        description: string,
        inputSchema: z.ZodRawShape
    ) {
        server.tool(
            name,
            description,
            inputSchema,
            async (args, { sendNotification, _meta }) => {
                const context = {
                    workingDirectory: process.cwd(),
                    config: undefined,
                    logger: undefined,
                    sendNotification: async (notification: {
                        method: string;
                        params: {
                            progressToken?: string | number;
                            progress: number;
                            total?: number;
                            message?: string;
                        };
                    }) => {
                        // Use sendNotification directly with proper typing
                        if (notification.method === 'notifications/progress' && _meta?.progressToken) {
                            // Build params object, removing undefined values to prevent JSON serialization issues
                            const params: Record<string, any> = {
                                progressToken: _meta.progressToken,
                                progress: notification.params.progress,
                            };
                            if (notification.params.total !== undefined) {
                                params.total = notification.params.total;
                            }
                            if (notification.params.message !== undefined) {
                                params.message = notification.params.message;
                            }
                            await sendNotification({
                                method: 'notifications/progress',
                                params: removeUndefinedValues(params) as any,
                            });
                        }
                    },
                    progressToken: _meta?.progressToken,
                };

                const result = await executeTool(name, args, context);

                if (result.success) {
                    // Build response with logs if available
                    const content: Array<{ type: 'text'; text: string }> = [];

                    // Add logs first if they exist
                    if (result.logs && result.logs.length > 0) {
                        content.push({
                            type: 'text' as const,
                            text: '=== Command Output ===\n' + result.logs.join('\n') + '\n\n=== Result ===',
                        });
                    }

                    // Add the result data
                    // Remove undefined values to prevent JSON serialization issues
                    const cleanData = removeUndefinedValues(result.data);
                    content.push({
                        type: 'text' as const,
                        text: JSON.stringify(cleanData, null, 2),
                    });

                    return { content };
                } else {
                    // Build error response with logs if available
                    const errorParts: string[] = [];

                    if (result.logs && result.logs.length > 0) {
                        errorParts.push('=== Command Output ===');
                        errorParts.push(result.logs.join('\n'));
                        errorParts.push('\n=== Error ===');
                    }

                    errorParts.push(result.error || 'Unknown error');

                    // Include context information if available
                    if (result.context && typeof result.context === 'object') {
                        errorParts.push('\n=== Context ===');
                        for (const [key, value] of Object.entries(result.context)) {
                            if (value !== undefined && value !== null) {
                                errorParts.push(`${key}: ${String(value)}`);
                            }
                        }
                    }

                    // Include details if available
                    if (result.details) {
                        if (result.details.stderr && result.details.stderr.trim()) {
                            errorParts.push('\n=== STDERR ===');
                            errorParts.push(result.details.stderr);
                        }
                        if (result.details.stdout && result.details.stdout.trim()) {
                            errorParts.push('\n=== STDOUT ===');
                            errorParts.push(result.details.stdout);
                        }
                    }

                    if (result.recovery && result.recovery.length > 0) {
                        errorParts.push('\n=== Recovery Steps ===');
                        errorParts.push(...result.recovery.map((step, i) => `${i + 1}. ${step}`));
                    }

                    return {
                        content: [{
                            type: 'text' as const,
                            text: errorParts.join('\n'),
                        }],
                        isError: true,
                    };
                }
            }
        );
    }

    // Register all tools
    registerTool(
        'riotprompt_get_version',
        'Get version information for riotprompt. Returns version, name, and description.',
        {},
    );

    registerTool(
        'riotprompt_create',
        'Create a new prompt directory structure or import from file. Scaffolds a new prompt with persona.md, instructions.md, and optional context directory.',
        {
            promptName: z.string(),
            path: z.string().optional(),
            persona: z.string().optional(),
            instructions: z.string().optional(),
            createContext: z.boolean().optional(),
            importFile: z.string().optional(),
        }
    );

    registerTool(
        'riotprompt_process',
        'Process a prompt (directory, JSON, or XML) and output the formatted prompt. Can format for specific models or export to JSON/XML.',
        {
            promptPath: z.string(),
            model: z.string().optional(),
            format: z.enum(['text', 'json', 'xml']).optional(),
            outputFile: z.string().optional(),
        }
    );

    registerTool(
        'riotprompt_execute',
        'Execute a prompt using an LLM provider (OpenAI, Anthropic, or Gemini). Requires appropriate API key to be set in environment.',
        {
            promptPath: z.string(),
            model: z.string().optional(),
            apiKey: z.string().optional(),
            temperature: z.number().optional(),
            maxTokens: z.number().optional(),
        }
    );

    // ========================================================================
    // Resources Handlers
    // ========================================================================

    const resources = getResources();
    for (const resource of resources) {
        server.resource(
            resource.name,
            resource.uri,
            {
                description: resource.description || '',
            },
            async () => {
                const data = await readResource(resource.uri);
                return {
                    contents: [{
                        uri: resource.uri,
                        mimeType: resource.mimeType || 'application/json',
                        text: JSON.stringify(data, null, 2),
                    }],
                };
            }
        );
    }

    // ========================================================================
    // Prompts Handlers
    // ========================================================================

    const prompts = getPrompts();
    for (const prompt of prompts) {
        // Convert prompt arguments to zod schema
        const promptArgs: Record<string, z.ZodTypeAny> = {};
        if (prompt.arguments) {
            for (const arg of prompt.arguments) {
                promptArgs[arg.name] = arg.required ? z.string() : z.string().optional();
            }
        }
        server.prompt(
            prompt.name,
            prompt.description,
            promptArgs,
            async (args, _extra) => {
                // Convert args to Record<string, string> for getPrompt
                const argsRecord: Record<string, string> = {};
                for (const [key, value] of Object.entries(args)) {
                    if (typeof value === 'string') {
                        argsRecord[key] = value;
                    }
                }
                const messages = await getPrompt(prompt.name, argsRecord);
                // Convert McpPromptMessage[] to the format expected by the SDK
                return {
                    messages: messages.map(msg => {
                        if (msg.content.type === 'text') {
                            return {
                                role: msg.role,
                                content: {
                                    type: 'text' as const,
                                    text: msg.content.text || '',
                                },
                            };
                        }
                        // For other content types, return as-is (may need adjustment)
                        return msg as any;
                    }),
                };
            }
        );
    }

    // ========================================================================
    // Start Server
    // ========================================================================

    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Server is ready when connect() resolves
}

// Handle errors silently in MCP mode
main().catch((_error) => {
    // In MCP mode, we can't write to stderr, so we just exit with error code
    process.exit(1);
});
