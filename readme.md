# AI-Code

A modern agent orchestration framework featuring tool-based architecture with embedded access patterns, intelligent AI model selection, and comprehensive inter-agent communication.

## Features

- **Tool-Based Architecture**: Tools encapsulate both operations and access patterns for simplified configuration
- **Intelligent AI Model Selection**: Automated model selection with cost and performance optimization
- **Access Pattern System**: Sophisticated resource access control using extensible class-based patterns
- **Inter-Agent Communication**: Structured messaging and collaboration between specialized agents
- **Automatic Request Routing**: Smart routing based on tool capabilities and access patterns
- **Comprehensive Monitoring**: Detailed logging, auditing, and performance analytics
- **React CLI Interface**: Modern command-line interface built with Ink

## Key Features

### Tool-Based Architecture

The system uses a unified tool-based approach where tools combine operations and access patterns:

- **ReadTool**: Read files with specific access pattern restrictions
- **EditTool**: Edit existing files within defined access boundaries
- **CreateTool**: Create new files following access pattern rules
- **DeleteTool**: Remove files with pattern-based validation
- **CommunicationTool**: Enable inter-agent messaging and collaboration
- **CompositeTool**: Combine multiple tool capabilities into unified operations

### Access Pattern System

Sophisticated resource access control using extensible patterns:

- **FileSystemAccessPattern**: Control file and directory access with glob patterns
- **CustomAccessPattern**: Implement complex validation logic with custom functions
- **CompositeAccessPattern**: Combine multiple patterns with AND/OR logic
- **TimeBasedAccessPattern**: Add temporal restrictions to any base pattern
- **DatabaseTableAccessPattern**: Control database table operations
- **APIEndpointAccessPattern**: Manage REST API endpoint access

### AI Model Selection

Intelligent model selection with automatic optimization:

- **Multiple Model Support**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku, GPT-4 Turbo, GPT-3.5 Turbo
- **Auto Mode**: Automatic model selection based on operation complexity and requirements
- **Cost Optimization**: Balance cost and performance with configurable thresholds
- **Operation-Specific Preferences**: Optimized models for different operation types
- **Agent-Specific Configuration**: Tailored model selection per agent type

## Installation

```bash
npm install -g ai-code
```

## Usage

### CLI Interface

Start the interactive CLI:

```bash
ai-code
```

### Basic Setup

```typescript
import { 
  createOrchestrator, 
  ToolFactory, 
  CommonTools,
  FileSystemAccessPattern,
  AIModel,
  OperationType
} from 'ai-code';

// Create orchestrator with model selection
const orchestrator = createOrchestrator({
  modelSelection: {
    autoMode: {
      enabled: true,
      costThreshold: 0.05,
      preferredModels: [AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_HAIKU]
    },
    defaultModel: AIModel.CLAUDE_3_5_SONNET
  }
});

// Execute operations with automatic model selection
const response = await orchestrator.executeRequest({
  type: OperationType.EDIT_FILE,
  filePath: 'src/components/Button.tsx',
  payload: { complexity: 7 },
  requestId: generateRequestId()
});
```

### Tool-Based Agent Configuration

```typescript
import { 
  AgentCapability, 
  ReadTool, 
  EditTool, 
  CommunicationTool,
  FileSystemAccessPattern,
  OperationType 
} from 'ai-code';

// Create tools with embedded access patterns
const reactReadTool = new ReadTool({
  id: 'react-read',
  description: 'Read React component files',
  accessPatterns: [
    new FileSystemAccessPattern(
      'react-files',
      'React component access',
      50,
      ['**/*.tsx', '**/*.jsx', '**/components/**'],
      true,
      [OperationType.READ_FILE]
    )
  ]
});

const reactEditTool = new EditTool({
  id: 'react-edit',
  description: 'Edit React component files',
  accessPatterns: [
    new FileSystemAccessPattern(
      'react-edit-access',
      'React component editing',
      60,
      ['**/*.tsx', '**/*.jsx', '**/components/**'],
      true,
      [OperationType.EDIT_FILE]
    )
  ]
});

// Modern agent with tool-based configuration
const reactAgent: AgentCapability = {
  id: 'react-agent',
  name: 'React Development Agent',
  description: 'Specialized agent for React component development',
  tools: [
    reactReadTool,
    reactEditTool,
    new CommunicationTool({
      id: 'react-communication',
      description: 'React agent communication'
    })
  ],
  endpoints: [
    { name: 'question', description: 'Answer React development questions' },
    { name: 'validate', description: 'Validate React component structure' }
  ]
};

orchestrator.registerAgent(reactAgent);
```

### Quick Agent Creation

```typescript
import { ToolFactory, CommonTools } from 'ai-code';

// Use factory methods for common patterns
const typescriptAgent: AgentCapability = {
  id: 'typescript-agent',
  name: 'TypeScript Development Agent',
  description: 'Handles TypeScript development tasks',
  tools: [
    // Pre-configured tool sets
    ...CommonTools.createTypeScriptTools(),
    // Custom tools
    ToolFactory.createEditTool([
      '**/*.ts', '**/*.tsx', '**/src/**'
    ], {
      id: 'typescript-advanced-edit',
      description: 'Advanced TypeScript editing'
    })
  ],
  endpoints: [
    { name: 'question', description: 'TypeScript questions' },
    { name: 'transform', description: 'Code transformations' }
  ]
};
```

## Architecture

The AI-Code framework features a modern, tool-based architecture with several key components:

### Core Orchestrator
- Central coordination of all agent activities with intelligent model selection
- Advanced request routing based on tool capabilities and access patterns
- Comprehensive event emission for monitoring, debugging, and analytics

### Tool-Based System
- **Tools encapsulate operations and access patterns** in unified classes
- Simplified agent configuration through tool instances
- Extensible tool types for different resource access patterns
- Granular permission control at the tool level

### Access Pattern Engine
- **Class-based access patterns** for sophisticated resource control
- Support for file systems, databases, APIs, and custom resources
- Composite patterns with AND/OR logic for complex rules
- Time-based restrictions and custom validation functions

### AI Model Selection System
- **Intelligent model routing** based on operation type and complexity
- Cost optimization with configurable thresholds and preferences
- Agent-specific and operation-specific model preferences
- Automatic fallback handling and performance monitoring

### Agent Registry
- Maps agents to access patterns using sophisticated matching algorithms
- Discovers responsible agents through tool capability analysis
- Validates tool permissions and access pattern requirements

### Communication System
- Structured inter-agent messaging with question/answer protocols
- Domain expertise sharing between specialized agents
- Broadcast capabilities for multi-agent consultation and collaboration

## Configuration

### Orchestrator Configuration

```typescript
const orchestrator = createOrchestrator({
  // Access pattern configuration
  accessPatterns: {
    enabled: true,
    enableCaching: true,
    maxCacheSize: 1000
  },
  
  // AI model selection configuration
  modelSelection: {
    autoMode: {
      enabled: true,
      costThreshold: 0.05,
      performanceThreshold: 7,
      operationPreferences: {
        [OperationType.READ_FILE]: [AIModel.CLAUDE_3_HAIKU],
        [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET],
        [OperationType.QUESTION]: [AIModel.CLAUDE_3_OPUS]
      }
    },
    defaultModel: AIModel.CLAUDE_3_5_SONNET
  },
  
  // Logging and monitoring
  logging: {
    level: 'info',
    logCommunications: true,
    logModelSelection: true,
    logAccessPatterns: true
  }
});
```

### Access Pattern Configuration

Create sophisticated access control with class-based patterns:

```typescript
import { 
  FileSystemAccessPattern, 
  CustomAccessPattern,
  CompositeAccessPattern 
} from 'ai-code';

// File system pattern
const sourceFilePattern = new FileSystemAccessPattern(
  'source-files',
  'Source code files',
  50,
  ['src/**/*.ts', 'src/**/*.tsx'],
  true,
  [OperationType.READ_FILE, OperationType.EDIT_FILE]
);

// Custom validation pattern
const securityPattern = new CustomAccessPattern(
  'security-validation',
  'Security file validation',
  100,
  async (context) => context.filePath.includes('security'),
  async (context) => {
    // Custom security validation logic
    return {
      allowed: context.operation === OperationType.READ_FILE,
      reason: 'Security files are read-only'
    };
  }
);

// Composite pattern combining multiple rules
const combinedPattern = new CompositeAccessPattern(
  'combined-access',
  'Combined access rules',
  75,
  [sourceFilePattern, securityPattern],
  'AND'
);
```

### Model Selection Configuration

Configure intelligent model selection:

```typescript
const modelConfig = {
  autoMode: {
    enabled: true,
    preferredModels: [
      AIModel.CLAUDE_3_5_SONNET,
      AIModel.CLAUDE_3_HAIKU,
      AIModel.GPT_4_TURBO
    ],
    costThreshold: 0.10,
    operationPreferences: {
      [OperationType.READ_FILE]: [AIModel.CLAUDE_3_HAIKU],
      [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET],
      [OperationType.TRANSFORM]: [AIModel.CLAUDE_3_OPUS]
    },
    agentPreferences: {
      'typescript-agent': [AIModel.CLAUDE_3_5_SONNET],
      'react-agent': [AIModel.CLAUDE_3_5_SONNET],
      'test-agent': [AIModel.GPT_4_TURBO]
    }
  }
};
```

## Examples Directory

Comprehensive examples are available in the `examples/` directory:

### 📁 `examples/tool-based-agents.ts`
Complete demonstration of the modern tool-based system:
- Creating tools with embedded access patterns
- Agent configuration using tool instances
- Tool factory methods for quick setup
- Common tool patterns for different file types
- Agent migration from legacy systems

### 📁 `examples/access-patterns.ts`
Comprehensive access pattern examples:
- File system patterns for different file types
- Database table access patterns
- API endpoint access control
- Composite patterns with AND/OR logic
- Time-based restrictions and custom validation

### 📁 `examples/custom-patterns.ts`
Custom access pattern implementations:
- Security-level based access control
- Git branch operation restrictions
- Cloud storage bucket access patterns
- Custom business rule validation

### 📁 `examples/basic-config.ts`
Basic orchestrator setup and usage:
- Simple orchestrator configuration
- Model selection setup
- Basic file operations
- System monitoring and statistics

### Running Examples

```typescript
import { runToolBasedExamples } from './examples/tool-based-agents.js';
import { demonstrateAccessPatterns } from './examples/access-patterns.js';
import { runBasicExample } from './examples/basic-config.js';

// Run comprehensive tool-based examples
await runToolBasedExamples();

// Demonstrate access patterns
await demonstrateAccessPatterns();

// Basic configuration example
await runBasicExample();
```

## API Reference

### Core Classes

- `CoreOrchestrator` - Main orchestration engine with model selection
- `AgentRegistry` - Agent discovery and tool-based registration
- `AccessPatternEvaluator` - Access pattern evaluation and caching
- `ModelSelector` - Intelligent AI model selection system
- `CommunicationSystem` - Inter-agent messaging and collaboration

### Tool Classes

- `ReadTool` - File reading with access pattern restrictions
- `EditTool` - File editing with pattern-based validation
- `CreateTool` - File creation within access boundaries  
- `DeleteTool` - File deletion with pattern controls
- `CommunicationTool` - Inter-agent communication capabilities
- `CompositeTool` - Combined tool operations

### Access Pattern Classes

- `AccessPattern<TContext>` - Base class for all access patterns
- `FileSystemAccessPattern` - File and directory access control
- `CustomAccessPattern` - Custom validation function patterns
- `CompositeAccessPattern` - Combined pattern logic
- `TimeBasedAccessPattern` - Temporal access restrictions

### Types and Interfaces

- `AgentCapability` - Tool-based agent definition
- `OperationRequest` - Request structure with model selection metadata
- `ToolConfig` - Tool configuration interface
- `AccessPatternResult` - Access validation results
- `ModelSelectionCriteria` - AI model selection parameters

## Key Benefits

### Tool-Based Architecture
- **Simplified Configuration**: Tools encapsulate both operations and access patterns
- **Better Separation of Concerns**: Clear boundaries between different capabilities
- **Easier Testing**: Individual tools can be tested in isolation
- **More Flexible Permissions**: Granular control at the tool level
- **Extensible Design**: Easy to add new tool types and capabilities

### Access Pattern System
- **Generic and Extensible**: Works with any resource type (files, databases, APIs)
- **Sophisticated Control**: Complex validation logic with custom functions
- **Performance Optimized**: Caching and efficient pattern matching
- **Composable Rules**: Combine patterns with AND/OR logic
- **Audit Trail**: Comprehensive logging of all access decisions

### AI Model Selection
- **Cost Optimization**: Balance cost and performance automatically
- **Operation-Specific**: Different models for different operation types
- **Agent-Specific**: Tailored model selection per agent specialization
- **Fallback Handling**: Robust fallback when preferred models unavailable
- **Performance Monitoring**: Track costs, selection decisions, and model performance

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Run examples
npm run examples
```

## Migration from Legacy Systems

The framework includes migration utilities for upgrading from directory-pattern based systems:

```typescript
import { AgentMigrator, MigrationPresets } from 'ai-code';

// Migrate legacy agent to modern tool-based system
const migrator = new AgentMigrator(MigrationPresets.createReactAgentMigration());
const migrationResult = migrator.migrateAgent(legacyAgent);

console.log(`Migrated ${migrationResult.summary.originalToolCount} legacy tools`);
console.log(`Created ${migrationResult.summary.modernToolCount} modern tools`);
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the tool-based architecture
4. Add tests for new tools and access patterns
5. Update examples demonstrating new functionality
6. Ensure all tests pass
7. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [Issues](https://github.com/mgorunuch/ai-code/issues)
- [Documentation](https://github.com/mgorunuch/ai-code#readme)
- [Examples Directory](examples/README.md)
- [Core Knowledge](source/core/knowledge.md)