# Core Orchestration Examples

This directory contains examples demonstrating how to use the Core Orchestration System with the modern tool-based architecture where tools encapsulate both operations and access patterns.

## Files Overview

### 📁 `basic-config.ts`
Basic orchestrator configuration example showing:
- Simple orchestrator setup with model selection and cost optimization
- Agent registration using tool-based configuration
- CommonTools usage for quick agent setup
- Basic usage examples (read, edit, question operations)
- System statistics and monitoring

### 📁 `access-patterns.ts`
Comprehensive examples of all access pattern types:
- **File System Patterns** - React components, TypeScript files, config files, tests
- **Database Patterns** - User tables, system tables, analytics data  
- **API Patterns** - User endpoints, public APIs, admin APIs
- **Composite Patterns** - Combining multiple patterns with AND/OR logic
- **Time-Based Patterns** - Business hours and maintenance window restrictions
- **Custom Patterns** - Complex validation logic and business rules

### 📁 `custom-patterns.ts`
Custom access pattern class examples for specific use cases:
- **DatabaseTableAccess** - Database table access control with operation mapping
- **APIEndpointAccess** - REST API endpoint access management
- **CloudStorageAccess** - Cloud storage bucket and path restrictions
- **SecurityLevelAccess** - Security clearance-based access control
- **GitBranchAccess** - Git branch-based operation restrictions

### 📁 `tool-based-agents.ts`
Modern tool-based agent configuration examples:
- **Tool Creation** - ReadTool, EditTool, CreateTool, DeleteTool examples
- **ToolFactory Usage** - Quick tool creation with factory methods
- **CommonTools Patterns** - Pre-configured tool sets for React, TypeScript, testing
- **Custom Tools** - Advanced tools with custom access patterns
- **CompositeTool** - Combining multiple tools for complex capabilities
- **Agent Validation** - Testing and validation examples

### 📁 `real-world-setup.ts`
Complete real-world project setup example:
- **Frontend Agent** - React/Vue components, styling, and assets
- **Backend Agent** - APIs, databases, and server-side logic
- **DevOps Agent** - CI/CD, Docker, and infrastructure configuration
- **Documentation Agent** - README files, API docs, and code comments
- **QA Agent** - Testing, code quality, and quality assurance
- **Production Configuration** - Cost optimization and security patterns
- **Interaction Examples** - Cross-agent communication and workflows

## Quick Start

### 1. Basic Setup
```typescript
import { runBasicExample } from './basic-config.js';

// Run the basic configuration example with tool-based agents
await runBasicExample();
```

### 2. Access Patterns Demo
```typescript
import { demonstrateAccessPatterns } from './access-patterns.js';

// Demonstrate different access pattern types
await demonstrateAccessPatterns();
```

### 3. Custom Patterns Demo
```typescript
import { demonstrateCustomPatterns } from './custom-patterns.js';

// Show custom access pattern implementations
await demonstrateCustomPatterns();
```

### 4. Tool-Based Agents Demo
```typescript
import { runToolBasedExamples } from './tool-based-agents.js';

// Demonstrate modern tool-based agent configuration
await runToolBasedExamples();
```

### 5. Real-World Setup
```typescript
import { runRealWorldExample, demonstrateAgentInteraction, validateProjectSetup } from './real-world-setup.js';

// Run complete real-world project setup
await runRealWorldExample();

// Demonstrate cross-agent interactions
await demonstrateAgentInteraction();

// Validate the project setup
validateProjectSetup();
```

## Key Concepts

### Tool-Based Architecture
The modern system uses tools that encapsulate both operations and access patterns:
- **AgentTool** - Base class for all tools with embedded access patterns
- **ReadTool** - File reading operations with configurable patterns
- **EditTool** - File editing operations with access control
- **CreateTool** - File/directory creation with pattern validation
- **DeleteTool** - File deletion with safety patterns
- **CommunicationTool** - Inter-agent communication capabilities
- **CompositeTool** - Combines multiple tools for complex workflows

### Access Pattern Classes
All access patterns extend the base `AccessPattern<TContext>` class and implement:
- `appliesTo(context)` - Determines if pattern applies to the current context
- `validate(context)` - Validates access and returns result with reason

### Pattern Types
1. **File System Patterns** - Control access to files and directories
2. **Database Patterns** - Manage database table and operation access
3. **API Patterns** - Control REST API endpoint access
4. **Composite Patterns** - Combine multiple patterns with logical operators
5. **Time-Based Patterns** - Add temporal restrictions to any base pattern
6. **Custom Patterns** - Implement complex business logic and rules

### Tool Configuration Examples

#### Using CommonTools for Quick Setup
```typescript
// Pre-configured React development tools
const reactTools = CommonTools.createReactTools();

// Pre-configured TypeScript development tools
const typescriptTools = CommonTools.createTypeScriptTools();

// Pre-configured testing tools
const testTools = CommonTools.createTestTools();
```

#### Custom Tool Creation
```typescript
const customEditTool = new EditTool({
  id: 'custom-editor',
  description: 'Custom file editor with specific patterns',
  accessPatterns: [
    new FileSystemAccessPattern(
      'custom-files',
      'Custom file patterns',
      60,
      ['**/*.custom.ts', '**/custom/**'],
      true,
      [OperationType.EDIT_FILE]
    )
  ]
});
```

#### Using ToolFactory
```typescript
// Quick tool creation with factory methods
const readTool = ToolFactory.createReadTool(
  ['**/*.tsx', '**/*.jsx'],
  { id: 'react-reader', description: 'Read React components' }
);

const fullAccessTool = ToolFactory.createFullAccessTool(
  ['**/sandbox/**'],
  { id: 'sandbox-access', description: 'Full sandbox access' }
);
```

#### Modern Agent Configuration
```typescript
const modernAgent: AgentCapability = {
  id: 'modern-agent',
  name: 'Modern Tool-Based Agent',
  description: 'Agent using tool-based architecture',
  tools: [
    ...CommonTools.createReactTools(),
    customEditTool,
    fullAccessTool
  ],
  endpoints: [
    { name: 'question', description: 'Answer questions' },
    { name: 'handle', description: 'Handle operations' },
    { name: 'validate', description: 'Validate code' }
  ]
};
```

## Best Practices

### 1. Tool Design
- Use CommonTools for standard patterns (React, TypeScript, testing)
- Create custom tools only when specific access patterns are needed
- Combine tools with CompositeTool for complex workflows
- Keep tool responsibilities focused and single-purpose

### 2. Access Pattern Priorities
- Use higher priorities (50-100) for security and safety patterns
- Use medium priorities (20-50) for business logic patterns
- Use lower priorities (10-20) for general access patterns

### 3. Agent Configuration
- Always include a 'question' endpoint for inter-agent communication
- Include a 'handle' endpoint for general operation handling
- Use descriptive tool IDs and descriptions for debugging
- Group related tools together logically

### 4. Error Handling
- Always provide descriptive reason messages in access patterns
- Include relevant metadata for debugging and auditing
- Handle edge cases gracefully in custom patterns
- Test tool access with various contexts

### 5. Performance
- Keep `appliesTo()` checks lightweight and fast
- Cache expensive validations when possible
- Use specific file patterns rather than overly broad ones
- Leverage ToolFactory for consistent tool creation

### 6. Security
- Default to deny access for security-sensitive patterns
- Validate all inputs in custom access patterns
- Log access decisions for audit purposes
- Use CustomAccessPattern for complex security rules

## Extension Examples

### Custom Tool for Specialized Workflows
```typescript
class DatabaseMigrationTool extends AgentTool<FileAccessContext> {
  readonly id = 'database-migration-tool';
  readonly name = 'Database Migration Tool';
  readonly description = 'Specialized tool for database migration operations';
  readonly accessPatterns = [
    new FileSystemAccessPattern(
      'migration-files',
      'Database migration files',
      90,
      ['**/migrations/**', '**/*.sql', '**/seeders/**'],
      true,
      [OperationType.READ_FILE, OperationType.WRITE_FILE, OperationType.EDIT_FILE]
    ),
    new CustomAccessPattern(
      'migration-safety',
      'Migration safety checks',
      100,
      async (context) => context.filePath.includes('migration'),
      async (context) => {
        // Safety checks for migrations
        if (context.operation === 'delete_file') {
          return {
            allowed: false,
            reason: 'Cannot delete migration files for data integrity',
            metadata: { safetyLevel: 'critical' }
          };
        }
        return { allowed: true, reason: 'Migration operation allowed' };
      }
    )
  ];

  canHandle(operation: OperationType): boolean {
    return ['read_file', 'write_file', 'edit_file'].includes(operation);
  }
}
```

### Custom Agent Pattern for Domain-Specific Work
```typescript
// E-commerce specialized agent
const ecommerceAgent: AgentCapability = {
  id: 'ecommerce-agent',
  name: 'E-commerce Development Agent',
  description: 'Specialized agent for e-commerce features',
  tools: [
    // Standard tools
    ...CommonTools.createReactTools(),
    ...CommonTools.createTypeScriptTools(),
    
    // E-commerce specific tools
    new EditTool({
      id: 'ecommerce-component-editor',
      description: 'Edit e-commerce components',
      accessPatterns: [
        new FileSystemAccessPattern(
          'ecommerce-components',
          'E-commerce React components',
          70,
          [
            '**/components/cart/**',
            '**/components/checkout/**',
            '**/components/product/**',
            '**/components/payment/**',
            '**/ecommerce/**'
          ],
          true
        )
      ]
    }),
    
    new CreateTool({
      id: 'payment-integration-creator',
      description: 'Create payment integration files',
      accessPatterns: [
        new CustomAccessPattern(
          'payment-security',
          'Payment security validation',
          100,
          async (context) => context.filePath.includes('payment'),
          async (context) => ({
            allowed: true,
            reason: 'Payment integration allowed with security awareness',
            metadata: { 
              securityNote: 'Ensure PCI compliance and secure API key handling'
            }
          })
        )
      ]
    })
  ],
  endpoints: [
    { name: 'question', description: 'Answer e-commerce questions' },
    { name: 'validate', description: 'Validate e-commerce component structure' },
    { name: 'security-review', description: 'Review payment security' },
    { name: 'integration', description: 'Help with payment gateway integration' },
    { name: 'handle', description: 'Handle e-commerce operations' }
  ]
};
```

## Running Examples

To run these examples in your project:

1. Import the orchestration system:
```typescript
import { createOrchestrator, OperationType, AIModel } from '../source/core/index.js';
```

2. Import tools and patterns:
```typescript
import { CommonTools, ToolFactory, ReadTool, EditTool } from '../source/core/tools.js';
import { FileSystemAccessPattern, CustomAccessPattern } from '../source/core/access-patterns.js';
```

3. Import and run examples:
```typescript
// Basic setup
import { runBasicExample } from './basic-config.js';
await runBasicExample();

// Access patterns demonstration
import { demonstrateAccessPatterns } from './access-patterns.js';
await demonstrateAccessPatterns();

// Custom patterns
import { demonstrateCustomPatterns } from './custom-patterns.js';
await demonstrateCustomPatterns();

// Tool-based agents
import { runToolBasedExamples } from './tool-based-agents.js';
await runToolBasedExamples();

// Real-world setup
import { runRealWorldExample, demonstrateAgentInteraction } from './real-world-setup.js';
await runRealWorldExample();
await demonstrateAgentInteraction();
```

### Complete Example Script
```typescript
// examples/run-all.ts
import { runBasicExample } from './basic-config.js';
import { demonstrateAccessPatterns } from './access-patterns.js';
import { demonstrateCustomPatterns } from './custom-patterns.js';
import { runToolBasedExamples } from './tool-based-agents.js';
import { runRealWorldExample, demonstrateAgentInteraction, validateProjectSetup } from './real-world-setup.js';

async function runAllExamples() {
  console.log('🚀 Running All Core Orchestration Examples\n');
  
  // Run examples in sequence
  await runBasicExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await demonstrateAccessPatterns();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await demonstrateCustomPatterns();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await runToolBasedExamples();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await runRealWorldExample();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await demonstrateAgentInteraction();
  console.log('\n' + '='.repeat(50) + '\n');
  
  validateProjectSetup();
  
  console.log('\n✅ All examples completed successfully!');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
```

## Migration from Legacy Systems

If you have existing agents using the old pattern system, they can be migrated to the new tool-based approach:

### Legacy Agent Structure
```typescript
// Old approach - separate access patterns and tools
const legacyAgent = {
  id: 'legacy-agent',
  accessPatterns: [/* separate patterns */],
  tools: ['read_local', 'edit_files'], // string-based tools
  endpoints: [/* endpoints */]
};
```

### Modern Tool-Based Structure
```typescript
// New approach - tools embed access patterns
const modernAgent: AgentCapability = {
  id: 'modern-agent',
  name: 'Modern Agent',
  description: 'Tool-based agent',
  tools: [
    // Tools contain embedded access patterns
    ...CommonTools.createReactTools(),
    new CustomTool(/* custom configuration */)
  ],
  endpoints: [/* same endpoints structure */]
};
```

### Key Migration Benefits
- **Simplified Configuration**: Tools encapsulate both operations and access patterns
- **Better Reusability**: CommonTools provide pre-configured tool sets
- **Improved Testing**: Individual tool access can be tested independently
- **Enhanced Security**: More granular control over operations and access
- **Better Performance**: Optimized access pattern evaluation

## Further Reading

- See `../source/core/knowledge.md` for detailed system documentation
- Review `../source/core/types.ts` for complete type definitions
- Check `../source/core/tools.ts` for all available tool implementations
- Explore `../source/core/access-patterns.ts` for built-in pattern implementations
- Reference `../source/core/orchestrator.ts` for orchestration system details

## Community and Support

For questions, issues, or contributions:
- Review the core system documentation
- Check existing examples for common patterns
- Test new configurations with the validation examples
- Follow the established patterns for consistency