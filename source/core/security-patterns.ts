/**
 * Security validation patterns and checks for agent configurations
 * 
 * This module provides comprehensive security validation patterns that can be
 * applied to agent configurations to ensure safe operation.
 */

import { FileSystemAccessPattern } from './access-patterns.js';
import { AccessPattern, AccessPatternResult, FileAccessContext } from './types.js';
import type { SecurityCheck, SecurityAuditLog } from './configuration-types.js';
import type { AgentId, OperationType } from './types.js';
import { minimatch } from 'minimatch';

/**
 * Security violation types
 */
export enum SecurityViolationType {
  PATH_TRAVERSAL = 'path_traversal',
  SYSTEM_FILE_ACCESS = 'system_file_access',
  CREDENTIAL_ACCESS = 'credential_access',
  EXECUTABLE_ACCESS = 'executable_access',
  NETWORK_CONFIG_ACCESS = 'network_config_access',
  UNSAFE_OPERATION = 'unsafe_operation',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_PATTERN = 'suspicious_pattern'
}

/**
 * Security level for violations
 */
export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Base security access pattern that applies security checks
 */
export class SecurityValidatedAccessPattern extends AccessPattern<FileAccessContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private allowedPaths: string[],
    private securityChecks: SecurityCheck[],
    private allow: boolean = true
  ) {
    super();
  }

  async appliesTo(context: FileAccessContext): Promise<boolean> {
    return this.allowedPaths.some(pattern => 
      minimatch(context.filePath, pattern)
    );
  }

  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    // First check basic path validation
    const pathAllowed = this.allowedPaths.some(pattern => 
      minimatch(context.filePath, pattern)
    );
    
    if (!pathAllowed) {
      return {
        allowed: false,
        reason: 'File path not in allowed patterns',
        patternId: this.id,
        metadata: { securityLevel: SecurityLevel.MEDIUM }
      };
    }
    
    // Run security checks
    for (const check of this.securityChecks) {
      const result = await check.validate(context);
      if (!result.passed) {
        return {
          allowed: false,
          reason: result.reason || 'Security check failed',
          patternId: this.id,
          metadata: { 
            securityViolation: result.type,
            securityLevel: SecurityLevel.HIGH
          }
        };
      }
    }
    
    return {
      allowed: this.allow,
      reason: this.allow ? 'Security validation passed' : 'Access denied by security policy',
      patternId: this.id,
      metadata: { securityValidated: true }
    };
  }
}

/**
 * Path traversal prevention check
 */
export const pathTraversalCheck: SecurityCheck = {
  async validate(context: FileAccessContext) {
    const normalizedPath = context.filePath.replace(/\\/g, '/');
    
    // Check for path traversal patterns
    const dangerousPatterns = [
      '../',
      '..\\',
      '..%2f',
      '..%5c',
      '%2e%2e%2f',
      '%2e%2e%5c'
    ];
    
    for (const pattern of dangerousPatterns) {
      if (normalizedPath.includes(pattern)) {
        return {
          passed: false,
          reason: 'Path traversal attempt detected',
          type: SecurityViolationType.PATH_TRAVERSAL
        };
      }
    }
    
    return { passed: true };
  }
};

/**
 * System file protection check
 */
export const systemFileProtectionCheck: SecurityCheck = {
  async validate(context: FileAccessContext) {
    const normalizedPath = context.filePath.toLowerCase().replace(/\\/g, '/');
    
    // System directories that should be protected
    const systemPaths = [
      '/etc/',
      '/usr/',
      '/var/',
      '/sys/',
      '/proc/',
      '/dev/',
      '/boot/',
      '/root/',
      'c:/windows/',
      'c:/program files/',
      'c:/programdata/',
      '/system/',
      '/library/',
      '/applications/',
      '/users/shared/'
    ];
    
    for (const systemPath of systemPaths) {
      if (normalizedPath.startsWith(systemPath)) {
        return {
          passed: false,
          reason: `Access to system directory denied: ${systemPath}`,
          type: SecurityViolationType.SYSTEM_FILE_ACCESS
        };
      }
    }
    
    return { passed: true };
  }
};

/**
 * Credential and secret file protection check
 */
export const credentialProtectionCheck: SecurityCheck = {
  async validate(context: FileAccessContext) {
    const fileName = context.filePath.toLowerCase();
    
    // Patterns that might contain credentials
    const credentialPatterns = [
      '**/.env*',
      '**/secrets/**',
      '**/*key*',
      '**/*token*',
      '**/*password*',
      '**/*credential*',
      '**/.ssh/**',
      '**/*.pem',
      '**/*.p12',
      '**/*.pfx',
      '**/id_rsa*',
      '**/id_dsa*',
      '**/id_ecdsa*',
      '**/known_hosts',
      '**/authorized_keys',
      '**/.aws/**',
      '**/.azure/**',
      '**/.gcp/**',
      '**/config.json',
      '**/credentials.json'
    ];
    
    const isCredentialFile = credentialPatterns.some(pattern => 
      minimatch(fileName, pattern)
    );
    
    if (isCredentialFile) {
      // Allow read access but restrict write/delete operations
      if (context.operation === OperationType.EDIT_FILE || 
          context.operation === OperationType.DELETE_FILE ||
          context.operation === OperationType.WRITE_FILE) {
        return {
          passed: false,
          reason: 'Write/delete access to credential files denied',
          type: SecurityViolationType.CREDENTIAL_ACCESS
        };
      }
      
      // Log read access for audit
      console.warn(`Security audit: Agent ${context.agentId} reading potential credential file: ${context.filePath}`);
    }
    
    return { passed: true };
  }
};

/**
 * Executable file protection check
 */
export const executableProtectionCheck: SecurityCheck = {
  async validate(context: FileAccessContext) {
    const fileName = context.filePath.toLowerCase();
    
    // Executable file extensions
    const executableExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.scr', '.pif',
      '.sh', '.bash', '.zsh', '.fish', '.csh', '.tcsh',
      '.ps1', '.psm1', '.psd1',
      '.app', '.dmg', '.pkg',
      '.deb', '.rpm', '.snap',
      '.jar', '.war', '.ear'
    ];
    
    const isExecutable = executableExtensions.some(ext => fileName.endsWith(ext));
    
    if (isExecutable && context.operation === OperationType.EXECUTE_COMMANDS) {
      return {
        passed: false,
        reason: 'Direct execution of files not allowed',
        type: SecurityViolationType.EXECUTABLE_ACCESS
      };
    }
    
    return { passed: true };
  }
};

/**
 * Node modules protection check
 */
export const nodeModulesProtectionCheck: SecurityCheck = {
  async validate(context: FileAccessContext) {
    if (context.filePath.includes('node_modules')) {
      // Allow read access but restrict modifications
      if (context.operation === OperationType.EDIT_FILE || 
          context.operation === OperationType.DELETE_FILE ||
          context.operation === OperationType.WRITE_FILE) {
        return {
          passed: false,
          reason: 'Modification of node_modules directory denied',
          type: SecurityViolationType.UNSAFE_OPERATION
        };
      }
    }
    
    return { passed: true };
  }
};

/**
 * Network configuration protection check
 */
export const networkConfigProtectionCheck: SecurityCheck = {
  async validate(context: FileAccessContext) {
    const fileName = context.filePath.toLowerCase();
    
    // Network configuration files
    const networkConfigPatterns = [
      '**/hosts',
      '**/resolv.conf',
      '**/network/interfaces',
      '**/NetworkManager/**',
      '**/wpa_supplicant.conf',
      '**/dhcpcd.conf',
      '**/iptables/**',
      '**/firewall/**'
    ];
    
    const isNetworkConfig = networkConfigPatterns.some(pattern => 
      minimatch(fileName, pattern)
    );
    
    if (isNetworkConfig && (
      context.operation === OperationType.EDIT_FILE || 
      context.operation === OperationType.DELETE_FILE
    )) {
      return {
        passed: false,
        reason: 'Modification of network configuration files denied',
        type: SecurityViolationType.NETWORK_CONFIG_ACCESS
      };
    }
    
    return { passed: true };
  }
};

/**
 * Suspicious file pattern detection
 */
export const suspiciousPatternCheck: SecurityCheck = {
  async validate(context: FileAccessContext) {
    const filePath = context.filePath.toLowerCase();
    
    // Suspicious patterns
    const suspiciousPatterns = [
      '**/tmp/**/*.exe',
      '**/temp/**/*.exe',
      '**/.hidden/**',
      '**/...*/**',  // Hidden directories with dots
      '**/*backdoor*',
      '**/*malware*',
      '**/*virus*',
      '**/*trojan*',
      '**/*keylog*',
      '**/*rootkit*'
    ];
    
    const isSuspicious = suspiciousPatterns.some(pattern => 
      minimatch(filePath, pattern)
    );
    
    if (isSuspicious) {
      return {
        passed: false,
        reason: 'Suspicious file pattern detected',
        type: SecurityViolationType.SUSPICIOUS_PATTERN
      };
    }
    
    return { passed: true };
  }
};

/**
 * Configuration file protection for important project files
 */
export const configFileProtectionCheck: SecurityCheck = {
  async validate(context: FileAccessContext) {
    const fileName = context.filePath.toLowerCase();
    
    // Important configuration files that need careful handling
    const importantConfigs = [
      '**/package.json',
      '**/package-lock.json',
      '**/yarn.lock',
      '**/pnpm-lock.yaml',
      '**/tsconfig.json',
      '**/webpack.config.*',
      '**/rollup.config.*',
      '**/vite.config.*',
      '**/next.config.*',
      '**/nuxt.config.*',
      '**/.gitignore',
      '**/.gitattributes',
      '**/Dockerfile*',
      '**/docker-compose.*',
      '**/Makefile',
      '**/Gemfile*',
      '**/requirements.txt',
      '**/Pipfile*',
      '**/poetry.lock',
      '**/go.mod',
      '**/go.sum',
      '**/Cargo.toml',
      '**/Cargo.lock'
    ];
    
    const isImportantConfig = importantConfigs.some(pattern => 
      minimatch(fileName, pattern)
    );
    
    if (isImportantConfig && context.operation === OperationType.DELETE_FILE) {
      return {
        passed: false,
        reason: 'Deletion of important configuration files requires explicit permission',
        type: SecurityViolationType.UNSAFE_OPERATION
      };
    }
    
    return { passed: true };
  }
};

/**
 * Create a comprehensive security pattern for agents
 */
export function createSecurityPattern(
  id: string,
  description: string,
  priority: number,
  allowedPaths: string[],
  additionalChecks: SecurityCheck[] = []
): SecurityValidatedAccessPattern {
  const standardChecks = [
    pathTraversalCheck,
    systemFileProtectionCheck,
    credentialProtectionCheck,
    executableProtectionCheck,
    nodeModulesProtectionCheck,
    networkConfigProtectionCheck,
    suspiciousPatternCheck,
    configFileProtectionCheck
  ];
  
  return new SecurityValidatedAccessPattern(
    id,
    description,
    priority,
    allowedPaths,
    [...standardChecks, ...additionalChecks],
    true
  );
}

/**
 * Create a restrictive security pattern that denies access
 */
export function createRestrictiveSecurityPattern(
  id: string,
  description: string,
  priority: number,
  restrictedPaths: string[],
  additionalChecks: SecurityCheck[] = []
): SecurityValidatedAccessPattern {
  const standardChecks = [
    pathTraversalCheck,
    systemFileProtectionCheck,
    credentialProtectionCheck,
    executableProtectionCheck,
    nodeModulesProtectionCheck,
    networkConfigProtectionCheck,
    suspiciousPatternCheck,
    configFileProtectionCheck
  ];
  
  return new SecurityValidatedAccessPattern(
    id,
    description,
    priority,
    restrictedPaths,
    [...standardChecks, ...additionalChecks],
    false // Deny access
  );
}

/**
 * Security auditor for logging security events
 */
export class SecurityAuditor {
  private auditLog: SecurityAuditLog[] = [];
  private maxLogSize = 10000;
  
  /**
   * Log a security event
   */
  logSecurityEvent(
    agentId: AgentId,
    operation: OperationType,
    resource: string,
    allowed: boolean,
    reason?: string,
    securityLevel: SecurityLevel = SecurityLevel.MEDIUM
  ): void {
    const logEntry: SecurityAuditLog = {
      timestamp: new Date(),
      agentId,
      operation,
      resource,
      allowed,
      reason,
      securityLevel
    };
    
    this.auditLog.push(logEntry);
    
    // Log critical events to console
    if (securityLevel === SecurityLevel.CRITICAL || !allowed) {
      console.warn('Security Event:', logEntry);
    }
    
    // Trim log if too large
    if (this.auditLog.length > this.maxLogSize) {
      this.auditLog = this.auditLog.slice(-Math.floor(this.maxLogSize * 0.8));
    }
  }
  
  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 100): SecurityAuditLog[] {
    return this.auditLog.slice(-limit);
  }
  
  /**
   * Get security events by agent
   */
  getEventsByAgent(agentId: AgentId, limit: number = 100): SecurityAuditLog[] {
    return this.auditLog
      .filter(event => event.agentId === agentId)
      .slice(-limit);
  }
  
  /**
   * Get denied access events
   */
  getDeniedEvents(limit: number = 100): SecurityAuditLog[] {
    return this.auditLog
      .filter(event => !event.allowed)
      .slice(-limit);
  }
  
  /**
   * Get critical security events
   */
  getCriticalEvents(limit: number = 100): SecurityAuditLog[] {
    return this.auditLog
      .filter(event => event.securityLevel === SecurityLevel.CRITICAL)
      .slice(-limit);
  }
  
  /**
   * Generate security report
   */
  generateSecurityReport(timeRange?: { start: Date; end: Date }): {
    totalEvents: number;
    deniedEvents: number;
    criticalEvents: number;
    topAgents: Array<{ agentId: AgentId; eventCount: number }>;
    topResources: Array<{ resource: string; accessCount: number }>;
    securityTrends: Array<{ date: string; events: number; denied: number }>;
  } {
    let events = this.auditLog;
    
    if (timeRange) {
      events = events.filter(event => 
        event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
      );
    }
    
    const deniedEvents = events.filter(event => !event.allowed);
    const criticalEvents = events.filter(event => event.securityLevel === SecurityLevel.CRITICAL);
    
    // Count events by agent
    const agentCounts = new Map<AgentId, number>();
    for (const event of events) {
      agentCounts.set(event.agentId, (agentCounts.get(event.agentId) || 0) + 1);
    }
    const topAgents = Array.from(agentCounts.entries())
      .map(([agentId, eventCount]) => ({ agentId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);
    
    // Count events by resource
    const resourceCounts = new Map<string, number>();
    for (const event of events) {
      resourceCounts.set(event.resource, (resourceCounts.get(event.resource) || 0) + 1);
    }
    const topResources = Array.from(resourceCounts.entries())
      .map(([resource, accessCount]) => ({ resource, accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);
    
    // Simple daily trends (last 7 days)
    const securityTrends: Array<{ date: string; events: number; denied: number }> = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayEvents = events.filter(event => 
        event.timestamp.toISOString().split('T')[0] === dateStr
      );
      const dayDenied = dayEvents.filter(event => !event.allowed);
      
      securityTrends.push({
        date: dateStr,
        events: dayEvents.length,
        denied: dayDenied.length
      });
    }
    
    return {
      totalEvents: events.length,
      deniedEvents: deniedEvents.length,
      criticalEvents: criticalEvents.length,
      topAgents,
      topResources,
      securityTrends
    };
  }
  
  /**
   * Clear audit log
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}

/**
 * Default security patterns for common use cases
 */
export const DEFAULT_SECURITY_PATTERNS = {
  /**
   * Standard development environment security
   */
  DEVELOPMENT: createSecurityPattern(
    'dev-security',
    'Development environment security pattern',
    90,
    ['src/**/*', 'test/**/*', 'tests/**/*', '**/*.md', '**/*.json', '**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx']
  ),
  
  /**
   * Restricted production environment security
   */
  PRODUCTION: createRestrictiveSecurityPattern(
    'prod-security',
    'Production environment security restrictions',
    95,
    ['**/production/**', '**/prod/**', '**/deploy/**', '**/release/**']
  ),
  
  /**
   * Configuration file security
   */
  CONFIG_PROTECTION: createRestrictiveSecurityPattern(
    'config-security',
    'Configuration file protection',
    85,
    ['**/.env*', '**/secrets/**', '**/*key*', '**/*password*', '**/.ssh/**']
  ),
  
  /**
   * System file protection
   */
  SYSTEM_PROTECTION: createRestrictiveSecurityPattern(
    'system-security',
    'System file protection',
    100,
    ['/etc/**', '/usr/**', '/var/**', '/sys/**', '/proc/**', 'C:/Windows/**', 'C:/Program Files/**']
  )
};

/**
 * Create default security auditor
 */
export function createSecurityAuditor(): SecurityAuditor {
  return new SecurityAuditor();
}

/**
 * Export types
 */
export type { SecurityCheck };
