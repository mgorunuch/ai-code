/**
 * Core types for the agent orchestration system
 */

export type AgentId = string;
export type DirectoryPattern = string;
export type FilePath = string;

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
  /** Directory patterns this agent is responsible for (glob patterns) */
  directoryPatterns: DirectoryPattern[];
  /** Tools this agent has access to */
  tools: AgentTool[];
  /** Endpoints this agent exposes */
  endpoints: AgentEndpoint[];
  
  // Legacy properties for backward compatibility (deprecated)
  /** @deprecated Use tools array instead. Whether this agent can edit files in its directories */
  canEdit?: boolean;
  /** @deprecated Use tools array instead. Whether this agent can read files outside its directories */
  canReadGlobally?: boolean;
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
 * Convert legacy boolean permissions to tools array
 */
export function legacyPermissionsToTools(
  canEdit?: boolean, 
  canReadGlobally?: boolean
): AgentTool[] {
  const tools: AgentTool[] = [AgentTool.READ_LOCAL, AgentTool.INTER_AGENT_COMMUNICATION];
  
  if (canEdit) {
    tools.push(
      AgentTool.EDIT_FILES,
      AgentTool.CREATE_FILES,
      AgentTool.DELETE_FILES,
      AgentTool.CREATE_DIRECTORIES
    );
  }
  
  if (canReadGlobally) {
    tools.push(AgentTool.READ_GLOBAL);
  }
  
  return tools;
}

/**
 * Normalize agent capability to ensure tools array is populated
 */
export function normalizeAgentCapability(agent: AgentCapability): AgentCapability {
  if (!agent.tools || agent.tools.length === 0) {
    // Convert legacy properties to tools
    agent.tools = legacyPermissionsToTools(agent.canEdit, agent.canReadGlobally);
  }
  
  return agent;
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
    // Legacy properties for backward compatibility (deprecated)
    /** @deprecated Use defaultTools instead. Allow global read access by default */
    allowGlobalRead?: boolean;
    /** @deprecated Use requireExplicitToolGrants instead. Require explicit permission for writes */
    requireExplicitWritePermission?: boolean;
  };
  /** Logging configuration */
  logging: {
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error';
    /** Whether to log inter-agent communications */
    logCommunications: boolean;
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
}