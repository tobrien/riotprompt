/**
 * Configuration Resource Handler
 */

import { readFile, access } from 'fs/promises';
import { resolve } from 'path';
import * as yaml from 'js-yaml';

export async function readConfig(): Promise<any> {
    const configPath = resolve(process.cwd(), 'riotprompt.yaml');
    
    try {
        await access(configPath);
    } catch {
        return {
            path: configPath,
            exists: false,
            message: 'No riotprompt.yaml found in current directory',
        };
    }

    try {
        const content = await readFile(configPath, 'utf-8');
        const config = yaml.load(content);
        
        return {
            path: configPath,
            exists: true,
            config,
        };
    } catch (error: any) {
        return {
            path: configPath,
            exists: true,
            error: error.message,
        };
    }
}
