# Core Orchestration Examples

This directory contains examples demonstrating how to use the Core Orchestration System with class-based access patterns.

## Files Overview

### 📁 `basic-config.ts`
Basic orchestrator configuration example showing:
- Simple orchestrator setup with model selection
- Agent registration with file system access patterns
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
- **DatabaseTableAccess** - Database table access control
- **APIEndpointAccess** - REST API endpoint access management
- **CloudStorageAccess** - Cloud storage bucket and path restrictions
- **SecurityLevelAccess** - Security clearance-based access control
- **GitBranchAccess** - Git branch-based operation restrictions

## Quick Start

### 1. Basic Setup
```typescript
import { runBasicExample } from './basic-config.js';

// Run the basic configuration example
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

## Key Concepts

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

### Configuration Examples

#### Simple File Pattern
```typescript
new FileSystemAccessPattern(
  'react-components',
  'React component files',
  20,
  ['**/*.tsx', '**/*.jsx'],
  true
)
```

#### Database Table Access
```typescript
new DatabaseTableAccess('users', ['SELECT', 'INSERT'], true)
```

#### API Endpoint Access
```typescript
new APIEndpointAccess('/api/users/*', ['GET', 'POST'], true)
```

#### Security Level Access
```typescript
new SecurityLevelAccess('confidential', 'elevated')
```

## Best Practices

### 1. Pattern Priorities
- Use higher priorities (50-100) for security and safety patterns
- Use medium priorities (20-50) for business logic patterns
- Use lower priorities (10-20) for general access patterns

### 2. Error Handling
- Always provide descriptive reason messages
- Include relevant metadata for debugging
- Handle edge cases gracefully

### 3. Performance
- Keep `appliesTo()` checks lightweight
- Cache expensive validations when possible
- Use specific patterns rather than overly broad ones

### 4. Security
- Default to deny access for security patterns
- Validate all inputs in custom patterns
- Log access decisions for audit purposes

## Extension Examples

### Custom Resource Type
```typescript
class MessageQueueAccess extends AccessPattern<QueueContext> {
  constructor(private queueName: string, private operations: string[]) {
    super(`queue-${queueName}`, `Access to queue ${queueName}`, 40);
  }
  
  async appliesTo(context: QueueContext): Promise<boolean> {
    return context.queueName === this.queueName;
  }
  
  async validate(context: QueueContext): Promise<AccessPatternResult> {
    if (!this.operations.includes(context.operation)) {
      return {
        allowed: false,
        reason: `Operation ${context.operation} not allowed on queue ${this.queueName}`
      };
    }
    
    return {
      allowed: true,
      reason: `Queue access granted for ${context.operation}`
    };
  }
}
```

### Business Rules Pattern
```typescript
class BusinessRulesAccess extends AccessPattern<FileAccessContext> {
  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    // Complex business logic here
    const isBusinessHours = /* check time */;
    const hasApproval = /* check approval system */;
    const isAuthorized = /* check authorization */;
    
    if (!isBusinessHours || !hasApproval || !isAuthorized) {
      return { allowed: false, reason: 'Business rules validation failed' };
    }
    
    return { allowed: true, reason: 'Business rules validation passed' };
  }
}
```

## Running Examples

To run these examples in your project:

1. Import the orchestration system:
```typescript
import { createOrchestrator } from '../source/core/index.js';
```

2. Import access patterns:
```typescript
import { FileSystemAccessPattern } from '../source/core/access-patterns.js';
```

3. Import examples:
```typescript
import { runBasicExample } from './basic-config.js';
import { demonstrateAccessPatterns } from './access-patterns.js';
```

4. Execute:
```typescript
await runBasicExample();
await demonstrateAccessPatterns();
```

## Further Reading

- See `../source/core/knowledge.md` for detailed system documentation
- Review `../source/core/types.ts` for type definitions
- Check `../source/core/access-patterns.ts` for built-in pattern implementations