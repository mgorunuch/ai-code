# AI Code System Configuration Rules

**Developer-Friendly Technical Specification**

This document provides a comprehensive guide to configuring the AI code system's agent orchestration, model selection, access patterns, and security mechanisms.

## Table of Contents

1. [File Structure & Organization](#file-structure--organization)
2. [Configuration Schema](#configuration-schema)
3. [Loading & Precedence Rules](#loading--precedence-rules)
4. [Security & Credentials](#security--credentials)
5. [Developer Experience](#developer-experience)
6. [Practical Examples](#practical-examples)

---

## File Structure & Organization

### Core Configuration Paths

```
.ai-code/
├── agents/                    # Agent definitions
│   ├── *.agent.ts            # Individual agent configurations
│   └── common/               # Shared agent patterns
├── config/                   # System configuration
│   ├── orchestration.ts      # Main orchestration config
│   ├── models.ts            # Model selection config
│   └── security.ts          # Security and access patterns
├── credentials/              # Encrypted credential storage
│   ├── api-keys.enc         # Encrypted API keys
│   └── tokens.enc           # Encrypted access tokens
└── user-config.ts           # User-specific overrides
```

### File Naming Conventions

- **Agent files**: Use `{domain}.agent.ts` format (e.g., `react.agent.ts`, `typescript.agent.ts`)
- **Config files**: Use descriptive names with `.ts` extension for type safety
- **Credential files**: Use `.enc` extension for encrypted storage
- **Tool definitions**: Embedded within agent files or shared in `common/`

### Project vs User Level Configuration

```typescript
// Project-level: .ai-code/config/orchestration.ts
export const projectConfig: OrchestrationConfig = {
  // Shared team settings
  agents: [...projectAgents],
  defaultPermissions: { requireExplicitToolGrants: true },
  logging: { level: 'info', logCommunications: true }
};

// User-level: .ai-code/user-config.ts  
export const userConfig: Partial<OrchestrationConfig> = {
  // Personal overrides
  logging: { level: 'debug' },
  modelSelection: {
    defaultModel: AIModel.CLAUDE_3_OPUS, // User prefers Opus
    autoMode: { enabled: false }         // User wants manual control
  }
};
```

---

## Configuration Schema

### Core Orchestration Configuration

```typescript
interface OrchestrationConfig {
  /** Registered agents with tool-based capabilities */
  agents: AgentCapability[];
  
  /** Default permission settings */
  defaultPermissions: {
    requireExplicitToolGrants: boolean;
  };
  
  /** Access patterns configuration */
  accessPatterns?: {
    enabled: boolean;
    enableCaching?: boolean;
    maxCacheSize?: number;
    globalPatterns?: AccessPattern[];
  };
  
  /** Logging configuration */
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logCommunications: boolean;
    logModelSelection?: boolean;
    logAccessPatterns?: boolean;
  };
  
  /** Model selection configuration */
  modelSelection?: ModelSelectionConfig;
}
```

### Agent Configuration Structure

```typescript
interface AgentCapability {
  /** Unique identifier for the agent */
  id: AgentId;
  
  /** Human-readable name */
  name: string;
  
  /** Description of agent's purpose */
  description: string;
  
  /** Tool instances defining capabilities and access patterns */
  tools: AgentTool[];
  
  /** Endpoints this agent exposes */
  endpoints: AgentEndpoint[];
}

// Example agent configuration
const reactAgent: AgentCapability = {
  id: 'react-dev',
  name: 'React Development Agent',
  description: 'Specialized for React component development',
  tools: [
    // Tool-based access patterns
    new ReadTool({
      id: 'react-reader',
      description: 'Read React component files',
      accessPatterns: [
        new FileSystemAccessPattern(
          'react-components',
          'React files',
          60, // priority
          ['**/*.tsx', '**/*.jsx', '**/components/**'],
          true, // allow
          [OperationType.READ_FILE]
        )
      ]
    }),
    new EditTool({ /* ... */ }),
    new CommunicationTool({ /* ... */ })
  ],
  endpoints: [
    { name: 'question', description: 'Answer React questions' },
    { name: 'validate', description: 'Validate React components' },
    { name: 'handle', description: 'Handle React operations' }
  ]
};
```

### Model Selection Configuration

```typescript
interface ModelSelectionConfig {
  /** Available model configurations */
  availableModels: ModelConfig[];
  
  /** Auto mode configuration */
  autoMode: AutoModeConfig;
  
  /** Default model when auto mode is disabled */
  defaultModel: AIModel;
  
  /** Selection strategy */
  selectionStrategy: 'cost-optimized' | 'performance-optimized' | 'balanced' | 'custom';
  
  /** Custom scoring weights */
  customWeights?: {
    cost: number;        // 0-1, weight for cost considerations
    speed: number;       // 0-1, weight for response speed
    quality: number;     // 0-1, weight for output quality
    accuracy: number;    // 0-1, weight for factual accuracy
  };
}

interface AutoModeConfig {
  enabled: boolean;
  preferredModels: AIModel[];
  costThreshold?: number;           // USD per request
  performanceThreshold?: number;    // 1-10 scale
  contextLengthThreshold?: number;  // Token limit
  operationPreferences?: Partial<Record<OperationType, AIModel[]>>;
  agentPreferences?: Record<AgentId, AIModel[]>;
  fallbackModel: AIModel;
}
```

### API Key and Credential Management

```typescript
interface CredentialConfig {
  /** Encrypted storage configuration */
  encryption: {
    algorithm: 'aes-256-gcm';
    keyDerivation: 'pbkdf2' | 'scrypt';
    iterations: number;
  };
  
  /** API provider configurations */
  providers: {
    anthropic: {
      apiKey: string;          // Encrypted reference
      organization?: string;
      project?: string;
    };
    openai: {
      apiKey: string;          // Encrypted reference
      organization?: string;
      project?: string;
    };
    custom?: {
      [provider: string]: {
        apiKey: string;
        endpoint: string;
        headers?: Record<string, string>;
      };
    };
  };
  
  /** Credential rotation settings */
  rotation: {
    enabled: boolean;
    interval: number;        // Hours
    backupCount: number;
  };
}
```

### Environment-Specific Configurations

```typescript
interface EnvironmentConfig {
  development: {
    logging: { level: 'debug', logCommunications: true };
    modelSelection: { defaultModel: AIModel.CLAUDE_3_HAIKU }; // Fast for dev
    accessPatterns: { enableCaching: false }; // Disable caching for dev
  };
  
  staging: {
    logging: { level: 'info', logCommunications: true };
    modelSelection: { defaultModel: AIModel.CLAUDE_3_5_SONNET };
    accessPatterns: { enableCaching: true, maxCacheSize: 500 };
  };
  
  production: {
    logging: { level: 'warn', logCommunications: false };
    modelSelection: { 
      autoMode: { enabled: true, costThreshold: 0.10 }
    };
    accessPatterns: { enableCaching: true, maxCacheSize: 2000 };
  };
}
```

---

## Loading & Precedence Rules

### Configuration Loading Order

1. **System defaults** (lowest priority)
2. **Environment configuration** 
3. **Project configuration** (`.ai-code/config/`)
4. **User configuration** (`.ai-code/user-config.ts`)
5. **Runtime overrides** (highest priority)

### Override Mechanisms

```typescript
// Deep merge strategy for configuration
function mergeConfigs(base: OrchestrationConfig, override: Partial<OrchestrationConfig>): OrchestrationConfig {
  return {
    ...base,
    ...override,
    // Special handling for nested objects
    logging: { ...base.logging, ...override.logging },
    defaultPermissions: { ...base.defaultPermissions, ...override.defaultPermissions },
    modelSelection: override.modelSelection ? {
      ...base.modelSelection,
      ...override.modelSelection,
      autoMode: { ...base.modelSelection?.autoMode, ...override.modelSelection.autoMode }
    } : base.modelSelection
  };
}
```

### Agent Inheritance and Composition

```typescript
// Base agent template
const baseWebAgent = {
  tools: [
    ...CommonTools.createWebTools(),
    new CommunicationTool({ id: 'web-comm' })
  ],
  endpoints: [
    { name: 'question', description: 'Answer web development questions' },
    { name: 'handle', description: 'Handle web operations' }
  ]
};

// Specialized agents inherit and extend
const reactAgent: AgentCapability = {
  ...baseWebAgent,
  id: 'react-agent',
  name: 'React Agent',
  tools: [
    ...baseWebAgent.tools,
    ...CommonTools.createReactTools() // Additional React-specific tools
  ]
};
```

### Runtime Hot-Reloading

```typescript
class ConfigurationManager {
  private watchers: Map<string, FSWatcher> = new Map();
  
  enableHotReload(configPath: string) {
    const watcher = watch(configPath, (eventType, filename) => {
      if (eventType === 'change') {
        this.reloadConfiguration(configPath);
      }
    });
    this.watchers.set(configPath, watcher);
  }
  
  private async reloadConfiguration(configPath: string) {
    try {
      // Clear module cache
      delete require.cache[require.resolve(configPath)];
      
      // Reload configuration
      const newConfig = await import(configPath);
      
      // Apply changes
      this.orchestrator.updateConfig(newConfig.default);
      
      console.log(`Configuration reloaded: ${configPath}`);
    } catch (error) {
      console.error(`Failed to reload configuration: ${error.message}`);
    }
  }
}
```

---

## Security & Credentials

### Secure API Key Storage

```typescript
// Credential encryption implementation
import { createCipher, createDecipher, scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

class CredentialManager {
  private masterKey: Buffer;
  
  async encryptCredential(plaintext: string, keyId: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await promisify(scrypt)(this.masterKey, salt, 32) as Buffer;
    
    const cipher = createCipher('aes-256-gcm', key);
    const iv = randomBytes(12);
    cipher.setAAD(Buffer.from(keyId));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }
  
  async decryptCredential(encrypted: string, keyId: string): Promise<string> {
    const [saltHex, ivHex, authTagHex, encryptedData] = encrypted.split(':');
    
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const key = await promisify(scrypt)(this.masterKey, salt, 32) as Buffer;
    
    const decipher = createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from(keyId));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Access Pattern Security

```typescript
// Custom access pattern with security validation
class SecurityValidatedAccessPattern extends AccessPattern<FileAccessContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private allowedPaths: string[],
    private securityChecks: SecurityCheck[]
  ) {
    super();
  }
  
  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    // 1. Basic path validation
    const pathAllowed = this.allowedPaths.some(pattern => 
      minimatch(context.filePath, pattern)
    );
    
    if (!pathAllowed) {
      return {
        allowed: false,
        reason: 'File path not in allowed patterns',
        patternId: this.id
      };
    }
    
    // 2. Security checks
    for (const check of this.securityChecks) {
      const result = await check.validate(context);
      if (!result.passed) {
        return {
          allowed: false,
          reason: result.reason,
          patternId: this.id,
          metadata: { securityViolation: result.type }
        };
      }
    }
    
    return {
      allowed: true,
      reason: 'Security validation passed',
      patternId: this.id,
      metadata: { securityValidated: true }
    };
  }
  
  appliesTo(context: FileAccessContext): boolean {
    return this.allowedPaths.some(pattern => 
      minimatch(context.filePath, pattern)
    );
  }
}

interface SecurityCheck {
  validate(context: FileAccessContext): Promise<{
    passed: boolean;
    reason?: string;
    type?: string;
  }>;
}

// Example security checks
const noNodeModulesCheck: SecurityCheck = {
  async validate(context) {
    if (context.filePath.includes('node_modules')) {
      return {
        passed: false,
        reason: 'Access to node_modules directory denied',
        type: 'path_restriction'
      };
    }
    return { passed: true };
  }
};

const noSystemFilesCheck: SecurityCheck = {
  async validate(context) {
    const systemPaths = ['/etc/', '/usr/', '/var/', 'C:\\Windows\\'];
    if (systemPaths.some(path => context.filePath.startsWith(path))) {
      return {
        passed: false,
        reason: 'Access to system directories denied',
        type: 'system_protection'
      };
    }
    return { passed: true };
  }
};
```

### Audit Trails and Security Logging

```typescript
interface SecurityAuditLog {
  timestamp: Date;
  agentId: AgentId;
  operation: OperationType;
  resource: string;
  allowed: boolean;
  reason?: string;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

class SecurityAuditor {
  private auditLog: SecurityAuditLog[] = [];
  
  logAccess(entry: SecurityAuditLog) {
    this.auditLog.push(entry);
    
    // Log to external security monitoring if critical
    if (entry.securityLevel === 'critical') {
      this.sendToSecurityMonitoring(entry);
    }
    
    // Rotate logs to prevent memory issues
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }
  
  getSecurityReport(timeRange: { start: Date; end: Date }): SecurityReport {
    const filteredLogs = this.auditLog.filter(log => 
      log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
    );
    
    return {
      totalRequests: filteredLogs.length,
      deniedRequests: filteredLogs.filter(log => !log.allowed).length,
      criticalEvents: filteredLogs.filter(log => log.securityLevel === 'critical').length,
      topAgents: this.getTopAgentsByActivity(filteredLogs),
      securityViolations: this.getSecurityViolations(filteredLogs)
    };
  }
}
```

---

## Developer Experience

### Zero-Config Defaults

```typescript
// System provides sensible defaults out of the box
const DEFAULT_CONFIG: OrchestrationConfig = {
  agents: [], // Start empty, agents register themselves
  defaultPermissions: {
    requireExplicitToolGrants: true // Secure by default
  },
  accessPatterns: {
    enabled: true,
    enableCaching: true,
    maxCacheSize: 1000
  },
  logging: {
    level: 'info',
    logCommunications: false, // Reduce noise by default
    logModelSelection: true,
    logAccessPatterns: false
  },
  modelSelection: {
    availableModels: DEFAULT_MODEL_CONFIGS,
    autoMode: DEFAULT_AUTO_MODE_CONFIG,
    defaultModel: AIModel.CLAUDE_3_5_SONNET, // Balanced choice
    selectionStrategy: 'balanced',
    customWeights: {
      cost: 0.3,
      speed: 0.2,
      quality: 0.3,
      accuracy: 0.2
    }
  }
};
```

### Progressive Disclosure

```typescript
// Level 1: Simple agent creation
const quickAgent = CommonTools.createAgent('react', {
  name: 'React Agent',
  description: 'Quick React development agent'
});

// Level 2: Custom tool configuration
const customAgent: AgentCapability = {
  id: 'custom-react',
  name: 'Custom React Agent',
  description: 'React agent with custom access patterns',
  tools: [
    ...CommonTools.createReactTools(),
    new EditTool({
      id: 'custom-edit',
      accessPatterns: [/* custom patterns */]
    })
  ],
  endpoints: [/* custom endpoints */]
};

// Level 3: Advanced configuration with custom patterns and security
const advancedAgent: AgentCapability = {
  id: 'advanced-react',
  name: 'Advanced React Agent',
  description: 'Highly customized React agent',
  tools: [
    new CompositeTool({
      id: 'advanced-composite',
      tools: [
        new ReadTool({ /* custom config */ }),
        new EditTool({ /* custom config */ }),
        new CreateTool({ /* custom config */ })
      ]
    })
  ],
  endpoints: [/* fully custom endpoints */]
};
```

### Clear Error Messages and Validation

```typescript
class ConfigurationValidator {
  validateAgent(agent: AgentCapability): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required field validation
    if (!agent.id) {
      errors.push('Agent must have an ID');
    } else if (!/^[a-z0-9-_]+$/.test(agent.id)) {
      errors.push('Agent ID must contain only lowercase letters, numbers, hyphens, and underscores');
    }
    
    if (!agent.name) {
      errors.push('Agent must have a name');
    }
    
    if (!agent.tools || agent.tools.length === 0) {
      errors.push('Agent must have at least one tool');
    }
    
    // Tool validation
    for (const tool of agent.tools) {
      const toolResult = this.validateTool(tool);
      errors.push(...toolResult.errors.map(e => `Tool ${tool.id}: ${e}`));
      warnings.push(...toolResult.warnings.map(w => `Tool ${tool.id}: ${w}`));
    }
    
    // Endpoint validation
    if (!agent.endpoints || agent.endpoints.length === 0) {
      warnings.push('Agent has no endpoints - may not be discoverable for inter-agent communication');
    }
    
    // Security recommendations
    const hasReadOnlyTools = agent.tools.some(tool => 
      tool.canHandle(OperationType.READ_FILE) && 
      !tool.canHandle(OperationType.EDIT_FILE) && 
      !tool.canHandle(OperationType.WRITE_FILE)
    );
    
    if (!hasReadOnlyTools) {
      warnings.push('Consider adding read-only tools for better security posture');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: this.generateSuggestions(agent)
    };
  }
  
  private generateSuggestions(agent: AgentCapability): string[] {
    const suggestions: string[] = [];
    
    // Suggest common patterns
    if (agent.id.includes('react') && !agent.tools.some(t => t.id.includes('test'))) {
      suggestions.push('Consider adding test tools for React development');
    }
    
    if (!agent.tools.some(t => t.canHandle(OperationType.QUESTION))) {
      suggestions.push('Consider adding a CommunicationTool for inter-agent collaboration');
    }
    
    return suggestions;
  }
}
```

### IDE Integration Patterns

```typescript
// TypeScript definitions for excellent IntelliSense
export interface AgentConfigHelper {
  /** Create a new agent with sensible defaults */
  createAgent(type: 'react' | 'typescript' | 'test' | 'config', options?: {
    name?: string;
    description?: string;
    additionalTools?: AgentTool[];
    customEndpoints?: AgentEndpoint[];
  }): AgentCapability;
  
  /** Validate agent configuration at development time */
  validateConfig(config: Partial<OrchestrationConfig>): Promise<ValidationResult>;
  
  /** Get suggestions for improving agent configuration */
  getSuggestions(agent: AgentCapability): ConfigurationSuggestion[];
}

// Development-time validation hooks
export function useConfigValidation() {
  return {
    validateOnSave: true,
    showWarnings: true,
    autoSuggest: true,
    formatOnSave: true
  };
}

// Schema validation for configuration files
export const agentConfigSchema = {
  type: 'object',
  required: ['id', 'name', 'description', 'tools', 'endpoints'],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9-_]+$' },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    tools: {
      type: 'array',
      minItems: 1,
      items: { $ref: '#/definitions/AgentTool' }
    },
    endpoints: {
      type: 'array',
      items: { $ref: '#/definitions/AgentEndpoint' }
    }
  }
};
```

---

## Practical Examples

### Basic React Development Setup

```typescript
// .ai-code/agents/react.agent.ts
import { AgentCapability } from '@ai-code/core';
import { CommonTools } from '@ai-code/tools';

export const reactAgent: AgentCapability = {
  id: 'react-dev',
  name: 'React Development Agent',
  description: 'Specialized agent for React component development',
  
  // Use pre-built tool patterns for quick setup
  tools: [
    ...CommonTools.createReactTools(),
    ...CommonTools.createTestTools(['**/*.test.tsx', '**/*.test.jsx'])
  ],
  
  endpoints: [
    { name: 'question', description: 'Answer React development questions' },
    { name: 'validate', description: 'Validate React component structure' },
    { name: 'handle', description: 'Handle React file operations' }
  ]
};
```

### Advanced TypeScript Development Setup

```typescript
// .ai-code/agents/typescript.agent.ts
import { 
  AgentCapability, 
  EditTool, 
  CustomAccessPattern,
  OperationType 
} from '@ai-code/core';

export const typescriptAgent: AgentCapability = {
  id: 'typescript-dev',
  name: 'TypeScript Development Agent',
  description: 'Advanced TypeScript development with custom validation',
  
  tools: [
    // Standard TypeScript tools
    ...CommonTools.createTypeScriptTools(),
    
    // Custom tool with advanced access patterns
    new EditTool({
      id: 'typescript-advanced-edit',
      description: 'TypeScript editing with custom validation',
      accessPatterns: [
        new CustomAccessPattern(
          'typescript-validation',
          'TypeScript file validation with custom rules',
          80,
          // Custom validation logic
          async (context) => {
            return context.filePath.match(/\.(ts|tsx)$/) !== null;
          },
          async (context) => {
            // Block edits to compiled files
            if (context.filePath.includes('dist/') || context.filePath.includes('.d.ts')) {
              return {
                allowed: false,
                reason: 'Cannot edit compiled TypeScript files',
                metadata: { fileType: 'compiled' }
              };
            }
            
            // Block edits to node_modules
            if (context.filePath.includes('node_modules')) {
              return {
                allowed: false,
                reason: 'Cannot edit dependencies',
                metadata: { fileType: 'dependency' }
              };
            }
            
            return {
              allowed: true,
              reason: 'TypeScript source file edit allowed',
              metadata: { validated: true, fileType: 'source' }
            };
          }
        )
      ]
    })
  ],
  
  endpoints: [
    { name: 'question', description: 'Answer TypeScript questions' },
    { name: 'validate', description: 'Validate TypeScript code quality' },
    { name: 'transform', description: 'Transform TypeScript code' },
    { name: 'handle', description: 'Handle TypeScript operations' }
  ]
};
```

### Model Selection Configuration

```typescript
// .ai-code/config/models.ts
import { ModelSelectionConfig, AIModel } from '@ai-code/core';

export const modelConfig: ModelSelectionConfig = {
  availableModels: [
    {
      model: AIModel.CLAUDE_3_5_SONNET,
      name: 'Claude 3.5 Sonnet',
      description: 'Balanced performance for most development tasks',
      capabilities: {
        maxContextLength: 200000,
        costPerKInput: 0.003,
        costPerKOutput: 0.015,
        speed: 8,
        reasoning: 9,
        codeGeneration: 9,
        analysis: 8,
        creativity: 7,
        accuracy: 9,
        multiLanguage: 8
      },
      available: true,
      provider: 'anthropic'
    },
    {
      model: AIModel.CLAUDE_3_HAIKU,
      name: 'Claude 3 Haiku',
      description: 'Fast and cost-effective for simple tasks',
      capabilities: {
        maxContextLength: 200000,
        costPerKInput: 0.00025,
        costPerKOutput: 0.00125,
        speed: 10,
        reasoning: 7,
        codeGeneration: 7,
        analysis: 6,
        creativity: 6,
        accuracy: 7,
        multiLanguage: 7
      },
      available: true,
      provider: 'anthropic'
    }
  ],
  
  autoMode: {
    enabled: true,
    preferredModels: [AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_HAIKU],
    costThreshold: 0.05, // Max $0.05 per request
    performanceThreshold: 7, // Minimum quality score
    contextLengthThreshold: 150000,
    
    // Operation-specific preferences
    operationPreferences: {
      [OperationType.READ_FILE]: [AIModel.CLAUDE_3_HAIKU], // Fast for reading
      [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET], // Quality for editing
      [OperationType.QUESTION]: [AIModel.CLAUDE_3_5_SONNET], // Quality for questions
      [OperationType.VALIDATE]: [AIModel.CLAUDE_3_5_SONNET] // Quality for validation
    },
    
    fallbackModel: AIModel.CLAUDE_3_HAIKU
  },
  
  defaultModel: AIModel.CLAUDE_3_5_SONNET,
  selectionStrategy: 'balanced',
  
  customWeights: {
    cost: 0.4,      // Higher weight on cost optimization
    speed: 0.2,     // Moderate weight on speed
    quality: 0.3,   // High weight on quality
    accuracy: 0.1   // Lower weight on accuracy for development tasks
  }
};
```

### Security Configuration

```typescript
// .ai-code/config/security.ts
import { SecurityConfig, SecurityValidatedAccessPattern } from '@ai-code/core';

export const securityConfig: SecurityConfig = {
  // Global security patterns that apply to all agents
  globalSecurityPatterns: [
    new SecurityValidatedAccessPattern(
      'no-system-files',
      'Prevent access to system files',
      100, // Highest priority
      ['**/*'], // Apply to all files
      [
        noSystemFilesCheck,
        noNodeModulesCheck,
        noSecretFilesCheck
      ]
    )
  ],
  
  // Credential configuration
  credentials: {
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'scrypt',
      iterations: 100000
    },
    rotation: {
      enabled: true,
      interval: 24 * 7, // Weekly rotation
      backupCount: 3
    }
  },
  
  // Audit configuration
  audit: {
    enabled: true,
    logLevel: 'all',
    retentionPeriod: 90, // 90 days
    alertThresholds: {
      deniedRequestsPerHour: 100,
      criticalEventsPerDay: 10
    }
  }
};

// Custom security checks
const noSecretFilesCheck: SecurityCheck = {
  async validate(context) {
    const secretPatterns = [
      '**/.env*',
      '**/secrets/**',
      '**/*key*',
      '**/*token*',
      '**/*password*'
    ];
    
    const isSecretFile = secretPatterns.some(pattern => 
      minimatch(context.filePath, pattern)
    );
    
    if (isSecretFile && context.operation !== OperationType.READ_FILE) {
      return {
        passed: false,
        reason: 'Write access to potential secret files denied',
        type: 'secret_protection'
      };
    }
    
    return { passed: true };
  }
};
```

### Complete Project Configuration

```typescript
// .ai-code/config/orchestration.ts
import { OrchestrationConfig } from '@ai-code/core';
import { reactAgent } from '../agents/react.agent.js';
import { typescriptAgent } from '../agents/typescript.agent.js';
import { modelConfig } from './models.js';
import { securityConfig } from './security.js';

export const orchestrationConfig: OrchestrationConfig = {
  // Register all project agents
  agents: [
    reactAgent,
    typescriptAgent,
    // Add more agents as needed
  ],
  
  // Security-first defaults
  defaultPermissions: {
    requireExplicitToolGrants: true
  },
  
  // Enable access patterns with caching for performance
  accessPatterns: {
    enabled: true,
    enableCaching: true,
    maxCacheSize: 2000,
    globalPatterns: securityConfig.globalSecurityPatterns
  },
  
  // Development-friendly logging
  logging: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    logCommunications: true,
    logModelSelection: true,
    logAccessPatterns: process.env.NODE_ENV === 'development'
  },
  
  // Model selection configuration
  modelSelection: modelConfig
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  orchestrationConfig.logging = {
    level: 'warn',
    logCommunications: false,
    logModelSelection: false,
    logAccessPatterns: false
  };
  
  orchestrationConfig.modelSelection!.autoMode.costThreshold = 0.02; // Stricter cost control in prod
}
```

### Best Practices Summary

1. **Start Simple**: Use `CommonTools` for quick agent setup
2. **Secure by Default**: Always enable access patterns and require explicit tool grants
3. **Environment Awareness**: Configure different settings for dev/staging/production
4. **Type Safety**: Use TypeScript for all configuration files
5. **Validation**: Validate configurations at build time and runtime
6. **Monitoring**: Enable appropriate logging and audit trails
7. **Performance**: Use caching for access pattern evaluation
8. **Security**: Implement defense-in-depth with multiple security layers
9. **Documentation**: Comment configuration choices for team understanding
10. **Evolution**: Design configurations to be easily extended and modified

### Anti-Patterns to Avoid

❌ **Don't**: Hard-code API keys in configuration files  
✅ **Do**: Use encrypted credential storage

❌ **Don't**: Grant overly broad access patterns  
✅ **Do**: Use principle of least privilege with specific patterns

❌ **Don't**: Disable all logging in production  
✅ **Do**: Use appropriate log levels and selective logging

❌ **Don't**: Skip validation of agent configurations  
✅ **Do**: Validate at development time and runtime

❌ **Don't**: Use the same configuration across all environments  
✅ **Do**: Customize for development, staging, and production needs

This configuration system provides a powerful, secure, and developer-friendly way to orchestrate AI agents with fine-grained control over capabilities, access patterns, and model selection while maintaining excellent performance and security posture.