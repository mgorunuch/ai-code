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
export { OperationType, AIModel, AgentToolEnum } from './types.js';

// Export helper functions
export { 
  hasAgentToolForOperation,
  getToolsForOperation,
  getRequiredTool,
  createFileAccessContext
} from './types.js';

// Export tool-based system
export * from './tools.js';

// Re-export AgentTool base class
export { AgentTool } from './types.js';

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
import { CoreOrchestrator } from './orchestrator.js';

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

