import {
  createOrchestrator,
  OperationType,
  AIModel,
  DEFAULT_MODEL_CONFIGS,
  DEFAULT_AUTO_MODE_CONFIG,
  type AgentCapability
} from '../source/core/index.js';
import {
  ReadTool,
  EditTool,
  CreateTool,
  CommunicationTool,
  ToolFactory,
  CommonTools
} from '../source/core/tools.js';
import {
  FileSystemAccessPattern
} from '../source/core/access-patterns.js';

/**
 * Basic Orchestrator Configuration Example
 * 
 * This example demonstrates how to set up a simple orchestration system
 * with class-based access patterns and model selection.
 */

// Create the orchestrator with basic configuration
const orchestrator = createOrchestrator({
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
      costThreshold: 0.05,
      operationPreferences: {
        [OperationType.READ_FILE]: [AIModel.CLAUDE_3_HAIKU],
        [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET],
        [OperationType.QUESTION]: [AIModel.CLAUDE_3_5_SONNET]
      }
    },
    defaultModel: AIModel.CLAUDE_3_5_SONNET,
    selectionStrategy: 'balanced'
  }
});

// Register a React agent using tool-based configuration
const reactAgent: AgentCapability = {
  id: 'react-agent',
  name: 'React Development Agent',
  description: 'Handles React components and frontend development with tool-based access patterns',
  tools: [
    // Use pre-configured React tools
    ...CommonTools.createReactTools(),
    // Add custom validation tool
    new CreateTool({
      id: 'react-test-creator',
      description: 'Create React component tests',
      accessPatterns: [
        new FileSystemAccessPattern(
          'react-test-files',
          'React test files',
          70,
          ['**/*.test.tsx', '**/*.test.jsx', '**/tests/components/**'],
          true,
          [OperationType.WRITE_FILE]
        )
      ]
    })
  ],
  endpoints: [
    { name: 'validate', description: 'Validate React component structure' },
    { name: 'optimize', description: 'Optimize React component performance' },
    { name: 'refactor', description: 'Refactor React components' },
    { name: 'question', description: 'Answer React development questions' },
    { name: 'handle', description: 'Handle React file operations' }
  ]
};

orchestrator.registerAgent(reactAgent);

// Register a TypeScript agent using tool-based configuration
const typescriptAgent: AgentCapability = {
  id: 'typescript-agent',
  name: 'TypeScript Development Agent',
  description: 'Handles TypeScript code and business logic with comprehensive tools',
  tools: [
    // Use pre-configured TypeScript tools
    ...CommonTools.createTypeScriptTools(),
    // Add configuration file management
    ...CommonTools.createConfigTools(),
    // Add directory creation capability
    new CreateTool({
      id: 'typescript-directory-creator',
      description: 'Create TypeScript project directories',
      accessPatterns: [
        new FileSystemAccessPattern(
          'typescript-directories',
          'TypeScript project directories',
          60,
          ['**/src/**', '**/lib/**', '**/types/**', '**/interfaces/**'],
          true,
          [OperationType.CREATE_DIRECTORY]
        )
      ]
    })
  ],
  endpoints: [
    { name: 'validate', description: 'Validate TypeScript code' },
    { name: 'compile', description: 'Compile TypeScript code' },
    { name: 'refactor', description: 'Refactor TypeScript code' },
    { name: 'question', description: 'Answer TypeScript questions' },
    { name: 'transform', description: 'Transform TypeScript code' },
    { name: 'handle', description: 'Handle TypeScript operations' }
  ]
};

orchestrator.registerAgent(typescriptAgent);

// Example usage function
export async function runBasicExample() {
  console.log('🚀 Starting Basic Orchestration Example');
  
  try {
    // Example 1: Read a React component file
    console.log('\n📖 Reading React component...');
    const readResponse = await orchestrator.executeRequest({
      type: OperationType.READ_FILE,
      filePath: 'src/components/Button.tsx',
      payload: {},
      requestId: 'read-1'
    });
    console.log('✅ Read successful:', readResponse.success);
    
    // Example 2: Edit a TypeScript file
    console.log('\n✏️ Editing TypeScript file...');
    const editResponse = await orchestrator.executeRequest({
      type: OperationType.EDIT_FILE,
      filePath: 'src/utils/helpers.ts',
      payload: {
        oldContent: 'export const helper = () => {}',
        newContent: 'export const helper = (): void => {}'
      },
      requestId: 'edit-1'
    });
    console.log('✅ Edit successful:', editResponse.success);
    
    // Example 3: Ask a question to an agent
    console.log('\n❓ Asking React agent a question...');
    const questionResponse = await orchestrator.executeRequest({
      type: OperationType.QUESTION,
      payload: {
        question: 'What are the best practices for React component props?',
        context: 'Working on a component library'
      },
      requestId: 'question-1'
    });
    console.log('✅ Question answered:', questionResponse.success);
    
    // Show system statistics
    console.log('\n📊 System Statistics:');
    const stats = orchestrator.getStats();
    console.log('- Total requests:', stats.totalRequests);
    console.log('- Successful requests:', stats.successfulRequests);
    console.log('- Failed requests:', stats.failedRequests);
    console.log('- Model usage:', stats.modelSelectionStats?.modelUsage || 'N/A');
    
  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Export the orchestrator and agents for use in other examples
export { orchestrator, reactAgent, typescriptAgent };