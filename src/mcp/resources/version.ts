/**
 * Version Resource Handler
 */

import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function readVersion(): Promise<any> {
    try {
        const packageJsonPath = resolve(__dirname, '../../../package.json');
        const content = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(content);
        
        return {
            version: packageJson.version,
            name: packageJson.name,
            description: packageJson.description,
        };
    } catch (error: any) {
        return {
            error: error.message,
        };
    }
}
