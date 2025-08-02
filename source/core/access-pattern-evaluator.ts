/**
 * Access Pattern Evaluator - Handles evaluation of different access pattern types
 */

import type {
  AccessPattern,
  AccessContext,
  AccessPatternResult
} from './types.js';

/**
 * Cache for access pattern evaluations
 */
interface AccessPatternCache {
  key: string;
  result: AccessPatternResult;
  timestamp: number;
}

export class AccessPatternEvaluator {
  private cache: Map<string, AccessPatternCache> = new Map();
  private cacheEnabled: boolean = true;
  private maxCacheSize: number = 1000;
  private cacheExpiryMs: number = 5 * 60 * 1000; // 5 minutes

  constructor(options?: {
    enableCaching?: boolean;
    maxCacheSize?: number;
    cacheExpiryMs?: number;
  }) {
    if (options?.enableCaching !== undefined) {
      this.cacheEnabled = options.enableCaching;
    }
    if (options?.maxCacheSize !== undefined) {
      this.maxCacheSize = options.maxCacheSize;
    }
    if (options?.cacheExpiryMs !== undefined) {
      this.cacheExpiryMs = options.cacheExpiryMs;
    }
  }

  /**
   * Evaluate an access pattern against a context
   */
  async evaluatePattern(
    pattern: AccessPattern,
    context: AccessContext
  ): Promise<AccessPatternResult> {
    // Generate cache key if caching is enabled
    const cacheKey = this.cacheEnabled ? this.generateCacheKey(pattern, context) : null;
    
    // Check cache first
    if (cacheKey && this.cacheEnabled) {
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let result: AccessPatternResult;

    try {
      // Check if pattern applies to this context
      const applies = await pattern.appliesTo(context);
      if (!applies) {
        result = {
          allowed: false,
          reason: `Pattern does not apply to this context`,
          patternId: pattern.id,
          metadata: { priority: pattern.priority }
        };
      } else {
        result = await pattern.validate(context);
        // Ensure pattern ID and priority are included
        result = {
          ...result,
          patternId: pattern.id,
          metadata: {
            ...result.metadata,
            priority: pattern.priority
          }
        };
      }

      // Cache the result
      if (cacheKey && this.cacheEnabled) {
        this.cacheResult(cacheKey, result);
      }

      return result;
    } catch (error) {
      const errorResult: AccessPatternResult = {
        allowed: false,
        reason: `Error evaluating access pattern: ${(error as Error).message}`,
        patternId: pattern.id
      };

      // Don't cache error results
      return errorResult;
    }
  }

  /**
   * Evaluate multiple patterns and return the highest priority result
   */
  async evaluatePatterns(
    patterns: AccessPattern[],
    context: AccessContext
  ): Promise<AccessPatternResult[]> {
    const results = await Promise.all(
      patterns.map(pattern => this.evaluatePattern(pattern, context))
    );

    return results;
  }

  /**
   * Get the best matching pattern result based on priority
   */
  getBestMatch(results: AccessPatternResult[]): AccessPatternResult | undefined {
    if (results.length === 0) {
      return undefined;
    }

    // Sort by priority (higher first), then by allowed status (allow wins over deny for same priority)
    const sortedResults = results
      .filter(result => result.patternId !== undefined)
      .sort((a, b) => {
        // First sort by priority (if available in metadata)
        const priorityA = (a.metadata?.priority as number) || 0;
        const priorityB = (b.metadata?.priority as number) || 0;
        
        if (priorityA !== priorityB) {
          return priorityB - priorityA; // Higher priority first
        }
        
        // If same priority, prefer allow over deny
        if (a.allowed !== b.allowed) {
          return a.allowed ? -1 : 1;
        }
        
        return 0;
      });

    return sortedResults[0];
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    maxSize: number;
    enabled: boolean;
  } {
    // For simplicity, we'll track hits vs misses in a basic way
    return {
      size: this.cache.size,
      hitRate: 0, // Would need proper tracking for this
      maxSize: this.maxCacheSize,
      enabled: this.cacheEnabled
    };
  }



  /**
   * Generate a cache key for an access pattern and context
   */
  private generateCacheKey(pattern: AccessPattern, context: AccessContext): string {
    const patternKey = this.getPatternId(pattern);
    const contextKey = `${context.requesterId}:${context.operation}:${context.resource}`;
    return `${patternKey}:${contextKey}`;
  }

  /**
   * Get a cached result if available and not expired
   */
  private getCachedResult(cacheKey: string): AccessPatternResult | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.cacheExpiryMs) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache a result
   */
  private cacheResult(cacheKey: string, result: AccessPatternResult): void {
    // Clean up old entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      this.cleanupCache();
    }

    this.cache.set(cacheKey, {
      key: cacheKey,
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, cached] of Array.from(this.cache.entries())) {
      if (now - cached.timestamp > this.cacheExpiryMs) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
    }

    // If still too many entries, remove oldest
    if (this.cache.size >= this.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2));
      for (const [key] of toRemove) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get a pattern identifier for caching and logging
   */
  private getPatternId(pattern: AccessPattern): string {
    return pattern.id;
  }
}