/**
 * Get Version Tool
 */

/* eslint-disable import/extensions */
import type { McpTool, ToolResult, ToolExecutionContext } from '../types.js';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
/* eslint-enable import/extensions */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const getVersionTool: McpTool = {
    name: 'riotprompt_get_version',
    description:
        'Get the current version of riotprompt. ' +
        'Useful for diagnosing if you are using the latest version.',
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
};

export async function executeGetVersion(_args: any, _context: ToolExecutionContext): Promise<ToolResult> {
    try {
        // Read version from package.json
        const packageJsonPath = resolve(__dirname, '../../../package.json');
        const content = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        
        return {
            success: true,
            data: {
                version: packageJson.version,
                name: packageJson.name,
                description: packageJson.description,
            },
            message: `${packageJson.name} ${packageJson.version}`,
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        };
    }
}
