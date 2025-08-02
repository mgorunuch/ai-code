/**
 * Agent Registry - Manages agent registration and capability discovery
 */

import { minimatch } from 'minimatch';
import type { 
  AgentCapability, 
  AgentId, 
  FilePath,
  PermissionResult,
  AgentTool,
  AccessPattern,
  AccessContext,
  AccessPatternResult,
  AccessPatternsConfig
} from './types.js';
import { OperationType, AccessPatternClass } from './types.js';
import { 
  hasAgentTool,
  getRequiredTool,
  AgentTool as AgentToolEnum,
  createAccessContext
} from './types.js';
import { AccessPatternEvaluator } from './access-pattern-evaluator.js';

export class AgentRegistry {
  private agents: Map<AgentId, AgentCapability> = new Map();
  private accessPatternEvaluator: AccessPatternEvaluator;
  private accessPatternsConfig: AccessPatternsConfig;
  private globalPatterns: AccessPattern[] = [];

  constructor(accessPatternsConfig?: AccessPatternsConfig) {
    this.accessPatternsConfig = {
      enabled: true,
      enableCaching: true,
      maxCacheSize: 1000,
      ...accessPatternsConfig
    };

    this.accessPatternEvaluator = new AccessPatternEvaluator({
      enableCaching: this.accessPatternsConfig.enableCaching,
      maxCacheSize: this.accessPatternsConfig.maxCacheSize
    });

    if (this.accessPatternsConfig.globalPatterns) {
      this.globalPatterns = this.accessPatternsConfig.globalPatterns;
    }
  }

  /**
   * Register a new agent with its capabilities
   */
  registerAgent(agent: AgentCapability): void {
    // Validate agent configuration
    this.validateAgentConfig(agent);

    // Check for conflicts with existing agents
    this.checkForConflicts(agent);

    // Register the agent
    this.agents.set(agent.id, agent);

    const patternsInfo = this.getAgentPatternsInfo(agent);
    console.log(`Agent registered: ${agent.id} (${agent.name}) with tools: [${agent.tools.join(', ')}] and ${patternsInfo}`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: AgentId): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
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
   * Find the responsible agent for a given file path using access patterns
   */
  async findResponsibleAgent(filePath: FilePath, operation?: OperationType): Promise<AgentCapability | undefined> {
    return this.findResponsibleAgentWithAccessPatterns(filePath, operation);
  }

  /**
   * Find responsible agent using the new access patterns system
   */
  async findResponsibleAgentWithAccessPatterns(
    filePath: FilePath, 
    operation?: OperationType
  ): Promise<AgentCapability | undefined> {
    const context = createAccessContext(
      filePath,
      operation || OperationType.READ_FILE,
      'system' // System is requesting to find responsible agent
    );

    let bestMatch: { agent: AgentCapability; result: AccessPatternResult } | undefined;

    for (const agent of this.agents.values()) {
      const patterns = this.getEffectiveAccessPatterns(agent);
      const results = await this.accessPatternEvaluator.evaluatePatterns(patterns, context);
      
      // Find the best matching result for this agent
      const bestResult = this.accessPatternEvaluator.getBestMatch(results.filter(r => r.allowed));
      
      if (bestResult) {
        const priority = (bestResult.metadata?.priority as number) || 0;
        const currentPriority = (bestMatch?.result.metadata?.priority as number) || 0;
        
        if (!bestMatch || priority > currentPriority) {
          bestMatch = { agent, result: bestResult };
        }
      }
    }

    return bestMatch?.agent;
  }


  /**
   * Find agents that can answer questions about a given domain
   */
  async findQuestionAgents(context?: { filePaths?: FilePath[]; domain?: string }): Promise<AgentCapability[]> {
    const questionAgents: AgentCapability[] = [];

    for (const agent of this.agents.values()) {
      // Check if agent has a question endpoint
      const hasQuestionEndpoint = agent.endpoints.some(ep => ep.name === 'question');
      if (!hasQuestionEndpoint) {
        continue;
      }

      // If file paths provided, check if agent is responsible for any of them
      if (context?.filePaths && context.filePaths.length > 0) {
        // Check asynchronously for each file path
        let hasRelevantFiles = false;
        for (const filePath of context.filePaths) {
          const responsibleAgent = await this.findResponsibleAgent(filePath);
          if (responsibleAgent?.id === agent.id) {
            hasRelevantFiles = true;
            break;
          }
        }
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

    // For permission checking, we need to handle this differently since findResponsibleAgent is now async
    // For now, we'll use a simpler approach
    const requiredTool = getRequiredTool(operation, filePath, false);
    
    // Check if agent has the required tool
    const hasRequiredTool = hasAgentTool(agent, requiredTool);
    
    // Special case for read operations
    if (operation === OperationType.READ_FILE) {
      // Agent can read files with READ_LOCAL tool
      if (hasAgentTool(agent, AgentToolEnum.READ_LOCAL)) {
        return { 
          allowed: true, 
          requiredTool: AgentToolEnum.READ_LOCAL,
          availableTools: agent.tools
        };
      }
      
      // Agent can read globally if it has read_global tool
      if (hasAgentTool(agent, AgentToolEnum.READ_GLOBAL)) {
        return { 
          allowed: true, 
          requiredTool: AgentToolEnum.READ_GLOBAL,
          availableTools: agent.tools
        };
      }

      return {
        allowed: false,
        reason: `Agent ${agentId} lacks required tool for reading ${filePath}. Required: ${requiredTool}`,
        requiredTool,
        availableTools: agent.tools
      };
    }

    // Check write permissions (includes edit, delete, create)
    if ([OperationType.WRITE_FILE, OperationType.EDIT_FILE, OperationType.DELETE_FILE].includes(operation)) {
      // Check if agent has required tool
      if (hasRequiredTool) {
        return { 
          allowed: true, 
          requiredTool,
          availableTools: agent.tools
        };
      }

      return {
        allowed: false,
        reason: `Agent ${agentId} lacks required tool for ${filePath}. Required: ${requiredTool}`,
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
   * Get effective access patterns for an agent (including global patterns)
   */
  private getEffectiveAccessPatterns(agent: AgentCapability): AccessPattern[] {
    const patterns: AccessPattern[] = [];

    // Add global patterns first (lower priority)
    patterns.push(...this.globalPatterns);

    // Add agent-specific patterns
    patterns.push(...agent.accessPatterns);

    return patterns;
  }

  /**
   * Get human-readable info about agent patterns
   */
  private getAgentPatternsInfo(agent: AgentCapability): string {
    const accessCount = agent.accessPatterns.length;
    const types = new Set(agent.accessPatterns.map(p => {
      if (typeof p === 'function') return 'function';
      if (p instanceof AccessPatternClass) return 'class';
      return 'object';
    }));
    return `${accessCount} access patterns (${Array.from(types).join(', ')})`;
  }

  /**
   * Check if an agent can access a file with the new access patterns system
   */
  async checkAgentAccess(
    agentId: AgentId,
    filePath: FilePath,
    operation: OperationType
  ): Promise<AccessPatternResult> {
    const agent = this.getAgent(agentId);
    if (!agent) {
      return {
        allowed: false,
        reason: `Agent ${agentId} not found`,
        patternId: 'system'
      };
    }

    const context = createAccessContext(filePath, operation, agentId);
    const patterns = this.getEffectiveAccessPatterns(agent);
    
    if (patterns.length === 0) {
      return {
        allowed: false,
        reason: `No access patterns defined for agent ${agentId}`,
        patternId: 'system'
      };
    }

    const results = await this.accessPatternEvaluator.evaluatePatterns(patterns, context);
    const bestMatch = this.accessPatternEvaluator.getBestMatch(results);

    return bestMatch || {
      allowed: false,
      reason: 'No matching access patterns found',
      patternId: 'system'
    };
  }

  /**
   * Add a global access pattern
   */
  addGlobalPattern(pattern: AccessPattern): void {
    this.globalPatterns.push(pattern);
  }

  /**
   * Remove a global access pattern
   */
  removeGlobalPattern(patternId: string): boolean {
    const index = this.globalPatterns.findIndex(pattern => {
      if (typeof pattern === 'function') return false;
      if (pattern instanceof AccessPatternClass) return pattern.id === patternId;
      return pattern.id === patternId;
    });

    if (index >= 0) {
      this.globalPatterns.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Get access pattern statistics
   */
  getAccessPatternStats(): {
    totalAgents: number;
    agentsWithAccessPatterns: number;
    globalPatterns: number;
    cacheStats: ReturnType<AccessPatternEvaluator['getCacheStats']>;
  } {
    const agents = Array.from(this.agents.values());
    
    return {
      totalAgents: agents.length,
      agentsWithAccessPatterns: agents.filter(a => a.accessPatterns && a.accessPatterns.length > 0).length,
      globalPatterns: this.globalPatterns.length,
      cacheStats: this.accessPatternEvaluator.getCacheStats()
    };
  }

  /**
   * Update access patterns configuration
   */
  updateAccessPatternsConfig(config: Partial<AccessPatternsConfig>): void {
    this.accessPatternsConfig = { ...this.accessPatternsConfig, ...config };
    
    // Update evaluator if caching settings changed
    if (config.enableCaching !== undefined || config.maxCacheSize !== undefined) {
      this.accessPatternEvaluator = new AccessPatternEvaluator({
        enableCaching: this.accessPatternsConfig.enableCaching,
        maxCacheSize: this.accessPatternsConfig.maxCacheSize
      });
    }
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

    // Validate that agent has accessPatterns
    if (!Array.isArray(agent.accessPatterns) || agent.accessPatterns.length === 0) {
      throw new Error('Agent must have at least one access pattern');
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

    // TODO: Add sophisticated conflict detection for access patterns
    // This would involve evaluating patterns against common file paths to detect overlaps
  }


  /**
   * Normalize file path for consistent matching
   */
  private normalizePath(filePath: string): string {
    // Remove leading slash and normalize separators
    return filePath.replace(/^\/+/, '').replace(/\\/g, '/');
  }
}