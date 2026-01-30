/**
 * Process Tool - Process a prompt and format it
 */

/* eslint-disable import/extensions */
import type { McpTool, ToolResult, ToolExecutionContext } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as RiotPrompt from '../../riotprompt.js';
/* eslint-enable import/extensions */

export const processTool: McpTool = {
    name: 'riotprompt_process',
    description:
        'Process a prompt (directory, JSON, or XML) and output the formatted prompt. ' +
        'Can format for specific models or export to JSON/XML.',
    inputSchema: {
        type: 'object',
        properties: {
            promptPath: {
                type: 'string',
                description: 'Path to prompt directory or file',
            },
            model: {
                type: 'string',
                description: 'Model to format for (e.g., gpt-4, claude-3-opus, gemini-1.5-pro)',
            },
            format: {
                type: 'string',
                enum: ['text', 'json', 'xml'],
                description: 'Output format (default: text)',
            },
            outputFile: {
                type: 'string',
                description: 'Optional output file path',
            },
        },
        required: ['promptPath'],
    },
};

async function isDirectory(filePath: string): Promise<boolean> {
    try {
        const stat = await fs.stat(filePath);
        return stat.isDirectory();
    } catch {
        return false;
    }
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function loadPromptFromDirectory(absolutePromptPath: string): Promise<RiotPrompt.Prompt> {
    let personaSection: RiotPrompt.Section<RiotPrompt.Instruction> | undefined;
    let instructionsSection: RiotPrompt.Section<RiotPrompt.Instruction> | undefined;
    let contextSection: RiotPrompt.Section<RiotPrompt.Context> | undefined;

    const loader = RiotPrompt.Loader.create();

    // 1. Load Persona
    const personaDir = path.join(absolutePromptPath, 'persona');
    const personaFile = path.join(absolutePromptPath, 'persona.md');

    if (await isDirectory(personaDir)) {
        const personaSections = await loader.load([personaDir]);
        if (personaSections.length > 0) {
            personaSection = RiotPrompt.createSection({ title: 'Persona' });
            personaSections.forEach(section => {
                personaSection!.add(section as any);
            });
        }
    } else if (await fileExists(personaFile)) {
        const personaContent = await fs.readFile(personaFile, 'utf-8');
        personaSection = RiotPrompt.createSection({ title: 'Persona' });
        personaSection.add(RiotPrompt.createInstruction(personaContent));
    }

    // 2. Load Instructions
    const instructionsDir = path.join(absolutePromptPath, 'instructions');
    const instructionsFile = path.join(absolutePromptPath, 'instructions.md');

    if (await isDirectory(instructionsDir)) {
        const instructionSections = await loader.load([instructionsDir]);
        if (instructionSections.length > 0) {
            instructionsSection = RiotPrompt.createSection({ title: 'Instructions' });
            instructionSections.forEach(section => {
                instructionsSection!.add(section as any);
            });
        }
    } else if (await fileExists(instructionsFile)) {
        const instructionsContent = await fs.readFile(instructionsFile, 'utf-8');
        instructionsSection = RiotPrompt.createSection({ title: 'Instructions' });
        instructionsSection.add(RiotPrompt.createInstruction(instructionsContent));
    }

    if (!instructionsSection) {
        throw new Error('instructions (directory or .md file) is required.');
    }

    // 3. Load Context
    const contextDir = path.join(absolutePromptPath, 'context');
    if (await isDirectory(contextDir)) {
        const contextSections = await loader.load([contextDir]);
        
        if (contextSections.length > 0) {
            contextSection = RiotPrompt.createSection({ title: 'Context' });
            contextSections.forEach(section => {
                contextSection!.add(section as any); 
            });
        }
    }

    // Build Prompt
    return RiotPrompt.createPrompt({
        persona: personaSection,
        instructions: instructionsSection,
        contexts: contextSection
    });
}

export async function executeProcess(args: any, context: ToolExecutionContext): Promise<ToolResult> {
    try {
        const promptPath = args.promptPath;
        const absolutePromptPath = path.resolve(context.workingDirectory, promptPath);
        
        if (!await fileExists(absolutePromptPath)) {
            return {
                success: false,
                error: `Prompt path not found at ${absolutePromptPath}`,
            };
        }

        let prompt: RiotPrompt.Prompt;

        if (await isDirectory(absolutePromptPath)) {
            prompt = await loadPromptFromDirectory(absolutePromptPath);
        } else {
            // It's a file
            const content = await fs.readFile(absolutePromptPath, 'utf-8');
            if (absolutePromptPath.endsWith('.json')) {
                prompt = RiotPrompt.Serializer.fromJSON(content);
            } else if (absolutePromptPath.endsWith('.xml')) {
                prompt = RiotPrompt.Serializer.fromXML(content);
            } else {
                return {
                    success: false,
                    error: 'Supported file formats are .json and .xml',
                };
            }
        }

        let output = '';
        const format = args.format || 'text';

        if (format === 'json') {
            output = RiotPrompt.Serializer.toJSON(prompt);
        } else if (format === 'xml') {
            output = RiotPrompt.Serializer.toXML(prompt);
        } else {
            // Format for model
            const model = args.model as RiotPrompt.Model || 'gpt-4';
            const formatter = RiotPrompt.Formatter.create();
            const chatRequest = formatter.formatPrompt(model, prompt);

            // Simple representation of the chat request
            if (chatRequest.messages) {
                output = chatRequest.messages.map(m => `--- ROLE: ${m.role} ---\n${m.content}`).join('\n\n');
            } else {
                output = JSON.stringify(chatRequest, null, 2);
            }
        }

        if (args.outputFile) {
            const outputPath = path.resolve(context.workingDirectory, args.outputFile);
            await fs.writeFile(outputPath, output);
            
            return {
                success: true,
                data: {
                    outputFile: outputPath,
                    format,
                },
                message: `Output written to ${outputPath}`,
            };
        } else {
            return {
                success: true,
                data: {
                    output,
                    format,
                },
                message: 'Prompt processed successfully',
            };
        }
    } catch (error: any) {
        return {
            success: false,
            error: error.message,
        };
    }
}
