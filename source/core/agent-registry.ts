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
  FileAccessContext,
  AccessPatternResult,
  AccessPatternsConfig
} from './types.js';
import { OperationType } from './types.js';
import { 
  hasAgentToolForOperation,
  getToolsForOperation,
  createFileAccessContext
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

    const toolNames = agent.tools.map(tool => tool.name || tool.id).join(', ');
    console.log(`Agent registered: ${agent.id} (${agent.name}) with tools: [${toolNames}]`);
  }


  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: AgentId): boolean {
    if (this.agents.has(agentId)) {
      this.agents.delete(agentId);
      console.log(`Agent unregistered: ${agentId}`);
      return true;
    }

    return false;
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
   * Find the responsible agent for a given file path using tool-based access patterns
   */
  async findResponsibleAgent(filePath: FilePath, operation?: OperationType): Promise<AgentCapability | undefined> {
    return await this.findResponsibleAgentWithToolPatterns(filePath, operation);
  }

  /**
   * Find responsible agent using tool-based access patterns
   */
  private async findResponsibleAgentWithToolPatterns(
    filePath: FilePath, 
    operation?: OperationType
  ): Promise<AgentCapability | undefined> {
    const context = createFileAccessContext(
      filePath,
      operation || OperationType.READ_FILE,
      'system' // System is requesting to find responsible agent
    );

    let bestMatch: { agent: AgentCapability; result: AccessPatternResult } | undefined;

    for (const agent of this.agents.values()) {
      // Check if agent has tools that can handle this operation
      if (operation && !hasAgentToolForOperation(agent, operation)) {
        continue;
      }

      // Get tools that can handle this operation
      const capableTools = operation 
        ? getToolsForOperation(agent, operation)
        : agent.tools;

      // Check access for each capable tool
      for (const tool of capableTools) {
        try {
          const result = await tool.checkAccess(context);
          
          if (result.allowed) {
            const priority = (result.metadata?.priority as number) || 0;
            const currentPriority = (bestMatch?.result.metadata?.priority as number) || 0;
            
            if (!bestMatch || priority > currentPriority) {
              bestMatch = { agent, result };
            }
          }
        } catch (error) {
          console.warn(`Error checking tool access for ${tool.id}:`, error);
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

    // Check modern agents first
    for (const agent of this.agents.values()) {
      // Check if agent has a question endpoint
      const hasQuestionEndpoint = agent.endpoints.some(ep => ep.name === 'question');
      if (!hasQuestionEndpoint) {
        continue;
      }

      // Check if agent has communication tools
      const hasCommunicationTool = agent.tools.some(tool => tool.canHandle(OperationType.QUESTION));
      if (!hasCommunicationTool) {
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

    // TODO: Also check legacy agents and convert them
    // For now, we'll only return modern agents

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
    if (agent) {
      return this.checkModernAgentPermissions(agent, operation, filePath);
    }

    return {
      allowed: false,
      reason: `Agent ${agentId} not found`
    };
  }

  /**
   * Check permissions for agents with tool-based access
   */
  private checkModernAgentPermissions(
    agent: AgentCapability,
    operation: OperationType,
    filePath?: FilePath
  ): PermissionResult {
    // For non-file operations, check if agent has tools that can handle it
    if (!filePath) {
      const hasCapableTool = hasAgentToolForOperation(agent, operation);
      const capableTools = getToolsForOperation(agent, operation);
      
      return {
        allowed: hasCapableTool,
        reason: hasCapableTool ? undefined : `Agent ${agent.id} has no tools that can handle ${operation}`,
        requiredTool: capableTools[0],
        availableTools: agent.tools
      };
    }

    // For file operations, check if any tool can handle the operation
    const capableTools = getToolsForOperation(agent, operation);
    
    if (capableTools.length === 0) {
      return {
        allowed: false,
        reason: `Agent ${agent.id} has no tools that can handle ${operation}`,
        availableTools: agent.tools
      };
    }

    // For now, assume if agent has capable tools, it has permission
    // The actual access check will be done during execution
    return {
      allowed: true,
      requiredTool: capableTools[0],
      availableTools: agent.tools
    };
  }






  /**
   * Check if an agent can access a file
   */
  async checkAgentAccess(
    agentId: AgentId,
    filePath: FilePath,
    operation: OperationType
  ): Promise<AccessPatternResult> {
    const agent = this.getAgent(agentId);
    if (agent) {
      return this.checkModernAgentAccess(agent, filePath, operation);
    }

    return {
      allowed: false,
      reason: `Agent ${agentId} not found`,
      patternId: 'system'
    };
  }

  /**
   * Check access for agent using tool-based patterns
   */
  private async checkModernAgentAccess(
    agent: AgentCapability,
    filePath: FilePath,
    operation: OperationType
  ): Promise<AccessPatternResult> {
    const context = createFileAccessContext(filePath, operation, agent.id);
    
    // Get tools that can handle this operation
    const capableTools = getToolsForOperation(agent, operation);
    
    if (capableTools.length === 0) {
      return {
        allowed: false,
        reason: `Agent ${agent.id} has no tools that can handle ${operation}`,
        patternId: 'system'
      };
    }

    // Check access for each capable tool and return the best result
    let bestResult: AccessPatternResult | undefined;
    
    for (const tool of capableTools) {
      try {
        const result = await tool.checkAccess(context);
        
        if (result.allowed) {
          const priority = (result.metadata?.priority as number) || 0;
          const currentPriority = (bestResult?.metadata?.priority as number) || 0;
          
          if (!bestResult || priority > currentPriority) {
            bestResult = result;
          }
        }
      } catch (error) {
        console.warn(`Error checking tool access for ${tool.id}:`, error);
      }
    }

    return bestResult || {
      allowed: false,
      reason: 'No tools allow access to this resource',
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
    const index = this.globalPatterns.findIndex(pattern => pattern.id === patternId);

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
    agentsWithTools: number;
    globalPatterns: number;
    cacheStats: ReturnType<AccessPatternEvaluator['getCacheStats']>;
  } {
    const agents = Array.from(this.agents.values());
    
    return {
      totalAgents: agents.length,
      agentsWithTools: agents.filter(a => a.tools && a.tools.length > 0).length,
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
    
    // Validate tools (check that they implement the AgentTool interface)
    for (const tool of agent.tools) {
      if (!tool.id || !tool.name || typeof tool.canHandle !== 'function') {
        throw new Error(`Invalid tool: Tool must implement AgentTool interface with id, name, and canHandle method`);
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

    // TODO: Add sophisticated conflict detection for tool access patterns
    // This would involve evaluating tool patterns against common file paths to detect overlaps
  }


  /**
   * Normalize file path for consistent matching
   */
  private normalizePath(filePath: string): string {
    // Remove leading slash and normalize separators
    return filePath.replace(/^\/+/, '').replace(/\\/g, '/');
  }
}