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
  DirectoryPattern,
  FilePath,
  OperationRequest,
  OperationResponse,
  OperationType,
  PermissionResult,
  AgentMessage,
  QuestionRequest,
  QuestionResponse,
  OrchestrationConfig,
  OrchestrationEvents
} from './types.js';

export { OperationType } from './types.js';

// Core systems
export { AgentRegistry } from './agent-registry.js';
export { PermissionSystem } from './permissions.js';
export { AgentCommunicationSystem } from './communication.js';
export { CoreOrchestrator } from './orchestrator.js';

// Permission system types
export type { PermissionRule, PermissionAuditLog } from './permissions.js';

// Communication system types
export type { CommunicationEvents } from './communication.js';

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
 * Utility function to create a basic agent capability
 */
export function createAgentCapability(
  id: string,
  name: string,
  directoryPatterns: string[],
  options?: {
    description?: string;
    canEdit?: boolean;
    canReadGlobally?: boolean;
    endpoints?: Array<{ name: string; description: string; }>;
  }
): AgentCapability {
  return {
    id,
    name,
    description: options?.description || `Agent responsible for ${directoryPatterns.join(', ')}`,
    directoryPatterns,
    canEdit: options?.canEdit ?? true,
    canReadGlobally: options?.canReadGlobally ?? false,
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
        canEdit: true,
        canReadGlobally: false,
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
        canEdit: true,
        canReadGlobally: true,
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
        canEdit: true,
        canReadGlobally: true,
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
        canEdit: true,
        canReadGlobally: false,
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
        canEdit: true,
        canReadGlobally: true,
        endpoints: [
          { name: 'question', description: 'Answer questions about project documentation' },
          { name: 'generate', description: 'Generate documentation and README content' },
          { name: 'update', description: 'Update existing documentation' }
        ]
      }
    );
  }
};