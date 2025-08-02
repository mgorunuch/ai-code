/**
 * Example usage of the Core Orchestration System
 * This file demonstrates how to set up and use the agent workflow system
 */

import { 
  createOrchestrator, 
  DefaultAgents, 
  OperationType, 
  generateRequestId,
  createAgentCapability
} from './index.js';
import { AgentTool } from './types.js';

async function demonstrateOrchestrationSystem() {
  console.log('=== Core Orchestration System Demo ===\n');

  // 1. Create orchestrator with tools-based configuration
  console.log('1. Creating orchestrator with tools-based permissions...');
  const orchestrator = createOrchestrator({
    defaultPermissions: {
      defaultTools: [AgentTool.READ_LOCAL, AgentTool.INTER_AGENT_COMMUNICATION],
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

  // Register a custom agent for database operations with tools
  const dbAgent = createAgentCapability(
    'database-agent',
    'Database Agent',
    ['**/database/**', '**/*.sql', '**/migrations/**'],
    {
      description: 'Manages database files and operations',
      tools: [
        AgentTool.READ_LOCAL,
        AgentTool.EDIT_FILES,
        AgentTool.CREATE_FILES,
        AgentTool.DELETE_FILES,
        AgentTool.INTER_AGENT_COMMUNICATION
      ],
      endpoints: [
        { name: 'question', description: 'Answer database questions' },
        { name: 'migrate', description: 'Run database migrations' }
      ]
    }
  );

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
  
  // Register question handlers
  orchestrator.communicationSystem.registerQuestionHandler('react-agent', async (question) => {
    return {
      answer: `React agent response to: "${question.question}"`,
      confidence: 0.9,
      supportingInfo: {
        referencedFiles: question.context?.filePaths || []
      }
    };
  });

  orchestrator.communicationSystem.registerQuestionHandler('typescript-agent', async (question) => {
    return {
      answer: `TypeScript agent response to: "${question.question}"`,
      confidence: 0.85,
      supportingInfo: {
        referencedFiles: question.context?.filePaths || []
      }
    };
  });

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
  console.log('\n6. Adding custom permission rule with tools...');
  
  orchestrator.permissionSystem.addPermissionRule({
    id: 'allow-global-config-read',
    description: 'Allow all agents to read config files globally',
    agentId: '*', // Apply to all agents
    filePattern: '**/*.config.*',
    operations: [OperationType.READ_FILE],
    tools: [AgentTool.READ_GLOBAL], // Specific tool requirement
    allow: true,
    priority: 100
  });
  
  console.log('Custom rule added: Global config file read access');
  
  // 7. Show system statistics
  console.log('\n7. System statistics:');
  const stats = orchestrator.getStats();
  console.log(`- Total agents: ${stats.totalAgents}`);
  console.log(`- Total requests: ${stats.totalRequests}`);
  console.log(`- Total responses: ${stats.totalResponses}`);
  
  // Show effective permissions for agents
  console.log('\n8. Effective permissions for agents:');
  for (const agent of orchestrator.getAgents()) {
    const permissions = orchestrator.permissionSystem.getEffectivePermissions(agent.id);
    console.log(`${agent.id}: tools=[${permissions.tools.join(', ')}], custom rules=${permissions.customRules.length}`);
  }
  
  console.log('\n=== Core Orchestration System Demo Complete ===');
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateOrchestrationSystem().catch(console.error);
}

export { demonstrateOrchestrationSystem };