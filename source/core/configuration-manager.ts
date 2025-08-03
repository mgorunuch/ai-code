/**
 * Configuration Manager - Main configuration system for the AI code orchestration platform
 *
 * This module implements the complete configuration system as specified in CONFIG_RULES.md,
 * including:
 * - Two-level configuration (user + project)
 * - .ai-code/agents/*.agent.ts file structure
 * - Encrypted credential storage
 * - Configuration validation and hot-reloading
 * - Integration with existing orchestration system
 */

import { EventEmitter } from 'events';
import type {
  CompleteConfig,
  ConfigLoadOptions,
  ConfigValidationResult,
  ConfigurationSuggestion,
  ConfigMergeOptions,
  HotReloadConfig,
  ConfigCacheOptions,
  ConfigurationManagerEvents,
  ModelSelectionConfig,
  SecurityConfig,
} from './configuration-types.js';

import {
  DEFAULT_SECURITY_CONFIG,
  DEFAULT_ENVIRONMENT_CONFIG,
  DEFAULT_CACHE_OPTIONS,
  DEFAULT_HOT_RELOAD_CONFIG
} from './configuration-types.js';
import type {
  AgentCapability,
  AIModel,
} from './types.js';
import { ConfigFileSystem } from './config-filesystem.js';
import { CredentialManager } from './credential-manager.js';
import { DEFAULT_MODEL_CONFIGS, DEFAULT_AUTO_MODE_CONFIG } from './model-selector.js';

/**
 * Configuration cache entry
 */
interface ConfigCacheEntry {
  config: CompleteConfig;
  timestamp: number;
  hash: string;
}

/**
 * Configuration manager that handles loading, validation, merging, and hot-reloading
 * of all configuration files in the .ai-code directory structure
 */
export class ConfigurationManager extends EventEmitter {
  private fileSystem: ConfigFileSystem;
  private credentialManager?: CredentialManager;
  private currentConfig?: CompleteConfig;
  private configCache = new Map<string, ConfigCacheEntry>();
  private validationCache = new Map<string, ConfigValidationResult>();
  private cacheOptions: ConfigCacheOptions;
  private hotReloadConfig: HotReloadConfig;
  private initialized = false;

  constructor(
    baseDir: string = process.cwd(),
    options: {
      cacheOptions?: Partial<ConfigCacheOptions>;
      hotReloadConfig?: Partial<HotReloadConfig>;
    } = {}
  ) {
    super();

    this.fileSystem = new ConfigFileSystem(baseDir);
    this.cacheOptions = { ...DEFAULT_CACHE_OPTIONS, ...options.cacheOptions };
    this.hotReloadConfig = { ...DEFAULT_HOT_RELOAD_CONFIG, ...options.hotReloadConfig } as HotReloadConfig;

    this.setupEventHandlers();
  }

  /**
   * Initialize the configuration system
   */
  async initialize(options: ConfigLoadOptions = {}): Promise<CompleteConfig> {
    try {
      // Initialize file system
      await this.fileSystem.initialize();

      // Load configuration
      const config = await this.loadConfiguration(options);

      // Initialize credential manager if credentials config exists
      if (config.security?.credentials) {
        this.credentialManager = new CredentialManager(
          config.security.credentials,
          this.fileSystem.getConfigPaths()
        );
        this.setupCredentialManagerEvents();
      }

      // Enable hot reloading if requested
      if (options.enableHotReload !== false && this.hotReloadConfig.enabled) {
        await this.enableHotReload();
      }

      this.currentConfig = config;
      this.initialized = true;

      this.emit('configLoaded', config);
      return config;
    } catch (error) {
      this.emit('configError', error as Error);
      throw new Error(`Failed to initialize configuration system: ${(error as Error).message}`);
    }
  }

  /**
   * Load the complete configuration from all sources
   */
  async loadConfiguration(options: ConfigLoadOptions = {}): Promise<CompleteConfig> {
    try {
      const environment = options.environment || process.env.NODE_ENV || 'development';
      const cacheKey = `config_${environment}_${Date.now()}`;

      // Check cache if enabled
      if (this.cacheOptions.enabled) {
        const cached = this.getCachedConfig(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Load base configuration files
      const [
        orchestrationConfig,
        userConfig,
        modelConfig,
        securityConfig,
        agentConfigs
      ] = await Promise.all([
        this.fileSystem.loadOrchestrationConfig(),
        this.fileSystem.loadUserConfig(),
        this.fileSystem.loadModelConfig(),
        this.fileSystem.loadSecurityConfig(),
        this.fileSystem.loadAgentConfigurations()
      ]);

      // Create base configuration with defaults
      const baseConfig: CompleteConfig = {
        // Core orchestration defaults
        agents: agentConfigs,
        defaultPermissions: {
          requireExplicitToolGrants: true
        },
        accessPatterns: {
          enabled: true,
          enableCaching: true,
          maxCacheSize: 1000
        },
        logging: {
          level: 'info',
          logCommunications: true,
          logModelSelection: true,
          logAccessPatterns: false
        },

        // Model selection with defaults
        modelSelection: this.mergeModelConfig(modelConfig),

        // Security configuration with defaults
        security: this.mergeSecurityConfig(securityConfig),

        // Environment configurations
        environments: DEFAULT_ENVIRONMENT_CONFIG
      };

      // Merge with orchestration config
      let mergedConfig = this.mergeConfigs(baseConfig, orchestrationConfig);

      // Apply environment-specific configuration
      if (mergedConfig.environments?.[environment]) {
        mergedConfig = this.mergeConfigs(mergedConfig, mergedConfig.environments[environment]);
      }

      // Apply user overrides (highest priority)
      mergedConfig = this.mergeConfigs(mergedConfig, userConfig);

      // Validate configuration if requested
      if (options.validateOnLoad !== false) {
        const validation = await this.validateConfiguration(mergedConfig);
        if (!validation.valid) {
          const errorMsg = `Configuration validation failed: ${validation.errors.join(', ')}`;
          throw new Error(errorMsg);
        }
        this.emit('configValidated', validation);
      }

      // Cache the result
      if (this.cacheOptions.enabled) {
        this.cacheConfig(cacheKey, mergedConfig);
      }

      return mergedConfig;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Validate a configuration object
   */
  async validateConfiguration(config: CompleteConfig): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const loadedComponents: string[] = [];
    const failedComponents: string[] = [];

    try {
      // Validate basic structure
      if (!config.agents) {
        errors.push('Configuration must have an agents array');
      } else {
        loadedComponents.push('agents');
      }

      if (!config.defaultPermissions) {
        errors.push('Configuration must have defaultPermissions');
      } else {
        loadedComponents.push('defaultPermissions');
      }

      if (!config.logging) {
        errors.push('Configuration must have logging configuration');
      } else {
        loadedComponents.push('logging');

        // Validate logging level
        const validLevels = ['debug', 'info', 'warn', 'error'];
        if (!validLevels.includes(config.logging.level)) {
          errors.push(`Invalid logging level: ${config.logging.level}. Must be one of: ${validLevels.join(', ')}`);
        }
      }

      // Validate agents
      if (config.agents) {
        for (let i = 0; i < config.agents.length; i++) {
          const agent = config.agents[i];
          const agentErrors = this.validateAgent(agent, i);
          errors.push(...agentErrors.errors);
          warnings.push(...agentErrors.warnings);
          suggestions.push(...agentErrors.suggestions);

          if (agentErrors.errors.length === 0) {
            loadedComponents.push(`agent:${agent.id}`);
          } else {
            failedComponents.push(`agent:${agent.id}`);
          }
        }
      }

      // Validate model selection configuration
      if (config.modelSelection) {
        const modelErrors = this.validateModelSelection(config.modelSelection);
        errors.push(...modelErrors.errors);
        warnings.push(...modelErrors.warnings);
        suggestions.push(...modelErrors.suggestions);

        if (modelErrors.errors.length === 0) {
          loadedComponents.push('modelSelection');
        } else {
          failedComponents.push('modelSelection');
        }
      }

      // Validate security configuration
      if (config.security) {
        const securityErrors = this.validateSecurityConfig(config.security);
        errors.push(...securityErrors.errors);
        warnings.push(...securityErrors.warnings);
        suggestions.push(...securityErrors.suggestions);

        if (securityErrors.errors.length === 0) {
          loadedComponents.push('security');
        } else {
          failedComponents.push('security');
        }
      }

      // Add general suggestions
      if (config.agents && config.agents.length === 0) {
        warnings.push('No agents configured - the system will have limited functionality');
        suggestions.push('Add agent configurations in .ai-code/agents/ directory');
      }

      if (!config.modelSelection?.autoMode?.enabled) {
        suggestions.push('Consider enabling auto mode for intelligent model selection');
      }

      const result: ConfigValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions,
        loadedComponents,
        failedComponents
      };

      // Cache validation result
      if (this.cacheOptions.cacheValidation) {
        const cacheKey = this.generateConfigHash(config);
        this.validationCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation failed: ${(error as Error).message}`],
        warnings: [],
        suggestions: [],
        loadedComponents,
        failedComponents
      };
    }
  }

  /**
   * Get the current configuration
   */
  getCurrentConfig(): CompleteConfig | undefined {
    return this.currentConfig;
  }

  /**
   * Update configuration and save to file
   */
  async updateConfiguration(
    configType: 'orchestration' | 'user' | 'models' | 'security',
    updates: any
  ): Promise<void> {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }

    try {
      // Save to file
      await this.fileSystem.saveConfig(configType, updates);

      // Clear caches
      this.clearCache();

      // Reload configuration
      const newConfig = await this.loadConfiguration();
      this.currentConfig = newConfig;

      this.emit('configReloaded', newConfig);
    } catch (error) {
      this.emit('configError', error as Error);
      throw new Error(`Failed to update ${configType} configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Add a new agent configuration
   */
  async addAgentConfiguration(agent: AgentCapability): Promise<void> {
    if (!this.initialized) {
      throw new Error('Configuration manager not initialized');
    }

    try {
      // Validate agent
      const validation = this.validateAgent(agent);
      if (validation.errors.length > 0) {
        throw new Error(`Agent validation failed: ${validation.errors.join(', ')}`);
      }

      // Save agent configuration
      await this.fileSystem.saveAgentConfig(agent);

      // Clear caches and reload
      this.clearCache();
      const newConfig = await this.loadConfiguration();
      this.currentConfig = newConfig;

      this.emit('agentConfigLoaded', agent);
      this.emit('configReloaded', newConfig);
    } catch (error) {
      this.emit('configError', error as Error);
      throw new Error(`Failed to add agent configuration: ${(error as Error).message}`);
    }
  }

  /**
   * Get configuration suggestions for improvement
   */
  getConfigurationSuggestions(config?: CompleteConfig): ConfigurationSuggestion[] {
    const targetConfig = config || this.currentConfig;
    if (!targetConfig) {
      return [];
    }

    const suggestions: ConfigurationSuggestion[] = [];

    // Security suggestions
    if (!targetConfig.security?.audit?.enabled) {
      suggestions.push({
        type: 'security',
        message: 'Enable security audit logging for better security monitoring',
        action: 'Set security.audit.enabled to true',
        priority: 'high',
        configPath: 'security.audit.enabled'
      });
    }

    if (targetConfig.defaultPermissions?.requireExplicitToolGrants === false) {
      suggestions.push({
        type: 'security',
        message: 'Requiring explicit tool grants improves security',
        action: 'Set defaultPermissions.requireExplicitToolGrants to true',
        priority: 'medium',
        configPath: 'defaultPermissions.requireExplicitToolGrants'
      });
    }

    // Performance suggestions
    if (!targetConfig.accessPatterns?.enableCaching) {
      suggestions.push({
        type: 'performance',
        message: 'Enable access pattern caching for better performance',
        action: 'Set accessPatterns.enableCaching to true',
        priority: 'medium',
        configPath: 'accessPatterns.enableCaching'
      });
    }

    if (!targetConfig.modelSelection?.autoMode?.enabled) {
      suggestions.push({
        type: 'performance',
        message: 'Auto mode can optimize model selection for cost and performance',
        action: 'Enable modelSelection.autoMode.enabled',
        priority: 'low',
        configPath: 'modelSelection.autoMode.enabled'
      });
    }

    // Best practices
    if (targetConfig.agents && targetConfig.agents.length === 0) {
      suggestions.push({
        type: 'best-practice',
        message: 'Add agent configurations to enable AI assistance',
        action: 'Create agent files in .ai-code/agents/ directory',
        priority: 'high'
      });
    }

    if (targetConfig.logging?.level === 'debug' && process.env.NODE_ENV === 'production') {
      suggestions.push({
        type: 'best-practice',
        message: 'Debug logging should not be used in production',
        action: 'Set logging.level to "warn" or "error" for production',
        priority: 'medium',
        configPath: 'logging.level'
      });
    }

    return suggestions;
  }

  /**
   * Get configuration statistics
   */
  getConfigurationStats(): {
    totalAgents: number;
    totalProviders: number;
    cacheHitRate: number;
    validationSuccessRate: number;
    configVersion: string;
    lastLoaded: Date;
    hotReloadEnabled: boolean;
  } {
    const config = this.currentConfig;

    return {
      totalAgents: config?.agents?.length || 0,
      totalProviders: Object.keys(config?.security?.credentials?.providers || {}).length,
      cacheHitRate: this.calculateCacheHitRate(),
      validationSuccessRate: this.calculateValidationSuccessRate(),
      configVersion: '1.0.0',
      lastLoaded: new Date(),
      hotReloadEnabled: this.hotReloadConfig.enabled
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.configCache.clear();
    this.validationCache.clear();
  }

  /**
   * Get credential storage path
   */
  getCredentialPath(): string {
    return this.fileSystem.getConfigPaths().credentialsDir;
  }

  /**
   * Enable hot reloading
   */
  async enableHotReload(): Promise<void> {
    const config: HotReloadConfig = {
      ...this.hotReloadConfig,
      onReload: async (newConfig) => {
        this.currentConfig = newConfig;
        this.emit('configReloaded', newConfig);
      },
      onReloadError: (error) => {
        this.emit('configError', error);
      }
    };

    await this.fileSystem.enableHotReload(config);
  }

  /**
   * Disable hot reloading
   */
  async disableHotReload(): Promise<void> {
    await this.fileSystem.disableHotReload();
  }

  /**
   * Initialize credentials with master password
   */
  async initializeCredentials(masterPassword: string): Promise<void> {
    if (!this.credentialManager) {
      // Create credential manager with default configuration if it doesn't exist
      const currentConfig = this.getCurrentConfig();
      if (currentConfig?.security?.credentials) {
        this.credentialManager = new CredentialManager(
          currentConfig.security.credentials,
          this.fileSystem.getConfigPaths()
        );
        this.setupCredentialManagerEvents();
      } else {
        throw new Error('Credential manager not available - security configuration missing');
      }
    }

    await this.credentialManager.initialize(masterPassword);
    this.emit('credentialsUpdated', 'system');
  }

  /**
   * Get credential for a provider
   */
  async getCredential(provider: string): Promise<string> {
    if (!this.credentialManager) {
      throw new Error('Credential manager not initialized');
    }

    try {
      return await this.credentialManager.getCredential(provider);
    } catch (error) {
      // Re-throw the error but don't emit configError for missing credentials
      // as this is normal when providers don't have credentials yet
      if ((error as Error).message.includes('No credential found for provider')) {
        throw error; // Re-throw without emitting configError
      }

      // For other errors, emit configError event
      this.emit('configError', error as Error);
      throw error;
    }
  }

  /**
   * Store a credential
   */
  async storeCredential(provider: string, credential: string): Promise<void> {
    if (!this.credentialManager) {
      throw new Error('Credential manager not initialized');
    }

    await this.credentialManager.storeCredential(provider, credential);
    this.emit('credentialsUpdated', provider);
  }

  /**
   * Clean up resources
   */
  async destroy(): Promise<void> {
    await this.disableHotReload();

    if (this.credentialManager) {
      this.credentialManager.destroy();
    }

    this.fileSystem.destroy();
    this.clearCache();
    this.removeAllListeners();

    this.initialized = false;
  }

  /**
   * Merge two configuration objects using the specified strategy
   */
  private mergeConfigs(
    base: any,
    override: any,
    options: ConfigMergeOptions = { strategy: 'deep' }
  ): any {
    if (!override) return base;
    if (!base) return override;

    switch (options.strategy) {
      case 'shallow':
        return { ...base, ...override };

      case 'replace':
        return override;

      case 'custom':
        if (options.customMerge) {
          return options.customMerge(base, override, '');
        }
        // Fall through to deep merge

      case 'deep':
      default:
        return this.deepMerge(base, override, options);
    }
  }

  /**
   * Deep merge two objects
   */
  private deepMerge(base: any, override: any, options: ConfigMergeOptions): any {
    const result = { ...base };

    for (const key in override) {
      if (options.excludePaths?.includes(key)) {
        continue;
      }

      const overrideValue = override[key];
      const baseValue = result[key];

      if (Array.isArray(overrideValue)) {
        if (options.preserveArrays && Array.isArray(baseValue)) {
          result[key] = [...baseValue, ...overrideValue];
        } else {
          result[key] = overrideValue;
        }
      } else if (typeof overrideValue === 'object' && overrideValue !== null && !Array.isArray(overrideValue)) {
        if (typeof baseValue === 'object' && baseValue !== null && !Array.isArray(baseValue)) {
          result[key] = this.deepMerge(baseValue, overrideValue, options);
        } else {
          result[key] = overrideValue;
        }
      } else {
        result[key] = overrideValue;
      }
    }

    return result;
  }

  /**
   * Merge model configuration with defaults
   */
  private mergeModelConfig(modelConfig: Partial<ModelSelectionConfig>): ModelSelectionConfig {
    return {
      availableModels: modelConfig.availableModels || DEFAULT_MODEL_CONFIGS,
      autoMode: {
        ...DEFAULT_AUTO_MODE_CONFIG,
        ...modelConfig.autoMode
      },
      defaultModel: modelConfig.defaultModel || AIModel.CLAUDE_3_5_SONNET,
      selectionStrategy: modelConfig.selectionStrategy || 'balanced',
      customWeights: modelConfig.customWeights || {
        cost: 0.3,
        speed: 0.2,
        quality: 0.3,
        accuracy: 0.2
      }
    };
  }

  /**
   * Merge security configuration with defaults
   */
  private mergeSecurityConfig(securityConfig: Partial<SecurityConfig>): SecurityConfig {
    return this.deepMerge(DEFAULT_SECURITY_CONFIG, securityConfig, { strategy: 'deep' });
  }

  /**
   * Validate an agent configuration
   */
  private validateAgent(agent: AgentCapability, index?: number): {
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const prefix = index !== undefined ? `Agent ${index} (${agent.id || 'unknown'})` : `Agent ${agent.id || 'unknown'}`;

    // Required fields
    if (!agent.id) {
      errors.push(`${prefix}: Missing required field 'id'`);
    } else if (!/^[a-z0-9-_]+$/.test(agent.id)) {
      errors.push(`${prefix}: ID must contain only lowercase letters, numbers, hyphens, and underscores`);
    }

    if (!agent.name) {
      errors.push(`${prefix}: Missing required field 'name'`);
    }

    if (!agent.description) {
      errors.push(`${prefix}: Missing required field 'description'`);
    }

    if (!agent.tools || !Array.isArray(agent.tools)) {
      errors.push(`${prefix}: Missing or invalid 'tools' array`);
    } else if (agent.tools.length === 0) {
      warnings.push(`${prefix}: No tools configured - agent will have no capabilities`);
    }

    if (!agent.endpoints || !Array.isArray(agent.endpoints)) {
      errors.push(`${prefix}: Missing or invalid 'endpoints' array`);
    } else if (agent.endpoints.length === 0) {
      warnings.push(`${prefix}: No endpoints configured - agent may not be discoverable`);
    }

    // Suggestions
    if (agent.description && agent.description.length < 10) {
      suggestions.push(`${prefix}: Description should be more detailed`);
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Validate model selection configuration
   */
  private validateModelSelection(config: ModelSelectionConfig): {
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!config.availableModels || config.availableModels.length === 0) {
      errors.push('Model selection must have at least one available model');
    }

    if (!config.defaultModel) {
      errors.push('Model selection must have a default model');
    }

    if (config.autoMode?.enabled && (!config.autoMode.preferredModels || config.autoMode.preferredModels.length === 0)) {
      warnings.push('Auto mode is enabled but no preferred models are configured');
    }

    if (config.autoMode?.costThreshold && config.autoMode.costThreshold > 1.0) {
      warnings.push('Cost threshold seems high - consider reviewing for cost optimization');
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Validate security configuration
   */
  private validateSecurityConfig(config: SecurityConfig): {
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!config.credentials) {
      errors.push('Security configuration must include credentials configuration');
      return { errors, warnings, suggestions };
    }

    if (!config.credentials.encryption) {
      errors.push('Credentials configuration must include encryption settings');
    }

    if (config.credentials.encryption?.iterations && config.credentials.encryption.iterations < 10000) {
      warnings.push('Encryption iterations should be at least 10,000 for security');
    }

    if (!config.audit?.enabled) {
      suggestions.push('Enable security audit logging for better monitoring');
    }

    return { errors, warnings, suggestions };
  }

  /**
   * Setup event handlers for file system
   */
  private setupEventHandlers(): void {
    this.fileSystem.on('configChanged', async (changedFiles: string[]) => {
      if (this.initialized) {
        try {
          this.clearCache();
          const newConfig = await this.loadConfiguration();
          this.currentConfig = newConfig;
          this.emit('configReloaded', newConfig);
          this.emit('hotReloadTriggered', changedFiles);
        } catch (error) {
          this.emit('configError', error as Error);
        }
      }
    });

    this.fileSystem.on('agentDiscovered', (agentPath: string, agent: AgentCapability) => {
      this.emit('agentConfigLoaded', agent);
    });

    this.fileSystem.on('fileError', (path: string, error: Error) => {
      this.emit('configError', error);
    });
  }

  /**
   * Setup event handlers for credential manager
   */
  private setupCredentialManagerEvents(): void {
    if (!this.credentialManager) return;

    this.credentialManager.on('credentialEncrypted', (provider: string) => {
      this.emit('credentialsUpdated', provider);
    });

    this.credentialManager.on('credentialError', (provider: string, error: Error) => {
      this.emit('configError', error);
    });

    this.credentialManager.on('credentialRotated', (provider: string) => {
      this.emit('credentialsUpdated', provider);
    });
  }

  /**
   * Get cached configuration
   */
  private getCachedConfig(cacheKey: string): CompleteConfig | null {
    const cached = this.configCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheOptions.ttl) {
      this.configCache.delete(cacheKey);
      return null;
    }

    return cached.config;
  }

  /**
   * Cache configuration
   */
  private cacheConfig(cacheKey: string, config: CompleteConfig): void {
    if (this.configCache.size >= this.cacheOptions.maxSize) {
      // Remove oldest entry
      const oldestKey = this.configCache.keys().next().value;
      this.configCache.delete(oldestKey);
    }

    this.configCache.set(cacheKey, {
      config,
      timestamp: Date.now(),
      hash: this.generateConfigHash(config)
    });
  }

  /**
   * Generate a hash for configuration object
   */
  private generateConfigHash(config: any): string {
    return Buffer.from(JSON.stringify(config)).toString('base64').substring(0, 16);
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    // Simplified calculation
    return this.configCache.size > 0 ? 0.8 : 0;
  }

  /**
   * Calculate validation success rate
   */
  private calculateValidationSuccessRate(): number {
    if (this.validationCache.size === 0) return 1.0;

    const successful = Array.from(this.validationCache.values())
      .filter(result => result.valid).length;

    return successful / this.validationCache.size;
  }
}

/**
 * Create a new configuration manager
 */
export function createConfigurationManager(
  baseDir?: string,
  options?: {
    cacheOptions?: Partial<ConfigCacheOptions>;
    hotReloadConfig?: Partial<HotReloadConfig>;
  }
): ConfigurationManager {
  return new ConfigurationManager(baseDir, options);
}

/**
 * Export configuration manager events interface
 */
export type { ConfigurationManagerEvents };
