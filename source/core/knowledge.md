# Core Orchestration System Knowledge

## Overview

The Core Orchestration System is a comprehensive framework for managing directory-based agent responsibilities, permissions, and inter-agent communication. This system uses a **tools-based permission model** that enables multiple specialized agents to work together while maintaining granular security controls and clear access boundaries.

## Key Changes: Tools-Based Permission System

The system has been refactored from simple boolean permissions (`canEdit`, `canReadGlobally`) to a more granular **tools-based approach**. This provides:

- **Granular Control**: Specific tools for different types of operations
- **Extensibility**: Easy addition of new tools and capabilities
- **Security**: Fine-grained permission management
- **Backward Compatibility**: Legacy boolean properties are still supported and automatically converted

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

4. **CoreOrchestrator** (`orchestrator.ts`)
   - Main coordination engine
   - Routes requests to appropriate agents
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
  ],
  // Legacy properties (automatically converted to tools if tools array is empty)
  canEdit: true,  // ← Deprecated, use tools array
  canReadGlobally: false  // ← Deprecated, use tools array
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
import { createOrchestrator, DefaultAgents, AgentTool } from './core/index.js';

const orchestrator = createOrchestrator({
  defaultPermissions: {
    defaultTools: [AgentTool.READ_LOCAL, AgentTool.INTER_AGENT_COMMUNICATION],
    requireExplicitToolGrants: true,
    // Legacy support (automatically converted)
    allowGlobalRead: false,
    requireExplicitWritePermission: true
  },
  logging: {
    level: 'info',
    logCommunications: true
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

// Read a file (automatically routed to responsible agent)
const response = await orchestrator.executeRequest({
  type: OperationType.READ_FILE,
  filePath: 'src/components/Button.tsx',
  payload: {},
  requestId: generateRequestId()
});

// Edit a file (requires write permissions)
const editResponse = await orchestrator.executeRequest({
  type: OperationType.EDIT_FILE,
  filePath: 'src/components/Button.tsx',
  payload: {
    oldContent: 'const Button = () => {',
    newContent: 'const Button: React.FC<ButtonProps> = () => {'
  },
  requestId: generateRequestId()
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
    allowGlobalRead: boolean;
    requireExplicitWritePermission: boolean;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logCommunications: boolean;
  };
}
```

### Agent Capabilities

```typescript
interface AgentCapability {
  id: string;                           // Unique agent identifier
  name: string;                         // Human-readable name
  description: string;                  // Purpose description
  directoryPatterns: string[];          // Glob patterns for responsibility
  canEdit: boolean;                     // Write permission flag
  canReadGlobally: boolean;             // Global read permission flag
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

## Troubleshooting

### Common Issues

1. **No Agent Found**
   - Check directory patterns match target files
   - Verify agent registration completed successfully
   - Review pattern specificity (more specific patterns win)

2. **Permission Denied**
   - Check agent's `canEdit` and `canReadGlobally` flags
   - Review custom permission rules
   - Verify file path matches agent's patterns

3. **Communication Failures**
   - Ensure target agent has required endpoint
   - Check agent registration and handler setup
   - Review message payload structure

### Debugging Tools

```typescript
// Get system statistics
const stats = orchestrator.getStats();
console.log('System Stats:', stats);

// Review permission audit log
const auditLog = orchestrator.permissionSystem.getAuditLog();
console.log('Recent Permissions:', auditLog);

// Check communication history
const commStats = orchestrator.communicationSystem.getStats();
console.log('Communication Stats:', commStats);
```

## Extension Points

The system is designed for extensibility:

- **Custom Agents**: Implement specialized agents for specific domains
- **Custom Operations**: Add new operation types beyond the built-in set
- **Custom Permissions**: Implement complex permission logic via custom rules
- **Event Handlers**: React to system events for logging, monitoring, or automation

## Migration Guide

When upgrading or migrating:

1. **Backup Configuration**: Save agent configurations and custom rules
2. **Test Permissions**: Verify permission rules work as expected
3. **Validate Patterns**: Ensure directory patterns match intended files
4. **Monitor Events**: Watch for permission or routing issues during transition