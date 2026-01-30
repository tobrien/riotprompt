/**
 * MCP Type Definitions for RiotPrompt
 *
 * This module defines types for the Model Context Protocol integration,
 * including protocol types, RiotPrompt-specific types, and resource result types.
 */

// ============================================================================
// MCP Protocol Types
// ============================================================================

/**
 * MCP Tool definition
 * Represents a callable tool exposed via MCP
 */
export interface McpTool {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, McpToolParameter>;
        required?: string[];
    };
}

/**
 * MCP Tool Parameter definition
 * Describes a single parameter for a tool
 */
export interface McpToolParameter {
    type: string;
    description: string;
    enum?: string[];
    items?: { type: string };
}

/**
 * MCP Resource definition
 * Represents a readable resource exposed via MCP
 */
export interface McpResource {
    uri: string;
    name: string;
    description: string;
    mimeType?: string;
}

/**
 * MCP Prompt definition
 * Represents a workflow prompt template
 */
export interface McpPrompt {
    name: string;
    description: string;
    arguments?: Array<{
        name: string;
        description: string;
        required: boolean;
    }>;
}

/**
 * MCP Prompt Message
 * Represents a message in a prompt template
 */
export interface McpPromptMessage {
    role: 'user' | 'assistant';
    content: {
        type: 'text' | 'image' | 'resource';
        text?: string;
        data?: string;
        mimeType?: string;
    };
}

// ============================================================================
// RiotPrompt-Specific Types
// ============================================================================

/**
 * Parsed riotprompt:// URI
 * Represents the structured components of a riotprompt URI
 */
export interface RiotPromptUri {
    scheme: 'riotprompt';
    type: 'config' | 'prompt' | 'templates' | 'version';
    path?: string;
    query?: Record<string, string>;
}

/**
 * Tool Execution Context
 * Provides context for tool execution
 */
export interface ToolExecutionContext {
    workingDirectory: string;
    config?: any; // RiotPrompt config
    logger?: any; // Logger instance
    sendNotification?: (notification: {
        method: string;
        params: {
            progressToken?: string | number;
            progress: number;
            total?: number;
            message?: string;
        };
    }) => Promise<void>; // MCP sendNotification function for progress updates
    progressToken?: string | number; // Progress token from request metadata
}

/**
 * Tool Result
 * Standard result format for tool execution
 */
export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    message?: string;
    // Enhanced error context for MCP
    context?: Record<string, any>;
    recovery?: string[];
    details?: {
        stdout?: string;
        stderr?: string;
        exitCode?: number;
        files?: string[];
        phase?: string;
    };
    // Captured log output from command execution
    logs?: string[];
}

// ============================================================================
// Resource Result Types
// ============================================================================

/**
 * Configuration Resource
 * Result of reading a riotprompt configuration
 */
export interface ConfigResource {
    path: string;
    exists: boolean;
    config?: any;
}

/**
 * Prompt Resource
 * Result of reading a prompt structure
 */
export interface PromptResource {
    path: string;
    name: string;
    structure: {
        hasPersona: boolean;
        hasInstructions: boolean;
        hasContext: boolean;
        contextFiles?: string[];
    };
}

/**
 * Templates Resource
 * Result of reading registered templates
 */
export interface TemplatesResource {
    templates: Array<{
        name: string;
        description?: string;
    }>;
}

/**
 * Version Resource
 * Result of reading riotprompt version information
 */
export interface VersionResource {
    version: string;
    name: string;
}
