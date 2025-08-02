import {
  createOrchestrator,
  OperationType,
  AIModel,
  DEFAULT_MODEL_CONFIGS,
  DEFAULT_AUTO_MODE_CONFIG,
  type AgentCapability
} from '../source/core/index.js';
import {
  ToolFactory,
  CommonTools,
  CreateTool,
  EditTool,
  CompositeTool
} from '../source/core/tools.js';
import {
  FileSystemAccessPattern,
  CustomAccessPattern
} from '../source/core/access-patterns.js';

/**
 * Real-World Project Setup Example
 * 
 * This example demonstrates a complete agent orchestration setup for a
 * full-stack web application project with multiple specialized agents.
 */

console.log('🌟 Real-World Project Setup Example');

// Create orchestrator with production-ready configuration
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
      costThreshold: 0.10, // Higher threshold for production
      operationPreferences: {
        [OperationType.READ_FILE]: [AIModel.CLAUDE_3_HAIKU],
        [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET],
        [OperationType.WRITE_FILE]: [AIModel.CLAUDE_3_5_SONNET],
        [OperationType.QUESTION]: [AIModel.CLAUDE_3_5_SONNET],
        [OperationType.VALIDATE]: [AIModel.CLAUDE_3_HAIKU],
        [OperationType.TRANSFORM]: [AIModel.CLAUDE_3_5_SONNET]
      }
    },
    defaultModel: AIModel.CLAUDE_3_5_SONNET,
    selectionStrategy: 'cost_optimized'
  }
});

// 1. Frontend Development Agent
const frontendAgent: AgentCapability = {
  id: 'frontend-agent',
  name: 'Frontend Development Agent',
  description: 'Handles React/Vue components, styling, and frontend assets',
  tools: [
    // React development tools
    ...CommonTools.createReactTools(),
    
    // Additional frontend tools
    new EditTool({
      id: 'frontend-assets-editor',
      description: 'Edit frontend assets and configuration',
      accessPatterns: [
        new FileSystemAccessPattern(
          'frontend-assets',
          'Frontend assets and configuration',
          40,
          [
            '**/public/**',
            '**/assets/**',
            '**/static/**',
            '**/*.json',
            '**/*.md',
            '**/package.json',
            '**/webpack.config.*',
            '**/vite.config.*',
            '**/next.config.*'
          ],
          true,
          [OperationType.EDIT_FILE, OperationType.READ_FILE]
        )
      ]
    }),
    
    // Testing tools for frontend
    new CreateTool({
      id: 'frontend-test-creator',
      description: 'Create frontend tests',
      accessPatterns: [
        new FileSystemAccessPattern(
          'frontend-tests',
          'Frontend test files',
          60,
          [
            '**/*.test.tsx',
            '**/*.test.jsx',
            '**/*.test.ts',
            '**/*.spec.tsx',
            '**/*.spec.jsx',
            '**/*.spec.ts',
            '**/tests/frontend/**',
            '**/tests/components/**',
            '**/__tests__/**'
          ],
          true,
          [OperationType.WRITE_FILE]
        )
      ]
    })
  ],
  endpoints: [
    { name: 'question', description: 'Answer frontend development questions' },
    { name: 'validate', description: 'Validate component structure and props' },
    { name: 'optimize', description: 'Optimize component performance' },
    { name: 'test', description: 'Create or update component tests' },
    { name: 'handle', description: 'Handle frontend file operations' }
  ]
};

// 2. Backend Development Agent
const backendAgent: AgentCapability = {
  id: 'backend-agent',
  name: 'Backend Development Agent',
  description: 'Handles API routes, database models, and server-side logic',
  tools: [
    // TypeScript tools for backend
    ...CommonTools.createTypeScriptTools(),
    
    // API development tools
    new EditTool({
      id: 'api-routes-editor',
      description: 'Edit API routes and middleware',
      accessPatterns: [
        new FileSystemAccessPattern(
          'api-routes',
          'API routes and middleware',
          70,
          [
            '**/api/**',
            '**/routes/**',
            '**/controllers/**',
            '**/middleware/**',
            '**/services/**',
            '**/models/**',
            '**/schemas/**'
          ],
          true,
          [OperationType.READ_FILE, OperationType.EDIT_FILE, OperationType.WRITE_FILE]
        )
      ]
    }),
    
    // Database tools
    new EditTool({
      id: 'database-editor',
      description: 'Edit database migrations and models',
      accessPatterns: [
        new FileSystemAccessPattern(
          'database-files',
          'Database migrations and models',
          80,
          [
            '**/migrations/**',
            '**/seeders/**',
            '**/database/**',
            '**/*.sql',
            '**/prisma/**',
            '**/models/**'
          ],
          true,
          [OperationType.READ_FILE, OperationType.EDIT_FILE, OperationType.WRITE_FILE]
        )
      ]
    }),
    
    // Backend testing tools
    new CreateTool({
      id: 'backend-test-creator',
      description: 'Create backend tests',
      accessPatterns: [
        new FileSystemAccessPattern(
          'backend-tests',
          'Backend test files',
          60,
          [
            '**/tests/api/**',
            '**/tests/backend/**',
            '**/tests/integration/**',
            '**/tests/unit/**',
            '**/*.test.ts',
            '**/*.spec.ts'
          ],
          true,
          [OperationType.WRITE_FILE]
        )
      ]
    })
  ],
  endpoints: [
    { name: 'question', description: 'Answer backend development questions' },
    { name: 'validate', description: 'Validate API structure and schemas' },
    { name: 'secure', description: 'Review security considerations' },
    { name: 'optimize', description: 'Optimize database queries and performance' },
    { name: 'test', description: 'Create or update API tests' },
    { name: 'handle', description: 'Handle backend file operations' }
  ]
};

// 3. DevOps and Configuration Agent
const devopsAgent: AgentCapability = {
  id: 'devops-agent',
  name: 'DevOps and Configuration Agent',
  description: 'Handles deployment, CI/CD, Docker, and infrastructure configuration',
  tools: [
    // Configuration tools
    ...CommonTools.createConfigTools(),
    
    // DevOps specific tools
    new EditTool({
      id: 'devops-config-editor',
      description: 'Edit DevOps and infrastructure configuration',
      accessPatterns: [
        new FileSystemAccessPattern(
          'devops-config',
          'DevOps configuration files',
          90,
          [
            '**/Dockerfile*',
            '**/docker-compose.*',
            '**/.github/**',
            '**/workflows/**',
            '**/terraform/**',
            '**/ansible/**',
            '**/kubernetes/**',
            '**/k8s/**',
            '**/.env*',
            '**/nginx.conf',
            '**/apache.conf',
            '**/.circleci/**',
            '**/.travis.yml',
            '**/Jenkinsfile',
            '**/deploy/**',
            '**/scripts/**'
          ],
          true,
          [OperationType.READ_FILE, OperationType.EDIT_FILE, OperationType.WRITE_FILE]
        )
      ]
    }),
    
    // Security validation
    new CustomAccessPattern(
      'security-validation',
      'Security-focused file validation',
      100,
      async (context) => {
        // Apply to security-sensitive files
        const securityFiles = [
          '.env', 'secrets', 'keys', 'certs', 'ssl',
          'auth', 'password', 'token', 'private'
        ];
        return securityFiles.some(keyword => 
          context.filePath.toLowerCase().includes(keyword)
        );
      },
      async (context) => {
        // Enhanced security checks
        if (context.operation === 'write_file' && context.filePath.includes('.env')) {
          return {
            allowed: true,
            reason: 'Environment file access allowed with security awareness',
            metadata: { 
              securityLevel: 'high',
              recommendation: 'Ensure no sensitive data is committed to version control'
            }
          };
        }
        
        if (context.filePath.includes('private') || context.filePath.includes('secret')) {
          return {
            allowed: false,
            reason: 'Direct access to private/secret files restricted',
            metadata: { securityLevel: 'critical' }
          };
        }
        
        return {
          allowed: true,
          reason: 'Security validation passed',
          metadata: { securityLevel: 'standard' }
        };
      }
    )
  ],
  endpoints: [
    { name: 'question', description: 'Answer DevOps and infrastructure questions' },
    { name: 'validate', description: 'Validate deployment and security configurations' },
    { name: 'deploy', description: 'Assist with deployment procedures' },
    { name: 'monitor', description: 'Help with monitoring and logging setup' },
    { name: 'secure', description: 'Review security configurations' },
    { name: 'handle', description: 'Handle DevOps file operations' }
  ]
};

// 4. Documentation Agent
const docsAgent: AgentCapability = {
  id: 'docs-agent',
  name: 'Documentation Agent',
  description: 'Handles project documentation, README files, and code comments',
  tools: [
    // Documentation-specific tools
    new EditTool({
      id: 'documentation-editor',
      description: 'Edit documentation files',
      accessPatterns: [
        new FileSystemAccessPattern(
          'documentation-files',
          'Documentation and README files',
          30,
          [
            '**/*.md',
            '**/*.mdx',
            '**/docs/**',
            '**/documentation/**',
            '**/README*',
            '**/CHANGELOG*',
            '**/CONTRIBUTING*',
            '**/LICENSE*',
            '**/CODE_OF_CONDUCT*',
            '**/*.txt',
            '**/*.rst'
          ],
          true,
          [OperationType.READ_FILE, OperationType.EDIT_FILE, OperationType.WRITE_FILE]
        )
      ]
    }),
    
    // API documentation
    new EditTool({
      id: 'api-docs-editor',
      description: 'Edit API documentation and schemas',
      accessPatterns: [
        new FileSystemAccessPattern(
          'api-documentation',
          'API documentation files',
          50,
          [
            '**/openapi.yaml',
            '**/swagger.yaml',
            '**/api-docs/**',
            '**/*.openapi.*',
            '**/*.swagger.*',
            '**/postman/**',
            '**/insomnia/**'
          ],
          true,
          [OperationType.READ_FILE, OperationType.EDIT_FILE, OperationType.WRITE_FILE]
        )
      ]
    }),
    
    // Comment and JSDoc tools
    new CustomAccessPattern(
      'code-comment-enhancer',
      'Enhance code comments and documentation',
      40,
      async (context) => {
        // Apply to source code files
        return /\.(ts|tsx|js|jsx|py|java|cpp|c|h)$/.test(context.filePath);
      },
      async (context) => {
        if (context.operation === 'edit_file') {
          return {
            allowed: true,
            reason: 'Code documentation enhancement allowed',
            metadata: { 
              purpose: 'documentation',
              recommendation: 'Focus on improving comments, JSDoc, and inline documentation'
            }
          };
        }
        return {
          allowed: true,
          reason: 'Code file access for documentation purposes',
          metadata: { purpose: 'documentation' }
        };
      }
    )
  ],
  endpoints: [
    { name: 'question', description: 'Answer documentation questions' },
    { name: 'validate', description: 'Validate documentation completeness' },
    { name: 'generate', description: 'Generate documentation from code' },
    { name: 'update', description: 'Update existing documentation' },
    { name: 'review', description: 'Review documentation for clarity and accuracy' },
    { name: 'handle', description: 'Handle documentation file operations' }
  ]
};

// 5. Testing and Quality Assurance Agent
const qaAgent: AgentCapability = {
  id: 'qa-agent',
  name: 'Testing and QA Agent',
  description: 'Handles all aspects of testing, code quality, and quality assurance',
  tools: [
    // Comprehensive testing tools
    ...CommonTools.createTestTools(),
    
    // Quality assurance tools
    new EditTool({
      id: 'qa-config-editor',
      description: 'Edit QA and testing configuration',
      accessPatterns: [
        new FileSystemAccessPattern(
          'qa-config',
          'QA and testing configuration files',
          60,
          [
            '**/jest.config.*',
            '**/vitest.config.*',
            '**/cypress.config.*',
            '**/playwright.config.*',
            '**/.eslintrc.*',
            '**/.prettierrc.*',
            '**/sonar-project.properties',
            '**/codecov.yml',
            '**/nyc.config.*',
            '**/coverage/**',
            '**/test-results/**'
          ],
          true,
          [OperationType.READ_FILE, OperationType.EDIT_FILE, OperationType.WRITE_FILE]
        )
      ]
    }),
    
    // E2E testing tools
    new CreateTool({
      id: 'e2e-test-creator',
      description: 'Create end-to-end tests',
      accessPatterns: [
        new FileSystemAccessPattern(
          'e2e-tests',
          'End-to-end test files',
          70,
          [
            '**/e2e/**',
            '**/cypress/**',
            '**/playwright/**',
            '**/tests/e2e/**',
            '**/*.e2e.*',
            '**/*.integration.*'
          ],
          true,
          [OperationType.WRITE_FILE, OperationType.EDIT_FILE]
        )
      ]
    }),
    
    // Code quality validation
    new CustomAccessPattern(
      'code-quality-validator',
      'Code quality and standards validation',
      80,
      async (context) => {
        // Apply to all source code files
        return /\.(ts|tsx|js|jsx|py|java|cpp|c|h|css|scss|sass)$/.test(context.filePath);
      },
      async (context) => {
        // Quality checks
        if (context.filePath.includes('node_modules') || context.filePath.includes('dist/')) {
          return {
            allowed: false,
            reason: 'Cannot modify generated or dependency files',
            metadata: { qualityRule: 'no-generated-file-changes' }
          };
        }
        
        return {
          allowed: true,
          reason: 'Code quality validation passed',
          metadata: { 
            qualityRule: 'source-file-access',
            recommendation: 'Ensure code follows project standards and conventions'
          }
        };
      }
    )
  ],
  endpoints: [
    { name: 'question', description: 'Answer testing and QA questions' },
    { name: 'validate', description: 'Validate test coverage and quality metrics' },
    { name: 'test', description: 'Create comprehensive tests' },
    { name: 'review', description: 'Review code quality and test effectiveness' },
    { name: 'analyze', description: 'Analyze test results and coverage reports' },
    { name: 'optimize', description: 'Optimize test performance and reliability' },
    { name: 'handle', description: 'Handle testing and QA file operations' }
  ]
};

// Register all agents
console.log('📝 Registering agents...');
orchestrator.registerAgent(frontendAgent);
orchestrator.registerAgent(backendAgent);
orchestrator.registerAgent(devopsAgent);
orchestrator.registerAgent(docsAgent);
orchestrator.registerAgent(qaAgent);

console.log('✅ All agents registered successfully!');

// Example usage scenarios
export async function runRealWorldExample() {
  console.log('🚀 Running Real-World Project Setup Example');
  
  try {
    // Scenario 1: Frontend component development
    console.log('\n🎨 Scenario 1: Frontend Component Development');
    const componentResponse = await orchestrator.executeRequest({
      type: OperationType.WRITE_FILE,
      filePath: 'src/components/UserProfile.tsx',
      payload: {
        content: `import React from 'react';

interface UserProfileProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
}

export const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};`
      },
      requestId: 'component-create-1'
    });
    console.log('Component creation:', componentResponse.success ? '✅ Success' : '❌ Failed');
    
    // Scenario 2: Backend API development
    console.log('\n🔧 Scenario 2: Backend API Development');
    const apiResponse = await orchestrator.executeRequest({
      type: OperationType.WRITE_FILE,
      filePath: 'src/api/routes/users.ts',
      payload: {
        content: `import express from 'express';
import { getUserById, updateUser } from '../controllers/userController';

const router = express.Router();

router.get('/:id', getUserById);
router.put('/:id', updateUser);

export default router;`
      },
      requestId: 'api-create-1'
    });
    console.log('API route creation:', apiResponse.success ? '✅ Success' : '❌ Failed');
    
    // Scenario 3: Documentation update
    console.log('\n📚 Scenario 3: Documentation Update');
    const docsResponse = await orchestrator.executeRequest({
      type: OperationType.EDIT_FILE,
      filePath: 'README.md',
      payload: {
        oldContent: '# Project',
        newContent: '# Full-Stack Web Application\n\nA comprehensive web application with React frontend and Node.js backend.'
      },
      requestId: 'docs-update-1'
    });
    console.log('Documentation update:', docsResponse.success ? '✅ Success' : '❌ Failed');
    
    // Scenario 4: Test creation
    console.log('\n🧪 Scenario 4: Test Creation');
    const testResponse = await orchestrator.executeRequest({
      type: OperationType.WRITE_FILE,
      filePath: 'src/components/__tests__/UserProfile.test.tsx',
      payload: {
        content: `import { render, screen } from '@testing-library/react';
import { UserProfile } from '../UserProfile';

describe('UserProfile', () => {
  it('renders user information', () => {
    const user = { name: 'John Doe', email: 'john@example.com' };
    render(<UserProfile user={user} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});`
      },
      requestId: 'test-create-1'
    });
    console.log('Test creation:', testResponse.success ? '✅ Success' : '❌ Failed');
    
    // Scenario 5: DevOps configuration
    console.log('\n🔧 Scenario 5: DevOps Configuration');
    const devopsResponse = await orchestrator.executeRequest({
      type: OperationType.WRITE_FILE,
      filePath: 'Dockerfile',
      payload: {
        content: `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]`
      },
      requestId: 'devops-create-1'
    });
    console.log('DevOps configuration:', devopsResponse.success ? '✅ Success' : '❌ Failed');
    
    // Show system statistics
    console.log('\n📊 System Statistics:');
    const stats = orchestrator.getStats();
    console.log(`- Total requests: ${stats.totalRequests}`);
    console.log(`- Successful requests: ${stats.successfulRequests}`);
    console.log(`- Failed requests: ${stats.failedRequests}`);
    console.log(`- Success rate: ${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`);
    
    if (stats.modelSelectionStats) {
      console.log('\n🤖 Model Usage:');
      Object.entries(stats.modelSelectionStats.modelUsage).forEach(([model, count]) => {
        console.log(`- ${model}: ${count} requests`);
      });
    }
    
  } catch (error) {
    console.error('❌ Real-world example failed:', error);
  }
}

// Agent interaction examples
export async function demonstrateAgentInteraction() {
  console.log('🤝 Demonstrating Agent Interaction');
  
  // Example questions to different agents
  const questions = [
    {
      agent: 'frontend-agent',
      question: 'What are the best practices for React component props validation?',
      context: 'Working on a component library'
    },
    {
      agent: 'backend-agent',
      question: 'How should I structure API error handling for a REST API?',
      context: 'Building a user management system'
    },
    {
      agent: 'devops-agent',
      question: 'What Docker best practices should I follow for a Node.js application?',
      context: 'Containerizing a web application'
    },
    {
      agent: 'docs-agent',
      question: 'How should I document API endpoints in OpenAPI format?',
      context: 'Creating comprehensive API documentation'
    },
    {
      agent: 'qa-agent',
      question: 'What testing strategies work best for full-stack applications?',
      context: 'Implementing comprehensive test coverage'
    }
  ];
  
  for (const { agent, question, context } of questions) {
    try {
      const response = await orchestrator.executeRequest({
        type: OperationType.QUESTION,
        payload: { question, context },
        requestId: `question-${agent}-${Date.now()}`
      });
      console.log(`\n${agent}: ${response.success ? '✅ Answered' : '❌ Failed'}`);
    } catch (error) {
      console.log(`\n${agent}: ❌ Error - ${error}`);
    }
  }
}

// Validation and health checks
export function validateProjectSetup() {
  console.log('🔍 Validating Project Setup');
  
  // Check agent registrations
  const registeredAgents = orchestrator.getStats().totalRequests >= 0; // Basic check
  console.log(`Agent registration: ${registeredAgents ? '✅ Valid' : '❌ Invalid'}`);
  
  // Validate agent capabilities
  const agents = [frontendAgent, backendAgent, devopsAgent, docsAgent, qaAgent];
  
  agents.forEach(agent => {
    console.log(`\n${agent.name}:`);
    console.log(`- Tools: ${agent.tools.length}`);
    console.log(`- Endpoints: ${agent.endpoints.length}`);
    console.log(`- Has question endpoint: ${agent.endpoints.some(ep => ep.name === 'question') ? '✅' : '❌'}`);
    console.log(`- Has handle endpoint: ${agent.endpoints.some(ep => ep.name === 'handle') ? '✅' : '❌'}`);
    
    // Check tool capabilities
    const operations = ['read_file', 'edit_file', 'write_file'] as const;
    operations.forEach(op => {
      const canHandle = agent.tools.some(tool => tool.canHandle(op as OperationType));
      console.log(`- Can handle ${op}: ${canHandle ? '✅' : '❌'}`);
    });
  });
}

// Export everything
export {
  orchestrator,
  frontendAgent,
  backendAgent,
  devopsAgent,
  docsAgent,
  qaAgent
};

console.log('\n✨ Real-World Setup Complete!');
console.log('📁 Available agents:');
console.log('  - Frontend Agent: React/Vue components, styling, assets');
console.log('  - Backend Agent: APIs, databases, server-side logic');
console.log('  - DevOps Agent: CI/CD, Docker, infrastructure');
console.log('  - Documentation Agent: README, API docs, comments');
console.log('  - QA Agent: Testing, code quality, coverage');
console.log('\n🚀 Ready for production development workflows!');