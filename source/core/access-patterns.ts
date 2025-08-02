/**
 * Common access pattern implementations
 * This file provides reusable access pattern classes for different resource types
 */

import { minimatch } from 'minimatch';
import {
  AccessPattern,
  type AccessContext,
  type FileAccessContext,
  type AccessPatternResult,
  type OperationType
} from './types.js';

/**
 * File system access pattern using glob patterns
 */
export class FileSystemAccessPattern extends AccessPattern<FileAccessContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private readonly filePatterns: string[],
    private readonly allow: boolean,
    private readonly operations?: OperationType[]
  ) {
    super();
  }

  async appliesTo(context: FileAccessContext): Promise<boolean> {
    // Check if operation is in allowed list
    if (this.operations && !this.operations.includes(context.operation)) {
      return false;
    }

    // Check if file matches any pattern
    const normalizedPath = this.normalizePath(context.filePath);
    return this.filePatterns.some(pattern => 
      minimatch(normalizedPath, pattern)
    );
  }

  async validate(context: FileAccessContext): Promise<AccessPatternResult> {
    return {
      allowed: this.allow,
      reason: this.allow 
        ? `Allowed by pattern: ${this.description}`
        : `Denied by pattern: ${this.description}`,
      patternId: this.id,
      metadata: {
        matchedPatterns: this.filePatterns,
        operation: context.operation
      }
    };
  }

  private normalizePath(filePath: string): string {
    return filePath.replace(/^\/+/, '').replace(/\\/g, '/');
  }
}

/**
 * Example: Database table access pattern
 */
export interface DatabaseAccessContext extends AccessContext<string> {
  tableName: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  userId: string;
}

export class DatabaseTableAccessPattern extends AccessPattern<DatabaseAccessContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private readonly tablePatterns: string[],
    private readonly allowedOperations: string[],
    private readonly allow: boolean
  ) {
    super();
  }

  async appliesTo(context: DatabaseAccessContext): Promise<boolean> {
    return this.tablePatterns.some(pattern => 
      minimatch(context.tableName, pattern)
    );
  }

  async validate(context: DatabaseAccessContext): Promise<AccessPatternResult> {
    if (!this.allowedOperations.includes(context.operation)) {
      return {
        allowed: false,
        reason: `Operation ${context.operation} not allowed on table ${context.tableName}`,
        patternId: this.id
      };
    }

    return {
      allowed: this.allow,
      reason: this.allow
        ? `${context.operation} allowed on ${context.tableName}`
        : `${context.operation} denied on ${context.tableName}`,
      patternId: this.id,
      metadata: {
        table: context.tableName,
        operation: context.operation
      }
    };
  }
}

/**
 * Example: API endpoint access pattern
 */
export interface APIAccessContext extends AccessContext<string> {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  userId: string;
}

export class APIEndpointAccessPattern extends AccessPattern<APIAccessContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private readonly endpointPatterns: string[],
    private readonly allowedMethods: string[],
    private readonly allow: boolean
  ) {
    super();
  }

  async appliesTo(context: APIAccessContext): Promise<boolean> {
    return this.endpointPatterns.some(pattern => 
      minimatch(context.endpoint, pattern)
    );
  }

  async validate(context: APIAccessContext): Promise<AccessPatternResult> {
    if (!this.allowedMethods.includes(context.method)) {
      return {
        allowed: false,
        reason: `Method ${context.method} not allowed on endpoint ${context.endpoint}`,
        patternId: this.id
      };
    }

    return {
      allowed: this.allow,
      reason: this.allow
        ? `${context.method} ${context.endpoint} allowed`
        : `${context.method} ${context.endpoint} denied`,
      patternId: this.id,
      metadata: {
        endpoint: context.endpoint,
        method: context.method
      }
    };
  }
}

/**
 * Composite access pattern that combines multiple patterns
 */
export class CompositeAccessPattern<TContext extends AccessContext = AccessContext> extends AccessPattern<TContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private readonly patterns: AccessPattern<TContext>[],
    private readonly logic: 'AND' | 'OR' = 'OR'
  ) {
    super();
  }

  async appliesTo(context: TContext): Promise<boolean> {
    const results = await Promise.all(
      this.patterns.map(p => p.appliesTo(context))
    );

    if (this.logic === 'AND') {
      return results.every(r => r);
    } else {
      return results.some(r => r);
    }
  }

  async validate(context: TContext): Promise<AccessPatternResult> {
    const results = await Promise.all(
      this.patterns.map(p => p.validate(context))
    );

    let allowed: boolean;
    if (this.logic === 'AND') {
      allowed = results.every(r => r.allowed);
    } else {
      allowed = results.some(r => r.allowed);
    }

    const reasons = results.map(r => r.reason).filter(Boolean);
    
    return {
      allowed,
      reason: reasons.join(this.logic === 'AND' ? ' AND ' : ' OR '),
      patternId: this.id,
      metadata: {
        logic: this.logic,
        subResults: results
      }
    };
  }
}

/**
 * Time-based access pattern
 */
export class TimeBasedAccessPattern<TContext extends AccessContext = AccessContext> extends AccessPattern<TContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private readonly basePattern: AccessPattern<TContext>,
    private readonly allowedHours: { start: number; end: number },
    private readonly allowedDays?: number[] // 0 = Sunday, 6 = Saturday
  ) {
    super();
  }

  async appliesTo(context: TContext): Promise<boolean> {
    return this.basePattern.appliesTo(context);
  }

  async validate(context: TContext): Promise<AccessPatternResult> {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Check time restrictions
    if (hour < this.allowedHours.start || hour >= this.allowedHours.end) {
      return {
        allowed: false,
        reason: `Access denied outside allowed hours (${this.allowedHours.start}:00 - ${this.allowedHours.end}:00)`,
        patternId: this.id
      };
    }

    // Check day restrictions
    if (this.allowedDays && !this.allowedDays.includes(day)) {
      return {
        allowed: false,
        reason: `Access denied on this day of the week`,
        patternId: this.id
      };
    }

    // If time checks pass, delegate to base pattern
    return this.basePattern.validate(context);
  }
}

/**
 * Custom validation access pattern
 */
export class CustomAccessPattern<TContext extends AccessContext = AccessContext> extends AccessPattern<TContext> {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly priority: number,
    private readonly appliesToFn: (context: TContext) => boolean | Promise<boolean>,
    private readonly validateFn: (context: TContext) => AccessPatternResult | Promise<AccessPatternResult>
  ) {
    super();
  }

  async appliesTo(context: TContext): Promise<boolean> {
    return this.appliesToFn(context);
  }

  async validate(context: TContext): Promise<AccessPatternResult> {
    const result = await this.validateFn(context);
    return {
      ...result,
      patternId: this.id
    };
  }
}