/**
 * MCP Tool Definitions and Executors
 *
 * Provides MCP tool interfaces for riotprompt commands
 */

/* eslint-disable import/extensions */
import type { McpTool, ToolResult, ToolExecutionContext } from '../types.js';

// Tool imports
import { getVersionTool, executeGetVersion } from './get-version.js';
import { createTool, executeCreate } from './create.js';
import { processTool, executeProcess } from './process.js';
import { executeTool as executePromptTool, executeExecute } from './execute.js';
/* eslint-enable import/extensions */

/**
 * Base tool executor - wraps command logic
 */
export async function executeTool(
    toolName: string,
    args: Record<string, any>,
    context: ToolExecutionContext
): Promise<ToolResult> {
    try {
        // Route to specific tool handler
        switch (toolName) {
            case 'riotprompt_get_version':
                return await executeGetVersion(args, context);
            case 'riotprompt_create':
                return await executeCreate(args, context);
            case 'riotprompt_process':
                return await executeProcess(args, context);
            case 'riotprompt_execute':
                return await executeExecute(args, context);
            default:
                return {
                    success: false,
                    error: `Unknown tool: ${toolName}`,
                };
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Unknown error',
            details: {
                stderr: error.stderr,
                stdout: error.stdout,
            },
        };
    }
}

/**
 * Tool definitions array
 */
export const tools: McpTool[] = [
    getVersionTool,
    createTool,
    processTool,
    executePromptTool,
];
