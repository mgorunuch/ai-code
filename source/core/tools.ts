/**
 * Concrete tool implementations with access patterns
 * Tools encapsulate both operation capabilities and access control
 */

import { AgentTool, OperationType, type AccessPattern, type FileAccessContext, type AccessPatternResult } from './types.js';
import { FileSystemAccessPattern } from './access-patterns.js';

/**
 * Tool for reading files with configurable access patterns
 */
export class ReadTool extends AgentTool<FileAccessContext> {
  readonly id: string;
  readonly name = 'File Reader';
  readonly description: string;
  readonly accessPatterns: AccessPattern<FileAccessContext>[];

  constructor(options: {
    id?: string;
    description?: string;
    accessPatterns: AccessPattern<FileAccessContext>[];
  }) {
    super();
    this.id = options.id || 'read-tool';
    this.description = options.description || 'Read files within specified patterns';
    this.accessPatterns = options.accessPatterns;
  }

  canHandle(operation: OperationType): boolean {
    return operation === OperationType.READ_FILE || operation === OperationType.VALIDATE;
  }
}

/**
 * Tool for editing existing files with configurable access patterns
 */
export class EditTool extends AgentTool<FileAccessContext> {
  readonly id: string;
  readonly name = 'File Editor';
  readonly description: string;
  readonly accessPatterns: AccessPattern<FileAccessContext>[];

  constructor(options: {
    id?: string;
    description?: string;
    accessPatterns: AccessPattern<FileAccessContext>[];
  }) {
    super();
    this.id = options.id || 'edit-tool';
    this.description = options.description || 'Edit existing files within specified patterns';
    this.accessPatterns = options.accessPatterns;
  }

  canHandle(operation: OperationType): boolean {
    return operation === OperationType.EDIT_FILE || operation === OperationType.TRANSFORM;
  }
}

/**
 * Tool for creating new files with configurable access patterns
 */
export class CreateTool extends AgentTool<FileAccessContext> {
  readonly id: string;
  readonly name = 'File Creator';
  readonly description: string;
  readonly accessPatterns: AccessPattern<FileAccessContext>[];

  constructor(options: {
    id?: string;
    description?: string;
    accessPatterns: AccessPattern<FileAccessContext>[];
  }) {
    super();
    this.id = options.id || 'create-tool';
    this.description = options.description || 'Create new files within specified patterns';
    this.accessPatterns = options.accessPatterns;
  }

  canHandle(operation: OperationType): boolean {
    return operation === OperationType.WRITE_FILE;
  }
}

/**
 * Tool for deleting files with configurable access patterns
 */
export class DeleteTool extends AgentTool<FileAccessContext> {
  readonly id: string;
  readonly name = 'File Deleter';
  readonly description: string;
  readonly accessPatterns: AccessPattern<FileAccessContext>[];

  constructor(options: {
    id?: string;
    description?: string;
    accessPatterns: AccessPattern<FileAccessContext>[];
  }) {
    super();
    this.id = options.id || 'delete-tool';
    this.description = options.description || 'Delete files within specified patterns';
    this.accessPatterns = options.accessPatterns;
  }

  canHandle(operation: OperationType): boolean {
    return operation === OperationType.DELETE_FILE;
  }
}

/**
 * Tool for creating directories with configurable access patterns
 */
export class CreateDirectoryTool extends AgentTool<FileAccessContext> {
  readonly id: string;
  readonly name = 'Directory Creator';
  readonly description: string;
  readonly accessPatterns: AccessPattern<FileAccessContext>[];

  constructor(options: {
    id?: string;
    description?: string;
    accessPatterns: AccessPattern<FileAccessContext>[];
  }) {
    super();
    this.id = options.id || 'create-directory-tool';
    this.description = options.description || 'Create directories within specified patterns';
    this.accessPatterns = options.accessPatterns;
  }

  canHandle(operation: OperationType): boolean {
    return operation === OperationType.CREATE_DIRECTORY;
  }
}

/**
 * Tool for inter-agent communication
 */
export class CommunicationTool extends AgentTool<FileAccessContext> {
  readonly id: string;
  readonly name = 'Inter-Agent Communication';
  readonly description: string;
  readonly accessPatterns: AccessPattern<FileAccessContext>[] = []; // No file patterns needed

  constructor(options: {
    id?: string;
    description?: string;
  } = {}) {
    super();
    this.id = options.id || 'communication-tool';
    this.description = options.description || 'Communicate with other agents';
  }

  canHandle(operation: OperationType): boolean {
    return operation === OperationType.QUESTION;
  }

  async checkAccess(): Promise<AccessPatternResult> {
    // Communication tool always allows access (no file patterns to check)
    return {
      allowed: true,
      reason: 'Inter-agent communication is always allowed',
      patternId: this.id
    };
  }
}

/**
 * Composite tool that combines multiple tools
 */
export class CompositeTool extends AgentTool<FileAccessContext> {
  readonly id: string;
  readonly name = 'Composite Tool';
  readonly description: string;
  readonly accessPatterns: AccessPattern<FileAccessContext>[];
  private readonly tools: AgentTool<FileAccessContext>[];

  constructor(options: {
    id?: string;
    description?: string;
    tools: AgentTool<FileAccessContext>[];
  }) {
    super();
    this.id = options.id || 'composite-tool';
    this.description = options.description || 'Composite tool combining multiple capabilities';
    this.tools = options.tools;
    
    // Combine all access patterns from sub-tools
    this.accessPatterns = this.tools.flatMap(tool => tool.accessPatterns);
  }

  canHandle(operation: OperationType): boolean {
    return this.tools.some(tool => tool.canHandle(operation));
  }

  async checkAccess(context: FileAccessContext): Promise<AccessPatternResult> {
    // Find the first tool that can handle this operation and check its access
    const capableTool = this.tools.find(tool => tool.canHandle(context.operation));
    
    if (!capableTool) {
      return {
        allowed: false,
        reason: `No tool in composite can handle operation ${context.operation}`,
        patternId: this.id
      };
    }

    return await capableTool.checkAccess(context);
  }
}

/**
 * Factory functions for creating common tool configurations
 */
export class ToolFactory {
  /**
   * Create a read tool with file system access patterns
   */
  static createReadTool(patterns: string[], options: {
    id?: string;
    description?: string;
    allow?: boolean;
    operations?: OperationType[];
  } = {}): ReadTool {
    const accessPattern = new FileSystemAccessPattern(
      options.id || 'read-access',
      options.description || 'Read access pattern',
      50,
      patterns,
      options.allow ?? true,
      options.operations
    );

    return new ReadTool({
      id: options.id,
      description: options.description,
      accessPatterns: [accessPattern]
    });
  }

  /**
   * Create an edit tool with file system access patterns
   */
  static createEditTool(patterns: string[], options: {
    id?: string;
    description?: string;
    allow?: boolean;
    operations?: OperationType[];
  } = {}): EditTool {
    const accessPattern = new FileSystemAccessPattern(
      options.id || 'edit-access',
      options.description || 'Edit access pattern',
      60,
      patterns,
      options.allow ?? true,
      options.operations
    );

    return new EditTool({
      id: options.id,
      description: options.description,
      accessPatterns: [accessPattern]
    });
  }

  /**
   * Create a create tool with file system access patterns
   */
  static createCreateTool(patterns: string[], options: {
    id?: string;
    description?: string;
    allow?: boolean;
    operations?: OperationType[];
  } = {}): CreateTool {
    const accessPattern = new FileSystemAccessPattern(
      options.id || 'create-access',
      options.description || 'Create access pattern',
      60,
      patterns,
      options.allow ?? true,
      options.operations
    );

    return new CreateTool({
      id: options.id,
      description: options.description,
      accessPatterns: [accessPattern]
    });
  }

  /**
   * Create a delete tool with file system access patterns
   */
  static createDeleteTool(patterns: string[], options: {
    id?: string;
    description?: string;
    allow?: boolean;
    operations?: OperationType[];
  } = {}): DeleteTool {
    const accessPattern = new FileSystemAccessPattern(
      options.id || 'delete-access',
      options.description || 'Delete access pattern',
      70,
      patterns,
      options.allow ?? true,
      options.operations
    );

    return new DeleteTool({
      id: options.id,
      description: options.description,
      accessPatterns: [accessPattern]
    });
  }

  /**
   * Create a full-access tool that can read, edit, create, and delete files
   */
  static createFullAccessTool(patterns: string[], options: {
    id?: string;
    description?: string;
    allow?: boolean;
  } = {}): CompositeTool {
    const tools = [
      this.createReadTool(patterns, { 
        id: `${options.id || 'full'}-read`,
        allow: options.allow 
      }),
      this.createEditTool(patterns, { 
        id: `${options.id || 'full'}-edit`,
        allow: options.allow 
      }),
      this.createCreateTool(patterns, { 
        id: `${options.id || 'full'}-create`,
        allow: options.allow 
      }),
      this.createDeleteTool(patterns, { 
        id: `${options.id || 'full'}-delete`,
        allow: options.allow 
      })
    ];

    return new CompositeTool({
      id: options.id || 'full-access-tool',
      description: options.description || 'Full file access within specified patterns',
      tools
    });
  }

  /**
   * Create a communication tool
   */
  static createCommunicationTool(options: {
    id?: string;
    description?: string;
  } = {}): CommunicationTool {
    return new CommunicationTool(options);
  }
}

/**
 * Pre-configured tool sets for common use cases
 */
export class CommonTools {
  /**
   * React component development tools
   */
  static createReactTools(): AgentTool[] {
    return [
      ToolFactory.createReadTool([
        '**/*.tsx',
        '**/*.jsx', 
        '**/components/**',
        '**/hooks/**',
        '**/styles/**',
        '**/*.css',
        '**/*.scss',
        '**/*.module.css'
      ], {
        id: 'react-read',
        description: 'Read React component files'
      }),
      ToolFactory.createEditTool([
        '**/*.tsx',
        '**/*.jsx',
        '**/components/**',
        '**/hooks/**',
        '**/styles/**',
        '**/*.css',
        '**/*.scss',
        '**/*.module.css'
      ], {
        id: 'react-edit',
        description: 'Edit React component files'
      }),
      ToolFactory.createCreateTool([
        '**/components/**',
        '**/hooks/**',
        '**/styles/**'
      ], {
        id: 'react-create',
        description: 'Create new React component files'
      }),
      ToolFactory.createCommunicationTool({
        id: 'react-communication',
        description: 'React agent communication'
      })
    ];
  }

  /**
   * TypeScript development tools
   */
  static createTypeScriptTools(): AgentTool[] {
    return [
      ToolFactory.createReadTool([
        '**/*.ts',
        '**/*.tsx',
        '**/src/**',
        '**/lib/**',
        '**/types/**',
        '**/interfaces/**'
      ], {
        id: 'typescript-read',
        description: 'Read TypeScript source files'
      }),
      ToolFactory.createEditTool([
        '**/*.ts',
        '**/*.tsx',
        '**/src/**',
        '**/lib/**',
        '**/types/**',
        '**/interfaces/**'
      ], {
        id: 'typescript-edit',
        description: 'Edit TypeScript source files'
      }),
      ToolFactory.createCreateTool([
        '**/src/**',
        '**/lib/**',
        '**/types/**',
        '**/interfaces/**'
      ], {
        id: 'typescript-create',
        description: 'Create new TypeScript files'
      }),
      ToolFactory.createCommunicationTool({
        id: 'typescript-communication',
        description: 'TypeScript agent communication'
      })
    ];
  }

  /**
   * Test development tools
   */
  static createTestTools(): AgentTool[] {
    return [
      ToolFactory.createReadTool([
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/tests/**',
        '**/test/**',
        '**/spec/**',
        // Also read source files for test creation
        '**/src/**/*.ts',
        '**/src/**/*.tsx'
      ], {
        id: 'test-read',
        description: 'Read test files and source code'
      }),
      ToolFactory.createEditTool([
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/tests/**',
        '**/test/**',
        '**/spec/**'
      ], {
        id: 'test-edit',
        description: 'Edit test files'
      }),
      ToolFactory.createCreateTool([
        '**/tests/**',
        '**/test/**',
        '**/spec/**'
      ], {
        id: 'test-create',
        description: 'Create new test files'
      }),
      ToolFactory.createCommunicationTool({
        id: 'test-communication',
        description: 'Test agent communication'
      })
    ];
  }

  /**
   * Configuration management tools
   */
  static createConfigTools(): AgentTool[] {
    return [
      ToolFactory.createReadTool([
        '**/package.json',
        '**/tsconfig.json',
        '**/*.config.*',
        '**/config/**',
        '**/.env*',
        '**/settings/**'
      ], {
        id: 'config-read',
        description: 'Read configuration files'
      }),
      ToolFactory.createEditTool([
        '**/package.json',
        '**/tsconfig.json',
        '**/*.config.*',
        '**/config/**',
        '**/settings/**'
      ], {
        id: 'config-edit',
        description: 'Edit configuration files'
      }),
      ToolFactory.createCommunicationTool({
        id: 'config-communication',
        description: 'Configuration agent communication'
      })
    ];
  }
}