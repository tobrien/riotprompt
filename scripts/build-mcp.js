#!/usr/bin/env node
/**
 * Build MCP Server
 * Simple build script to compile the MCP server separately from main build
 */

import { build } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, chmodSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

// Get package version
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'));
const version = packageJson.version;

async function buildMCPServer() {
    try {
        console.log('Building MCP server...');

        await build({
            entryPoints: [resolve(root, 'src/mcp/server.ts')],
            bundle: true,
            platform: 'node',
            target: 'esnext',
            format: 'esm',
            outfile: resolve(root, 'dist/mcp-server.js'),
            external: [
                '@modelcontextprotocol/*',
                '@riotprompt/*',
                '@anthropic-ai/*',
                '@google/*',
                '@fjell/*',
                '@theunwalked/*',
                'openai',
                'tiktoken',
            ],
            sourcemap: true,
        });

        // Add shebang and replace placeholders
        const outputPath = resolve(root, 'dist/mcp-server.js');
        let content = readFileSync(outputPath, 'utf-8');

        // Replace version placeholder if any
        content = content.replace(/__VERSION__/g, version);

        if (!content.startsWith('#!')) {
            content = `#!/usr/bin/env node\n${content}`;
        }

        writeFileSync(outputPath, content);

        // Make executable
        chmodSync(outputPath, 0o755);

        console.log('✓ MCP server built successfully');
    } catch (error) {
        console.error('✗ MCP server build failed:', error);
        process.exit(1);
    }
}

buildMCPServer();
