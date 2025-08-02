import {
  FileSystemAccessPattern,
  DatabaseTableAccessPattern,
  APIEndpointAccessPattern,
  CompositeAccessPattern,
  TimeBasedAccessPattern,
  CustomAccessPattern
} from '../source/core/access-patterns.js';
import type { FileAccessContext, OperationType } from '../source/core/types.js';

/**
 * Access Patterns Usage Examples
 * 
 * This example demonstrates how to create and use different types of
 * access patterns in the orchestration system.
 */

// 1. File System Access Patterns
console.log('📁 File System Access Patterns Examples');

// React components pattern
const reactPattern = new FileSystemAccessPattern(
  'react-components',
  'React component files (.tsx, .jsx)',
  20,
  ['**/*.tsx', '**/*.jsx', '**/components/**'],
  true
);

// TypeScript source pattern
const typescriptPattern = new FileSystemAccessPattern(
  'typescript-source',
  'TypeScript source files',
  30,
  ['**/*.ts', '**/src/**', '**/lib/**'],
  true
);

// Configuration files pattern (read-only)
const configPattern = new FileSystemAccessPattern(
  'config-files',
  'Configuration files (read-only)',
  15,
  ['**/package.json', '**/tsconfig.json', '**/*.config.*'],
  false // read-only
);

// Test files pattern
const testPattern = new FileSystemAccessPattern(
  'test-files',
  'Test and spec files',
  10,
  ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/tests/**'],
  true
);

// 2. Database Access Patterns
console.log('🗄️ Database Access Patterns Examples');

// User data tables
const userTablesPattern = new DatabaseTableAccessPattern(
  'user-data',
  'User data tables',
  50,
  ['users', 'user_profiles', 'user_settings'],
  ['SELECT', 'INSERT', 'UPDATE'],
  true
);

// System tables (read-only)
const systemTablesPattern = new DatabaseTableAccessPattern(
  'system-tables',
  'System configuration tables',
  100,
  ['sys_*', 'config_*', 'migrations'],
  ['SELECT'],
  false
);

// Analytics tables
const analyticsPattern = new DatabaseTableAccessPattern(
  'analytics-data',
  'Analytics and reporting tables',
  25,
  ['analytics_*', 'reports_*', 'metrics_*'],
  ['SELECT', 'INSERT'],
  true
);

// 3. API Endpoint Access Patterns
console.log('🌐 API Endpoint Access Patterns Examples');

// User API endpoints
const userAPIPattern = new APIEndpointAccessPattern(
  'user-api',
  'User management API endpoints',
  30,
  ['/api/users/*', '/api/auth/*'],
  ['GET', 'POST', 'PUT'],
  true
);

// Public API endpoints (read-only)
const publicAPIPattern = new APIEndpointAccessPattern(
  'public-api',
  'Public API endpoints',
  10,
  ['/api/public/*', '/api/health', '/api/status'],
  ['GET'],
  false
);

// Admin API endpoints (restricted)
const adminAPIPattern = new APIEndpointAccessPattern(
  'admin-api',
  'Administrative API endpoints',
  100,
  ['/api/admin/*', '/api/system/*'],
  ['GET', 'POST', 'PUT', 'DELETE'],
  true
);

// 4. Composite Access Patterns
console.log('🔗 Composite Access Patterns Examples');

// Full stack development pattern (combines multiple patterns)
const fullStackPattern = new CompositeAccessPattern(
  'full-stack-dev',
  'Full stack development access',
  40,
  [reactPattern, typescriptPattern, userAPIPattern],
  'AND' // All patterns must allow access
);

// Frontend development pattern
const frontendPattern = new CompositeAccessPattern(
  'frontend-dev',
  'Frontend development access',
  25,
  [reactPattern, configPattern, publicAPIPattern],
  'OR' // Any pattern can allow access
);

// 5. Time-Based Access Patterns
console.log('⏰ Time-Based Access Patterns Examples');

// Business hours restriction
const businessHoursPattern = new TimeBasedAccessPattern(
  'business-hours',
  'Business hours access only',
  50,
  systemTablesPattern, // Base pattern
  { start: 9, end: 17 }, // 9 AM to 5 PM
  [1, 2, 3, 4, 5] // Monday to Friday
);

// Maintenance window restriction
const maintenancePattern = new TimeBasedAccessPattern(
  'maintenance-window',
  'Maintenance window access',
  100,
  adminAPIPattern, // Base pattern
  { start: 2, end: 6 }, // 2 AM to 6 AM
  undefined // All days allowed
);

// 6. Custom Access Patterns
console.log('🎛️ Custom Access Patterns Examples');

// Custom file validation pattern
const customFilePattern = new CustomAccessPattern(
  'custom-file-validation',
  'Custom file validation logic',
  75,
  // appliesTo function
  async (context: FileAccessContext) => {
    return context.filePath.endsWith('.ts') || context.filePath.endsWith('.tsx');
  },
  // validate function
  async (context: FileAccessContext) => {
    // Custom validation logic
    if (context.filePath.includes('legacy')) {
      return {
        allowed: false,
        reason: 'Legacy files are not editable',
        metadata: { category: 'legacy-restriction' }
      };
    }
    
    if (context.operation === 'delete_file' && context.filePath.includes('critical')) {
      return {
        allowed: false,
        reason: 'Critical files cannot be deleted',
        metadata: { category: 'safety-restriction' }
      };
    }
    
    return {
      allowed: true,
      reason: 'Custom validation passed',
      metadata: { category: 'custom-approved' }
    };
  }
);

// Complex business logic pattern
const businessLogicPattern = new CustomAccessPattern(
  'business-logic',
  'Complex business rules validation',
  90,
  // appliesTo function
  async (context: FileAccessContext) => {
    return context.filePath.includes('business') || context.filePath.includes('domain');
  },
  // validate function
  async (context: FileAccessContext) => {
    // Simulate complex business rules
    const isWorkingHours = new Date().getHours() >= 9 && new Date().getHours() <= 17;
    const isWeekday = new Date().getDay() >= 1 && new Date().getDay() <= 5;
    
    if (!isWorkingHours || !isWeekday) {
      return {
        allowed: false,
        reason: 'Business logic changes only allowed during business hours',
        metadata: { 
          category: 'time-restriction',
          currentTime: new Date().toISOString()
        }
      };
    }
    
    return {
      allowed: true,
      reason: 'Business hours validation passed',
      metadata: { 
        category: 'business-approved',
        validatedAt: new Date().toISOString()
      }
    };
  }
);

// Export all patterns for use in other examples
export {
  // File System Patterns
  reactPattern,
  typescriptPattern,
  configPattern,
  testPattern,
  
  // Database Patterns
  userTablesPattern,
  systemTablesPattern,
  analyticsPattern,
  
  // API Patterns
  userAPIPattern,
  publicAPIPattern,
  adminAPIPattern,
  
  // Composite Patterns
  fullStackPattern,
  frontendPattern,
  
  // Time-Based Patterns
  businessHoursPattern,
  maintenancePattern,
  
  // Custom Patterns
  customFilePattern,
  businessLogicPattern
};

// Example usage demonstration
export async function demonstrateAccessPatterns() {
  console.log('🎯 Demonstrating Access Patterns');
  
  // Create a sample context
  const sampleContext: FileAccessContext = {
    resource: 'src/components/Button.tsx',
    filePath: 'src/components/Button.tsx',
    operation: 'edit_file' as OperationType,
    requesterId: 'react-agent',
    agentId: 'react-agent',
    timestamp: new Date()
  };
  
  // Test patterns
  const patterns = [
    reactPattern,
    typescriptPattern,
    configPattern,
    customFilePattern
  ];
  
  for (const pattern of patterns) {
    try {
      const applies = await pattern.appliesTo(sampleContext);
      if (applies) {
        const result = await pattern.validate(sampleContext);
        console.log(`Pattern "${pattern.id}": ${result.allowed ? '✅ ALLOWED' : '❌ DENIED'} - ${result.reason}`);
      } else {
        console.log(`Pattern "${pattern.id}": ⏭️ SKIPPED - Does not apply`);
      }
    } catch (error) {
      console.log(`Pattern "${pattern.id}": ❌ ERROR - ${error}`);
    }
  }
}