/**
 * Execute Tool - Execute a prompt using an LLM provider
 */

/* eslint-disable import/extensions */
import type { McpTool, ToolResult, ToolExecutionContext } from '../types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as RiotPrompt from '../../riotprompt.js';
/* eslint-enable import/extensions */

export const executeTool: McpTool = {
    name: 'riotprompt_execute',
    description:
        'Execute a prompt using an LLM provider (OpenAI, Anthropic, or Gemini). ' +
        'Requires appropriate API key to be set in environment.',
    inputSchema: {
        type: 'object',
        properties: {
            promptPath: {
                type: 'string',
                description: 'Path to prompt directory or file',
            },
            model: {
                type: 'string',
                description: 'Model to use (e.g., gpt-4, claude-3-opus, gemini-1.5-pro)',
            },
            apiKey: {
                type: 'string',
                description: 'API Key (overrides environment variables)',
            },
            temperature: {
                type: 'number',
                description: 'Temperature (0-1)',
            },
            maxTokens: {
                type: 'number',
                description: 'Maximum tokens to generate',
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

export async function executeExecute(args: any, context: ToolExecutionContext): Promise<ToolResult> {
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

        // Format the prompt for the model
        const modelName = args.model || 'gpt-4';
        const formatter = RiotPrompt.Formatter.create();
        const chatRequest = formatter.formatPrompt(modelName as RiotPrompt.Model, prompt);

        // Execute
        const executionOptions: RiotPrompt.Execution.ExecutionOptions = {
            apiKey: args.apiKey,
            model: modelName,
            temperature: args.temperature,
            maxTokens: args.maxTokens
        };

        const result = await RiotPrompt.Execution.execute(chatRequest, executionOptions);

        return {
            success: true,
            data: {
                content: result.content,
                usage: result.usage ? {
                    inputTokens: result.usage.inputTokens,
                    outputTokens: result.usage.outputTokens,
                } : undefined,
                model: modelName,
            },
            message: 'Prompt executed successfully',
        };
    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Unknown error during execution',
        };
    }
}
