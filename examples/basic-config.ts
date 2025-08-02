import {
  createOrchestrator,
  AgentTool,
  AIModel,
  DEFAULT_MODEL_CONFIGS,
  DEFAULT_AUTO_MODE_CONFIG,
  OperationType
} from '../source/core/index.js';
import {
  FileSystemAccessPattern,
  DatabaseTableAccessPattern,
  APIEndpointAccessPattern
} from '../source/core/access-patterns.js';

/**
 * Basic Orchestrator Configuration Example
 * 
 * This example demonstrates how to set up a simple orchestration system
 * with class-based access patterns and model selection.
 */

// Create the orchestrator with basic configuration
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

// Register a React agent with file system access patterns
orchestrator.registerAgent({
  id: 'react-agent',
  name: 'React Development Agent',
  description: 'Handles React components and frontend development',
  accessPatterns: [
    new FileSystemAccessPattern(
      'react-components',
      'React component files',
      20,
      ['**/*.tsx', '**/*.jsx', '**/components/**'],
      true
    ),
    new FileSystemAccessPattern(
      'react-styles',
      'CSS and styling files',
      15,
      ['**/*.css', '**/*.scss', '**/*.module.css'],
      true
    )
  ],
  tools: [
    AgentTool.READ_LOCAL,
    AgentTool.EDIT_FILES,
    AgentTool.CREATE_FILES,
    AgentTool.INTER_AGENT_COMMUNICATION
  ],
  endpoints: [
    { name: 'validate', description: 'Validate React component structure' },
    { name: 'optimize', description: 'Optimize React component performance' },
    { name: 'refactor', description: 'Refactor React components' }
  ]
});

// Register a TypeScript agent with broader access
orchestrator.registerAgent({
  id: 'typescript-agent',
  name: 'TypeScript Development Agent',
  description: 'Handles TypeScript code and business logic',
  accessPatterns: [
    new FileSystemAccessPattern(
      'typescript-source',
      'TypeScript source files',
      30,
      ['**/*.ts', '**/src/**', '**/lib/**'],
      true
    ),
    new FileSystemAccessPattern(
      'config-files',
      'Configuration files',
      25,
      ['**/tsconfig.json', '**/*.config.ts', '**/*.config.js'],
      true
    )
  ],
  tools: [
    AgentTool.READ_LOCAL,
    AgentTool.READ_GLOBAL,
    AgentTool.EDIT_FILES,
    AgentTool.CREATE_FILES,
    AgentTool.CREATE_DIRECTORIES,
    AgentTool.INTER_AGENT_COMMUNICATION
  ],
  endpoints: [
    { name: 'validate', description: 'Validate TypeScript code' },
    { name: 'compile', description: 'Compile TypeScript code' },
    { name: 'refactor', description: 'Refactor TypeScript code' }
  ]
});

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

export { orchestrator };