import {
  AgentCapability,
  OperationType,
  type FileAccessContext
} from '../source/core/types.js';
import {
  ReadTool,
  EditTool,
  CreateTool,
  DeleteTool,
  CommunicationTool,
  CompositeTool,
  ToolFactory,
  CommonTools
} from '../source/core/tools.js';
import {
  FileSystemAccessPattern,
  CustomAccessPattern
} from '../source/core/access-patterns.js';

/**
 * Tool-Based Agent Configuration Examples
 * 
 * This example demonstrates the new tool-based approach where tools
 * encapsulate both operations and access patterns, simplifying agent configuration.
 */

console.log('🔧 Tool-Based Agent Configuration Examples');

// 1. Basic Tool Creation
console.log('📝 Basic Tool Creation Examples');

// Create a read tool with specific access patterns
const reactReadTool = new ReadTool({
  id: 'react-read-tool',
  description: 'Read React component files',
  accessPatterns: [
    new FileSystemAccessPattern(
      'react-files',
      'React component files',
      50,
      ['**/*.tsx', '**/*.jsx', '**/components/**'],
      true,
      [OperationType.READ_FILE]
    )
  ]
});

// Create an edit tool with multiple access patterns
const reactEditTool = new EditTool({
  id: 'react-edit-tool',
  description: 'Edit React component files',
  accessPatterns: [
    new FileSystemAccessPattern(
      'react-components',
      'React component files',
      60,
      ['**/*.tsx', '**/*.jsx', '**/components/**'],
      true,
      [OperationType.EDIT_FILE]
    ),
    new FileSystemAccessPattern(
      'react-styles',
      'React style files',
      50,
      ['**/*.css', '**/*.scss', '**/*.module.css'],
      true,
      [OperationType.EDIT_FILE]
    )
  ]
});

// Create a communication tool
const communicationTool = new CommunicationTool({
  id: 'react-communication',
  description: 'React agent inter-agent communication'
});

console.log(`Created tools: ${reactReadTool.name}, ${reactEditTool.name}, ${communicationTool.name}`);

// 2. Using Tool Factory
console.log('🏭 Tool Factory Examples');

// Quick tool creation using factory methods
const typescriptReadTool = ToolFactory.createReadTool([
  '**/*.ts',
  '**/*.tsx',
  '**/src/**',
  '**/lib/**'
], {
  id: 'typescript-read',
  description: 'Read TypeScript source files',
  allow: true
});

const typescriptEditTool = ToolFactory.createEditTool([
  '**/*.ts',
  '**/*.tsx',
  '**/src/**',
  '**/lib/**'
], {
  id: 'typescript-edit',
  description: 'Edit TypeScript source files',
  allow: true
});

const fullAccessTool = ToolFactory.createFullAccessTool([
  '**/sandbox/**'
], {
  id: 'sandbox-full-access',
  description: 'Full access to sandbox files',
  allow: true
});

console.log(`Factory-created tools: ${typescriptReadTool.name}, ${typescriptEditTool.name}, ${fullAccessTool.name}`);

// 3. Modern Agent Configuration
console.log('🤖 Modern Agent Configuration Examples');

// React Development Agent with tool-based configuration
const reactAgent: AgentCapability = {
  id: 'react-agent',
  name: 'React Development Agent',
  description: 'Specialized agent for React component development using tool-based access patterns',
  tools: [
    // Use factory-created tools for common patterns
    ...CommonTools.createReactTools(),
    // Add custom tools for specific needs
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
    { name: 'question', description: 'Answer React development questions' },
    { name: 'validate', description: 'Validate React component structure' },
    { name: 'handle', description: 'Handle React file operations' }
  ]
};

// TypeScript Development Agent
const typescriptAgent: AgentCapability = {
  id: 'typescript-agent',
  name: 'TypeScript Development Agent',
  description: 'Specialized agent for TypeScript development',
  tools: [
    ...CommonTools.createTypeScriptTools(),
    // Custom tool with advanced access patterns
    new EditTool({
      id: 'typescript-advanced-edit',
      description: 'Advanced TypeScript editing with custom validation',
      accessPatterns: [
        new CustomAccessPattern(
          'typescript-validation',
          'TypeScript file validation',
          80,
          async (context) => {
            return context.filePath.endsWith('.ts') || context.filePath.endsWith('.tsx');
          },
          async (context) => {
            // Custom validation logic
            if (context.filePath.includes('node_modules')) {
              return {
                allowed: false,
                reason: 'Cannot edit files in node_modules',
                metadata: { restriction: 'node_modules' }
              };
            }
            
            if (context.operation === 'edit_file' && context.filePath.includes('dist/')) {
              return {
                allowed: false,
                reason: 'Cannot edit compiled files in dist directory',
                metadata: { restriction: 'compiled-files' }
              };
            }
            
            return {
              allowed: true,
              reason: 'TypeScript file edit allowed',
              metadata: { validated: true }
            };
          }
        )
      ]
    })
  ],
  endpoints: [
    { name: 'question', description: 'Answer TypeScript questions' },
    { name: 'validate', description: 'Validate TypeScript code' },
    { name: 'transform', description: 'Transform TypeScript code' },
    { name: 'handle', description: 'Handle TypeScript operations' }
  ]
};

// Test Agent with specialized tools
const testAgent: AgentCapability = {
  id: 'test-agent',
  name: 'Test Development Agent',
  description: 'Specialized agent for test development and validation',
  tools: [
    ...CommonTools.createTestTools(),
    // Custom composite tool for test operations
    new CompositeTool({
      id: 'test-composite-tool',
      description: 'Composite tool for comprehensive test operations',
      tools: [
        ToolFactory.createReadTool([
          '**/*.test.*',
          '**/*.spec.*',
          '**/tests/**',
          // Also read source files to understand what to test
          '**/src/**/*.ts',
          '**/src/**/*.tsx'
        ], {
          id: 'test-source-reader',
          description: 'Read test files and source code for context'
        }),
        ToolFactory.createCreateTool([
          '**/*.test.*',
          '**/*.spec.*',
          '**/tests/**'
        ], {
          id: 'test-creator',
          description: 'Create new test files'
        }),
        ToolFactory.createEditTool([
          '**/*.test.*',
          '**/*.spec.*',
          '**/tests/**'
        ], {
          id: 'test-editor',
          description: 'Edit existing test files'
        })
      ]
    })
  ],
  endpoints: [
    { name: 'question', description: 'Answer testing questions' },
    { name: 'validate', description: 'Validate test coverage and structure' },
    { name: 'handle', description: 'Handle test operations' }
  ]
};

console.log(`Created modern agents: ${reactAgent.name}, ${typescriptAgent.name}, ${testAgent.name}`);

// 4. Common Tool Patterns
console.log('🎯 Common Tool Patterns');

// Create agents using predefined tool patterns
const quickReactAgent: AgentCapability = {
  id: 'quick-react',
  name: 'Quick React Agent',
  description: 'Quickly created React agent using common patterns',
  tools: CommonTools.createReactTools(),
  endpoints: [
    { name: 'question', description: 'Answer React questions' },
    { name: 'validate', description: 'Validate React components' },
    { name: 'handle', description: 'Handle React operations' }
  ]
};

const quickTypeScriptAgent: AgentCapability = {
  id: 'quick-typescript',
  name: 'Quick TypeScript Agent',
  description: 'Quickly created TypeScript agent using common patterns',
  tools: CommonTools.createTypeScriptTools(),
  endpoints: [
    { name: 'question', description: 'Answer TypeScript questions' },
    { name: 'validate', description: 'Validate TypeScript code' },
    { name: 'handle', description: 'Handle TypeScript operations' }
  ]
};

const quickTestAgent: AgentCapability = {
  id: 'quick-test',
  name: 'Quick Test Agent',
  description: 'Quickly created test agent using common patterns',
  tools: CommonTools.createTestTools(),
  endpoints: [
    { name: 'question', description: 'Answer testing questions' },
    { name: 'validate', description: 'Validate test coverage' },
    { name: 'handle', description: 'Handle test operations' }
  ]
};

const quickConfigAgent: AgentCapability = {
  id: 'quick-config',
  name: 'Quick Config Agent',
  description: 'Quickly created config agent using common patterns',
  tools: CommonTools.createConfigTools(),
  endpoints: [
    { name: 'question', description: 'Answer configuration questions' },
    { name: 'validate', description: 'Validate configuration files' },
    { name: 'handle', description: 'Handle config operations' }
  ]
};

console.log(`Quick agents created: ${quickReactAgent.name}, ${quickTypeScriptAgent.name}, ${quickTestAgent.name}, ${quickConfigAgent.name}`);

// 5. Tool Access Testing
console.log('🧪 Tool Access Testing Examples');

async function demonstrateToolAccess() {
  console.log('Testing tool access patterns...');
  
  // Create test context
  const testContext: FileAccessContext = {
    resource: 'src/components/Button.tsx',
    filePath: 'src/components/Button.tsx',
    operation: 'edit_file' as OperationType,
    requesterId: 'test-system',
    agentId: 'react-agent',
    timestamp: new Date()
  };
  
  // Test react read tool
  try {
    const readResult = await reactReadTool.checkAccess(testContext);
    console.log(`React read tool access: ${readResult.allowed ? '✅ ALLOWED' : '❌ DENIED'} - ${readResult.reason}`);
  } catch (error) {
    console.log(`React read tool error: ${error}`);
  }

  // Test react edit tool
  try {
    const editResult = await reactEditTool.checkAccess(testContext);
    console.log(`React edit tool access: ${editResult.allowed ? '✅ ALLOWED' : '❌ DENIED'} - ${editResult.reason}`);
  } catch (error) {
    console.log(`React edit tool error: ${error}`);
  }

  // Test communication tool (no file context needed)
  try {
    const commResult = await communicationTool.checkAccess(testContext);
    console.log(`Communication tool access: ${commResult.allowed ? '✅ ALLOWED' : '❌ DENIED'} - ${commResult.reason}`);
  } catch (error) {
    console.log(`Communication tool error: ${error}`);
  }

  // Test operation handling
  console.log('\nTesting operation handling...');
  console.log(`React read tool can handle read_file: ${reactReadTool.canHandle('read_file' as OperationType)}`);
  console.log(`React read tool can handle edit_file: ${reactReadTool.canHandle('edit_file' as OperationType)}`);
  console.log(`React edit tool can handle edit_file: ${reactEditTool.canHandle('edit_file' as OperationType)}`);
  console.log(`Communication tool can handle question: ${communicationTool.canHandle('question' as OperationType)}`);
}

// 6. Agent Validation
console.log('✅ Agent Validation Examples');

function validateAgents() {
  const agents = [reactAgent, typescriptAgent, testAgent, quickReactAgent];
  
  for (const agent of agents) {
    console.log(`\n${agent.name} validation:`);
    console.log(`Agent ID: ${agent.id}`);
    console.log(`Tools count: ${agent.tools.length}`);
    console.log(`Endpoints count: ${agent.endpoints.length}`);
    
    // Basic validation checks
    const hasQuestionEndpoint = agent.endpoints.some(ep => ep.name === 'question');
    const hasHandleEndpoint = agent.endpoints.some(ep => ep.name === 'handle');
    const hasCommunicationTool = agent.tools.some(tool => tool.canHandle('question' as OperationType));
    
    console.log(`Has question endpoint: ${hasQuestionEndpoint ? '✅' : '❌'}`);
    console.log(`Has handle endpoint: ${hasHandleEndpoint ? '✅' : '❌'}`);
    console.log(`Has communication capability: ${hasCommunicationTool ? '✅' : '❌'}`);
    
    // Check tool capabilities
    const fileOperations = ['read_file', 'edit_file', 'write_file', 'delete_file'] as OperationType[];
    const supportedOps = fileOperations.filter(op => 
      agent.tools.some(tool => tool.canHandle(op))
    );
    console.log(`Supported operations: ${supportedOps.join(', ')}`);
  }
}

// Export all created agents and tools for use in other examples
export {
  // Tools
  reactReadTool,
  reactEditTool,
  communicationTool,
  typescriptReadTool,
  typescriptEditTool,
  fullAccessTool,
  
  // Modern Agents
  reactAgent,
  typescriptAgent,
  testAgent,
  
  // Quick Agents
  quickReactAgent,
  quickTypeScriptAgent,
  quickTestAgent,
  quickConfigAgent,
  
  // Functions
  demonstrateToolAccess,
  validateAgents
};

// Run demonstrations
export async function runToolBasedExamples() {
  console.log('🚀 Running Tool-Based Agent Examples');
  
  await demonstrateToolAccess();
  validateAgents();
  
  console.log('\n📊 Summary:');
  console.log(`- Created ${6} individual tools`);
  console.log(`- Created ${3} modern agents with tool-based configuration`);
  console.log(`- Created ${4} quick agents using common patterns`);
  console.log(`- Demonstrated tool access validation`);
  console.log(`- Validated agent configurations`);
  
  console.log('\n✨ Key Benefits of Tool-Based System:');
  console.log('- Tools encapsulate both operations and access patterns');
  console.log('- Simplified agent configuration');
  console.log('- Better separation of concerns');
  console.log('- Easier testing and validation');
  console.log('- More flexible permission model');
  console.log('- Reusable tool patterns for common use cases');
}