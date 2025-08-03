# Core Orchestration System Knowledge

## Overview

The Core Orchestration System is a comprehensive framework for managing agent responsibilities, permissions, inter-agent communication, and **intelligent AI model selection**. This system uses a **tool-based architecture** where tools encapsulate both operations and access patterns, significantly simplifying agent configuration and permission management. The system includes **automated model selection** that enables multiple specialized agents to work together while maintaining granular security controls, clear access boundaries, and optimal performance through dynamic model routing.

**New in 2025**: The system now includes a complete **configuration management system** that supports:
- **.ai-code directory structure** for organized configuration
- **Two-level configuration** (user + project) with intelligent merging
- **Encrypted credential storage** with automatic rotation
- **Hot-reloading** for development productivity
- **Security validation patterns** with comprehensive audit trails
- **Environment-specific configurations** (development, staging, production)

> **Note**: The system has been modernized to use only the tool-based approach. All legacy compatibility layers and migration utilities have been removed for a clean, maintainable codebase.

## Key Features: Tool-Based Architecture

The system uses a **tool-based architecture** for managing agent capabilities and permissions. This provides:

- **Unified Model**: Tools combine operations and access patterns in one class
- **Simplified Configuration**: Agents only need to specify tool instances
- **Granular Control**: Each tool instance has its own specific access patterns
- **Extensibility**: Easy addition of new tool types and capabilities
- **Security**: Fine-grained permission management at the tool level
- **Clean Architecture**: Modern, flexible design patterns
- **Type Safety**: Full TypeScript support with comprehensive type checking

## Recent Updates (August 2025)

The core orchestration system has been updated to fix all TypeScript compilation errors and improve type safety:

- **Fixed Import/Export Issues**: All missing exports (`DefaultAgents`, `createAgentCapability`, `AgentToolEnum`) have been resolved
- **Enhanced Type Definitions**: Added proper type definitions for all interfaces and improved type safety
- **Backward Compatibility**: Added legacy `AgentToolEnum` and `getRequiredTool` functions for existing permission rules
- **Iterator Compatibility**: Fixed Map iterator issues for better cross-platform compatibility
- **Modern Tool API**: Updated example code to use the current tool-based architecture
- **Comprehensive Type Coverage**: All core files now compile without TypeScript errors

### Critical API Key Persistence Fix (August 2025)

**MAJOR ISSUE RESOLVED**: API keys set in settings now properly persist after application reload.

**Problem Identified**: The Settings UI was using an in-memory storage system (`storage.tsx`) that was completely disconnected from the core orchestration system's encrypted credential management. This caused API keys to be lost on every restart.

**Solution Implemented**: 
1. **Integrated Settings with Core System**: The Settings component now connects to the `CoreOrchestrator` and `CredentialManager`
2. **Persistent Encrypted Storage**: API keys are now stored using the core system's encrypted storage (`CredentialManager`) in `.ai-code/credentials/api-keys.enc`
3. **Graceful Fallback**: If the core system is unavailable, the Settings gracefully falls back to session storage with clear user warnings
4. **Master Password Support**: Users can initialize the encrypted credential system directly from the Settings UI
5. **Automatic Configuration Setup**: The orchestrator now automatically creates the `.ai-code` directory structure when needed
6. **Robust Error Handling**: Added comprehensive error handling and user feedback for credential initialization
7. **Visual Storage Status**: Users can see whether their API keys are stored securely (encrypted) or temporarily (session only)

**Key Files Modified**:
- `/source/core/orchestrator.ts` - Added `initializeCredentialsForSettings()` method and improved initialization logic
- `/source/core/configuration-manager.ts` - Enhanced credential manager initialization with automatic fallback
- `/source/core/config-filesystem.ts` - Improved module loading to handle both .ts and .js files during development
- `/source/Settings.tsx` - Integrated with core orchestration system and improved user feedback
- `/source/types.tsx` - Added `isSecure` field to Provider interface for storage status indication

**How It Works Now**:
1. When Settings loads, it tries to initialize the core orchestration system
2. If config files don't exist, it prompts the user for a master password
3. The system automatically creates the `.ai-code` directory structure
4. API keys are encrypted using AES-256-GCM with scrypt key derivation
5. Keys persist across application restarts and are securely stored on disk
6. Users get clear visual feedback about whether their keys are securely stored
- **Dual System Support**: The Settings component handles both legacy storage (session-only) and core encrypted storage seamlessly

**Technical Details**:
- Settings component now imports and uses `CoreOrchestrator` for credential management
- Implemented automatic detection of core system availability
- Added master password initialization UI within Settings
- API keys are stored encrypted and persist across application restarts
- Clear user feedback indicates whether keys are stored persistently or temporarily

**User Experience**: 
- First-time users see a master password prompt to initialize secure storage
- Existing users' API keys are automatically migrated to encrypted storage
- Clear visual indicators show storage type (encrypted/persistent vs session/temporary)
- Graceful error handling with fallback to session storage if core system fails

### Configuration System Implementation (August 2025)

A complete configuration management system has been implemented that follows the CONFIG_RULES.md specification:

- **ConfigurationManager**: Central configuration loading, validation, and management
- **ConfigFileSystem**: File system integration for .ai-code directory structure
- **CredentialManager**: Encrypted storage and management of API keys and tokens
- **SecurityPatterns**: Comprehensive security validation and audit logging
- **Hot-Reloading**: Real-time configuration updates for development productivity
- **Multi-Environment Support**: Separate configurations for development, staging, and production
- **Intelligent Merging**: Two-level configuration (project + user) with conflict resolution

## AI Model Selection System

The system includes comprehensive **AI model selection** capabilities with auto mode functionality:

- **Multi-Model Support**: Support for multiple AI models (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku, GPT-4 Turbo, GPT-3.5 Turbo)
- **Auto Mode**: Intelligent automatic model selection based on operation type, complexity, and requirements
- **Cost Optimization**: Cost-aware selection with configurable thresholds
- **Performance Optimization**: Quality-based selection considering reasoning, speed, and accuracy
- **Context-Aware**: Selection based on estimated context length requirements
- **Agent-Specific Preferences**: Different models for different agent types
- **Operation-Specific Preferences**: Optimized models for specific operation types

## Architecture

### Core Components

1. **AgentRegistry** (`agent-registry.ts`)
   - Manages agent registration and discovery
   - Maps agents to access patterns using sophisticated matching
   - Provides agent lookup and responsibility determination

2. **PermissionSystem** (`permissions.ts`)
   - Enforces access pattern-based controls
   - Supports custom permission rules and overrides
   - Maintains audit logs of permission decisions

3. **AgentCommunicationSystem** (`communication.ts`)
   - Facilitates inter-agent messaging
   - Implements question/answer protocol
   - Tracks communication history and statistics

4. **ModelSelector** (`model-selector.ts`)
   - Intelligent AI model selection system
   - Auto mode with configurable preferences
   - Cost and performance optimization
   - Model capability assessment and routing

5. **CoreOrchestrator** (`orchestrator.ts`)
   - Main coordination engine
   - Routes requests to appropriate agents
   - Integrates model selection for optimal performance
   - Orchestrates complex multi-agent workflows

6. **ConfigurationManager** (`configuration-manager.ts`)
   - Central configuration loading and management
   - Two-level configuration merging (project + user)
   - Configuration validation and hot-reloading
   - Integration with credential and security systems

7. **ConfigFileSystem** (`config-filesystem.ts`)
   - .ai-code directory structure management
   - TypeScript configuration file loading
   - Agent configuration discovery
   - File watching for hot-reload functionality

8. **CredentialManager** (`credential-manager.ts`)
   - Encrypted API key and token storage
   - Automatic credential rotation
   - Secure master key derivation
   - Provider-specific credential management

9. **SecurityPatterns** (`security-patterns.ts`)
   - Comprehensive security validation
   - Access pattern security checks
   - Security audit logging and reporting
   - Built-in protection against common vulnerabilities

## Key Features

### Class-Based Access Patterns System

The core orchestration system uses an extensible class-based access patterns system that provides sophisticated control over resource access. All access patterns must extend the base `AccessPattern` class, making the system generic and extensible for any type of resource (files, database tables, API endpoints, etc.).

#### Core Access Pattern Architecture

```typescript
// Base class for all access patterns
export abstract class AccessPattern<TContext extends AccessContext = AccessContext> {
  abstract readonly id: string;
  abstract readonly description: string;
  abstract readonly priority: number;
  abstract validate(context: TContext): AccessPatternResult | Promise<AccessPatternResult>;
  abstract appliesTo(context: TContext): boolean | Promise<boolean>;
}

// Generic context for any resource type
export interface AccessContext<TResource = any> {
  resource: TResource;
  operation: string;
  requesterId: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}
```

#### File System Access Pattern

For file-based access control:

```typescript
import { FileSystemAccessPattern } from './core/access-patterns.js';

const agent: AgentCapability = {
  id: 'react-agent',
  name: 'React Frontend Agent',
  accessPatterns: [
    new FileSystemAccessPattern(
      'react-components',
      'React component files',
      20, // priority
      ['**/*.tsx', '**/*.jsx', '**/components/**/*'],
      true, // allow access
      [OperationType.READ_FILE, OperationType.EDIT_FILE] // allowed operations
    )
  ],
  tools: [AgentTool.READ_LOCAL, AgentTool.EDIT_FILES],
  endpoints: [{ name: 'question', description: 'Answer React questions' }]
};
```

#### Database Access Pattern

For database table access control:

```typescript
import { DatabaseTableAccessPattern } from './core/access-patterns.js';

const databasePattern = new DatabaseTableAccessPattern(
  'user-table-access',
  'User table access control',
  50,
  ['users', 'user_profiles', 'user_*'], // table patterns
  ['SELECT', 'INSERT', 'UPDATE'], // allowed operations
  true // allow access
);

const agent: AgentCapability = {
  id: 'database-agent',
  name: 'Database Agent',
  accessPatterns: [databasePattern],
  tools: [AgentTool.READ_LOCAL, AgentTool.EXECUTE_COMMANDS],
  endpoints: [{ name: 'query', description: 'Execute database queries' }]
};
```

#### API Endpoint Access Pattern

For REST API access control:

```typescript
import { APIEndpointAccessPattern } from './core/access-patterns.js';

const apiPattern = new APIEndpointAccessPattern(
  'api-user-endpoints',
  'User API endpoints access',
  30,
  ['/api/users/*', '/api/auth/*'], // endpoint patterns
  ['GET', 'POST'], // allowed methods
  true // allow access
);
```

#### Custom Access Pattern Implementation

Create custom patterns for any resource type:

```typescript
// Custom pattern for cloud storage access
interface CloudStorageContext extends AccessContext<string> {
  bucket: string;
  key: string;
  operation: 'READ' | 'WRITE' | 'DELETE' | 'LIST';
  userId: string;
}

class CloudStorageAccessPattern extends AccessPattern<CloudStorageContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private readonly bucketPatterns: string[],
    private readonly keyPatterns: string[],
    private readonly allowedOperations: string[]
  ) {
    super();
  }

  async appliesTo(context: CloudStorageContext): Promise<boolean> {
    const bucketMatches = this.bucketPatterns.some(pattern => 
      minimatch(context.bucket, pattern)
    );
    const keyMatches = this.keyPatterns.some(pattern => 
      minimatch(context.key, pattern)
    );
    return bucketMatches && keyMatches;
  }

  async validate(context: CloudStorageContext): Promise<AccessPatternResult> {
    if (!this.allowedOperations.includes(context.operation)) {
      return {
        allowed: false,
        reason: `Operation ${context.operation} not allowed on ${context.bucket}/${context.key}`,
        patternId: this.id
      };
    }

    // Additional validation logic
    if (context.bucket.includes('production') && context.operation === 'DELETE') {
      return {
        allowed: false,
        reason: 'Cannot delete from production buckets',
        patternId: this.id,
        metadata: { securityLevel: 'high' }
      };
    }

    return {
      allowed: true,
      reason: `${context.operation} allowed on ${context.bucket}/${context.key}`,
      patternId: this.id
    };
  }
}
```

#### Composite Access Patterns

Combine multiple patterns with AND/OR logic:

```typescript
import { CompositeAccessPattern, TimeBasedAccessPattern } from './core/access-patterns.js';

// Base pattern for file access
const filePattern = new FileSystemAccessPattern(
  'source-files',
  'Source code files',
  20,
  ['src/**/*.ts', 'src/**/*.tsx'],
  true
);

// Wrap with time restrictions
const businessHoursPattern = new TimeBasedAccessPattern(
  'business-hours-only',
  'Business hours access restriction',
  100,
  filePattern,
  { start: 9, end: 17 }, // 9 AM to 5 PM
  [1, 2, 3, 4, 5] // Monday to Friday
);

// Combine multiple patterns
const compositePattern = new CompositeAccessPattern(
  'combined-access',
  'Combined access rules',
  50,
  [businessHoursPattern, anotherPattern],
  'AND' // Both patterns must allow access
);
```

#### Custom Validation Pattern

For complex custom logic:

```typescript
import { CustomAccessPattern } from './core/access-patterns.js';

const customPattern = new CustomAccessPattern(
  'complex-validation',
  'Complex custom validation',
  75,
  // appliesTo function
  async (context) => {
    // Custom logic to determine if pattern applies
    return context.resource.startsWith('/secure/');
  },
  // validate function
  async (context) => {
    // Complex validation logic
    const securityCheck = await performSecurityCheck(context);
    if (!securityCheck.passed) {
      return {
        allowed: false,
        reason: securityCheck.reason,
        metadata: { securityLevel: 'critical' }
      };
    }
    
    return {
      allowed: true,
      reason: 'Security check passed'
    };
  }
);
```

**Pattern Evaluation Rules:**
- All patterns must extend the base `AccessPattern` class
- Higher priority patterns override lower priority ones
- Patterns are evaluated in priority order (highest first)
- The `appliesTo` method determines if a pattern should be evaluated
- The `validate` method performs the actual access control logic
- Results are cached for performance (configurable)

### Tools-Based Permission System

The system enforces granular access controls through tools:

**Available Tool Types:**
- `ReadTool`: Read files within specified access patterns
- `EditTool`: Edit existing files within specified access patterns
- `CreateTool`: Create new files within specified access patterns
- `DeleteTool`: Delete files within specified access patterns
- `CreateDirectoryTool`: Create directories within specified patterns
- `CommunicationTool`: Communicate with other agents
- `CompositeTool`: Combine multiple tool capabilities

**Permission Rules:**
- Agents must have specific tools to perform operations
- Each tool defines which operations it can handle through the `canHandle()` method
- Tools encapsulate access patterns that define where they can operate
- All tool usage is logged for audit purposes

**Custom Rules with Tools:**
```typescript
const rule: PermissionRule = {
  id: 'allow-config-read',
  description: 'Allow all agents to read config files globally',
  agentId: '*',  // Apply to all agents
  filePattern: '**/*.config.*',
  operations: [OperationType.READ_FILE],
  allow: true,
  priority: 100
};

// Restrictive rule
const editRule: PermissionRule = {
  id: 'restrict-production-edits',
  description: 'Prevent editing production files',
  agentId: '*',
  filePattern: '**/production/**',
  operations: [OperationType.EDIT_FILE, OperationType.DELETE_FILE],
  allow: false,
  priority: 200
};
```

### AI Model Selection and Auto Mode

The system provides intelligent model selection through the **ModelSelector** component:

**Available Models:**
- `CLAUDE_3_5_SONNET`: Balanced performance for most coding and analysis tasks
- `CLAUDE_3_OPUS`: Maximum capability for complex reasoning and analysis
- `CLAUDE_3_HAIKU`: Fast and efficient for simple tasks
- `GPT_4_TURBO`: OpenAI's latest high-capability model
- `GPT_3_5_TURBO`: Fast and cost-effective for routine tasks

**Model Configuration:**
```typescript
const modelConfig: ModelConfig = {
  model: AIModel.CLAUDE_3_5_SONNET,
  name: 'Claude 3.5 Sonnet',
  description: 'Balanced performance for most coding and analysis tasks',
  provider: 'anthropic',
  available: true,
  capabilities: {
    maxContextLength: 200000,
    costPerKInput: 0.003,
    costPerKOutput: 0.015,
    speed: 7,
    reasoning: 9,
    codeGeneration: 9,
    analysis: 9,
    creativity: 8,
    accuracy: 9,
    multiLanguage: 8
  }
};
```

**Auto Mode Configuration:**
```typescript
const autoModeConfig: AutoModeConfig = {
  enabled: true,
  preferredModels: [
    AIModel.CLAUDE_3_5_SONNET,
    AIModel.CLAUDE_3_HAIKU,
    AIModel.GPT_4_TURBO
  ],
  costThreshold: 0.1, // $0.10 per request
  performanceThreshold: 7,
  contextLengthThreshold: 100000,
  operationPreferences: {
    [OperationType.READ_FILE]: [AIModel.CLAUDE_3_HAIKU, AIModel.GPT_3_5_TURBO],
    [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO],
    [OperationType.QUESTION]: [AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_OPUS],
    [OperationType.TRANSFORM]: [AIModel.CLAUDE_3_OPUS, AIModel.CLAUDE_3_5_SONNET]
  },
  agentPreferences: {
    'typescript-agent': [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO],
    'react-agent': [AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_HAIKU],
    'test-agent': [AIModel.GPT_4_TURBO, AIModel.CLAUDE_3_5_SONNET]
  },
  fallbackModel: AIModel.CLAUDE_3_5_SONNET
};
```

**Model Selection Process:**
1. **Operation Analysis**: Evaluates operation type, complexity, and context requirements
2. **Preference Matching**: Checks operation-specific and agent-specific preferences
3. **Capability Assessment**: Ensures model meets performance and context requirements
4. **Cost Optimization**: Selects most cost-effective model within quality thresholds
5. **Fallback Handling**: Uses fallback model if no preferred models are available

**Selection Criteria:**
```typescript
const criteria: ModelSelectionCriteria = {
  operationType: OperationType.EDIT_FILE,
  agentId: 'typescript-agent',
  complexity: 7,
  contextLength: 50000,
  priority: 8,
  maxCost: 0.05,
  requiredCapabilities: {
    reasoning: 8,
    codeGeneration: 8,
    accuracy: 9
  }
};

const result = orchestrator.selectModelForOperation(
  criteria.operationType,
  criteria.agentId,
  {
    complexity: criteria.complexity,
    contextLength: criteria.contextLength,
    priority: criteria.priority,
    maxCost: criteria.maxCost,
    requiredCapabilities: criteria.requiredCapabilities
  }
);
```

### Configuration Management System

The system provides comprehensive configuration management following the .ai-code directory structure:

#### Directory Structure

```
.ai-code/
├── agents/                    # Agent definitions
│   ├── react.agent.ts        # React development agent
│   ├── typescript.agent.ts   # TypeScript development agent
│   └── common/               # Shared agent patterns
├── config/                   # System configuration
│   ├── orchestration.ts      # Main orchestration config
│   ├── models.ts            # Model selection config
│   └── security.ts          # Security and access patterns
├── credentials/              # Encrypted credential storage
│   ├── api-keys.enc         # Encrypted API keys
│   ├── tokens.enc           # Encrypted access tokens
│   └── backups/             # Credential backups
└── user-config.ts           # User-specific overrides
```

#### Configuration Loading Process

1. **System Defaults**: Basic operational defaults
2. **Environment Configuration**: Development/staging/production settings
3. **Project Configuration**: Team-shared settings in .ai-code/config/
4. **User Configuration**: Personal overrides in .ai-code/user-config.ts
5. **Runtime Overrides**: Highest priority runtime modifications

#### Configuration Examples

```typescript
// .ai-code/config/orchestration.ts
import type { OrchestrationConfig } from '@ai-code/core';
import { reactAgent } from '../agents/react.agent.js';
import { typescriptAgent } from '../agents/typescript.agent.js';

export const orchestrationConfig: OrchestrationConfig = {
  agents: [reactAgent, typescriptAgent],
  defaultPermissions: {
    requireExplicitToolGrants: true
  },
  accessPatterns: {
    enabled: true,
    enableCaching: true,
    maxCacheSize: 2000
  },
  logging: {
    level: 'info',
    logCommunications: true,
    logModelSelection: true,
    logAccessPatterns: false
  },
  modelSelection: {
    defaultModel: AIModel.CLAUDE_3_5_SONNET,
    selectionStrategy: 'balanced',
    autoMode: {
      enabled: true,
      costThreshold: 0.1,
      performanceThreshold: 7
    }
  }
};

// .ai-code/user-config.ts
import type { UserConfig } from '@ai-code/core';

export const userConfig: UserConfig = {
  logging: { level: 'debug' },
  modelSelection: {
    defaultModel: AIModel.CLAUDE_3_OPUS,
    autoMode: { enabled: false }
  }
};

// .ai-code/agents/react.agent.ts
import type { AgentCapability } from '@ai-code/core';
import { CommonTools, FileSystemAccessPattern } from '@ai-code/core';

export const reactAgent: AgentCapability = {
  id: 'react-dev',
  name: 'React Development Agent',
  description: 'Specialized for React component development',
  tools: [...CommonTools.createReactTools()],
  endpoints: [
    { name: 'question', description: 'Answer React questions' },
    { name: 'validate', description: 'Validate React components' }
  ]
};
```

#### Using the Configuration System

```typescript
import { CoreOrchestrator } from '@ai-code/core';

// Initialize with configuration files
const orchestrator = await CoreOrchestrator.createWithConfig(
  process.cwd(), // Base directory
  { 
    environment: 'development',
    enableHotReload: true,
    validateOnLoad: true
  }
);

// Initialize credentials
await orchestrator.initializeCredentials('master-password');

// Store API credentials
await orchestrator.storeCredential('anthropic', 'sk-ant-...');
await orchestrator.storeCredential('openai', 'sk-...');

// Enable hot reloading for development
await orchestrator.enableHotReload();

// Update configuration programmatically
await orchestrator.updateConfiguration('user', {
  logging: { level: 'debug' }
});

// Add new agent configuration
await orchestrator.addAgentConfiguration({
  id: 'test-agent',
  name: 'Testing Agent',
  description: 'Automated testing agent',
  tools: [...CommonTools.createTestTools()],
  endpoints: [
    { name: 'test', description: 'Run tests' }
  ]
});
```

#### Security and Validation

```typescript
// Built-in security patterns
import { 
  createSecurityPattern, 
  DEFAULT_SECURITY_PATTERNS,
  SecurityLevel 
} from '@ai-code/core';

// Apply security patterns to agents
const secureAgent: AgentCapability = {
  id: 'secure-agent',
  name: 'Security-Validated Agent',
  description: 'Agent with comprehensive security checks',
  accessPatterns: [
    createSecurityPattern(
      'secure-dev-access',
      'Secure development file access',
      80,
      ['src/**/*.ts', 'src/**/*.tsx', 'test/**/*'],
      [/* additional custom security checks */]
    )
  ],
  tools: [...CommonTools.createReactTools()],
  endpoints: [/* ... */]
};

// Security audit reporting
const securityReport = orchestrator.getSecurityAuditReport({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  end: new Date()
});

console.log('Security Report:', {
  totalEvents: securityReport.totalEvents,
  deniedEvents: securityReport.deniedEvents,
  criticalEvents: securityReport.criticalEvents,
  topAgents: securityReport.topAgents,
  securityTrends: securityReport.securityTrends
});
```

#### Environment-Specific Configuration

```typescript
// Automatic environment detection and configuration
const config = await orchestrator.loadConfiguration({
  environment: process.env.NODE_ENV, // 'development', 'staging', 'production'
  validateOnLoad: true
});

// Different settings per environment
if (process.env.NODE_ENV === 'production') {
  await orchestrator.updateConfiguration('orchestration', {
    logging: { level: 'warn', logCommunications: false },
    modelSelection: {
      autoMode: { costThreshold: 0.02 } // Stricter cost control
    }
  });
}
```

#### Configuration Validation

```typescript
// Validate configuration
const validation = await orchestrator.validateConfiguration();

if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  console.warn('Configuration warnings:', validation.warnings);
}

console.log('Loaded components:', validation.loadedComponents);
console.log('Suggestions:', validation.suggestions);

// Get configuration statistics
const stats = orchestrator.getConfigurationStats();
console.log('Configuration stats:', {
  totalAgents: stats.totalAgents,
  totalProviders: stats.totalProviders,
  hotReloadEnabled: stats.hotReloadEnabled,
  cacheHitRate: stats.cacheHitRate
});
```

### Inter-Agent Communication

Agents communicate through a structured messaging system:

**Question Protocol:**
```typescript
// Ask a specific agent
const response = await orchestrator.askQuestion(
  'typescript-agent',
  {
    question: 'What interfaces are defined in this module?',
    context: { filePaths: ['src/types.ts'] }
  },
  'react-agent'
);

// Broadcast to all relevant agents
const responses = await orchestrator.askQuestion(
  'orchestrator',
  {
    question: 'How should I implement authentication?',
    context: { domain: 'security' }
  }
);
```

**Message Types:**
- `question`: Request information or advice
- `validate`: Request validation of code or structure
- `transform`: Request transformation of data or code
- `handle`: Request processing of an operation

### Request Routing

The orchestrator automatically routes requests based on:

1. **Access Pattern Analysis**: Determines responsible agent via pattern matching
2. **Operation Type**: Routes to agents with appropriate endpoints
3. **Permission Checks**: Ensures requesting agent has necessary access
4. **Fallback Logic**: Handles cases where no specific agent is responsible

## Usage Examples

### Basic Setup

```typescript
import { 
  createOrchestrator, 
  ToolFactory,
  CommonTools,
  AIModel, 
  DEFAULT_MODEL_CONFIGS, 
  DEFAULT_AUTO_MODE_CONFIG,
  FileSystemAccessPattern,
  CustomAccessPattern,
  AccessPattern
} from './core/index.js';

const orchestrator = createOrchestrator({
  defaultPermissions: {
    requireExplicitToolGrants: true
  },
  accessPatterns: {
    enabled: true,
    enableCaching: true,
    maxCacheSize: 1000,
    globalPatterns: [
      {
        id: 'global-config-read',
        description: 'Allow all agents to read config files',
        filePatterns: ['**/*.config.*', '**/config/**/*'],
        operations: [OperationType.READ_FILE],
        allow: true,
        priority: 5
      }
    ]
  },
  logging: {
    level: 'info',
    logCommunications: true,
    logModelSelection: true,
    logAccessPatterns: true
  },
  modelSelection: {
    availableModels: DEFAULT_MODEL_CONFIGS,
    autoMode: {
      ...DEFAULT_AUTO_MODE_CONFIG,
      enabled: true,
      costThreshold: 0.05,
      operationPreferences: {
        [OperationType.QUESTION]: [AIModel.CLAUDE_3_OPUS, AIModel.CLAUDE_3_5_SONNET],
        [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO]
      }
    },
    defaultModel: AIModel.CLAUDE_3_5_SONNET,
    selectionStrategy: 'balanced'
  }
});

// Register agents with tool-based configuration
// (You would create your own agents using the tool factory methods)
```

### Custom Agent Registration with Access Patterns

```typescript
// Define a custom security access pattern class
class SecurityAccessPattern extends AccessPattern<FileAccessContext> {
  readonly id = 'security-pattern';
  readonly description = 'Security-aware access pattern';
  readonly priority = 100;

  async appliesTo(context: FileAccessContext): Promise<boolean> {
    return context.filePath.includes('security') || 
           context.filePath.includes('auth') ||
           context.filePath.includes('password');
  }

  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    // Only allow read operations on security files
    if (context.operation !== OperationType.READ_FILE) {
      return {
        allowed: false,
        reason: 'Only read operations allowed on security files',
        metadata: { securityLevel: 'restricted' }
      };
    }

    return {
      allowed: true,
      reason: 'Security file read access granted',
      metadata: { securityLevel: 'monitored' }
    };
  }
}

// Define a custom database validation pattern
class DatabaseValidationPattern extends AccessPattern<FileAccessContext> {
  readonly id = 'database-validation';
  readonly description = 'Database file validation';
  readonly priority = 60;
  
  async appliesTo(context: FileAccessContext): Promise<boolean> {
    return context.filePath.endsWith('.sql');
  }
  
  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    if (context.operation === OperationType.EDIT_FILE) {
      // Check if it's a migration file
      if (context.filePath.includes('migration')) {
        // Additional validation for migrations
        const isSafeOperation = await this.checkMigrationSafety(context.filePath);
        if (!isSafeOperation) {
          return {
            allowed: false,
            reason: 'Unsafe migration detected',
            patternId: this.id
          };
        }
      }
    }
    
    return {
      allowed: true,
      reason: 'Database operation validated',
      patternId: this.id
    };
  }
  
  private async checkMigrationSafety(filePath: string): Promise<boolean> {
    // Implementation for migration safety checks
    return true;
  }
}

const customAgent: AgentCapability = {
  id: 'database-agent',
  name: 'Database Management Agent',
  description: 'Handles database schemas and migrations with advanced security',
  accessPatterns: [
    // File system patterns
    new FileSystemAccessPattern(
      'database-files',
      'Database schema and migration files',
      50,
      ['**/migrations/**/*', '**/schemas/**/*', '**/*.sql'],
      true,
      [OperationType.READ_FILE, OperationType.EDIT_FILE]
    ),
    new FileSystemAccessPattern(
      'config-files',
      'Database configuration files',
      30,
      ['**/database.config.*', '**/db-config.*'],
      true,
      [OperationType.READ_FILE]
    ),
    // Custom validation pattern
    new DatabaseValidationPattern(),
    // Security pattern
    new SecurityAccessPattern()
  ],
  tools: [
    AgentTool.READ_LOCAL,
    AgentTool.READ_GLOBAL,
    AgentTool.EDIT_FILES,
    AgentTool.CREATE_FILES,
    AgentTool.DELETE_FILES,
    AgentTool.EXECUTE_COMMANDS,
    AgentTool.INTER_AGENT_COMMUNICATION
  ],
  endpoints: [
    { name: 'question', description: 'Answer database questions' },
    { name: 'migrate', description: 'Run database migrations' },
    { name: 'validate', description: 'Validate schema definitions' }
  ]
};

orchestrator.registerAgent(customAgent, async (request) => {
  // Custom request handler implementation
  switch (request.type) {
    case OperationType.READ_FILE:
      // Handle file reading with security logging
      console.log(`Database agent reading: ${request.filePath}`);
      break;
    case OperationType.EDIT_FILE:
      // Handle file editing with backup
      await createBackup(request.filePath);
      break;
    case OperationType.QUESTION:
      // Handle database questions
      break;
    default:
      throw new Error(`Unsupported operation: ${request.type}`);
  }
});

async function checkMigrationSafety(filePath: string): Promise<boolean> {
  // Implementation for migration safety checks
  return true;
}

async function createBackup(filePath: string): Promise<void> {
  // Implementation for creating backups
}
```

### File Operations

```typescript
import { OperationType, generateRequestId } from './core/index.js';

// Read a file (automatically routed to responsible agent with model selection)
const response = await orchestrator.executeRequest({
  type: OperationType.READ_FILE,
  filePath: 'src/components/Button.tsx',
  payload: {},
  requestId: generateRequestId()
});

// Edit a file (requires write permissions, auto-selects appropriate model)
const editResponse = await orchestrator.executeRequest({
  type: OperationType.EDIT_FILE,
  filePath: 'src/components/Button.tsx',
  payload: {
    oldContent: 'const Button = () => {',
    newContent: 'const Button: React.FC<ButtonProps> = () => {',
    priority: 8 // High priority for complex edits
  },
  requestId: generateRequestId()
});

// The response includes model selection metadata
console.log('Selected model:', editResponse.metadata?.selectedModel);
console.log('Model confidence:', editResponse.metadata?.modelSelectionConfidence);
console.log('Estimated cost:', editResponse.metadata?.estimatedCost);
```

### Model Selection Operations

```typescript
// Manual model selection for specific operation
const modelResult = orchestrator.selectModelForOperation(
  OperationType.TRANSFORM,
  'typescript-agent',
  {
    complexity: 9,
    contextLength: 150000,
    priority: 10,
    maxCost: 0.20,
    requiredCapabilities: {
      reasoning: 9,
      codeGeneration: 9,
      accuracy: 10
    }
  }
);

console.log('Selected model:', modelResult.selectedModel);
console.log('Selection reason:', modelResult.reason);
console.log('Confidence:', modelResult.confidence);

// Get model selection configuration and statistics
const modelConfig = orchestrator.getModelSelectionConfig();
console.log('Available models:', modelConfig.availableModels.length);
console.log('Auto mode enabled:', modelConfig.autoModeConfig.enabled);
console.log('Selection stats:', modelConfig.selectionStats);

// Update model selection configuration
orchestrator.updateModelSelectionConfig({
  autoModeConfig: {
    costThreshold: 0.15,
    performanceThreshold: 8,
    operationPreferences: {
      [OperationType.QUESTION]: [AIModel.CLAUDE_3_OPUS]
    }
  },
  defaultModel: AIModel.GPT_4_TURBO,
  selectionStrategy: 'performance-optimized'
});
```

### Access Pattern Management

```typescript
// Add global access patterns
orchestrator.addGlobalAccessPattern(
  new FileSystemAccessPattern(
    'emergency-access',
    'Emergency read access for all agents',
    1000, // high priority
    ['**/emergency/**/*'],
    true, // allow
    [OperationType.READ_FILE]
  )
);

// Add audit pattern using custom class
class AuditAccessPattern extends AccessPattern<FileAccessContext> {
  readonly id = 'audit-logger';
  readonly description = 'Audit all file operations';
  readonly priority = 1; // low priority, runs after other patterns
  
  async appliesTo(context: FileAccessContext): Promise<boolean> {
    return true; // Apply to all file operations
  }
  
  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    // Log all file operations for audit
    console.log(`AUDIT: ${context.agentId} performing ${context.operation} on ${context.filePath}`);
    
    return {
      allowed: true,
      reason: 'Audit logged',
      patternId: this.id,
      metadata: { audited: true, timestamp: new Date() }
    };
  }
}

orchestrator.addGlobalAccessPattern(new AuditAccessPattern());

// Test access patterns for debugging
const testResult = await orchestrator.testAccessPattern(
  'database-agent',
  'src/migrations/001_create_users.sql',
  OperationType.EDIT_FILE
);

console.log('Access Pattern Result:', testResult.accessPatternResult);
console.log('Permission Result:', testResult.permissionResult);
console.log('Custom Rules Applied:', testResult.customRulesApplied);

// Get access pattern statistics
const stats = orchestrator.getAccessPatternStats();
console.log('Access Pattern Stats:', stats);

// Permission rules work with access patterns
orchestrator.permissionSystem.addPermissionRule({
  id: 'test-read-source',
  description: 'Allow test agent to read source files',
  agentId: 'test-agent',
  filePattern: 'src/**/*.ts',
  operations: [OperationType.READ_FILE],
  allow: true,
  priority: 50
});

// Check permissions (synchronous)
const permission = orchestrator.permissionSystem.checkPermission(
  'test-agent',
  OperationType.READ_FILE,
  'src/utils/helpers.ts'
);

// Check permissions with access patterns (async)
const asyncPermission = await orchestrator.permissionSystem.checkPermissionAsync(
  'test-agent',
  OperationType.READ_FILE,
  'src/utils/helpers.ts'
);

if (asyncPermission.allowed) {
  // Proceed with operation
}
```

## Configuration

### Orchestration Config

```typescript
interface OrchestrationConfig {
  agents: AgentCapability[];
  defaultPermissions: {
    requireExplicitToolGrants: boolean;
  };
  accessPatterns?: {
    enabled: boolean;
    globalPatterns?: AccessPattern[];
    enableCaching?: boolean;
    maxCacheSize?: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logCommunications: boolean;
    logModelSelection?: boolean;
    logAccessPatterns?: boolean;
  };
  modelSelection?: {
    availableModels: ModelConfig[];
    autoMode: AutoModeConfig;
    defaultModel: AIModel;
    selectionStrategy: 'cost-optimized' | 'performance-optimized' | 'balanced' | 'custom';
    customWeights?: {
      cost: number;
      speed: number;
      quality: number;
      accuracy: number;
    };
  };
}
```

### Access Patterns Config

```typescript
interface AccessPatternsConfig {
  /** Enable the access patterns system */
  enabled: boolean;
  /** Global access patterns that apply to all agents */
  globalPatterns?: AccessPattern[];
  /** Cache access pattern evaluations for performance */
  enableCaching?: boolean;
  /** Maximum cache size for access pattern evaluations */
  maxCacheSize?: number;
}

// Generic base class for all access patterns
abstract class AccessPattern<TContext extends AccessContext = AccessContext> {
  abstract readonly id: string;
  abstract readonly description: string;
  abstract readonly priority: number;
  abstract validate(context: TContext): AccessPatternResult | Promise<AccessPatternResult>;
  abstract appliesTo(context: TContext): boolean | Promise<boolean>;
}

// Generic context for any resource type
interface AccessContext<TResource = any> {
  resource: TResource;
  operation: string;
  requesterId: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

// Specialized context for file system access
interface FileAccessContext extends AccessContext<FilePath> {
  filePath: FilePath;
  operation: OperationType;
  agentId: AgentId;
}
```

### Model Selection Config

```typescript
interface ModelConfig {
  model: AIModel;
  name: string;
  description: string;
  capabilities: ModelCapabilities;
  available: boolean;
  provider: string;
  endpoint?: string;
  options?: Record<string, any>;
}

interface AutoModeConfig {
  enabled: boolean;
  preferredModels: AIModel[];
  costThreshold?: number;
  performanceThreshold?: number;
  contextLengthThreshold?: number;
  operationPreferences?: Partial<Record<OperationType, AIModel[]>>;
  agentPreferences?: Record<AgentId, AIModel[]>;
  fallbackModel: AIModel;
}
```

### Agent Capabilities

```typescript
interface AgentCapability {
  id: string;                           // Unique agent identifier
  name: string;                         // Human-readable name
  description: string;                  // Purpose description
  accessPatterns: AccessPattern[];      // Class-based access patterns
  tools: AgentTool[];                   // Granted tools for operations
  endpoints: AgentEndpoint[];           // Available operations
}
```

## Events and Monitoring

The system emits events for monitoring and debugging:

```typescript
orchestrator.on('requestReceived', (request) => {
  console.log(`Request received: ${request.type} for ${request.filePath}`);
});

orchestrator.on('permissionDenied', (request, reason) => {
  console.log(`Permission denied: ${reason}`);
});

orchestrator.on('agentRegistered', (agent) => {
  console.log(`Agent registered: ${agent.id}`);
});

// Model selection events
orchestrator.on('modelSelected', (criteria, result) => {
  console.log(`Model selected: ${result.selectedModel} for ${criteria.operationType}`);
  console.log(`Selection reason: ${result.reason}`);
  console.log(`Confidence: ${result.confidence.toFixed(2)}`);
});

orchestrator.on('modelSelectionFailed', (criteria, error) => {
  console.log(`Model selection failed for ${criteria.operationType}: ${error}`);
});

orchestrator.on('autoModeTriggered', (criteria) => {
  console.log(`Auto mode triggered for ${criteria.operationType}`);
});
```

## Error Handling

The system provides comprehensive error handling:

- **Permission Errors**: Clear messages about access violations
- **Routing Errors**: Information about missing responsible agents
- **Communication Errors**: Details about failed inter-agent messages
- **Validation Errors**: Specific validation failure reasons

## Performance Considerations

- **Pattern Matching**: Uses efficient matching algorithms for access patterns
- **Caching**: Agent lookups and pattern evaluations are optimized for repeated access
- **Memory Management**: History buffers are automatically trimmed
- **Async Operations**: All operations are non-blocking

## Best Practices

### Agent Design

1. **Single Responsibility**: Each agent should have a clear, focused purpose
2. **Minimal Overlap**: Avoid overlapping access patterns between agents
3. **Clear Interfaces**: Define explicit endpoints for each agent
4. **Error Handling**: Implement robust error handling in request handlers

### Permission Configuration

1. **Principle of Least Privilege**: Grant minimal necessary permissions
2. **Explicit Rules**: Use custom rules for special cases
3. **Audit Logging**: Enable logging for security monitoring
4. **Regular Review**: Periodically review permission grants

### Communication Patterns

1. **Question First**: Use questions before making assumptions
2. **Context Rich**: Provide detailed context in requests
3. **Async Aware**: Design for asynchronous communication
4. **Error Resilient**: Handle communication failures gracefully

### Configuration Management Best Practices

#### File Organization

1. **Logical Grouping**: Group related agents in the agents/ directory
2. **Descriptive Names**: Use clear, descriptive names for agent files (e.g., `react.agent.ts`)
3. **Common Patterns**: Share reusable patterns in the common/ directory
4. **Environment Separation**: Use environment-specific configurations
5. **Version Control**: Include .ai-code/ in version control (except credentials/)

#### Security Practices

1. **Credential Isolation**: Never commit API keys or credentials to version control
2. **Strong Master Password**: Use a strong master password for credential encryption
3. **Regular Rotation**: Enable automatic credential rotation for production
4. **Access Pattern Validation**: Use security patterns to validate agent access
5. **Audit Monitoring**: Regularly review security audit logs

#### Development Workflow

1. **Hot Reload**: Enable hot reloading during development for productivity
2. **Validation**: Always validate configuration before deployment
3. **Testing**: Test configuration changes in staging environments
4. **Backup**: Regular backup of configuration and credentials
5. **Documentation**: Document custom configurations and patterns

#### Configuration Examples

```typescript
// Good: Clear, secure agent configuration
export const databaseAgent: AgentCapability = {
  id: 'database-manager',
  name: 'Database Management Agent',
  description: 'Handles database operations with security validation',
  accessPatterns: [
    createSecurityPattern(
      'db-access',
      'Secure database file access',
      90,
      ['**/migrations/**/*', '**/schemas/**/*', '**/*.sql'],
      [customDatabaseSecurityChecks]
    )
  ],
  tools: [
    ...CommonTools.createDatabaseTools(),
    new CommunicationTool({ id: 'db-comm' })
  ],
  endpoints: [
    { name: 'migrate', description: 'Run database migrations' },
    { name: 'validate', description: 'Validate schema definitions' }
  ]
};

// Good: Environment-aware configuration
export const orchestrationConfig: OrchestrationConfig = {
  agents: [databaseAgent, reactAgent, typescriptAgent],
  defaultPermissions: {
    requireExplicitToolGrants: true // Always secure by default
  },
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    logCommunications: process.env.NODE_ENV !== 'production',
    logModelSelection: true,
    logAccessPatterns: process.env.NODE_ENV === 'development'
  },
  modelSelection: {
    defaultModel: AIModel.CLAUDE_3_5_SONNET,
    selectionStrategy: process.env.NODE_ENV === 'production' 
      ? 'cost-optimized' 
      : 'balanced',
    autoMode: {
      enabled: true,
      costThreshold: process.env.NODE_ENV === 'production' ? 0.02 : 0.1
    }
  }
};

// Good: User configuration overrides
export const userConfig: UserConfig = {
  // Personal preferences that don't affect security
  logging: { level: 'debug' },
  modelSelection: {
    defaultModel: AIModel.CLAUDE_3_OPUS, // User prefers higher quality
    customWeights: {
      cost: 0.1,     // User prioritizes quality over cost
      quality: 0.6,
      speed: 0.2,
      accuracy: 0.1
    }
  }
};
```

#### Common Pitfalls to Avoid

❌ **Don't**: Store credentials in configuration files
```typescript
// BAD - Never do this
export const config = {
  apiKey: 'sk-ant-1234567890' // Exposed in version control
};
```

✅ **Do**: Use the credential manager
```typescript
// GOOD - Use encrypted storage
await orchestrator.storeCredential('anthropic', apiKey);
const apiKey = await orchestrator.getCredential('anthropic');
```

❌ **Don't**: Give agents overly broad access
```typescript
// BAD - Too permissive
const agent: AgentCapability = {
  accessPatterns: [
    new FileSystemAccessPattern('all-access', 'All files', 1, ['**/*'], true)
  ]
};
```

✅ **Do**: Use specific, security-validated patterns
```typescript
// GOOD - Specific and secure
const agent: AgentCapability = {
  accessPatterns: [
    createSecurityPattern(
      'react-dev-access',
      'React development files only',
      50,
      ['src/**/*.tsx', 'src/**/*.jsx', 'test/**/*.test.*']
    )
  ]
};
```

❌ **Don't**: Disable security features
```typescript
// BAD - Compromises security
export const config = {
  defaultPermissions: { requireExplicitToolGrants: false },
  security: { audit: { enabled: false } }
};
```

✅ **Do**: Keep security enabled with appropriate logging
```typescript
// GOOD - Security-first approach
export const config = {
  defaultPermissions: { requireExplicitToolGrants: true },
  security: {
    audit: { 
      enabled: true, 
      logLevel: 'denied',
      retentionPeriod: 90 
    }
  }
};
```

## Model Selection Best Practices

### Selection Strategy Configuration

1. **Cost-Optimized Strategy**: Use for production environments with tight budgets
   ```typescript
   modelSelection: {
     selectionStrategy: 'cost-optimized',
     autoMode: {
       costThreshold: 0.01,
       preferredModels: [AIModel.CLAUDE_3_HAIKU, AIModel.GPT_3_5_TURBO]
     }
   }
   ```

2. **Performance-Optimized Strategy**: Use for high-quality outputs where cost is secondary
   ```typescript
   modelSelection: {
     selectionStrategy: 'performance-optimized',
     autoMode: {
       performanceThreshold: 9,
       preferredModels: [AIModel.CLAUDE_3_OPUS, AIModel.GPT_4_TURBO]
     }
   }
   ```

3. **Balanced Strategy**: Use for general-purpose applications
   ```typescript
   modelSelection: {
     selectionStrategy: 'balanced',
     autoMode: {
       costThreshold: 0.05,
       performanceThreshold: 7,
       preferredModels: [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO]
     }
   }
   ```

### Operation-Specific Recommendations

- **Simple Operations** (READ_FILE, DELETE_FILE): Use fast, cost-effective models like Claude 3 Haiku
- **Code Generation** (WRITE_FILE, EDIT_FILE): Use balanced models like Claude 3.5 Sonnet
- **Complex Analysis** (VALIDATE, TRANSFORM): Use high-capability models like Claude 3 Opus
- **Questions**: Use reasoning-optimized models based on complexity

### Agent-Specific Preferences

Configure different models for different agent types based on their specialization:
```typescript
agentPreferences: {
  'typescript-agent': [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO],
  'react-agent': [AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_HAIKU],
  'test-agent': [AIModel.GPT_4_TURBO, AIModel.CLAUDE_3_5_SONNET],
  'docs-agent': [AIModel.CLAUDE_3_OPUS, AIModel.GPT_4_TURBO]
}
```

## Troubleshooting

### Access Pattern Issues

1. **Pattern Not Matching**
   - Verify file path normalization (paths are normalized to remove leading slashes)
   - Check pattern priority - higher priority patterns override lower ones
   - Test pattern with debugging: `orchestrator.testAccessPattern(agentId, filePath, operation)`
   - Enable access pattern logging: `logAccessPatterns: true` in config

2. **Performance Issues**
   - Enable caching: `accessPatterns.enableCaching: true`
   - Increase cache size: `accessPatterns.maxCacheSize: 2000`
   - Simplify complex function patterns for high-volume operations
   - Monitor cache hit rates: `orchestrator.getAccessPatternStats().cacheStats`

3. **Function Pattern Errors**
   - Wrap async operations in try-catch blocks
   - Return proper AccessPatternResult objects
   - Set reasonable timeouts for external calls
   - Log errors within custom functions for debugging

4. **Class Pattern Issues**
   - Ensure class extends AccessPatternClass properly
   - Implement all abstract methods (id, description, priority, validate, appliesTo)
   - Handle async operations correctly in validate() method
   - Test class instances before registering

### Debugging Access Patterns

```typescript
// Enable detailed logging
orchestrator.updateConfig({
  logging: {
    level: 'debug',
    logAccessPatterns: true
  }
});

// Test specific access patterns
const debugResult = await orchestrator.testAccessPattern(
  'my-agent',
  'src/components/Button.tsx',
  OperationType.EDIT_FILE
);

console.log('Access Pattern Debug:', {
  allowed: debugResult.accessPatternResult.allowed,
  reason: debugResult.accessPatternResult.reason,
  patternId: debugResult.accessPatternResult.patternId,
  metadata: debugResult.accessPatternResult.metadata
});

// Check agent pattern configuration
const agent = orchestrator.getAgent('my-agent');
console.log('Agent patterns:', {
  hasAccessPatterns: !!agent?.accessPatterns?.length,
  patternCount: agent?.accessPatterns?.length || 0
});

// Get system-wide statistics
const stats = orchestrator.getAccessPatternStats();
console.log('System Stats:', stats);
```

### Model Selection Issues

1. **No Model Selected**
   - Check if auto mode is enabled in configuration
   - Verify that at least one model is marked as available
   - Ensure cost thresholds are not too restrictive
   - Check if preferred models list is empty

2. **Unexpected Model Selection**
   - Review operation-specific preferences
   - Check agent-specific preferences
   - Verify complexity and context length estimations
   - Review cost thresholds and performance requirements

3. **Model Selection Performance**
   - Monitor selection time in metadata
   - Consider caching frequently used selections
   - Reduce complexity of scoring algorithms for high-volume use cases
   - Use simpler models for low-priority operations

4. **Cost Overruns**
   - Lower cost thresholds in auto mode configuration
   - Prioritize cost-effective models in preferences
   - Set maximum cost limits per operation
   - Monitor actual vs estimated costs

### Common Issues

1. **No Agent Found**
   - Check access patterns match target files
   - Verify agent registration completed successfully
   - Review pattern specificity (more specific patterns win)

2. **Permission Denied**
   - Check agent's tools array for required permissions
   - Review custom permission rules
   - Verify file path matches agent's patterns

3. **Communication Failures**
   - Ensure target agent has required endpoint
   - Check agent registration and handler setup
   - Review message payload structure

### Debugging Tools

```typescript
// Get system statistics (includes model selection stats)
const stats = orchestrator.getStats();
console.log('System Stats:', stats);
console.log('Model Usage:', stats.modelSelectionStats.modelUsage);
console.log('Average Cost:', stats.modelSelectionStats.averageCost);

// Review permission audit log
const auditLog = orchestrator.permissionSystem.getAuditLog();
console.log('Recent Permissions:', auditLog);

// Check communication history
const commStats = orchestrator.communicationSystem.getStats();
console.log('Communication Stats:', commStats);

// Model selection debugging
const modelConfig = orchestrator.getModelSelectionConfig();
console.log('Available Models:', modelConfig.availableModels.map(m => m.model));
console.log('Auto Mode Config:', modelConfig.autoModeConfig);
console.log('Selection History:', modelConfig.selectionHistory);
console.log('Selection Stats:', modelConfig.selectionStats);

// Test model selection for specific scenarios
const testSelection = orchestrator.selectModelForOperation(
  OperationType.TRANSFORM,
  'typescript-agent',
  { complexity: 8, contextLength: 100000, priority: 9 }
);
console.log('Test Selection:', testSelection);
```

## Extension Points

The system is designed for extensibility:

- **Custom Agents**: Implement specialized agents for specific domains
- **Custom Operations**: Add new operation types beyond the built-in set
- **Custom Permissions**: Implement complex permission logic via custom rules
- **Event Handlers**: React to system events for logging, monitoring, or automation
- **Custom Models**: Add support for new AI models and providers
- **Custom Selection Logic**: Implement specialized model selection algorithms
- **Model Adapters**: Create adapters for different AI service APIs
- **Cost Tracking**: Implement detailed cost tracking and budget management