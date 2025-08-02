/**
 * Core types for the agent orchestration system
 */

export type AgentId = string;
export type DirectoryPattern = string;
export type FilePath = string;

/**
 * Generic context for access pattern validation
 * This can be extended for specific resource types
 */
export interface AccessContext<TResource = any> {
  /** The resource being accessed (e.g., file path, table name, endpoint) */
  resource: TResource;
  /** The operation being performed */
  operation: string;
  /** The agent or entity requesting access */
  requesterId: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
  /** Timestamp of the request */
  timestamp?: Date;
}

/**
 * Result of access pattern validation
 */
export interface AccessPatternResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Reason for the decision */
  reason?: string;
  /** Additional metadata from the pattern */
  metadata?: Record<string, any>;
  /** Pattern that made the decision */
  patternId?: string;
}

/**
 * Abstract base class for all access pattern implementations
 */
export abstract class AccessPattern<TContext extends AccessContext = AccessContext> {
  abstract readonly id: string;
  abstract readonly description: string;
  abstract readonly priority: number;

  /**
   * Validate access for the given context
   */
  abstract validate(context: TContext): AccessPatternResult | Promise<AccessPatternResult>;

  /**
   * Check if this pattern applies to the given context
   */
  abstract appliesTo(context: TContext): boolean | Promise<boolean>;
}

/**
 * Specialized context for file system access
 */
export interface FileAccessContext extends AccessContext<FilePath> {
  /** The file path being accessed */
  filePath: FilePath;
  /** The file operation being performed */
  operation: OperationType;
  /** The agent requesting access */
  agentId: AgentId;
}

/**
 * Helper function to create a file access context
 */
export function createFileAccessContext(
  filePath: FilePath,
  operation: OperationType,
  agentId: AgentId,
  metadata?: Record<string, any>
): FileAccessContext {
  return {
    resource: filePath,
    filePath,
    operation,
    requesterId: agentId,
    agentId,
    metadata,
    timestamp: new Date()
  };
}

/**
 * Available tools that agents can be granted access to
 */
export enum AgentTool {
  /** Read files within assigned directories */
  READ_LOCAL = 'read_local',
  /** Read files globally across all directories */
  READ_GLOBAL = 'read_global',
  /** Edit existing files within assigned directories */
  EDIT_FILES = 'edit_files',
  /** Create new files within assigned directories */
  CREATE_FILES = 'create_files',
  /** Delete files within assigned directories */
  DELETE_FILES = 'delete_files',
  /** Create new directories within assigned patterns */
  CREATE_DIRECTORIES = 'create_directories',
  /** Execute system commands (restricted) */
  EXECUTE_COMMANDS = 'execute_commands',
  /** Access network resources */
  NETWORK_ACCESS = 'network_access',
  /** Communicate with other agents */
  INTER_AGENT_COMMUNICATION = 'inter_agent_communication'
}

/**
 * Tool set type for convenience */
export type AgentToolSet = Set<AgentTool>;

/**
 * Agent capability definition
 */
export interface AgentCapability {
  /** Unique identifier for the agent */
  id: AgentId;
  /** Human-readable name for the agent */
  name: string;
  /** Description of the agent's purpose and capabilities */
  description: string;
  /** Access patterns this agent is responsible for */
  accessPatterns: AccessPattern[];
  /** Tools this agent has access to */
  tools: AgentTool[];
  /** Endpoints this agent exposes */
  endpoints: AgentEndpoint[];
}

/**
 * Agent endpoint definition
 */
export interface AgentEndpoint {
  /** Endpoint name (e.g., "question", "validate", "transform") */
  name: string;
  /** Description of what this endpoint does */
  description: string;
  /** Input schema for the endpoint */
  inputSchema?: any;
  /** Output schema for the endpoint */
  outputSchema?: any;
}

/**
 * Request to execute an operation
 */
export interface OperationRequest {
  /** Type of operation */
  type: OperationType;
  /** Target file path (for file operations) */
  filePath?: FilePath;
  /** Operation payload */
  payload: any;
  /** Requesting agent ID (if from another agent) */
  requestingAgent?: AgentId;
  /** Request ID for tracking */
  requestId: string;
}

/**
 * Types of operations that can be performed
 */
export enum OperationType {
  READ_FILE = 'read_file',
  WRITE_FILE = 'write_file',
  EDIT_FILE = 'edit_file',
  DELETE_FILE = 'delete_file',
  CREATE_DIRECTORY = 'create_directory',
  QUESTION = 'question',
  VALIDATE = 'validate',
  TRANSFORM = 'transform'
}

/**
 * Response from an operation
 */
export interface OperationResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Response data */
  data?: any;
  /** Error message if unsuccessful */
  error?: string;
  /** Agent that handled the request */
  handledBy: AgentId;
  /** Request ID this response corresponds to */
  requestId: string;
  /** Additional metadata (e.g., model selection info) */
  metadata?: Record<string, any>;
}

/**
 * Permission check result
 */
export interface PermissionResult {
  /** Whether the operation is allowed */
  allowed: boolean;
  /** Reason if not allowed */
  reason?: string;
  /** Agent that would handle this operation */
  responsibleAgent?: AgentId;
  /** Required tool for this operation */
  requiredTool?: AgentTool;
  /** Available tools for the requesting agent */
  availableTools?: AgentTool[];
}

/**
 * Inter-agent communication message
 */
export interface AgentMessage {
  /** Source agent */
  from: AgentId;
  /** Target agent */
  to: AgentId;
  /** Endpoint being called */
  endpoint: string;
  /** Message payload */
  payload: any;
  /** Message ID for tracking */
  messageId: string;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Agent question request
 */
export interface QuestionRequest {
  /** The question being asked */
  question: string;
  /** Context about the question */
  context?: {
    /** Related file paths */
    filePaths?: FilePath[];
    /** Additional context data */
    metadata?: Record<string, any>;
  };
}

/**
 * Tool permission mapping for operations
 */
export const OPERATION_TOOL_MAP: Record<OperationType, AgentTool> = {
  [OperationType.READ_FILE]: AgentTool.READ_LOCAL,
  [OperationType.WRITE_FILE]: AgentTool.CREATE_FILES,
  [OperationType.EDIT_FILE]: AgentTool.EDIT_FILES,
  [OperationType.DELETE_FILE]: AgentTool.DELETE_FILES,
  [OperationType.CREATE_DIRECTORY]: AgentTool.CREATE_DIRECTORIES,
  [OperationType.QUESTION]: AgentTool.INTER_AGENT_COMMUNICATION,
  [OperationType.VALIDATE]: AgentTool.READ_LOCAL,
  [OperationType.TRANSFORM]: AgentTool.EDIT_FILES
};

/**
 * Helper function to check if an agent has a specific tool
 */
export function hasAgentTool(agent: AgentCapability, tool: AgentTool): boolean {
  return agent.tools.includes(tool);
}

/**
 * Helper function to get required tool for an operation
 */
export function getRequiredTool(
  operation: OperationType, 
  filePath?: FilePath, 
  isGlobalAccess?: boolean
): AgentTool {
  if (operation === OperationType.READ_FILE && isGlobalAccess) {
    return AgentTool.READ_GLOBAL;
  }
  return OPERATION_TOOL_MAP[operation];
}


/**
 * Agent question response
 */
export interface QuestionResponse {
  /** The answer to the question */
  answer: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Supporting information */
  supportingInfo?: {
    /** Referenced files */
    referencedFiles?: FilePath[];
    /** Additional metadata */
    metadata?: Record<string, any>;
  };
}

/**
 * Available AI models for different operations
 */
export enum AIModel {
  /** Claude 3.5 Sonnet - Balanced performance for most tasks */
  CLAUDE_3_5_SONNET = 'claude-3-5-sonnet-20241022',
  /** Claude 3 Opus - Maximum capability for complex tasks */
  CLAUDE_3_OPUS = 'claude-3-opus-20240229',
  /** Claude 3 Haiku - Fast and efficient for simple tasks */
  CLAUDE_3_HAIKU = 'claude-3-haiku-20240307',
  /** GPT-4 Turbo - OpenAI's latest model */
  GPT_4_TURBO = 'gpt-4-turbo-preview',
  /** GPT-3.5 Turbo - Fast and cost-effective */
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  /** Custom model for specific use cases */
  CUSTOM = 'custom'
}

/**
 * Model capability characteristics
 */
export interface ModelCapabilities {
  /** Maximum context length */
  maxContextLength: number;
  /** Cost per 1K tokens (input) */
  costPerKInput: number;
  /** Cost per 1K tokens (output) */
  costPerKOutput: number;
  /** Relative speed (1-10, 10 being fastest) */
  speed: number;
  /** Reasoning capability (1-10, 10 being best) */
  reasoning: number;
  /** Code generation quality (1-10, 10 being best) */
  codeGeneration: number;
  /** Analysis quality (1-10, 10 being best) */
  analysis: number;
  /** Creative writing quality (1-10, 10 being best) */
  creativity: number;
  /** Factual accuracy (1-10, 10 being best) */
  accuracy: number;
  /** Language support quality (1-10, 10 being best) */
  multiLanguage: number;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  /** Model identifier */
  model: AIModel;
  /** Model display name */
  name: string;
  /** Model description */
  description: string;
  /** Model capabilities */
  capabilities: ModelCapabilities;
  /** Whether this model is available */
  available: boolean;
  /** API provider (anthropic, openai, etc.) */
  provider: string;
  /** Custom API endpoint if using custom model */
  endpoint?: string;
  /** Additional configuration options */
  options?: Record<string, any>;
}

/**
 * Auto mode configuration for intelligent model selection
 */
export interface AutoModeConfig {
  /** Whether auto mode is enabled */
  enabled: boolean;
  /** Preferred models in order of preference */
  preferredModels: AIModel[];
  /** Cost threshold for automatic selection (USD per request) */
  costThreshold?: number;
  /** Performance threshold for selection (1-10) */
  performanceThreshold?: number;
  /** Context length threshold for model selection */
  contextLengthThreshold?: number;
  /** Operation-specific model preferences */
  operationPreferences?: Partial<Record<OperationType, AIModel[]>>;
  /** Agent-specific model preferences */
  agentPreferences?: Record<AgentId, AIModel[]>;
  /** Fallback model if preferred models are unavailable */
  fallbackModel: AIModel;
}

/**
 * Model selection criteria for operation
 */
export interface ModelSelectionCriteria {
  /** Type of operation being performed */
  operationType: OperationType;
  /** Requesting agent ID */
  agentId?: AgentId;
  /** Estimated complexity (1-10) */
  complexity?: number;
  /** Estimated context length needed */
  contextLength?: number;
  /** Priority level (1-10, 10 being highest) */
  priority?: number;
  /** Maximum cost willing to spend */
  maxCost?: number;
  /** Required capabilities */
  requiredCapabilities?: Partial<ModelCapabilities>;
  /** Custom selection factors */
  customFactors?: Record<string, any>;
}

/**
 * Model selection result
 */
export interface ModelSelectionResult {
  /** Selected model */
  selectedModel: AIModel;
  /** Reason for selection */
  reason: string;
  /** Selection confidence (0-1) */
  confidence: number;
  /** Estimated cost for operation */
  estimatedCost?: number;
  /** Alternative models considered */
  alternatives?: Array<{
    model: AIModel;
    score: number;
    reason: string;
  }>;
  /** Selection metadata */
  metadata?: Record<string, any>;
}

/**
 * Access patterns configuration
 */
export interface AccessPatternsConfig {
  /** Enable the access patterns system */
  enabled: boolean;
  /** Global access patterns that apply to all agents */
  globalPatterns?: AccessPattern[];
  /** Cache access pattern evaluations for performance */
  enableCaching?: boolean;
  /** Maximum cache size for access pattern evaluations */
  maxCacheSize?: number;
}

/**
 * Orchestration configuration
 */
export interface OrchestrationConfig {
  /** Registered agents */
  agents: AgentCapability[];
  /** Default permissions */
  defaultPermissions: {
    /** Default tools granted to all agents */
    defaultTools: AgentTool[];
    /** Require explicit tool grants for sensitive operations */
    requireExplicitToolGrants: boolean;
  };
  /** Access patterns configuration */
  accessPatterns?: AccessPatternsConfig;
  /** Logging configuration */
  logging: {
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** Whether to log inter-agent communications */
    logCommunications: boolean;
    /** Whether to log model selection decisions */
    logModelSelection?: boolean;
    /** Whether to log access pattern evaluations */
    logAccessPatterns?: boolean;
  };
  /** Model selection configuration */
  modelSelection?: {
    /** Available model configurations */
    availableModels: ModelConfig[];
    /** Auto mode configuration */
    autoMode: AutoModeConfig;
    /** Default model for operations when auto mode is disabled */
    defaultModel: AIModel;
    /** Model selection settings */
    selectionStrategy: 'cost-optimized' | 'performance-optimized' | 'balanced' | 'custom';
    /** Custom scoring weights for model selection */
    customWeights?: {
      cost: number;
      speed: number;
      quality: number;
      accuracy: number;
    };
  };
}

/**
 * Events emitted by the orchestration system
 */
export interface OrchestrationEvents {
  agentRegistered: (agent: AgentCapability) => void;
  agentUnregistered: (agentId: AgentId) => void;
  operationRequested: (request: OperationRequest) => void;
  operationCompleted: (response: OperationResponse) => void;
  permissionDenied: (request: OperationRequest, reason: string, requiredTool?: AgentTool) => void;
  agentCommunication: (message: AgentMessage) => void;
  toolAccessDenied: (agentId: AgentId, tool: AgentTool, context?: string) => void;
  toolAccessGranted: (agentId: AgentId, tool: AgentTool, context?: string) => void;
  modelSelected: (criteria: ModelSelectionCriteria, result: ModelSelectionResult) => void;
  modelSelectionFailed: (criteria: ModelSelectionCriteria, error: string) => void;
  autoModeTriggered: (criteria: ModelSelectionCriteria) => void;
}