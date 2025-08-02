# AI-Code

A comprehensive agent orchestration framework for managing directory-based agent responsibilities and inter-agent communication.

## Features

- **Directory-Based Agent Responsibility**: Agents are restricted to specific directories using glob patterns
- **Tools-Based Permission System**: Granular control over agent capabilities (read, edit, create, execute, etc.)
- **Inter-Agent Communication**: Question/answer endpoints for collaborative problem-solving
- **Automatic Request Routing**: Intelligent routing of requests to appropriate agents
- **Comprehensive Auditing**: Detailed logging of all agent activities and permission decisions
- **React CLI Interface**: User-friendly command-line interface built with Ink

## Core Concepts

### Agent Tools

Agents are granted specific tools that define their capabilities:

- `READ_LOCAL` - Read files within assigned directories
- `READ_GLOBAL` - Read any file in the system
- `EDIT_FILES` - Modify existing files
- `CREATE_FILES` - Create new files
- `DELETE_FILES` - Remove files
- `CREATE_DIRECTORIES` - Create new directories
- `EXECUTE_COMMANDS` - Run system commands
- `NETWORK_ACCESS` - Make network requests
- `INTER_AGENT_COMMUNICATION` - Communicate with other agents

### Directory Patterns

Agents are assigned to specific directories using glob patterns:

```typescript
const reactAgent = {
  id: 'react-agent',
  name: 'React Frontend Agent',
  directoryPatterns: ['**/*.tsx', '**/*.jsx', '**/components/**'],
  tools: [AgentTool.READ_LOCAL, AgentTool.EDIT_FILES, AgentTool.CREATE_FILES]
};
```

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

### Programmatic Usage

```typescript
import { createOrchestrator, DefaultAgents, AgentTool } from 'ai-code';

// Create orchestrator
const orchestrator = createOrchestrator();

// Register agents
orchestrator.registerAgent(DefaultAgents.createReactAgent());
orchestrator.registerAgent(DefaultAgents.createTypescriptAgent());

// Execute operations
const response = await orchestrator.executeRequest({
  type: OperationType.READ_FILE,
  filePath: 'src/components/Button.tsx',
  payload: {},
  requestId: generateRequestId()
});

// Ask questions to agents
const answer = await orchestrator.askQuestion(
  'react-agent',
  { question: 'What components are available?' },
  'user-agent'
);
```

### Custom Agent Configuration

```typescript
import { AgentCapability, AgentTool } from 'ai-code';

const customAgent: AgentCapability = {
  id: 'custom-agent',
  name: 'Custom Agent',
  directoryPatterns: ['**/custom/**', '**/*.custom.ts'],
  tools: [
    AgentTool.READ_LOCAL,
    AgentTool.EDIT_FILES,
    AgentTool.INTER_AGENT_COMMUNICATION
  ],
  endpoints: [
    { name: 'question', description: 'Answer questions about custom logic' }
  ]
};

orchestrator.registerAgent(customAgent);
```

## Architecture

The AI-Code framework consists of several core components:

### Core Orchestrator
- Central coordination of all agent activities
- Request routing based on file paths and agent capabilities
- Event emission for monitoring and debugging

### Agent Registry
- Maps agents to directory patterns using glob matching
- Discovers responsible agents for specific file paths
- Validates agent permissions and tool requirements

### Permission System
- Enforces directory-based access controls
- Supports custom permission rules with priority handling
- Comprehensive audit logging for security compliance

### Communication System
- Structured messaging between agents
- Question/answer endpoints for domain expertise sharing
- Broadcast capabilities for multi-agent consultation

## Configuration

### Default Agents

The framework includes several pre-configured agents:

- **React Agent**: Handles `.tsx`, `.jsx` files and components
- **TypeScript Agent**: Manages `.ts` files and type definitions
- **Test Agent**: Responsible for test files and specs
- **Config Agent**: Handles configuration files
- **Documentation Agent**: Manages markdown and documentation files

### Permission Rules

Custom permission rules can be added:

```typescript
orchestrator.addPermissionRule({
  agentId: 'react-agent',
  operation: OperationType.EDIT_FILE,
  allow: true,
  requiredTools: [AgentTool.EDIT_FILES],
  priority: 100
});
```

## API Reference

### Core Classes

- `CoreOrchestrator` - Main orchestration engine
- `AgentRegistry` - Agent discovery and registration
- `PermissionSystem` - Access control and auditing
- `CommunicationSystem` - Inter-agent messaging

### Types

- `AgentCapability` - Agent definition interface
- `OperationRequest` - Request structure for operations
- `QuestionRequest` - Structure for agent questions
- `AgentTool` - Enumeration of available tools

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
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- [Issues](https://github.com/mgorunuch/ai-code/issues)
- [Documentation](https://github.com/mgorunuch/ai-code#readme)
- [Contributing Guidelines](CONTRIBUTING.md)