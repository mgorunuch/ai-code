import { AccessPattern, FileAccessContext, AccessPatternResult, OperationType } from '../source/core/types.js';

/**
 * Custom Access Pattern Class Examples
 * 
 * This file demonstrates how to create custom access pattern classes
 * for specific business requirements and use cases.
 */

// 1. Database Table Access Pattern
export class DatabaseTableAccess extends AccessPattern<FileAccessContext> {
  constructor(
    private tableName: string,
    private allowedOperations: string[] = ['SELECT'],
    private allow: boolean = true
  ) {
    super(
      `db-table-${tableName}`,
      `Database table access for ${tableName}`,
      50
    );
  }

  async appliesTo(context: FileAccessContext): Promise<boolean> {
    // Apply to database-related file operations
    return context.filePath.includes('database') || 
           context.filePath.includes('sql') ||
           context.filePath.includes('migration');
  }

  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    if (!this.allow) {
      return {
        allowed: false,
        reason: `Access to table ${this.tableName} is restricted`,
        metadata: { tableName: this.tableName, restrictionType: 'table-blocked' }
      };
    }

    // Check if operation is allowed (map file operations to database operations)
    const operationMapping: Record<string, string> = {
      'read_file': 'SELECT',
      'edit_file': 'UPDATE',
      'write_file': 'INSERT',
      'delete_file': 'DELETE'
    };
    
    const dbOperation = operationMapping[context.operation] || context.operation;
    if (!this.allowedOperations.includes(dbOperation)) {
      return {
        allowed: false,
        reason: `Operation ${dbOperation} not allowed on table ${this.tableName}`,
        metadata: { 
          tableName: this.tableName,
          requestedOperation: dbOperation,
          allowedOperations: this.allowedOperations
        }
      };
    }

    return {
      allowed: true,
      reason: `Access granted to table ${this.tableName} for ${dbOperation}`,
      metadata: { 
        tableName: this.tableName,
        operation: dbOperation,
        accessType: 'table-access'
      }
    };
  }
}

// 2. API Endpoint Access Pattern
export class APIEndpointAccess extends AccessPattern<FileAccessContext> {
  constructor(
    private endpoint: string,
    private allowedMethods: string[] = ['GET'],
    private allow: boolean = true
  ) {
    super(
      `api-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}`,
      `API endpoint access for ${endpoint}`,
      30
    );
  }

  async appliesTo(context: FileAccessContext): Promise<boolean> {
    // Apply to API-related files
    return context.filePath.includes('api') || 
           context.filePath.includes('route') ||
           context.filePath.includes('endpoint');
  }

  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    if (!this.allow) {
      return {
        allowed: false,
        reason: `Access to endpoint ${this.endpoint} is restricted`,
        metadata: { endpoint: this.endpoint, restrictionType: 'endpoint-blocked' }
      };
    }

    // For file operations, we'll map them to HTTP methods conceptually
    const operationToMethod: Record<string, string> = {
      'read_file': 'GET',
      'edit_file': 'PUT',
      'write_file': 'POST',
      'delete_file': 'DELETE'
    };

    const method = operationToMethod[context.operation] || 'UNKNOWN';
    
    if (!this.allowedMethods.includes(method)) {
      return {
        allowed: false,
        reason: `Method ${method} not allowed on endpoint ${this.endpoint}`,
        metadata: { 
          endpoint: this.endpoint,
          requestedMethod: method,
          allowedMethods: this.allowedMethods
        }
      };
    }

    return {
      allowed: true,
      reason: `Access granted to endpoint ${this.endpoint} for ${method}`,
      metadata: { 
        endpoint: this.endpoint,
        method: method,
        accessType: 'endpoint-access'
      }
    };
  }
}

// 3. Cloud Storage Access Pattern
export class CloudStorageAccess extends AccessPattern<FileAccessContext> {
  constructor(
    private bucketName: string,
    private pathPrefix: string = '',
    private allowedOperations: string[] = ['READ_FILE'],
    private allow: boolean = true
  ) {
    super(
      `cloud-storage-${bucketName}`,
      `Cloud storage access for bucket ${bucketName}`,
      40
    );
  }

  async appliesTo(context: FileAccessContext): Promise<boolean> {
    // Apply to cloud storage paths
    return context.filePath.startsWith('s3://') || 
           context.filePath.startsWith('gs://') ||
           context.filePath.startsWith('azure://') ||
           context.filePath.includes(this.bucketName);
  }

  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    if (!this.allow) {
      return {
        allowed: false,
        reason: `Access to bucket ${this.bucketName} is restricted`,
        metadata: { 
          bucketName: this.bucketName,
          restrictionType: 'bucket-blocked'
        }
      };
    }

    // Check path prefix
    if (this.pathPrefix && !context.filePath.includes(this.pathPrefix)) {
      return {
        allowed: false,
        reason: `Access denied: path must start with ${this.pathPrefix}`,
        metadata: { 
          bucketName: this.bucketName,
          requiredPrefix: this.pathPrefix,
          actualPath: context.filePath
        }
      };
    }

    // Check allowed operations
    if (!this.allowedOperations.includes(context.operation)) {
      return {
        allowed: false,
        reason: `Operation ${context.operation} not allowed on bucket ${this.bucketName}`,
        metadata: { 
          bucketName: this.bucketName,
          requestedOperation: context.operation,
          allowedOperations: this.allowedOperations
        }
      };
    }

    return {
      allowed: true,
      reason: `Cloud storage access granted to ${this.bucketName}`,
      metadata: { 
        bucketName: this.bucketName,
        pathPrefix: this.pathPrefix,
        operation: context.operation,
        accessType: 'cloud-storage-access'
      }
    };
  }
}

// 4. Security Level Access Pattern
export class SecurityLevelAccess extends AccessPattern<FileAccessContext> {
  constructor(
    private securityLevel: 'public' | 'internal' | 'confidential' | 'restricted',
    private userClearanceLevel: 'basic' | 'standard' | 'elevated' | 'admin' = 'basic'
  ) {
    const levelPriorities = {
      'public': 10,
      'internal': 30,
      'confidential': 70,
      'restricted': 100
    };

    super(
      `security-${securityLevel}`,
      `Security level access control (${securityLevel})`,
      levelPriorities[securityLevel]
    );
  }

  async appliesTo(context: FileAccessContext): Promise<boolean> {
    // Apply to files with security classifications
    const securityKeywords = ['security', 'auth', 'secret', 'private', 'confidential', 'restricted'];
    return securityKeywords.some(keyword => context.filePath.toLowerCase().includes(keyword));
  }

  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    const clearanceLevels = {
      'basic': 1,
      'standard': 2,
      'elevated': 3,
      'admin': 4
    };

    const securityLevels = {
      'public': 1,
      'internal': 2,
      'confidential': 3,
      'restricted': 4
    };

    const userLevel = clearanceLevels[this.userClearanceLevel];
    const requiredLevel = securityLevels[this.securityLevel];

    if (userLevel < requiredLevel) {
      return {
        allowed: false,
        reason: `Insufficient clearance: ${this.userClearanceLevel} clearance cannot access ${this.securityLevel} resources`,
        metadata: { 
          securityLevel: this.securityLevel,
          userClearance: this.userClearanceLevel,
          accessType: 'security-denied'
        }
      };
    }

    // Additional restrictions for high-security operations
    if (this.securityLevel === 'restricted' && context.operation === 'delete_file') {
      return {
        allowed: false,
        reason: 'Deletion of restricted files requires special authorization',
        metadata: { 
          securityLevel: this.securityLevel,
          operation: context.operation,
          accessType: 'operation-restricted'
        }
      };
    }

    return {
      allowed: true,
      reason: `Security clearance validated for ${this.securityLevel} access`,
      metadata: { 
        securityLevel: this.securityLevel,
        userClearance: this.userClearanceLevel,
        operation: context.operation,
        accessType: 'security-approved'
      }
    };
  }
}

// 5. Git Branch Access Pattern
export class GitBranchAccess extends AccessPattern<FileAccessContext> {
  constructor(
    private allowedBranches: string[] = ['main', 'develop'],
    private protectedBranches: string[] = ['main', 'master'],
    private currentBranch: string = 'develop'
  ) {
    super(
      'git-branch-access',
      'Git branch-based access control',
      80
    );
  }

  async appliesTo(context: FileAccessContext): Promise<boolean> {
    // Apply to all file operations in a git repository
    return true; // Could check for .git directory presence
  }

  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    // Check if current branch is allowed
    if (!this.allowedBranches.includes(this.currentBranch)) {
      return {
        allowed: false,
        reason: `Operations not allowed on branch: ${this.currentBranch}`,
        metadata: { 
          currentBranch: this.currentBranch,
          allowedBranches: this.allowedBranches,
          accessType: 'branch-restricted'
        }
      };
    }

    // Extra protection for protected branches
    if (this.protectedBranches.includes(this.currentBranch) && 
        ['delete_file', 'edit_file'].includes(context.operation)) {
      
      // In a real implementation, you might check for pull request requirements
      return {
        allowed: false,
        reason: `Direct modifications to protected branch ${this.currentBranch} require pull request`,
        metadata: { 
          currentBranch: this.currentBranch,
          protectedBranches: this.protectedBranches,
          operation: context.operation,
          accessType: 'protected-branch-restriction'
        }
      };
    }

    return {
      allowed: true,
      reason: `Git branch access validated for ${this.currentBranch}`,
      metadata: { 
        currentBranch: this.currentBranch,
        operation: context.operation,
        accessType: 'branch-approved'
      }
    };
  }
}

// Example usage and configuration
export const ExampleCustomPatterns = {
  // Database access examples
  userTableAccess: new DatabaseTableAccess('users', ['SELECT', 'INSERT', 'UPDATE'], true),
  systemTableAccess: new DatabaseTableAccess('system_config', ['SELECT'], true),
  
  // API endpoint examples
  publicAPIAccess: new APIEndpointAccess('/api/public/*', ['GET'], true),
  userAPIAccess: new APIEndpointAccess('/api/users/*', ['GET', 'POST', 'PUT'], true),
  adminAPIAccess: new APIEndpointAccess('/api/admin/*', ['GET', 'POST', 'PUT', 'DELETE'], false),
  
  // Cloud storage examples
  publicBucketAccess: new CloudStorageAccess('public-assets', 'images/', ['READ_FILE'], true),
  privateBucketAccess: new CloudStorageAccess('private-data', 'user-data/', ['READ_FILE', 'EDIT_FILE'], true),
  
  // Security level examples
  publicAccess: new SecurityLevelAccess('public', 'basic'),
  internalAccess: new SecurityLevelAccess('internal', 'standard'),
  confidentialAccess: new SecurityLevelAccess('confidential', 'elevated'),
  restrictedAccess: new SecurityLevelAccess('restricted', 'admin'),
  
  // Git branch access
  gitBranchAccess: new GitBranchAccess(['main', 'develop', 'feature/*'], ['main'], 'develop')
};

// Demonstration function
export async function demonstrateCustomPatterns() {
  console.log('🎨 Demonstrating Custom Access Patterns');
  
  const testContext: FileAccessContext = {
    resource: 'src/auth/security/user-auth.ts',
    filePath: 'src/auth/security/user-auth.ts',
    operation: 'edit_file' as OperationType,
    requesterId: 'security-agent',
    agentId: 'security-agent',
    timestamp: new Date()
  };

  const patterns = [
    ExampleCustomPatterns.userTableAccess,
    ExampleCustomPatterns.confidentialAccess,
    ExampleCustomPatterns.gitBranchAccess
  ];

  for (const pattern of patterns) {
    try {
      const applies = await pattern.appliesTo(testContext);
      if (applies) {
        const result = await pattern.validate(testContext);
        console.log(`${pattern.id}: ${result.allowed ? '✅' : '❌'} ${result.reason}`);
        if (result.metadata) {
          console.log(`  Metadata:`, result.metadata);
        }
      } else {
        console.log(`${pattern.id}: ⏭️ Does not apply to this context`);
      }
    } catch (error) {
      console.log(`${pattern.id}: ❌ Error - ${error}`);
    }
  }
}