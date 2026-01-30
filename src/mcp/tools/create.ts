/**
 * Create Tool - Create a new prompt structure
 */

/* eslint-disable import/extensions */
import type { McpTool, ToolResult, ToolExecutionContext } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as RiotPrompt from '../../riotprompt.js';
/* eslint-enable import/extensions */

export const createTool: McpTool = {
    name: 'riotprompt_create',
    description:
        'Create a new prompt directory structure or import from file. ' +
        'Scaffolds a new prompt with persona.md, instructions.md, and optional context directory.',
    inputSchema: {
        type: 'object',
        properties: {
            promptName: {
                type: 'string',
                description: 'Name of the prompt to create',
            },
            path: {
                type: 'string',
                description: 'Base path to create the prompt in (defaults to current directory)',
            },
            persona: {
                type: 'string',
                description: 'Initial text for persona.md',
            },
            instructions: {
                type: 'string',
                description: 'Initial text for instructions.md',
            },
            createContext: {
                type: 'boolean',
                description: 'Create context directory with placeholder (default: true)',
            },
            importFile: {
                type: 'string',
                description: 'Import prompt structure from a JSON or XML file',
            },
        },
        required: ['promptName'],
    },
};

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function executeCreate(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
        const promptName = args.promptName;
        const basePath = args.path || context.workingDirectory;
        const fullPath = path.resolve(basePath, promptName);

        if (await fileExists(fullPath)) {
            return {
                success: false,
                error: `Directory ${fullPath} already exists.`,
            };
        }

        if (args.importFile) {
            // Import Mode
            const content = await fs.readFile(args.importFile, 'utf-8');
            let prompt: RiotPrompt.Prompt;

            if (args.importFile.endsWith('.json')) {
                prompt = RiotPrompt.Serializer.fromJSON(content);
            } else if (args.importFile.endsWith('.xml')) {
                prompt = RiotPrompt.Serializer.fromXML(content);
            } else {
                return {
                    success: false,
                    error: 'Unsupported file extension. Use .json or .xml',
                };
            }

            await RiotPrompt.Writer.saveToDirectory(prompt, fullPath);
            
            return {
                success: true,
                data: {
                    path: fullPath,
                    imported: true,
                    source: args.importFile,
                },
                message: `Successfully imported prompt to ${fullPath}`,
            };
        } else {
            // Scaffold Mode
            await fs.mkdir(fullPath, { recursive: true });

            // Create persona.md
            const personaText = args.persona || 'You are a helpful AI assistant.';
            await fs.writeFile(path.join(fullPath, 'persona.md'), personaText);

            // Create instructions.md
            const instructionsText = args.instructions || 'Please analyze the following request.';
            await fs.writeFile(path.join(fullPath, 'instructions.md'), instructionsText);

            // Create context directory if requested (default: true)
            const createContext = args.createContext !== false;
            if (createContext) {
                const contextDir = path.join(fullPath, 'context');
                await fs.mkdir(contextDir);
                await fs.writeFile(
                    path.join(contextDir, 'README.md'),
                    'Place context files (json, md, txt) in this directory.'
                );
            }

            return {
                success: true,
                data: {
                    path: fullPath,
                    files: [
                        'persona.md',
                        'instructions.md',
                        ...(createContext ? ['context/'] : []),
                    ],
                },
                message: `Prompt '${promptName}' created successfully at ${fullPath}`,
            };
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        };
    }
}
