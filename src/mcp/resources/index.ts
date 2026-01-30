/**
 * MCP Resource Handlers
 *
 * Provides read-only access to riotprompt data via MCP resources
 */

/* eslint-disable import/extensions */
import type { McpResource } from '../types.js';
import { readConfig } from './config.js';
import { readVersion } from './version.js';
/* eslint-enable import/extensions */

/**
 * Get all available resources
 */
export function getResources(): McpResource[] {
    return [
        {
            uri: 'riotprompt://config',
            name: 'RiotPrompt Configuration',
            description: 'Current riotprompt configuration (riotprompt.yaml)',
            mimeType: 'application/json',
        },
        {
            uri: 'riotprompt://version',
            name: 'RiotPrompt Version',
            description: 'Version information for riotprompt',
            mimeType: 'application/json',
        },
    ];
}

/**
 * Read a resource by URI
 */
export async function readResource(uri: string): Promise<any> {
    if (uri === 'riotprompt://config') {
        return await readConfig();
    }
    if (uri === 'riotprompt://version') {
        return await readVersion();
    }
    
    throw new Error(`Unknown resource URI: ${uri}`);
}
