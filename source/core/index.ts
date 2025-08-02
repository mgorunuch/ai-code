/**
 * Core Orchestration System - Main Export
 * 
 * This module provides the complete agent orchestration system with:
 * - Directory-based agent responsibility
 * - Permission management
 * - Inter-agent communication
 * - Request routing and execution
 */

// Core types
export type {
  AgentCapability,
  AgentEndpoint,
  AgentId,
  FilePath,
  OperationRequest,
  OperationResponse,
  PermissionResult,
  AgentMessage,
  QuestionRequest,
  QuestionResponse,
  OrchestrationConfig,
  OrchestrationEvents,
  // Model selection types
  ModelCapabilities,
  ModelConfig,
  AutoModeConfig,
  ModelSelectionCriteria,
  ModelSelectionResult
} from './types.js';

// Re-export enums for convenience
export { OperationType, AIModel, AgentTool } from './types.js';

// Export access pattern classes
export { 
  FileSystemAccessPattern,
  DatabaseTableAccessPattern,
  APIEndpointAccessPattern,
  CompositeAccessPattern,
  TimeBasedAccessPattern,
  CustomAccessPattern
} from './access-patterns.js';

// Export access pattern types
export type {
  DatabaseAccessContext,
  APIAccessContext
} from './access-patterns.js';

// Core systems
export { AgentRegistry } from './agent-registry.js';
export { PermissionSystem } from './permissions.js';
export { AgentCommunicationSystem } from './communication.js';
export { CoreOrchestrator } from './orchestrator.js';
export { ModelSelector, createModelSelector } from './model-selector.js';

// Import the actual types we need
import type { OrchestrationConfig, AgentCapability } from './types.js';
import { AgentTool } from './types.js';
import { CoreOrchestrator } from './orchestrator.js';
import { FileSystemAccessPattern } from './access-patterns.js';

// Permission system types
export type { PermissionRule, PermissionAuditLog } from './permissions.js';

// Communication system types
export type { CommunicationEvents } from './communication.js';

// Model selector types and defaults
export type { ModelSelectorEvents } from './model-selector.js';
export { DEFAULT_MODEL_CONFIGS, DEFAULT_AUTO_MODE_CONFIG } from './model-selector.js';

// Orchestrator types
export type { RequestHandler, OrchestrationEvents as OrchestratorEvents } from './orchestrator.js';

/**
 * Create a new orchestration system with default configuration
 */
export function createOrchestrator(config?: Partial<OrchestrationConfig>) {
  return new CoreOrchestrator(config);
}

/**
 * Utility function to generate unique request IDs
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Utility function to create a basic agent capability with access patterns
 */
export function createAgentCapability(
  id: string,
  name: string,
  filePatterns: string[],
  options?: {
    description?: string;
    tools?: Array<AgentTool>;
    endpoints?: Array<{ name: string; description: string; }>;
    priority?: number;
  }
): AgentCapability {
  return {
    id,
    name,
    description: options?.description || `Agent responsible for ${filePatterns.join(', ')}`,
    accessPatterns: [
      new FileSystemAccessPattern(
        `${id}-main-pattern`,
        `Main access pattern for ${name}`,
        options?.priority || 20,
        filePatterns,
        true // allow access
      )
    ],
    tools: options?.tools || [AgentTool.READ_LOCAL, AgentTool.INTER_AGENT_COMMUNICATION],
    endpoints: options?.endpoints || [
      { name: 'question', description: 'Answer questions about this domain' },
      { name: 'handle', description: 'Handle operations in this domain' }
    ]
  };
}

/**
 * Default agent configurations for common scenarios
 */
export const DefaultAgents = {
  /**
   * React/Frontend agent for UI components
   */
  createReactAgent(): AgentCapability {
    return createAgentCapability(
      'react-agent',
      'React Frontend Agent',
      ['**/*.tsx', '**/*.jsx', '**/components/**', '**/pages/**', '**/hooks/**'],
      {
        description: 'Manages React components, pages, and frontend code',
        tools: [
          AgentTool.READ_LOCAL,
          AgentTool.EDIT_FILES,
          AgentTool.CREATE_FILES,
          AgentTool.DELETE_FILES,
          AgentTool.INTER_AGENT_COMMUNICATION
        ],
        endpoints: [
          { name: 'question', description: 'Answer questions about React components and frontend code' },
          { name: 'validate', description: 'Validate React component structure and props' },
          { name: 'transform', description: 'Transform React components and JSX' }
        ]
      }
    );
  },

  /**
   * TypeScript/Core agent for business logic
   */
  createTypescriptAgent(): AgentCapability {
    return createAgentCapability(
      'typescript-agent',
      'TypeScript Core Agent',
      ['**/*.ts', '**/src/**', '**/lib/**', '!**/*.test.ts', '!**/*.spec.ts'],
      {
        description: 'Manages TypeScript code, business logic, and core functionality',
        tools: [
          AgentTool.READ_LOCAL,
          AgentTool.READ_GLOBAL,
          AgentTool.EDIT_FILES,
          AgentTool.CREATE_FILES,
          AgentTool.DELETE_FILES,
          AgentTool.CREATE_DIRECTORIES,
          AgentTool.INTER_AGENT_COMMUNICATION
        ],
        endpoints: [
          { name: 'question', description: 'Answer questions about TypeScript code and business logic' },
          { name: 'validate', description: 'Validate TypeScript code structure and types' },
          { name: 'transform', description: 'Transform TypeScript code and interfaces' }
        ]
      }
    );
  },

  /**
   * Test agent for test files
   */
  createTestAgent(): AgentCapability {
    return createAgentCapability(
      'test-agent',
      'Test Agent',
      ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx', '**/tests/**', '**/__tests__/**'],
      {
        description: 'Manages test files and testing infrastructure',
        tools: [
          AgentTool.READ_LOCAL,
          AgentTool.READ_GLOBAL,
          AgentTool.EDIT_FILES,
          AgentTool.CREATE_FILES,
          AgentTool.DELETE_FILES,
          AgentTool.INTER_AGENT_COMMUNICATION
        ],
        endpoints: [
          { name: 'question', description: 'Answer questions about tests and testing strategies' },
          { name: 'validate', description: 'Validate test structure and coverage' },
          { name: 'generate', description: 'Generate test cases and test files' }
        ]
      }
    );
  },

  /**
   * Configuration agent for config files
   */
  createConfigAgent(): AgentCapability {
    return createAgentCapability(
      'config-agent',
      'Configuration Agent',
      ['**/package.json', '**/tsconfig.json', '**/*.config.*', '**/.*rc.*', '**/.env*'],
      {
        description: 'Manages configuration files and project settings',
        tools: [
          AgentTool.READ_LOCAL,
          AgentTool.EDIT_FILES,
          AgentTool.CREATE_FILES,
          AgentTool.DELETE_FILES,
          AgentTool.INTER_AGENT_COMMUNICATION
        ],
        endpoints: [
          { name: 'question', description: 'Answer questions about project configuration' },
          { name: 'validate', description: 'Validate configuration files' },
          { name: 'update', description: 'Update configuration settings' }
        ]
      }
    );
  },

  /**
   * Documentation agent for markdown and docs
   */
  createDocsAgent(): AgentCapability {
    return createAgentCapability(
      'docs-agent',
      'Documentation Agent',
      ['**/*.md', '**/docs/**', '**/README*'],
      {
        description: 'Manages documentation, README files, and markdown content',
        tools: [
          AgentTool.READ_LOCAL,
          AgentTool.READ_GLOBAL,
          AgentTool.EDIT_FILES,
          AgentTool.CREATE_FILES,
          AgentTool.DELETE_FILES,
          AgentTool.INTER_AGENT_COMMUNICATION
        ],
        endpoints: [
          { name: 'question', description: 'Answer questions about project documentation' },
          { name: 'generate', description: 'Generate documentation and README content' },
          { name: 'update', description: 'Update existing documentation' }
        ]
      }
    );
  }
};