/**
 * Agent Registry - Manages agent registration and capability discovery
 */

import { minimatch } from 'minimatch';
import type { 
  AgentCapability, 
  AgentId, 
  DirectoryPattern, 
  FilePath,
  PermissionResult,
  OperationType,
  AgentTool
} from './types.js';
import { 
  normalizeAgentCapability,
  hasAgentTool,
  getRequiredTool,
  AgentTool as AgentToolEnum
} from './types.js';

export class AgentRegistry {
  private agents: Map<AgentId, AgentCapability> = new Map();
  private directoryMappings: Map<DirectoryPattern, AgentId> = new Map();

  /**
   * Register a new agent with its capabilities
   */
  registerAgent(agent: AgentCapability): void {
    // Normalize agent to ensure tools array is populated
    const normalizedAgent = normalizeAgentCapability(agent);
    
    // Validate agent configuration
    this.validateAgentConfig(normalizedAgent);

    // Check for conflicts with existing agents
    this.checkForConflicts(normalizedAgent);

    // Register the agent
    this.agents.set(normalizedAgent.id, normalizedAgent);

    // Update directory mappings
    for (const pattern of normalizedAgent.directoryPatterns) {
      this.directoryMappings.set(pattern, normalizedAgent.id);
    }

    console.log(`Agent registered: ${normalizedAgent.id} (${normalizedAgent.name}) with tools: [${normalizedAgent.tools.join(', ')}]`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: AgentId): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Remove directory mappings
    for (const pattern of agent.directoryPatterns) {
      this.directoryMappings.delete(pattern);
    }

    // Remove agent
    this.agents.delete(agentId);

    console.log(`Agent unregistered: ${agentId}`);
    return true;
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: AgentId): AgentCapability | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentCapability[] {
    return Array.from(this.agents.values());
  }

  /**
   * Find the responsible agent for a given file path
   */
  findResponsibleAgent(filePath: FilePath): AgentCapability | undefined {
    // Normalize the file path
    const normalizedPath = this.normalizePath(filePath);

    // Find the most specific pattern match
    let bestMatch: { agent: AgentCapability; specificity: number } | undefined;

    for (const agent of this.agents.values()) {
      for (const pattern of agent.directoryPatterns) {
        if (minimatch(normalizedPath, pattern)) {
          const specificity = this.calculatePatternSpecificity(pattern);
          
          if (!bestMatch || specificity > bestMatch.specificity) {
            bestMatch = { agent, specificity };
          }
        }
      }
    }

    return bestMatch?.agent;
  }

  /**
   * Find agents that can answer questions about a given domain
   */
  findQuestionAgents(context?: { filePaths?: FilePath[]; domain?: string }): AgentCapability[] {
    const questionAgents: AgentCapability[] = [];

    for (const agent of this.agents.values()) {
      // Check if agent has a question endpoint
      const hasQuestionEndpoint = agent.endpoints.some(ep => ep.name === 'question');
      if (!hasQuestionEndpoint) {
        continue;
      }

      // If file paths provided, check if agent is responsible for any of them
      if (context?.filePaths && context.filePaths.length > 0) {
        const hasRelevantFiles = context.filePaths.some(filePath => 
          this.findResponsibleAgent(filePath)?.id === agent.id
        );
        if (hasRelevantFiles) {
          questionAgents.push(agent);
        }
      } else {
        // No specific context, include all agents with question endpoints
        questionAgents.push(agent);
      }
    }

    return questionAgents;
  }

  /**
   * Check permissions for an operation
   */
  checkPermissions(
    agentId: AgentId, 
    operation: OperationType, 
    filePath?: FilePath
  ): PermissionResult {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        allowed: false,
        reason: `Agent ${agentId} not found`
      };
    }

    // For non-file operations, check if agent has communication tool
    if (!filePath) {
      const requiredTool = getRequiredTool(operation);
      const hasRequiredTool = hasAgentTool(agent, requiredTool);
      
      return {
        allowed: hasRequiredTool,
        reason: hasRequiredTool ? undefined : `Agent ${agentId} lacks required tool: ${requiredTool}`,
        requiredTool,
        availableTools: agent.tools
      };
    }

    const responsibleAgent = this.findResponsibleAgent(filePath);
    const isResponsibleAgent = responsibleAgent?.id === agentId;
    const isGlobalAccess = !isResponsibleAgent;
    const requiredTool = getRequiredTool(operation, filePath, isGlobalAccess);
    
    // Check if agent has the required tool
    const hasRequiredTool = hasAgentTool(agent, requiredTool);
    
    // Special case for read operations
    if (operation === OperationType.READ_FILE) {
      // Agent can read its own files with READ_LOCAL tool
      if (isResponsibleAgent && hasAgentTool(agent, AgentToolEnum.READ_LOCAL)) {
        return { 
          allowed: true, 
          responsibleAgent,
          requiredTool: AgentToolEnum.READ_LOCAL,
          availableTools: agent.tools
        };
      }
      
      // Agent can read globally if it has read_global tool
      if (hasAgentTool(agent, AgentToolEnum.READ_GLOBAL)) {
        return { 
          allowed: true, 
          responsibleAgent,
          requiredTool: AgentToolEnum.READ_GLOBAL,
          availableTools: agent.tools
        };
      }

      return {
        allowed: false,
        reason: `Agent ${agentId} lacks required tool for reading ${filePath}. Required: ${requiredTool}`,
        responsibleAgent,
        requiredTool,
        availableTools: agent.tools
      };
    }

    // Check write permissions (includes edit, delete, create)
    if ([OperationType.WRITE_FILE, OperationType.EDIT_FILE, OperationType.DELETE_FILE].includes(operation)) {
      // Only the responsible agent can perform write operations
      if (isResponsibleAgent && hasRequiredTool) {
        return { 
          allowed: true, 
          responsibleAgent,
          requiredTool,
          availableTools: agent.tools
        };
      }

      // If no responsible agent, check if this agent has required tool and matches patterns
      if (!responsibleAgent) {
        const normalizedPath = this.normalizePath(filePath);
        const matchesPattern = agent.directoryPatterns.some(pattern => 
          minimatch(normalizedPath, pattern)
        );
        
        if (matchesPattern && hasRequiredTool) {
          return { 
            allowed: true, 
            responsibleAgent: agent,
            requiredTool,
            availableTools: agent.tools
          };
        }
      }

      return {
        allowed: false,
        reason: `Agent ${agentId} lacks required tool or responsibility for ${filePath}. Required: ${requiredTool}, Responsible agent: ${responsibleAgent?.id || 'none'}`,
        responsibleAgent,
        requiredTool,
        availableTools: agent.tools
      };
    }

    // For other operations, just check if agent has required tool
    return {
      allowed: hasRequiredTool,
      reason: hasRequiredTool ? undefined : `Agent ${agentId} lacks required tool: ${requiredTool}`,
      requiredTool,
      availableTools: agent.tools
    };
  }

  /**
   * Get agents by directory pattern
   */
  getAgentsByPattern(pattern: DirectoryPattern): AgentCapability[] {
    const agents: AgentCapability[] = [];
    
    for (const agent of this.agents.values()) {
      if (agent.directoryPatterns.includes(pattern)) {
        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * Validate agent configuration
   */
  private validateAgentConfig(agent: AgentCapability): void {
    if (!agent.id || typeof agent.id !== 'string') {
      throw new Error('Agent must have a valid string ID');
    }

    if (!agent.name || typeof agent.name !== 'string') {
      throw new Error('Agent must have a valid string name');
    }

    if (!Array.isArray(agent.directoryPatterns) || agent.directoryPatterns.length === 0) {
      throw new Error('Agent must have at least one directory pattern');
    }

    if (!Array.isArray(agent.endpoints)) {
      throw new Error('Agent must have an endpoints array');
    }

    if (!Array.isArray(agent.tools) || agent.tools.length === 0) {
      throw new Error('Agent must have at least one tool');
    }

    // Validate endpoints
    for (const endpoint of agent.endpoints) {
      if (!endpoint.name || typeof endpoint.name !== 'string') {
        throw new Error('All agent endpoints must have a valid name');
      }
    }
    
    // Validate tools
    for (const tool of agent.tools) {
      if (!Object.values(AgentToolEnum).includes(tool)) {
        throw new Error(`Invalid tool: ${tool}. Must be one of: ${Object.values(AgentToolEnum).join(', ')}`);
      }
    }
  }

  /**
   * Check for conflicts with existing agents
   */
  private checkForConflicts(newAgent: AgentCapability): void {
    if (this.agents.has(newAgent.id)) {
      throw new Error(`Agent with ID ${newAgent.id} already exists`);
    }

    // Check for overlapping directory patterns that could cause conflicts
    for (const pattern of newAgent.directoryPatterns) {
      for (const existingAgent of this.agents.values()) {
        for (const existingPattern of existingAgent.directoryPatterns) {
          if (this.patternsOverlap(pattern, existingPattern)) {
            console.warn(
              `Warning: Directory pattern conflict between ${newAgent.id} (${pattern}) and ${existingAgent.id} (${existingPattern})`
            );
          }
        }
      }
    }
  }

  /**
   * Check if two patterns overlap
   */
  private patternsOverlap(pattern1: string, pattern2: string): boolean {
    // Simple overlap detection - could be enhanced
    return pattern1 === pattern2 || 
           pattern1.includes(pattern2) || 
           pattern2.includes(pattern1);
  }

  /**
   * Calculate pattern specificity (higher = more specific)
   */
  private calculatePatternSpecificity(pattern: string): number {
    let specificity = 0;
    
    // More path segments = more specific
    specificity += pattern.split('/').length;
    
    // Fewer wildcards = more specific
    const wildcards = (pattern.match(/\*/g) || []).length;
    specificity -= wildcards;
    
    // Exact matches = more specific
    if (!pattern.includes('*') && !pattern.includes('?')) {
      specificity += 10;
    }

    return specificity;
  }

  /**
   * Normalize file path for consistent matching
   */
  private normalizePath(filePath: string): string {
    // Remove leading slash and normalize separators
    return filePath.replace(/^\/+/, '').replace(/\\/g, '/');
  }
}