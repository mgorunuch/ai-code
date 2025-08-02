/**
 * Model Selection System
 * 
 * Provides intelligent model selection with auto mode capabilities.
 * Selects the best AI model based on operation type, complexity, cost, and performance requirements.
 */

import { EventEmitter } from 'events';
import type {
  ModelConfig,
  ModelCapabilities,
  AutoModeConfig,
  ModelSelectionCriteria,
  ModelSelectionResult,
  AgentId
} from './types.js';
import { AIModel, OperationType } from './types.js';

/**
 * Events emitted by the model selection system
 */
export interface ModelSelectorEvents {
  modelSelected: (criteria: ModelSelectionCriteria, result: ModelSelectionResult) => void;
  modelSelectionFailed: (criteria: ModelSelectionCriteria, error: string) => void;
  autoModeTriggered: (criteria: ModelSelectionCriteria) => void;
  configurationUpdated: (newConfig: Partial<AutoModeConfig>) => void;
}

/**
 * Default model configurations with realistic capabilities
 */
export const DEFAULT_MODEL_CONFIGS: ModelConfig[] = [
  {
    model: AIModel.CLAUDE_3_5_SONNET,
    name: 'Claude 3.5 Sonnet',
    description: 'Balanced performance for most coding and analysis tasks',
    provider: 'anthropic',
    available: true,
    capabilities: {
      maxContextLength: 200000,
      costPerKInput: 0.003,
      costPerKOutput: 0.015,
      speed: 7,
      reasoning: 9,
      codeGeneration: 9,
      analysis: 9,
      creativity: 8,
      accuracy: 9,
      multiLanguage: 8
    }
  },
  {
    model: AIModel.CLAUDE_3_OPUS,
    name: 'Claude 3 Opus',
    description: 'Maximum capability for complex reasoning and analysis',
    provider: 'anthropic',
    available: true,
    capabilities: {
      maxContextLength: 200000,
      costPerKInput: 0.015,
      costPerKOutput: 0.075,
      speed: 4,
      reasoning: 10,
      codeGeneration: 9,
      analysis: 10,
      creativity: 10,
      accuracy: 10,
      multiLanguage: 9
    }
  },
  {
    model: AIModel.CLAUDE_3_HAIKU,
    name: 'Claude 3 Haiku',
    description: 'Fast and efficient for simple tasks',
    provider: 'anthropic',
    available: true,
    capabilities: {
      maxContextLength: 200000,
      costPerKInput: 0.00025,
      costPerKOutput: 0.00125,
      speed: 10,
      reasoning: 7,
      codeGeneration: 7,
      analysis: 7,
      creativity: 6,
      accuracy: 8,
      multiLanguage: 7
    }
  },
  {
    model: AIModel.GPT_4_TURBO,
    name: 'GPT-4 Turbo',
    description: 'OpenAI\'s latest high-capability model',
    provider: 'openai',
    available: true,
    capabilities: {
      maxContextLength: 128000,
      costPerKInput: 0.01,
      costPerKOutput: 0.03,
      speed: 6,
      reasoning: 9,
      codeGeneration: 8,
      analysis: 9,
      creativity: 9,
      accuracy: 9,
      multiLanguage: 9
    }
  },
  {
    model: AIModel.GPT_3_5_TURBO,
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective for routine tasks',
    provider: 'openai',
    available: true,
    capabilities: {
      maxContextLength: 16385,
      costPerKInput: 0.0005,
      costPerKOutput: 0.0015,
      speed: 9,
      reasoning: 6,
      codeGeneration: 6,
      analysis: 6,
      creativity: 7,
      accuracy: 7,
      multiLanguage: 7
    }
  }
];

/**
 * Default auto mode configuration
 */
export const DEFAULT_AUTO_MODE_CONFIG: AutoModeConfig = {
  enabled: true,
  preferredModels: [
    AIModel.CLAUDE_3_5_SONNET,
    AIModel.CLAUDE_3_HAIKU,
    AIModel.GPT_4_TURBO,
    AIModel.GPT_3_5_TURBO,
    AIModel.CLAUDE_3_OPUS
  ],
  costThreshold: 0.1, // $0.10 per request
  performanceThreshold: 7,
  contextLengthThreshold: 100000,
  operationPreferences: {
    [OperationType.READ_FILE]: [AIModel.CLAUDE_3_HAIKU, AIModel.GPT_3_5_TURBO],
    [OperationType.WRITE_FILE]: [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO],
    [OperationType.EDIT_FILE]: [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO],
    [OperationType.DELETE_FILE]: [AIModel.CLAUDE_3_HAIKU, AIModel.GPT_3_5_TURBO],
    [OperationType.CREATE_DIRECTORY]: [AIModel.CLAUDE_3_HAIKU, AIModel.GPT_3_5_TURBO],
    [OperationType.QUESTION]: [AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_OPUS],
    [OperationType.VALIDATE]: [AIModel.CLAUDE_3_5_SONNET, AIModel.GPT_4_TURBO],
    [OperationType.TRANSFORM]: [AIModel.CLAUDE_3_OPUS, AIModel.CLAUDE_3_5_SONNET]
  },
  fallbackModel: AIModel.CLAUDE_3_5_SONNET
};

/**
 * Operation complexity mapping
 */
const OPERATION_COMPLEXITY: Record<OperationType, number> = {
  [OperationType.READ_FILE]: 2,
  [OperationType.WRITE_FILE]: 5,
  [OperationType.EDIT_FILE]: 6,
  [OperationType.DELETE_FILE]: 3,
  [OperationType.CREATE_DIRECTORY]: 2,
  [OperationType.QUESTION]: 7,
  [OperationType.VALIDATE]: 8,
  [OperationType.TRANSFORM]: 9
};

export class ModelSelector extends EventEmitter {
  private modelConfigs: Map<AIModel, ModelConfig> = new Map();
  private autoModeConfig: AutoModeConfig;
  private selectionHistory: Array<{
    criteria: ModelSelectionCriteria;
    result: ModelSelectionResult;
    timestamp: Date;
  }> = [];

  constructor(
    modelConfigs: ModelConfig[] = DEFAULT_MODEL_CONFIGS,
    autoModeConfig: AutoModeConfig = DEFAULT_AUTO_MODE_CONFIG
  ) {
    super();
    
    // Initialize model configurations
    for (const config of modelConfigs) {
      this.modelConfigs.set(config.model, config);
    }
    
    this.autoModeConfig = { ...autoModeConfig };
    this.log('info', `Model selector initialized with ${modelConfigs.length} models`);
  }

  /**
   * Select the best model for given criteria
   */
  selectModel(criteria: ModelSelectionCriteria): ModelSelectionResult {
    try {
      const startTime = Date.now();
      
      // Check if auto mode is enabled
      if (this.autoModeConfig.enabled) {
        this.emit('autoModeTriggered', criteria);
      }

      // Get available models
      const availableModels = this.getAvailableModels();
      if (availableModels.length === 0) {
        throw new Error('No available models configured');
      }

      // Score all available models
      const scoredModels = this.scoreModels(criteria, availableModels);
      
      // Select the best model
      const bestModel = scoredModels[0];
      if (!bestModel) {
        throw new Error('No suitable model found for criteria');
      }

      const result: ModelSelectionResult = {
        selectedModel: bestModel.model,
        reason: bestModel.reason,
        confidence: bestModel.score / 10, // Normalize to 0-1
        estimatedCost: this.estimateOperationCost(bestModel.model, criteria),
        alternatives: scoredModels.slice(1, 4).map(m => ({
          model: m.model,
          score: m.score,
          reason: m.reason
        })),
        metadata: {
          selectionTime: Date.now() - startTime,
          totalModelsConsidered: availableModels.length,
          autoModeEnabled: this.autoModeConfig.enabled
        }
      };

      // Store in history
      this.selectionHistory.push({
        criteria,
        result,
        timestamp: new Date()
      });

      // Emit event
      this.emit('modelSelected', criteria, result);
      
      this.log('info', `Selected model ${result.selectedModel} for ${criteria.operationType} (confidence: ${result.confidence.toFixed(2)})`);
      
      return result;

    } catch (error) {
      const errorMessage = (error as Error).message;
      this.emit('modelSelectionFailed', criteria, errorMessage);
      this.log('error', `Model selection failed: ${errorMessage}`);
      
      // Return fallback model
      return {
        selectedModel: this.autoModeConfig.fallbackModel,
        reason: `Fallback selection due to error: ${errorMessage}`,
        confidence: 0.5,
        estimatedCost: this.estimateOperationCost(this.autoModeConfig.fallbackModel, criteria)
      };
    }
  }

  /**
   * Score models based on selection criteria
   */
  private scoreModels(criteria: ModelSelectionCriteria, models: ModelConfig[]): Array<{
    model: AIModel;
    score: number;
    reason: string;
  }> {
    const complexity = criteria.complexity ?? OPERATION_COMPLEXITY[criteria.operationType];
    const contextLength = criteria.contextLength ?? 10000;
    const priority = criteria.priority ?? 5;
    const maxCost = criteria.maxCost ?? this.autoModeConfig.costThreshold ?? 0.1;

    const scoredModels = models.map(config => {
      let score = 0;
      const reasons: string[] = [];

      // Check operation-specific preferences
      const opPreferences = this.autoModeConfig.operationPreferences?.[criteria.operationType];
      if (opPreferences?.includes(config.model)) {
        const preferenceIndex = opPreferences.indexOf(config.model);
        score += (opPreferences.length - preferenceIndex) * 2;
        reasons.push(`Operation preference (rank ${preferenceIndex + 1})`);
      }

      // Check agent-specific preferences
      if (criteria.agentId) {
        const agentPreferences = this.autoModeConfig.agentPreferences?.[criteria.agentId];
        if (agentPreferences?.includes(config.model)) {
          const agentPrefIndex = agentPreferences.indexOf(config.model);
          score += (agentPreferences.length - agentPrefIndex) * 1.5;
          reasons.push(`Agent preference (rank ${agentPrefIndex + 1})`);
        }
      }

      // Score based on complexity requirements
      if (complexity >= 8) {
        // High complexity - prefer reasoning and analysis
        score += config.capabilities.reasoning * 0.4;
        score += config.capabilities.analysis * 0.3;
        score += config.capabilities.codeGeneration * 0.3;
        reasons.push('High complexity task');
      } else if (complexity >= 5) {
        // Medium complexity - balanced approach
        score += config.capabilities.reasoning * 0.25;
        score += config.capabilities.codeGeneration * 0.35;
        score += config.capabilities.speed * 0.2;
        score += config.capabilities.accuracy * 0.2;
        reasons.push('Medium complexity task');
      } else {
        // Low complexity - prefer speed and cost
        score += config.capabilities.speed * 0.5;
        score += (10 - this.getCostScore(config.capabilities)) * 0.3;
        score += config.capabilities.accuracy * 0.2;
        reasons.push('Low complexity task');
      }

      // Context length check
      if (contextLength > config.capabilities.maxContextLength) {
        score *= 0.1; // Heavy penalty for insufficient context
        reasons.push('Insufficient context length');
      } else if (contextLength > config.capabilities.maxContextLength * 0.8) {
        score *= 0.7; // Moderate penalty for near-limit context
        reasons.push('Near context limit');
      }

      // Cost consideration
      const estimatedCost = this.estimateOperationCost(config.model, criteria);
      if (estimatedCost > maxCost) {
        score *= 0.3; // Heavy penalty for exceeding cost threshold
        reasons.push(`Exceeds cost threshold ($${estimatedCost.toFixed(4)} > $${maxCost.toFixed(4)})`);
      } else {
        const costScore = 1 - (estimatedCost / maxCost);
        score += costScore * 2;
        reasons.push(`Within cost budget`);
      }

      // Priority adjustments
      if (priority >= 8) {
        // High priority - prefer quality over cost
        score += config.capabilities.reasoning * 0.2;
        score += config.capabilities.accuracy * 0.2;
        reasons.push('High priority - quality focus');
      } else if (priority <= 3) {
        // Low priority - prefer cost efficiency
        score += (10 - this.getCostScore(config.capabilities)) * 0.3;
        score += config.capabilities.speed * 0.2;
        reasons.push('Low priority - efficiency focus');
      }

      // Required capabilities check
      if (criteria.requiredCapabilities) {
        for (const [capability, minValue] of Object.entries(criteria.requiredCapabilities)) {
          const actualValue = config.capabilities[capability as keyof ModelCapabilities] as number;
          if (actualValue < minValue) {
            score *= 0.2; // Heavy penalty for not meeting requirements
            reasons.push(`Fails ${capability} requirement (${actualValue} < ${minValue})`);
          }
        }
      }

      // Preferred models boost
      const preferredIndex = this.autoModeConfig.preferredModels.indexOf(config.model);
      if (preferredIndex !== -1) {
        const boost = (this.autoModeConfig.preferredModels.length - preferredIndex) * 0.5;
        score += boost;
        reasons.push(`Preferred model (rank ${preferredIndex + 1})`);
      }

      return {
        model: config.model,
        score: Math.max(0, score),
        reason: reasons.length > 0 ? reasons.join('; ') : 'No specific reasoning factors'
      };
    });

    // Sort by score (highest first)
    return scoredModels.sort((a, b) => b.score - a.score);
  }

  /**
   * Get cost score (1-10, where 10 is most expensive)
   */
  private getCostScore(capabilities: ModelCapabilities): number {
    const avgCost = (capabilities.costPerKInput + capabilities.costPerKOutput) / 2;
    // Normalize to 1-10 scale (adjust based on typical costs)
    return Math.min(10, Math.max(1, avgCost * 1000));
  }

  /**
   * Estimate operation cost based on model and criteria
   */
  private estimateOperationCost(model: AIModel, criteria: ModelSelectionCriteria): number {
    const config = this.modelConfigs.get(model);
    if (!config) return 0;

    const contextLength = criteria.contextLength ?? 10000;
    const complexity = criteria.complexity ?? OPERATION_COMPLEXITY[criteria.operationType];
    
    // Estimate tokens (rough approximation)
    const inputTokens = contextLength * 0.75; // Assume 75% of context is input
    const outputTokens = Math.min(4000, contextLength * 0.25 * complexity); // Output scales with complexity
    
    const inputCost = (inputTokens / 1000) * config.capabilities.costPerKInput;
    const outputCost = (outputTokens / 1000) * config.capabilities.costPerKOutput;
    
    return inputCost + outputCost;
  }

  /**
   * Get available models
   */
  private getAvailableModels(): ModelConfig[] {
    return Array.from(this.modelConfigs.values()).filter(config => config.available);
  }

  /**
   * Update auto mode configuration
   */
  updateAutoModeConfig(updates: Partial<AutoModeConfig>): void {
    this.autoModeConfig = { ...this.autoModeConfig, ...updates };
    this.emit('configurationUpdated', updates);
    this.log('info', 'Auto mode configuration updated');
  }

  /**
   * Add or update model configuration
   */
  updateModelConfig(config: ModelConfig): void {
    this.modelConfigs.set(config.model, config);
    this.log('info', `Model configuration updated: ${config.model}`);
  }

  /**
   * Remove model configuration
   */
  removeModelConfig(model: AIModel): boolean {
    const success = this.modelConfigs.delete(model);
    if (success) {
      this.log('info', `Model configuration removed: ${model}`);
    }
    return success;
  }

  /**
   * Get model configuration
   */
  getModelConfig(model: AIModel): ModelConfig | undefined {
    return this.modelConfigs.get(model);
  }

  /**
   * Get all model configurations
   */
  getAllModelConfigs(): ModelConfig[] {
    return Array.from(this.modelConfigs.values());
  }

  /**
   * Get current auto mode configuration
   */
  getAutoModeConfig(): AutoModeConfig {
    return { ...this.autoModeConfig };
  }

  /**
   * Get selection history
   */
  getSelectionHistory(limit?: number): Array<{
    criteria: ModelSelectionCriteria;
    result: ModelSelectionResult;
    timestamp: Date;
  }> {
    const history = [...this.selectionHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Clear selection history
   */
  clearSelectionHistory(): void {
    this.selectionHistory = [];
    this.log('info', 'Selection history cleared');
  }

  /**
   * Get selection statistics
   */
  getSelectionStats(): {
    totalSelections: number;
    modelUsage: Record<AIModel, number>;
    averageConfidence: number;
    averageCost: number;
    autoModeUsage: number;
  } {
    const stats = {
      totalSelections: this.selectionHistory.length,
      modelUsage: {} as Record<AIModel, number>,
      averageConfidence: 0,
      averageCost: 0,
      autoModeUsage: 0
    };

    if (this.selectionHistory.length === 0) {
      return stats;
    }

    let totalConfidence = 0;
    let totalCost = 0;
    let autoModeCount = 0;

    for (const entry of this.selectionHistory) {
      // Count model usage
      const model = entry.result.selectedModel;
      stats.modelUsage[model] = (stats.modelUsage[model] || 0) + 1;

      // Sum confidence
      totalConfidence += entry.result.confidence;

      // Sum cost
      if (entry.result.estimatedCost) {
        totalCost += entry.result.estimatedCost;
      }

      // Count auto mode usage
      if (entry.result.metadata?.autoModeEnabled) {
        autoModeCount++;
      }
    }

    stats.averageConfidence = totalConfidence / this.selectionHistory.length;
    stats.averageCost = totalCost / this.selectionHistory.length;
    stats.autoModeUsage = autoModeCount / this.selectionHistory.length;

    return stats;
  }

  /**
   * Internal logging method
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [MODEL_SELECTOR] ${message}`, ...args);
  }
}

/**
 * Create a model selector with default configuration
 */
export function createModelSelector(
  modelConfigs?: ModelConfig[],
  autoModeConfig?: Partial<AutoModeConfig>
): ModelSelector {
  const fullAutoConfig = { ...DEFAULT_AUTO_MODE_CONFIG, ...autoModeConfig };
  return new ModelSelector(modelConfigs, fullAutoConfig);
}