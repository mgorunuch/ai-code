/**
 * Configuration system types and interfaces for the AI code orchestration platform
 */

import type {
  OrchestrationConfig,
  AgentCapability,
  AgentId,
  AccessPattern,
  ModelConfig,
  AutoModeConfig,
  OperationType
} from './types.js';

import { AIModel } from './types.js';

/**
 * Configuration file paths within the .ai-code directory
 */
export interface ConfigPaths {
  /** Root .ai-code directory */
  rootDir: string;
  /** Agents directory (.ai-code/agents/) */
  agentsDir: string;
  /** Configuration directory (.ai-code/config/) */
  configDir: string;
  /** Credentials directory (.ai-code/credentials/) */
  credentialsDir: string;
  /** User configuration file (.ai-code/user-config.ts) */
  userConfig: string;
  /** Main orchestration config (.ai-code/config/orchestration.ts) */
  orchestrationConfig: string;
  /** Models config (.ai-code/config/models.ts) */
  modelsConfig: string;
  /** Security config (.ai-code/config/security.ts) */
  securityConfig: string;
  /** Encrypted API keys (.ai-code/credentials/api-keys.enc) */
  apiKeysFile: string;
  /** Encrypted tokens (.ai-code/credentials/tokens.enc) */
  tokensFile: string;
}

/**
 * Default configuration paths relative to current working directory
 */
export const DEFAULT_CONFIG_PATHS: ConfigPaths = {
  rootDir: '.ai-code',
  agentsDir: '.ai-code/agents',
  configDir: '.ai-code/config',
  credentialsDir: '.ai-code/credentials',
  userConfig: '.ai-code/user-config.ts',
  orchestrationConfig: '.ai-code/config/orchestration.ts',
  modelsConfig: '.ai-code/config/models.ts',
  securityConfig: '.ai-code/config/security.ts',
  apiKeysFile: '.ai-code/credentials/api-keys.enc',
  tokensFile: '.ai-code/credentials/tokens.enc'
};

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  development?: Partial<OrchestrationConfig>;
  staging?: Partial<OrchestrationConfig>;
  production?: Partial<OrchestrationConfig>;
}

/**
 * Model selection configuration for the configuration system
 */
export interface ModelSelectionConfig {
  /** Available model configurations */
  availableModels: ModelConfig[];
  /** Auto mode configuration */
  autoMode: AutoModeConfig;
  /** Default model when auto mode is disabled */
  defaultModel: AIModel;
  /** Selection strategy */
  selectionStrategy: 'cost-optimized' | 'performance-optimized' | 'balanced' | 'custom';
  /** Custom scoring weights */
  customWeights?: {
    cost: number;        // 0-1, weight for cost considerations
    speed: number;       // 0-1, weight for response speed
    quality: number;     // 0-1, weight for output quality
    accuracy: number;    // 0-1, weight for factual accuracy
  };
}

/**
 * Credential encryption configuration
 */
export interface CredentialEncryptionConfig {
  /** Encryption algorithm */
  algorithm: 'aes-256-gcm';
  /** Key derivation method */
  keyDerivation: 'pbkdf2' | 'scrypt';
  /** Number of iterations for key derivation */
  iterations: number;
}

/**
 * API provider configuration
 */
export interface APIProviderConfig {
  /** API key (encrypted reference) */
  apiKey: string;
  /** Organization ID (optional) */
  organization?: string;
  /** Project ID (optional) */
  project?: string;
  /** Custom headers for the provider */
  headers?: Record<string, string>;
}

/**
 * Custom provider configuration
 */
export interface CustomProviderConfig extends APIProviderConfig {
  /** API endpoint URL */
  endpoint: string;
}

/**
 * Credential rotation settings
 */
export interface CredentialRotationConfig {
  /** Whether credential rotation is enabled */
  enabled: boolean;
  /** Rotation interval in hours */
  interval: number;
  /** Number of backup credentials to keep */
  backupCount: number;
}

/**
 * Full credential configuration
 */
export interface CredentialConfig {
  /** Encryption configuration */
  encryption: CredentialEncryptionConfig;
  /** API provider configurations */
  providers: {
    anthropic?: APIProviderConfig;
    openai?: APIProviderConfig;
    custom?: Record<string, CustomProviderConfig>;
  };
  /** Credential rotation settings */
  rotation: CredentialRotationConfig;
}

/**
 * Security check interface for access patterns
 */
export interface SecurityCheck {
  validate(context: any): Promise<{
    passed: boolean;
    reason?: string;
    type?: string;
  }>;
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
  timestamp: Date;
  agentId: AgentId;
  operation: OperationType;
  resource: string;
  allowed: boolean;
  reason?: string;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Security audit configuration
 */
export interface SecurityAuditConfig {
  /** Whether audit logging is enabled */
  enabled: boolean;
  /** Logging level for audit events */
  logLevel: 'all' | 'denied' | 'critical';
  /** Retention period in days */
  retentionPeriod: number;
  /** Alert thresholds */
  alertThresholds: {
    deniedRequestsPerHour: number;
    criticalEventsPerDay: number;
  };
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /** Global security patterns that apply to all agents */
  globalSecurityPatterns?: AccessPattern[];
  /** Credential configuration */
  credentials: CredentialConfig;
  /** Audit configuration */
  audit: SecurityAuditConfig;
}

/**
 * Complete configuration structure matching CONFIG_RULES.md specification
 */
export interface CompleteConfig extends OrchestrationConfig {
  /** Environment-specific configurations */
  environments?: EnvironmentConfig;
  /** Security configuration */
  security?: SecurityConfig;
  /** Model selection configuration (enhanced) */
  modelSelection: ModelSelectionConfig;
}

/**
 * User-specific configuration overrides
 */
export interface UserConfig extends Partial<CompleteConfig> {
  /** User preferences for model selection */
  modelSelection?: Partial<ModelSelectionConfig>;
  /** User-specific logging preferences */
  logging?: Partial<CompleteConfig['logging']>;
  /** User-specific security settings */
  security?: Partial<SecurityConfig>;
}

/**
 * Configuration loading options
 */
export interface ConfigLoadOptions {
  /** Environment to load (development, staging, production) */
  environment?: string;
  /** Whether to enable hot reloading */
  enableHotReload?: boolean;
  /** Whether to validate configuration on load */
  validateOnLoad?: boolean;
  /** Timeout for configuration loading in milliseconds */
  loadTimeout?: number;
  /** Base directory for configuration files */
  baseDir?: string;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Suggestions for improvement */
  suggestions: string[];
  /** Successfully loaded components */
  loadedComponents?: string[];
  /** Failed components */
  failedComponents?: string[];
}

/**
 * Configuration suggestion
 */
export interface ConfigurationSuggestion {
  /** Suggestion type */
  type: 'security' | 'performance' | 'maintainability' | 'best-practice';
  /** Suggestion message */
  message: string;
  /** Suggested action */
  action?: string;
  /** Priority level */
  priority: 'low' | 'medium' | 'high';
  /** Configuration path being suggested */
  configPath?: string;
}

/**
 * Configuration merge strategy
 */
export type ConfigMergeStrategy = 'deep' | 'shallow' | 'replace' | 'custom';

/**
 * Configuration merge options
 */
export interface ConfigMergeOptions {
  /** Merge strategy to use */
  strategy: ConfigMergeStrategy;
  /** Custom merge function (when strategy is 'custom') */
  customMerge?: (base: any, override: any, path: string) => any;
  /** Paths to exclude from merging */
  excludePaths?: string[];
  /** Whether to preserve arrays or replace them */
  preserveArrays?: boolean;
}

/**
 * Hot reload configuration
 */
export interface HotReloadConfig {
  /** Whether hot reload is enabled */
  enabled: boolean;
  /** Files to watch for changes */
  watchPaths: string[];
  /** Debounce time in milliseconds */
  debounceTime: number;
  /** Whether to validate on reload */
  validateOnReload: boolean;
  /** Callback when configuration is reloaded */
  onReload?: (config: CompleteConfig) => void;
  /** Callback when reload fails */
  onReloadError?: (error: Error) => void;
}

/**
 * Configuration cache options
 */
export interface ConfigCacheOptions {
  /** Whether to enable configuration caching */
  enabled: boolean;
  /** Cache TTL in milliseconds */
  ttl: number;
  /** Maximum cache size */
  maxSize: number;
  /** Whether to cache validation results */
  cacheValidation: boolean;
}

/**
 * Configuration export/import format
 */
export interface ConfigExportFormat {
  /** Export format */
  format: 'json' | 'yaml' | 'typescript';
  /** Whether to include sensitive data */
  includeSensitive: boolean;
  /** Whether to include comments and documentation */
  includeComments: boolean;
  /** Compression level (0-9) */
  compression?: number;
}

/**
 * Configuration backup options
 */
export interface ConfigBackupOptions {
  /** Whether to enable automatic backups */
  enabled: boolean;
  /** Backup directory */
  backupDir: string;
  /** Number of backups to retain */
  retentionCount: number;
  /** Backup interval in hours */
  interval: number;
  /** Whether to compress backups */
  compress: boolean;
}

/**
 * Configuration manager events
 */
export interface ConfigurationManagerEvents {
  configLoaded: (config: CompleteConfig) => void;
  configReloaded: (config: CompleteConfig) => void;
  configValidated: (result: ConfigValidationResult) => void;
  configError: (error: Error) => void;
  agentConfigLoaded: (agent: AgentCapability) => void;
  credentialsUpdated: (provider: string) => void;
  securityAlert: (alert: SecurityAuditLog) => void;
  backupCreated: (backupPath: string) => void;
  hotReloadTriggered: (changedFiles: string[]) => void;
}

/**
 * Legacy default configuration values (replaced by proper implementation above)
 */
export const LEGACY_DEFAULT_CONFIG_PATHS: Partial<ConfigPaths> = {
  rootDir: '.ai-code',
  agentsDir: '.ai-code/agents',
  configDir: '.ai-code/config',
  credentialsDir: '.ai-code/credentials',
  userConfig: '.ai-code/user-config.ts',
  orchestrationConfig: '.ai-code/config/orchestration.ts',
  modelsConfig: '.ai-code/config/models.ts',
  securityConfig: '.ai-code/config/security.ts',
  apiKeysFile: '.ai-code/credentials/api-keys.enc',
  tokensFile: '.ai-code/credentials/tokens.enc'
};

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  credentials: {
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'scrypt',
      iterations: 100000
    },
    providers: {},
    rotation: {
      enabled: false,
      interval: 24 * 7, // Weekly
      backupCount: 3
    }
  },
  audit: {
    enabled: true,
    logLevel: 'denied',
    retentionPeriod: 90,
    alertThresholds: {
      deniedRequestsPerHour: 100,
      criticalEventsPerDay: 10
    }
  }
};

/**
 * Default environment configuration
 */
export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  development: {
    logging: {
      level: 'debug',
      logCommunications: true,
      logModelSelection: true,
      logAccessPatterns: true
    },
    modelSelection: {
      defaultModel: AIModel.CLAUDE_3_HAIKU,
      selectionStrategy: 'cost-optimized'
    }
  },
  staging: {
    logging: {
      level: 'info',
      logCommunications: true,
      logModelSelection: true,
      logAccessPatterns: false
    },
    modelSelection: {
      defaultModel: AIModel.CLAUDE_3_5_SONNET,
      selectionStrategy: 'balanced'
    }
  },
  production: {
    logging: {
      level: 'warn',
      logCommunications: false,
      logModelSelection: false,
      logAccessPatterns: false
    },
    modelSelection: {
      selectionStrategy: 'cost-optimized',
      autoMode: {
        enabled: true,
        costThreshold: 0.02
      }
    }
  }
};

/**
 * Default cache options
 */
export const DEFAULT_CACHE_OPTIONS: ConfigCacheOptions = {
  enabled: true,
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  cacheValidation: true
};

/**
 * Default hot reload configuration
 */
export const DEFAULT_HOT_RELOAD_CONFIG: Partial<HotReloadConfig> = {
  enabled: false,
  debounceTime: 1000,
  validateOnReload: true
};

/**
 * Default backup options
 */
export const DEFAULT_BACKUP_OPTIONS: ConfigBackupOptions = {
  enabled: false,
  backupDir: '.ai-code/.backups',
  retentionCount: 10,
  interval: 24, // Daily
  compress: true
};