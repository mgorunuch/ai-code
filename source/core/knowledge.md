# Core Orchestration System Knowledge

## Overview

The Core Orchestration System is a comprehensive framework for managing directory-based agent responsibilities, permissions, inter-agent communication, and **intelligent AI model selection**. This system uses a **tools-based permission model** and **automated model selection** that enables multiple specialized agents to work together while maintaining granular security controls, clear access boundaries, and optimal performance through dynamic model routing.

## Key Features: Tools-Based Permission System

The system uses a **tools-based approach** for managing agent permissions. This provides:

- **Granular Control**: Specific tools for different types of operations
- **Extensibility**: Easy addition of new tools and capabilities
- **Security**: Fine-grained permission management
- **Clean Architecture**: No legacy compatibility layers

## AI Model Selection System

The system now includes comprehensive **AI model selection** capabilities with auto mode functionality:

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
   - Maps agents to directory patterns using glob matching
   - Provides agent lookup and responsibility determination

2. **PermissionSystem** (`permissions.ts`)
   - Enforces directory-based access controls
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

## Key Features

### Directory-Based Responsibility

Each agent is assigned responsibility for specific directory patterns using glob syntax:

```typescript
const agent: AgentCapability = {
  id: 'react-agent',
  name: 'React Frontend Agent',
  directoryPatterns: [
    '**/*.tsx',
    '**/*.jsx', 
    '**/components/**',
    '**/pages/**'
  ],
  tools: [
    AgentTool.READ_LOCAL,
    AgentTool.EDIT_FILES,
    AgentTool.CREATE_FILES,
    AgentTool.DELETE_FILES,
    AgentTool.INTER_AGENT_COMMUNICATION
  ],
  endpoints: [
    { name: 'question', description: 'Answer React-related questions' }
  ]
};
```

**Pattern Matching Rules:**
- `**` matches any number of directories
- `*` matches any single directory or filename segment
- `!pattern` excludes matching paths
- More specific patterns take precedence over general ones

### Tools-Based Permission System

The system enforces granular access controls through tools:

**Available Tools:**
- `READ_LOCAL`: Read files within assigned directories
- `READ_GLOBAL`: Read files globally across all directories
- `EDIT_FILES`: Edit existing files within assigned directories
- `CREATE_FILES`: Create new files within assigned directories
- `DELETE_FILES`: Delete files within assigned directories
- `CREATE_DIRECTORIES`: Create new directories within assigned patterns
- `EXECUTE_COMMANDS`: Execute system commands (restricted)
- `NETWORK_ACCESS`: Access network resources
- `INTER_AGENT_COMMUNICATION`: Communicate with other agents

**Permission Rules:**
- Agents must have specific tools to perform operations
- Tools are mapped to operations (e.g., `EDIT_FILE` operation requires `EDIT_FILES` tool)
- Global access requires `READ_GLOBAL` tool instead of local read access
- All tool usage is logged for audit purposes

**Custom Rules with Tools:**
```typescript
const rule: PermissionRule = {
  id: 'allow-config-read',
  description: 'Allow all agents to read config files globally',
  agentId: '*',  // Apply to all agents
  filePattern: '**/*.config.*',
  operations: [OperationType.READ_FILE],
  tools: [AgentTool.READ_GLOBAL],  // Specific tool requirement
  allow: true,
  priority: 100
};

// Tool-specific rule
const editRule: PermissionRule = {
  id: 'restrict-production-edits',
  description: 'Prevent editing production files',
  agentId: '*',
  filePattern: '**/production/**',
  operations: [OperationType.EDIT_FILE, OperationType.DELETE_FILE],
  tools: [AgentTool.EDIT_FILES, AgentTool.DELETE_FILES],
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

1. **File Path Analysis**: Determines responsible agent via pattern matching
2. **Operation Type**: Routes to agents with appropriate endpoints
3. **Permission Checks**: Ensures requesting agent has necessary access
4. **Fallback Logic**: Handles cases where no specific agent is responsible

## Usage Examples

### Basic Setup

```typescript
import { 
  createOrchestrator, 
  DefaultAgents, 
  AgentTool, 
  AIModel, 
  DEFAULT_MODEL_CONFIGS, 
  DEFAULT_AUTO_MODE_CONFIG 
} from './core/index.js';

const orchestrator = createOrchestrator({
  defaultPermissions: {
    defaultTools: [AgentTool.READ_LOCAL, AgentTool.INTER_AGENT_COMMUNICATION],
    requireExplicitToolGrants: true
  },
  logging: {
    level: 'info',
    logCommunications: true,
    logModelSelection: true
  },
  modelSelection: {
    availableModels: DEFAULT_MODEL_CONFIGS,
    autoMode: {
      ...DEFAULT_AUTO_MODE_CONFIG,
      enabled: true,
      costThreshold: 0.05, // Custom cost threshold
      operationPreferences: {
        [OperationType.QUESTION]: [AIModel.CLAUDE_3_OPUS, AIModel.CLAUDE_3_5_SONNET],
        [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO]
      }
    },
    defaultModel: AIModel.CLAUDE_3_5_SONNET,
    selectionStrategy: 'balanced'
  }
});

// Register pre-configured agents
orchestrator.registerAgent(DefaultAgents.createReactAgent());
orchestrator.registerAgent(DefaultAgents.createTypescriptAgent());
orchestrator.registerAgent(DefaultAgents.createTestAgent());
```

### Custom Agent Registration

```typescript
const customAgent: AgentCapability = {
  id: 'database-agent',
  name: 'Database Management Agent',
  description: 'Handles database schemas and migrations',
  directoryPatterns: [
    '**/migrations/**',
    '**/schemas/**',
    '**/*.sql'
  ],
  tools: [
    AgentTool.READ_LOCAL,
    AgentTool.READ_GLOBAL,  // Can read config files globally
    AgentTool.EDIT_FILES,
    AgentTool.CREATE_FILES,
    AgentTool.DELETE_FILES,
    AgentTool.EXECUTE_COMMANDS,  // For running migrations
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
      // Handle file reading
      break;
    case OperationType.QUESTION:
      // Handle questions
      break;
    default:
      throw new Error(`Unsupported operation: ${request.type}`);
  }
});
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

### Permission Management

```typescript
// Add custom permission rule
orchestrator.permissionSystem.addPermissionRule({
  id: 'test-read-source',
  description: 'Allow test agent to read source files',
  agentId: 'test-agent',
  filePattern: 'src/**/*.ts',
  operations: [OperationType.READ_FILE],
  allow: true,
  priority: 50
});

// Check permissions before operation
const permission = orchestrator.permissionSystem.checkPermission(
  'test-agent',
  OperationType.READ_FILE,
  'src/utils/helpers.ts'
);

if (permission.allowed) {
  // Proceed with operation
}
```

## Configuration

### Orchestration Config

```typescript
interface OrchestrationConfig {
  agents: AgentCapability[];
  defaultPermissions: {
    defaultTools: AgentTool[];
    requireExplicitToolGrants: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logCommunications: boolean;
    logModelSelection?: boolean;
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
  directoryPatterns: string[];          // Glob patterns for responsibility
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

- **Pattern Matching**: Uses efficient minimatch library for glob patterns
- **Caching**: Agent lookups are optimized for repeated access
- **Memory Management**: History buffers are automatically trimmed
- **Async Operations**: All operations are non-blocking

## Best Practices

### Agent Design

1. **Single Responsibility**: Each agent should have a clear, focused purpose
2. **Minimal Overlap**: Avoid overlapping directory patterns between agents
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
   - Check directory patterns match target files
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

## Migration Guide

When upgrading or migrating:

1. **Backup Configuration**: Save agent configurations, custom rules, and model settings
2. **Test Permissions**: Verify permission rules work as expected with tools-based system
3. **Validate Patterns**: Ensure directory patterns match intended files
4. **Configure Models**: Set up model selection configuration and test auto mode
5. **Monitor Events**: Watch for permission, routing, or model selection issues during transition
6. **Cost Monitoring**: Establish cost tracking and budget alerts for model usage
7. **Performance Testing**: Validate that model selection doesn't impact system performance

### Model Selection Migration Checklist

- [ ] Configure available models and their capabilities
- [ ] Set up auto mode with appropriate thresholds
- [ ] Define operation-specific model preferences
- [ ] Configure agent-specific model preferences
- [ ] Test model selection with various operation types
- [ ] Monitor cost implications of model choices
- [ ] Set up logging for model selection decisions
- [ ] Establish fallback models for error scenarios