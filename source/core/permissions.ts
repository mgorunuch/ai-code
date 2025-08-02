/**
 * Permission System for Directory-based Agent Access Control
 */

import type { 
  AgentId, 
  FilePath, 
  OperationType, 
  PermissionResult, 
  AgentCapability,
  AgentTool,
  AccessPatternResult,
  FileAccessContext
} from './types.js';
import { 
  hasAgentTool,
  getRequiredTool,
  AgentTool as AgentToolEnum,
  createFileAccessContext
} from './types.js';
import { AgentRegistry } from './agent-registry.js';

export interface PermissionRule {
  /** Rule ID */
  id: string;
  /** Rule description */
  description: string;
  /** Agent this rule applies to */
  agentId: AgentId;
  /** File pattern this rule applies to */
  filePattern: string;
  /** Operations this rule covers */
  operations: OperationType[];
  /** Tools this rule covers */
  tools?: AgentTool[];
  /** Whether this rule allows or denies access */
  allow: boolean;
  /** Priority of this rule (higher = more important) */
  priority: number;
}

export interface PermissionAuditLog {
  /** Timestamp of the check */
  timestamp: Date;
  /** Agent requesting permission */
  agentId: AgentId;
  /** Operation being requested */
  operation: OperationType;
  /** File path (if applicable) */
  filePath?: FilePath;
  /** Result of the permission check */
  result: PermissionResult;
  /** Applied rules */
  appliedRules: PermissionRule[];
}

export class PermissionSystem {
  private customRules: Map<string, PermissionRule> = new Map();
  private auditLog: PermissionAuditLog[] = [];
  private enableAuditLogging: boolean = true;

  constructor(private agentRegistry: AgentRegistry) {}

  /**
   * Check if an agent has permission to perform an operation (synchronous version for backward compatibility)
   */
  checkPermission(
    agentId: AgentId,
    operation: OperationType,
    filePath?: FilePath
  ): PermissionResult {
    // For synchronous calls, use legacy system
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      return this.logAndReturn({
        allowed: false,
        reason: `Agent ${agentId} not found`
      }, agentId, operation, filePath, []);
    }

    const registryResult = this.agentRegistry.checkPermissions(agentId, operation, filePath);
    
    // Check custom rules
    if (filePath) {
      const customResult = this.checkCustomRules(agentId, operation, filePath);
      if (customResult.overrideResult) {
        return this.logAndReturn(
          customResult.overrideResult,
          agentId,
          operation,
          filePath,
          customResult.appliedRules
        );
      }
    }

    return this.logAndReturn(registryResult, agentId, operation, filePath, []);
  }

  /**
   * Check if an agent has permission to perform an operation (asynchronous version with access patterns)
   */
  async checkPermissionAsync(
    agentId: AgentId,
    operation: OperationType,
    filePath?: FilePath
  ): Promise<PermissionResult> {
    const startTime = Date.now();

    // Get the agent
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      return this.logAndReturn({
        allowed: false,
        reason: `Agent ${agentId} not found`
      }, agentId, operation, filePath, []);
    }

    // For operations that don't involve files, use legacy permission checking
    if (!filePath) {
      const registryResult = this.agentRegistry.checkPermissions(agentId, operation, filePath);
      return this.logAndReturn(registryResult, agentId, operation, filePath, []);
    }

    // Try the new access patterns system first
    try {
      const accessResult = await this.agentRegistry.checkAgentAccess(agentId, filePath, operation);
      
      // Convert access pattern result to permission result
      let permissionResult: PermissionResult = {
        allowed: accessResult.allowed,
        reason: accessResult.reason,
        requiredTool: getRequiredTool(operation, filePath),
        availableTools: agent.tools
      };

      // If access patterns deny, check custom rules for overrides
      if (!accessResult.allowed) {
        const customResult = this.checkCustomRules(agentId, operation, filePath);
        if (customResult.overrideResult) {
          permissionResult = customResult.overrideResult;
          return this.logAndReturn(
            permissionResult,
            agentId,
            operation,
            filePath,
            customResult.appliedRules
          );
        }
      }

      // If access patterns allow, check custom rules for denials
      if (accessResult.allowed) {
        const customResult = this.checkCustomRules(agentId, operation, filePath);
        if (customResult.overrideResult && !customResult.overrideResult.allowed) {
          permissionResult = customResult.overrideResult;
          return this.logAndReturn(
            permissionResult,
            agentId,
            operation,
            filePath,
            customResult.appliedRules
          );
        }
      }

      // Check if agent has the required tools even if access patterns allow
      const requiredTool = getRequiredTool(operation, filePath);
      if (!hasAgentTool(agent, requiredTool)) {
        permissionResult = {
          allowed: false,
          reason: `Agent ${agentId} lacks required tool: ${requiredTool}`,
          requiredTool,
          availableTools: agent.tools
        };
      }

      return this.logAndReturn(permissionResult, agentId, operation, filePath, []);

    } catch (error) {
      // Fallback to legacy system if access patterns fail
      console.warn(`Access patterns failed for ${agentId}:${operation}:${filePath}, falling back to legacy system:`, error);
      const registryResult = this.agentRegistry.checkPermissions(agentId, operation, filePath);
      
      // Still check custom rules for legacy fallback
      const customResult = this.checkCustomRules(agentId, operation, filePath);
      if (customResult.overrideResult) {
        return this.logAndReturn(
          customResult.overrideResult,
          agentId,
          operation,
          filePath,
          customResult.appliedRules
        );
      }

      return this.logAndReturn(registryResult, agentId, operation, filePath, []);
    }
  }

  /**
   * Add a custom permission rule
   */
  addPermissionRule(rule: PermissionRule): void {
    // Validate the rule
    this.validateRule(rule);

    // Check if agent exists
    if (!this.agentRegistry.getAgent(rule.agentId)) {
      throw new Error(`Cannot add rule for non-existent agent: ${rule.agentId}`);
    }

    this.customRules.set(rule.id, rule);
    console.log(`Permission rule added: ${rule.id} for agent ${rule.agentId}`);
  }

  /**
   * Remove a custom permission rule
   */
  removePermissionRule(ruleId: string): boolean {
    const removed = this.customRules.delete(ruleId);
    if (removed) {
      console.log(`Permission rule removed: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Get all custom permission rules
   */
  getPermissionRules(agentId?: AgentId): PermissionRule[] {
    const rules = Array.from(this.customRules.values());
    
    if (agentId) {
      return rules.filter(rule => rule.agentId === agentId);
    }

    return rules;
  }

  /**
   * Check if an agent can access any files in a directory
   */
  checkDirectoryAccess(
    agentId: AgentId,
    directoryPath: string,
    operation: OperationType
  ): PermissionResult {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      return {
        allowed: false,
        reason: `Agent ${agentId} not found`
      };
    }

    // Check if agent has required tools for this operation
    const requiredTool = getRequiredTool(operation, directoryPath);
    if (hasAgentTool(agent, requiredTool)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `Agent ${agentId} does not have ${operation} access to directory ${directoryPath}`
    };
  }

  /**
   * Get effective permissions for an agent
   */
  getEffectivePermissions(agentId: AgentId): {
    tools: AgentTool[];
    customRules: PermissionRule[];
  } {
    const agent = this.agentRegistry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    return {
      tools: agent.tools,
      customRules: this.getPermissionRules(agentId),
    };
  }

  /**
   * Enable or disable audit logging
   */
  setAuditLogging(enabled: boolean): void {
    this.enableAuditLogging = enabled;
    console.log(`Audit logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get audit log entries
   */
  getAuditLog(agentId?: AgentId, limit?: number): PermissionAuditLog[] {
    let logs = Array.from(this.auditLog);

    if (agentId) {
      logs = logs.filter(log => log.agentId === agentId);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
    console.log('Audit log cleared');
  }

  /**
   * Get access pattern statistics from the agent registry
   */
  getAccessPatternStats() {
    return this.agentRegistry.getAccessPatternStats();
  }

  /**
   * Test an access pattern against a specific context
   */
  async testAccessPattern(
    agentId: AgentId,
    filePath: FilePath,
    operation: OperationType
  ): Promise<{
    accessPatternResult: AccessPatternResult;
    permissionResult: PermissionResult;
    customRulesApplied: PermissionRule[];
  }> {
    const accessResult = await this.agentRegistry.checkAgentAccess(agentId, filePath, operation);
    const permissionResult = await this.checkPermissionAsync(agentId, operation, filePath);
    const customResult = this.checkCustomRules(agentId, operation, filePath);

    return {
      accessPatternResult: accessResult,
      permissionResult,
      customRulesApplied: customResult.appliedRules
    };
  }

  /**
   * Check custom rules for overrides
   */
  private checkCustomRules(
    agentId: AgentId,
    operation: OperationType,
    filePath: FilePath
  ): { overrideResult?: PermissionResult; appliedRules: PermissionRule[] } {
    const applicableRules = this.getApplicableRules(agentId, operation, filePath);
    
    if (applicableRules.length === 0) {
      return { appliedRules: [] };
    }

    // Sort by priority (highest first)
    const sortedRules = applicableRules.sort((a, b) => b.priority - a.priority);
    
    // Apply the highest priority rule
    const topRule = sortedRules[0];
    const requiredTool = getRequiredTool(operation, filePath);
    
    return {
      overrideResult: {
        allowed: topRule.allow,
        reason: topRule.allow 
          ? `Allowed by custom rule: ${topRule.description}`
          : `Denied by custom rule: ${topRule.description}`,
        requiredTool
      },
      appliedRules: [topRule]
    };
  }

  /**
   * Get applicable rules for a request
   */
  private getApplicableRules(
    agentId: AgentId,
    operation: OperationType,
    filePath: FilePath
  ): PermissionRule[] {
    const rules: PermissionRule[] = [];
    const requiredTool = getRequiredTool(operation, filePath);

    for (const rule of this.customRules.values()) {
      // Check if rule applies to this agent
      if (rule.agentId !== agentId && rule.agentId !== '*') {
        continue;
      }

      // Check if rule applies to this operation
      if (!rule.operations.includes(operation)) {
        continue;
      }
      
      // Check if rule applies to this tool (if tools are specified)
      if (rule.tools && rule.tools.length > 0 && !rule.tools.includes(requiredTool)) {
        continue;
      }

      // Check if rule applies to this file pattern
      const normalizedPath = filePath.replace(/^\/+/, '').replace(/\\/g, '/');
      if (this.matchesPattern(normalizedPath, rule.filePattern)) {
        rules.push(rule);
      }
    }

    return rules;
  }

  /**
   * Check if a file path matches a pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Validate a permission rule
   */
  private validateRule(rule: PermissionRule): void {
    if (!rule.id || typeof rule.id !== 'string') {
      throw new Error('Rule must have a valid string ID');
    }

    if (!rule.agentId || typeof rule.agentId !== 'string') {
      throw new Error('Rule must have a valid agent ID');
    }

    if (!rule.filePattern || typeof rule.filePattern !== 'string') {
      throw new Error('Rule must have a valid file pattern');
    }

    if (!Array.isArray(rule.operations) || rule.operations.length === 0) {
      throw new Error('Rule must specify at least one operation');
    }
    
    // Validate tools if specified
    if (rule.tools && Array.isArray(rule.tools)) {
      for (const tool of rule.tools) {
        if (!Object.values(AgentToolEnum).includes(tool)) {
          throw new Error(`Invalid tool: ${tool}. Must be one of: ${Object.values(AgentToolEnum).join(', ')}`);
        }
      }
    }

    if (typeof rule.allow !== 'boolean') {
      throw new Error('Rule must specify whether it allows or denies access');
    }

    if (typeof rule.priority !== 'number') {
      throw new Error('Rule must have a numeric priority');
    }
  }

  /**
   * Log permission check and return result
   */
  private logAndReturn(
    result: PermissionResult,
    agentId: AgentId,
    operation: OperationType,
    filePath: FilePath | undefined,
    appliedRules: PermissionRule[]
  ): PermissionResult {
    if (this.enableAuditLogging) {
      const logEntry: PermissionAuditLog = {
        timestamp: new Date(),
        agentId,
        operation,
        filePath,
        result,
        appliedRules
      };

      this.auditLog.push(logEntry);

      // Keep only the last 1000 entries to prevent memory issues
      if (this.auditLog.length > 1000) {
        this.auditLog = this.auditLog.slice(-1000);
      }
    }

    return result;
  }
}