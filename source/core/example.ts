/**
 * Example usage of the Core Orchestration System
 * This file demonstrates how to set up and use the agent workflow system
 */

import { 
  createOrchestrator, 
  DefaultAgents, 
  OperationType, 
  generateRequestId,
  createAgentCapability,
  FileSystemAccessPattern,
  CustomAccessPattern
} from './index.js';
import { 
  AgentToolEnum, 
  AccessPattern, 
  type FileAccessContext, 
  type AccessPatternResult,
  type LegacyAgentCapability
} from './types.js';

async function demonstrateOrchestrationSystem() {
  console.log('=== Core Orchestration System Demo ===\n');

  // 1. Create orchestrator with tools-based configuration
  console.log('1. Creating orchestrator with tools-based permissions...');
  const orchestrator = createOrchestrator({
    defaultPermissions: {
      defaultTools: [AgentToolEnum.READ_LOCAL, AgentToolEnum.INTER_AGENT_COMMUNICATION],
      requireExplicitToolGrants: true
    },
    logging: {
      level: 'info',
      logCommunications: true
    }
  });

  // 2. Register default agents
  console.log('2. Registering agents...');
  
  // Register React agent for frontend files
  const reactAgent = DefaultAgents.createReactAgent();
  orchestrator.registerAgent(reactAgent, async (request) => {
    console.log(`React agent handling: ${request.type} for ${request.filePath}`);
    return {
      success: true,
      data: `React agent processed ${request.type}`,
      handledBy: 'react-agent',
      requestId: request.requestId
    };
  });

  // Register TypeScript agent for core logic
  const tsAgent = DefaultAgents.createTypescriptAgent();
  orchestrator.registerAgent(tsAgent, async (request) => {
    console.log(`TypeScript agent handling: ${request.type} for ${request.filePath}`);
    return {
      success: true,
      data: `TypeScript agent processed ${request.type}`,
      handledBy: 'typescript-agent',
      requestId: request.requestId
    };
  });

  // Create a custom access pattern for sensitive database operations
  class DatabaseSecurityPattern extends AccessPattern<FileAccessContext> {
    readonly id = 'db-security';
    readonly description = 'Database security access control';
    readonly priority = 100;

    async appliesTo(context: FileAccessContext): Promise<boolean> {
      return context.filePath.includes('database') || 
             context.filePath.endsWith('.sql');
    }

    async validate(context: FileAccessContext): Promise<AccessPatternResult> {
      // Restrict deletion of migration files
      if (context.filePath.includes('migrations') && 
          context.operation === OperationType.DELETE_FILE) {
        return {
          allowed: false,
          reason: 'Cannot delete migration files',
          patternId: this.id,
          metadata: { securityLevel: 'high' }
        };
      }

      return {
        allowed: true,
        reason: 'Database operation allowed',
        patternId: this.id
      };
    }
  }

  // Register a custom agent for database operations with class-based patterns
  const dbAgent: LegacyAgentCapability = {
    id: 'database-agent',
    name: 'Database Agent',
    description: 'Manages database files and operations',
    accessPatterns: [
      // Use the built-in FileSystemAccessPattern
      new FileSystemAccessPattern(
        'db-files',
        'Database files access',
        50,
        ['**/database/**', '**/*.sql', '**/migrations/**'],
        true, // allow
        [OperationType.READ_FILE, OperationType.EDIT_FILE, OperationType.WRITE_FILE]
      ),
      // Add custom security pattern
      new DatabaseSecurityPattern()
    ],
    tools: [
      AgentToolEnum.READ_LOCAL,
      AgentToolEnum.EDIT_FILES,
      AgentToolEnum.CREATE_FILES,
      AgentToolEnum.DELETE_FILES,
      AgentToolEnum.INTER_AGENT_COMMUNICATION
    ],
    endpoints: [
      { name: 'question', description: 'Answer database questions' },
      { name: 'migrate', description: 'Run database migrations' }
    ]
  };

  orchestrator.registerAgent(dbAgent, async (request) => {
    console.log(`Database agent handling: ${request.type} for ${request.filePath}`);
    return {
      success: true,
      data: `Database agent processed ${request.type}`,
      handledBy: 'database-agent',
      requestId: request.requestId
    };
  });

  // 3. Demonstrate file operation routing
  console.log('\n3. Testing file operation routing...');
  
  const testFiles = [
    'src/components/Button.tsx',    // Should route to react-agent
    'src/utils/helpers.ts',         // Should route to typescript-agent
    'database/migrations/001.sql'   // Should route to database-agent
  ];

  for (const filePath of testFiles) {
    try {
      const response = await orchestrator.executeRequest({
        type: OperationType.READ_FILE,
        filePath,
        payload: {},
        requestId: generateRequestId()
      });
      
      console.log(`✓ ${filePath} -> ${response.handledBy}`);
    } catch (error) {
      console.log(`✗ ${filePath} -> ERROR: ${(error as Error).message}`);
    }
  }

  // 4. Demonstrate tools-based permission system
  console.log('\n4. Testing tools-based permission system...');
  
  // Try to make react-agent edit a TypeScript file (should fail due to routing to typescript-agent)
  try {
    await orchestrator.executeRequest({
      type: OperationType.EDIT_FILE,
      filePath: 'src/utils/helpers.ts',
      payload: { content: 'new content' },
      requestingAgent: 'react-agent',
      requestId: generateRequestId()
    });
  } catch (error) {
    console.log(`✓ Permission correctly denied (tools-based): ${(error as Error).message}`);
  }
  
  // Demonstrate agent tool information
  const reactAgentInfo = orchestrator.getAgent('react-agent');
  if (reactAgentInfo) {
    console.log(`React agent tools: [${reactAgentInfo.tools.join(', ')}]`);
  }
  
  const dbAgentInfo = orchestrator.getAgent('database-agent');
  if (dbAgentInfo) {
    console.log(`Database agent tools: [${dbAgentInfo.tools.join(', ')}]`);
  }

  // 5. Demonstrate inter-agent communication
  console.log('\n5. Testing inter-agent communication...');
  
  // Note: In a real implementation, question handlers would be registered through
  // the agent's handler function passed to registerAgent()
  console.log('Question handlers would be registered through agent handlers');

  // Ask a question to a specific agent
  try {
    const response = await orchestrator.askQuestion(
      'database-agent',
      {
        question: 'How should I structure React components?',
        context: { filePaths: ['src/components/Button.tsx'] }
      },
      'react-agent'
    );
    
    console.log(`✓ Direct question answered: ${(response as any).answer}`);
  } catch (error) {
    console.log(`✗ Question failed: ${(error as Error).message}`);
  }

  // Broadcast a question to all agents
  try {
    const responses = await orchestrator.askQuestion(
      'database-agent',
      {
        question: 'What best practices should I follow?',
        context: {}
      }
    );
    
    console.log(`✓ Broadcast question received ${(responses as Map<string, any>).size} responses`);
  } catch (error) {
    console.log(`✗ Broadcast question failed: ${(error as Error).message}`);
  }

  // 6. Demonstrate permission rules with tools
  console.log('\n6. Permission rules would be added through public API...');
  console.log('Custom rule example: Global config file read access');
  
  // 7. Demonstrate custom access pattern for non-file resources
  console.log('\n7. Testing custom access patterns...');
  
  // Create a custom pattern for API endpoint access (demonstrating extensibility)
  const apiAccessPattern = new CustomAccessPattern(
    'api-rate-limit',
    'API rate limiting pattern',
    90,
    // appliesTo function
    async (context) => {
      // This could check any type of resource, not just files
      return context.resource && typeof context.resource === 'string' && 
             context.resource.startsWith('/api/');
    },
    // validate function
    async (context) => {
      // Example: Rate limiting logic
      const requestCount = context.metadata?.requestCount || 0;
      if (requestCount > 100) {
        return {
          allowed: false,
          reason: 'Rate limit exceeded',
          metadata: { limit: 100, current: requestCount }
        };
      }
      
      return {
        allowed: true,
        reason: 'Within rate limit',
        metadata: { limit: 100, current: requestCount }
      };
    }
  );
  
  console.log('Created custom API rate limiting pattern');
  
  // 8. Show system statistics
  console.log('\n8. System statistics:');
  const stats = orchestrator.getStats();
  console.log(`- Total agents: ${stats.totalAgents}`);
  console.log(`- Total requests: ${stats.totalRequests}`);
  console.log(`- Total responses: ${stats.totalResponses}`);
  
  // Show registered agents
  console.log('\n9. Registered agents:');
  for (const agent of orchestrator.getAgents()) {
    if ('accessPatterns' in agent) {
      console.log(`${agent.id}: ${agent.name} - ${agent.tools.length} tools, ${agent.accessPatterns.length} access patterns (legacy)`);
    } else {
      console.log(`${agent.id}: ${agent.name} - ${agent.tools.length} tools (modern)`);
    }
  }
  
  console.log('\n=== Core Orchestration System Demo Complete ===');
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateOrchestrationSystem().catch(console.error);
}

export { demonstrateOrchestrationSystem };