/**
 * File system integration for .ai-code directory structure and operations
 */

import { readFile, writeFile, mkdir, readdir, stat, access, watch } from 'fs/promises';
import { join, dirname, resolve, extname, basename } from 'path';
import { FSWatcher } from 'fs';
import { EventEmitter } from 'events';
import type {
  ConfigPaths,
  CompleteConfig,
  UserConfig,
  ModelSelectionConfig,
  SecurityConfig,
  ConfigLoadOptions,
  HotReloadConfig,
  DEFAULT_CONFIG_PATHS
} from './configuration-types.js';
import type { AgentCapability } from './types.js';

/**
 * Events emitted by the ConfigFileSystem
 */
export interface ConfigFileSystemEvents {
  directoryCreated: (path: string) => void;
  fileLoaded: (path: string, type: string) => void;
  fileCreated: (path: string, type: string) => void;
  fileUpdated: (path: string, type: string) => void;
  fileError: (path: string, error: Error) => void;
  agentDiscovered: (agentPath: string, agent: AgentCapability) => void;
  configChanged: (changedFiles: string[]) => void;
  hotReloadTriggered: (files: string[]) => void;
}

/**
 * File system manager for .ai-code configuration structure
 */
export class ConfigFileSystem extends EventEmitter {
  private configPaths: ConfigPaths;
  private watchers = new Map<string, FSWatcher>();
  private moduleCache = new Map<string, any>();
  private lastModified = new Map<string, number>();

  constructor(baseDir: string = process.cwd()) {
    super();
    this.configPaths = this.resolveConfigPaths(baseDir);
  }

  /**
   * Initialize the .ai-code directory structure
   */
  async initialize(): Promise<void> {
    try {
      // Create all necessary directories
      await this.createDirectoryStructure();
      
      // Create default configuration files if they don't exist
      await this.createDefaultConfigFiles();
      
      this.emit('directoryCreated', this.configPaths.rootDir);
    } catch (error) {
      throw new Error(`Failed to initialize config filesystem: ${(error as Error).message}`);
    }
  }

  /**
   * Load the complete orchestration configuration
   */
  async loadOrchestrationConfig(): Promise<Partial<CompleteConfig>> {
    try {
      const configPath = this.configPaths.orchestrationConfig;
      const config = await this.loadTypeScriptModule<{ default: Partial<CompleteConfig> }>(configPath);
      
      this.emit('fileLoaded', configPath, 'orchestration');
      return config.default || config;
    } catch (error) {
      // Return empty config if file doesn't exist
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      this.emit('fileError', this.configPaths.orchestrationConfig, error as Error);
      throw error;
    }
  }

  /**
   * Load user-specific configuration overrides
   */
  async loadUserConfig(): Promise<Partial<UserConfig>> {
    try {
      const configPath = this.configPaths.userConfig;
      const config = await this.loadTypeScriptModule<{ default: Partial<UserConfig> }>(configPath);
      
      this.emit('fileLoaded', configPath, 'user');
      return config.default || config;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      this.emit('fileError', this.configPaths.userConfig, error as Error);
      throw error;
    }
  }

  /**
   * Load model selection configuration
   */
  async loadModelConfig(): Promise<Partial<ModelSelectionConfig>> {
    try {
      const configPath = this.configPaths.modelsConfig;
      const config = await this.loadTypeScriptModule<{ default: Partial<ModelSelectionConfig> }>(configPath);
      
      this.emit('fileLoaded', configPath, 'models');
      return config.default || config;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      this.emit('fileError', this.configPaths.modelsConfig, error as Error);
      throw error;
    }
  }

  /**
   * Load security configuration
   */
  async loadSecurityConfig(): Promise<Partial<SecurityConfig>> {
    try {
      const configPath = this.configPaths.securityConfig;
      const config = await this.loadTypeScriptModule<{ default: Partial<SecurityConfig> }>(configPath);
      
      this.emit('fileLoaded', configPath, 'security');
      return config.default || config;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return {};
      }
      this.emit('fileError', this.configPaths.securityConfig, error as Error);
      throw error;
    }
  }

  /**
   * Discover and load all agent configurations
   */
  async loadAgentConfigurations(): Promise<AgentCapability[]> {
    try {
      const agentsDir = this.configPaths.agentsDir;
      
      // Check if agents directory exists
      try {
        await access(agentsDir);
      } catch {
        // Directory doesn't exist, return empty array
        return [];
      }

      const files = await readdir(agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.agent.js'));
      
      const agents: AgentCapability[] = [];
      
      for (const agentFile of agentFiles) {
        try {
          const agentPath = join(agentsDir, agentFile);
          const agentModule = await this.loadTypeScriptModule<{ 
            default?: AgentCapability;
            [key: string]: any;
          }>(agentPath);
          
          // Extract agent configuration (could be default export or named export)
          let agent: AgentCapability;
          if (agentModule.default) {
            agent = agentModule.default;
          } else {
            // Look for any exported AgentCapability
            const exports = Object.values(agentModule);
            const agentExport = exports.find((exp: any) => 
              exp && typeof exp === 'object' && exp.id && exp.name && exp.tools
            );
            
            if (!agentExport) {
              throw new Error(`No valid agent configuration found in ${agentFile}`);
            }
            
            agent = agentExport as AgentCapability;
          }
          
          agents.push(agent);
          this.emit('agentDiscovered', agentPath, agent);
          this.emit('fileLoaded', agentPath, 'agent');
        } catch (error) {
          this.emit('fileError', join(agentsDir, agentFile), error as Error);
          console.warn(`Failed to load agent configuration from ${agentFile}:`, error);
        }
      }
      
      return agents;
    } catch (error) {
      throw new Error(`Failed to load agent configurations: ${(error as Error).message}`);
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfig(
    configType: 'orchestration' | 'user' | 'models' | 'security',
    config: any
  ): Promise<void> {
    try {
      let filePath: string;
      
      switch (configType) {
        case 'orchestration':
          filePath = this.configPaths.orchestrationConfig;
          break;
        case 'user':
          filePath = this.configPaths.userConfig;
          break;
        case 'models':
          filePath = this.configPaths.modelsConfig;
          break;
        case 'security':
          filePath = this.configPaths.securityConfig;
          break;
        default:
          throw new Error(`Unknown config type: ${configType}`);
      }
      
      const content = this.generateTypeScriptConfigFile(config, configType);
      await writeFile(filePath, content, 'utf8');
      
      // Clear module cache for this file
      this.clearModuleCache(filePath);
      
      this.emit('fileUpdated', filePath, configType);
    } catch (error) {
      throw new Error(`Failed to save ${configType} config: ${(error as Error).message}`);
    }
  }

  /**
   * Save agent configuration
   */
  async saveAgentConfig(agent: AgentCapability): Promise<void> {
    try {
      const agentPath = join(this.configPaths.agentsDir, `${agent.id}.agent.js`);
      const content = this.generateAgentConfigFile(agent);
      
      await writeFile(agentPath, content, 'utf8');
      
      // Clear module cache
      this.clearModuleCache(agentPath);
      
      this.emit('fileCreated', agentPath, 'agent');
    } catch (error) {
      throw new Error(`Failed to save agent config for ${agent.id}: ${(error as Error).message}`);
    }
  }

  /**
   * Enable hot reloading for configuration files
   */
  async enableHotReload(config: HotReloadConfig): Promise<void> {
    if (!config.enabled) {
      return;
    }

    const watchPaths = config.watchPaths.length > 0 
      ? config.watchPaths 
      : [
          this.configPaths.orchestrationConfig,
          this.configPaths.userConfig,
          this.configPaths.modelsConfig,
          this.configPaths.securityConfig,
          this.configPaths.agentsDir
        ];

    for (const watchPath of watchPaths) {
      try {
        await access(watchPath);
        
        // Note: watch() returns an AsyncIterable in newer Node.js versions
        // For now, we'll disable hot reload for file watching 
        // This can be re-implemented with a file watcher library if needed
        console.warn(`Hot reload not fully implemented for ${watchPath}`);
      } catch (error) {
        // Path doesn't exist, skip watching
        console.warn(`Cannot watch path ${watchPath}: path does not exist`);
      }
    }
  }

  /**
   * Disable hot reloading
   */
  async disableHotReload(): Promise<void> {
    for (const [path, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
  }

  /**
   * Check if configuration directory structure exists
   */
  async configExists(): Promise<boolean> {
    try {
      await access(this.configPaths.rootDir);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration file paths
   */
  getConfigPaths(): ConfigPaths {
    return { ...this.configPaths };
  }

  /**
   * Validate that all necessary directories and files exist
   */
  async validateStructure(): Promise<{
    valid: boolean;
    missingDirectories: string[];
    missingFiles: string[];
    issues: string[];
  }> {
    const missingDirectories: string[] = [];
    const missingFiles: string[] = [];
    const issues: string[] = [];

    // Check directories
    const requiredDirs = [
      this.configPaths.rootDir,
      this.configPaths.agentsDir,
      this.configPaths.configDir,
      this.configPaths.credentialsDir
    ];

    for (const dir of requiredDirs) {
      try {
        const stats = await stat(dir);
        if (!stats.isDirectory()) {
          issues.push(`${dir} exists but is not a directory`);
        }
      } catch {
        missingDirectories.push(dir);
      }
    }

    // Check for optional configuration files (they can be missing)
    const optionalFiles = [
      this.configPaths.orchestrationConfig,
      this.configPaths.userConfig,
      this.configPaths.modelsConfig,
      this.configPaths.securityConfig
    ];

    for (const file of optionalFiles) {
      try {
        await access(file);
      } catch {
        // Optional files can be missing
      }
    }

    return {
      valid: missingDirectories.length === 0 && issues.length === 0,
      missingDirectories,
      missingFiles,
      issues
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.disableHotReload();
    this.moduleCache.clear();
    this.lastModified.clear();
    this.removeAllListeners();
  }

  /**
   * Resolve configuration paths based on base directory
   */
  private resolveConfigPaths(baseDir: string): ConfigPaths {
    const rootDir = join(baseDir, '.ai-code');
    
    // Use .js extensions for generated configuration files
    // The filesystem will handle .ts files when they exist during development
    return {
      rootDir,
      agentsDir: join(rootDir, 'agents'),
      configDir: join(rootDir, 'config'),
      credentialsDir: join(rootDir, 'credentials'),
      userConfig: join(rootDir, 'user-config.js'),
      orchestrationConfig: join(rootDir, 'config', 'orchestration.js'),
      modelsConfig: join(rootDir, 'config', 'models.js'),
      securityConfig: join(rootDir, 'config', 'security.js'),
      apiKeysFile: join(rootDir, 'credentials', 'api-keys.enc'),
      tokensFile: join(rootDir, 'credentials', 'tokens.enc')
    };
  }

  /**
   * Create the complete directory structure
   */
  private async createDirectoryStructure(): Promise<void> {
    const directories = [
      this.configPaths.rootDir,
      this.configPaths.agentsDir,
      this.configPaths.configDir,
      this.configPaths.credentialsDir,
      join(this.configPaths.agentsDir, 'common'),
      join(this.configPaths.credentialsDir, 'backups')
    ];

    for (const dir of directories) {
      try {
        await access(dir);
      } catch {
        await mkdir(dir, { recursive: true });
        this.emit('directoryCreated', dir);
      }
    }
  }

  /**
   * Create default configuration files if they don't exist
   */
  private async createDefaultConfigFiles(): Promise<void> {
    // Create default orchestration config
    try {
      await access(this.configPaths.orchestrationConfig);
    } catch {
      const defaultContent = this.generateDefaultOrchestrationConfig();
      await writeFile(this.configPaths.orchestrationConfig, defaultContent, 'utf8');
      this.emit('fileCreated', this.configPaths.orchestrationConfig, 'orchestration');
    }

    // Create default models config
    try {
      await access(this.configPaths.modelsConfig);
    } catch {
      const defaultContent = this.generateDefaultModelsConfig();
      await writeFile(this.configPaths.modelsConfig, defaultContent, 'utf8');
      this.emit('fileCreated', this.configPaths.modelsConfig, 'models');
    }

    // Create default security config
    try {
      await access(this.configPaths.securityConfig);
    } catch {
      const defaultContent = this.generateDefaultSecurityConfig();
      await writeFile(this.configPaths.securityConfig, defaultContent, 'utf8');
      this.emit('fileCreated', this.configPaths.securityConfig, 'security');
    }

    // Create default user config
    try {
      await access(this.configPaths.userConfig);
    } catch {
      const defaultContent = this.generateDefaultUserConfig();
      await writeFile(this.configPaths.userConfig, defaultContent, 'utf8');
      this.emit('fileCreated', this.configPaths.userConfig, 'user');
    }
  }

  /**
   * Load a TypeScript module with caching and error handling
   * Attempts to load .js file, falls back to .ts for development
   */
  private async loadTypeScriptModule<T = any>(filePath: string): Promise<T> {
    const possiblePaths = [
      filePath,
      // If the path ends with .js, also try .ts version for development
      filePath.replace(/\.js$/, '.ts')
    ];

    let lastError: Error | undefined;

    for (const path of possiblePaths) {
      try {
        // Check if file exists
        await access(path);
        
        // Check if module is cached and file hasn't changed
        const stats = await stat(path);
        const lastMod = this.lastModified.get(path);
        
        if (lastMod && lastMod >= stats.mtime.getTime()) {
          const cached = this.moduleCache.get(path);
          if (cached) {
            return cached;
          }
        }

        // Load the module using dynamic import
        // Note: In ESM, modules are cached automatically by the runtime
        const module = await import(path);
        
        // Cache the module and timestamp
        this.moduleCache.set(path, module);
        this.lastModified.set(path, stats.mtime.getTime());
        
        return module;
      } catch (error) {
        lastError = error as Error;
        // Continue to next path
      }
    }

    // If we get here, all paths failed
    throw new Error(`Failed to load module ${filePath}: ${lastError?.message || 'File not found'}`);
  }

  /**
   * Clear module cache for a specific file
   */
  private clearModuleCache(filePath: string): void {
    this.moduleCache.delete(filePath);
    this.lastModified.delete(filePath);
    
    // Also clear from Node.js require cache
    try {
      delete require.cache[require.resolve(filePath)];
    } catch {
      // File might not be in require cache
    }
  }

  /**
   * Handle file change events for hot reloading
   */
  private handleFileChange(filePath: string, config: HotReloadConfig): void {
    setTimeout(() => {
      try {
        this.clearModuleCache(filePath);
        this.emit('configChanged', [filePath]);
        this.emit('hotReloadTriggered', [filePath]);
        
        if (config.onReload) {
          // Reload would be handled by the configuration manager
        }
      } catch (error) {
        this.emit('fileError', filePath, error as Error);
        if (config.onReloadError) {
          config.onReloadError(error as Error);
        }
      }
    }, config.debounceTime);
  }

  /**
   * Generate TypeScript configuration file content
   */
  private generateTypeScriptConfigFile(config: any, type: string): string {
    const imports = this.generateImports(type);
    const exportName = this.getExportName(type);
    const configJson = JSON.stringify(config, null, 2);
    
    return `${imports}

/**
 * ${type.charAt(0).toUpperCase() + type.slice(1)} configuration for AI code orchestration platform
 * 
 * This file is auto-generated. You can modify it as needed.
 * Changes will be preserved when the configuration is updated.
 */

export const ${exportName} = ${configJson} as const;

export default ${exportName};
`;
  }

  /**
   * Generate agent configuration file content
   */
  private generateAgentConfigFile(agent: AgentCapability): string {
    const agentJson = JSON.stringify(agent, null, 2);
    
    return `import type { AgentCapability } from '@ai-code/core';

/**
 * Agent configuration: ${agent.name}
 * 
 * ${agent.description}
 */

export const ${agent.id.replace(/-/g, '_')}Agent: AgentCapability = ${agentJson};

export default ${agent.id.replace(/-/g, '_')}Agent;
`;
  }

  /**
   * Generate default orchestration configuration
   */
  private generateDefaultOrchestrationConfig(): string {
    return `// @ts-check
import { AIModel } from '../../source/core/types.js';

/**
 * Main orchestration configuration
 * 
 * This file defines the core configuration for the AI code orchestration platform.
 * @type {import('../../source/core/types.js').OrchestrationConfig}
 */
export const orchestrationConfig = {
  agents: [],
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
  modelSelection: {
    // availableModels will be loaded from models.js
    autoMode: {
      enabled: true,
      preferredModels: [AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_HAIKU],
      costThreshold: 0.1,
      performanceThreshold: 7,
      contextLengthThreshold: 100000,
      fallbackModel: AIModel.CLAUDE_3_5_SONNET
    },
    defaultModel: AIModel.CLAUDE_3_5_SONNET,
    selectionStrategy: 'balanced'
  }
};

export default orchestrationConfig;
`;
  }

  /**
   * Generate default user configuration
   */
  private generateDefaultUserConfig(): string {
    return `// @ts-check
import { AIModel } from '../../source/core/types.js';

/**
 * User-specific configuration overrides
 * 
 * This file contains personal preferences that override the project configuration.
 * @type {import('../../source/core/types.js').UserConfig}
 */
export const userConfig = {
  // Personal logging preferences
  logging: {
    level: 'info'
  },
  
  // Personal model preferences
  modelSelection: {
    defaultModel: AIModel.CLAUDE_3_5_SONNET
  }
};

export default userConfig;
`;
  }

  private generateDefaultModelsConfig(): string {
    return `// @ts-check
import { AIModel } from '../../source/core/types.js';

/**
 * Model selection configuration
 * 
 * This file defines available AI models and selection strategies.
 * @type {import('../../source/core/types.js').ModelSelectionConfig}
 */
export const modelConfig = {
  defaultModel: AIModel.CLAUDE_3_5_SONNET,
  selectionStrategy: 'balanced',
  autoMode: {
    enabled: true,
    preferredModels: [AIModel.CLAUDE_3_5_SONNET, AIModel.CLAUDE_3_HAIKU],
    costThreshold: 0.05,
    performanceThreshold: 7,
    contextLengthThreshold: 100000,
    fallbackModel: AIModel.CLAUDE_3_HAIKU
  }
};

export default modelConfig;
`;
  }

  private generateDefaultSecurityConfig(): string {
    return `// @ts-check

/**
 * Security configuration
 * 
 * This file defines security policies and access patterns.
 * @type {import('../../source/core/types.js').SecurityConfig}
 */
export const securityConfig = {
  defaultPermissions: {
    requireExplicitToolGrants: true,
    allowNetworkAccess: false,
    allowFileSystemWrite: false,
    allowProcessExecution: false,
    allowSystemInfoAccess: false
  },
  accessPatterns: {
    enabled: true,
    enableCaching: true,
    maxCacheSize: 1000,
    defaultDenyUnknownPatterns: true,
    auditAccessViolations: true
  }
};

export default securityConfig;
`;
  }

  /**
   * Generate appropriate imports for configuration type
   */
  private generateImports(type: string): string {
    switch (type) {
      case 'orchestration':
        return `import type { OrchestrationConfig } from '@ai-code/core';
import { AIModel } from '@ai-code/core';`;
      case 'user':
        return `import type { UserConfig } from '@ai-code/core';
import { AIModel } from '@ai-code/core';`;
      case 'models':
        return `import type { ModelSelectionConfig, ModelConfig, AutoModeConfig } from '@ai-code/core';
import { AIModel } from '@ai-code/core';`;
      case 'security':
        return `import type { SecurityConfig } from '@ai-code/core';`;
      default:
        return `import type { CompleteConfig } from '@ai-code/core';`;
    }
  }

  /**
   * Get export name for configuration type
   */
  private getExportName(type: string): string {
    switch (type) {
      case 'orchestration':
        return 'orchestrationConfig';
      case 'user':
        return 'userConfig';
      case 'models':
        return 'modelConfig';
      case 'security':
        return 'securityConfig';
      default:
        return 'config';
    }
  }
}

/**
 * Create a new configuration file system manager
 */
export function createConfigFileSystem(baseDir?: string): ConfigFileSystem {
  return new ConfigFileSystem(baseDir);
}