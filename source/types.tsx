// Types for the settings menu
export interface Provider {
  id: string;
  name: string;
  apiKey?: string;
  isSecure?: boolean; // Whether the API key is stored in encrypted storage
}

export interface ApiKeyStorage {
  getApiKey: (providerId: string) => string | undefined;
  setApiKey: (providerId: string, apiKey: string) => void;
  removeApiKey: (providerId: string) => void;
}

// Configuration UI Types
export interface ConfigurationTab {
  id: string;
  label: string;
  component: React.ComponentType<any>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  line?: number;
  column?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
}

export interface AgentConfigFile {
  id: string;
  name: string;
  description: string;
  filePath: string;
  content: string;
  lastModified: Date;
  isValid: boolean;
  validationResult?: ValidationResult;
}

export interface CredentialEntry {
  id: string;
  name: string;
  provider: string;
  type: 'api_key' | 'token' | 'certificate' | 'custom';
  value: string;
  masked: boolean;
  lastUpdated: Date;
  expiresAt?: Date;
}

export interface ConfigurationPreset {
  id: string;
  name: string;
  description: string;
  version: string;
  created: Date;
  modified: Date;
  config: {
    agents?: any[];
    models?: any;
    credentials?: CredentialEntry[];
    settings?: any;
  };
  tags: string[];
}

export interface ConfigurationChange {
  id: string;
  type: 'agent' | 'model' | 'credential' | 'setting';
  action: 'create' | 'update' | 'delete';
  path: string;
  oldValue?: any;
  newValue?: any;
  timestamp: Date;
  impact?: string;
}

export interface ConfigurationPreview {
  changes: ConfigurationChange[];
  affectedAgents: string[];
  affectedModels: string[];
  validationResults: ValidationResult[];
  estimatedImpact: 'low' | 'medium' | 'high';
}

export interface EditorSettings {
  theme: 'light' | 'dark';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  autoComplete: boolean;
  syntaxHighlighting: boolean;
}

export interface ConfigurationContext {
  userConfig: any;
  projectConfig: any;
  environmentConfig: any;
  resolvedConfig: any;
  validationErrors: ValidationError[];
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

export interface AgentToolConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  accessPatterns: AccessPatternConfig[];
  enabled: boolean;
  configuration: Record<string, any>;
}

export interface AccessPatternConfig {
  id: string;
  description: string;
  priority: number;
  paths: string[];
  operations: string[];
  allow: boolean;
  conditions?: Record<string, any>;
}

export interface ModelSelectionConfig {
  availableModels: ModelConfig[];
  autoMode: AutoModeConfig;
  defaultModel: string;
  selectionStrategy: 'cost-optimized' | 'performance-optimized' | 'balanced' | 'custom';
  customWeights?: {
    cost: number;
    speed: number;
    quality: number;
    accuracy: number;
  };
}

export interface ModelConfig {
  model: string;
  name: string;
  description: string;
  capabilities: ModelCapabilities;
  available: boolean;
  provider: string;
  endpoint?: string;
  options?: Record<string, any>;
}

export interface ModelCapabilities {
  maxContextLength: number;
  costPerKInput: number;
  costPerKOutput: number;
  speed: number;
  reasoning: number;
  codeGeneration: number;
  analysis: number;
  creativity: number;
  accuracy: number;
  multiLanguage: number;
}

export interface AutoModeConfig {
  enabled: boolean;
  preferredModels: string[];
  costThreshold?: number;
  performanceThreshold?: number;
  contextLengthThreshold?: number;
  operationPreferences?: Record<string, string[]>;
  agentPreferences?: Record<string, string[]>;
  fallbackModel: string;
}