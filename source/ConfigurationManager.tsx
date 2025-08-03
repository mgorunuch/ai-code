import React, { useState, useEffect, useCallback } from 'react';
import { Text } from 'ink';
import { 
  ConfigurationTab, 
  ConfigurationContext, 
  ValidationError,
  ConfigurationChange
} from './types';
import { ConfigurationManager as CoreConfigurationManager } from './core/configuration-manager.js';
import { CredentialManager as CoreCredentialManager } from './core/credential-manager.js';
import type { CompleteConfig, UserConfig, ConfigValidationResult } from './core/configuration-types.js';
import { AgentConfigEditor } from './AgentConfigEditor';
import { CredentialManager } from './CredentialManager';
import { ConfigurationValidator } from './ConfigurationValidator';
import { ConfigurationImportExport } from './ConfigurationImportExport';
import { ConfigurationPreview } from './ConfigurationPreview';

export interface ConfigurationManagerProps {
  onExit?: () => void;
  initialTab?: string;
  baseDir?: string;
  autoSave?: boolean;
}

interface TabPanelProps {
  children: React.ReactNode;
  value: string;
  index: string;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div style={{ display: value === index ? 'block' : 'none', padding: '16px 0' }}>
      {value === index && children}
    </div>
  );
};

export const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({
  onExit,
  initialTab = 'agents',
  baseDir = process.cwd(),
  autoSave = false
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [configContext, setConfigContext] = useState<ConfigurationContext>({
    userConfig: {},
    projectConfig: {},
    environmentConfig: {},
    resolvedConfig: {},
    validationErrors: [],
    isLoading: false,
    hasUnsavedChanges: false
  });
  const [previewChanges, setPreviewChanges] = useState<ConfigurationChange[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [coreConfigManager, setCoreConfigManager] = useState<CoreConfigurationManager | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  // Configuration tabs
  const tabs: ConfigurationTab[] = [
    {
      id: 'agents',
      label: 'Agent Configuration',
      component: () => <AgentConfigurationPanel context={configContext} onChange={handleConfigChange} />
    },
    {
      id: 'models',
      label: 'Model Selection',
      component: () => <ModelConfigurationPanel context={configContext} onChange={handleConfigChange} />
    },
    {
      id: 'credentials',
      label: 'Credentials',
      component: () => <CredentialsPanel context={configContext} onChange={handleConfigChange} />
    },
    {
      id: 'security',
      label: 'Security & Access',
      component: () => <SecurityPanel context={configContext} onChange={handleConfigChange} />
    },
    {
      id: 'import-export',
      label: 'Import/Export',
      component: () => <ImportExportPanel context={configContext} />
    }
  ];

  // Initialize core configuration manager on mount
  useEffect(() => {
    initializeCoreConfigManager();
  }, [baseDir]);

  const initializeCoreConfigManager = async () => {
    try {
      setConfigContext(prev => ({ ...prev, isLoading: true }));
      setInitializationError(null);
      
      const manager = new CoreConfigurationManager(baseDir, {
        cacheOptions: { enabled: true, ttl: 300000 }, // 5 minute cache
        hotReloadConfig: { enabled: true, debounceTime: 1000 }
      });
      
      // Set up event listeners
      manager.on('configLoaded', (config: CompleteConfig) => {
        updateConfigContext(config, null);
      });
      
      manager.on('configReloaded', (config: CompleteConfig) => {
        updateConfigContext(config, null);
        setPreviewChanges([]); // Clear preview on reload
      });
      
      manager.on('configError', (error: Error) => {
        setConfigContext(prev => ({ 
          ...prev, 
          isLoading: false,
          validationErrors: [{
            field: 'system',
            message: error.message,
            severity: 'error'
          }]
        }));
      });
      
      manager.on('configValidated', (result: ConfigValidationResult) => {
        const validationErrors = [
          ...result.errors.map(error => ({ field: 'validation', message: error, severity: 'error' as const })),
          ...result.warnings.map(warning => ({ field: 'validation', message: warning, severity: 'warning' as const }))
        ];
        setConfigContext(prev => ({ ...prev, validationErrors }));
      });
      
      // Initialize the manager
      await manager.initialize({ enableHotReload: true, validateOnLoad: true });
      setCoreConfigManager(manager);
      
    } catch (error) {
      console.error('Failed to initialize configuration manager:', error);
      setInitializationError(error instanceof Error ? error.message : 'Unknown error');
      setConfigContext(prev => ({ 
        ...prev, 
        isLoading: false,
        validationErrors: [{
          field: 'initialization',
          message: `Failed to initialize: ${error}`,
          severity: 'error'
        }]
      }));
    }
  };

  const updateConfigContext = (config: CompleteConfig, validationResult: ConfigValidationResult | null) => {
    setConfigContext(prev => ({
      ...prev,
      userConfig: {}, // TODO: Extract from config
      projectConfig: config,
      environmentConfig: config.environments || {},
      resolvedConfig: config,
      validationErrors: validationResult ? [
        ...validationResult.errors.map(error => ({ field: 'validation', message: error, severity: 'error' as const })),
        ...validationResult.warnings.map(warning => ({ field: 'validation', message: warning, severity: 'warning' as const }))
      ] : [],
      isLoading: false
    }));
  };

  const reloadConfiguration = async () => {
    if (!coreConfigManager) return;
    
    try {
      setConfigContext(prev => ({ ...prev, isLoading: true }));
      const config = await coreConfigManager.loadConfiguration();
      const validation = await coreConfigManager.validateConfiguration(config);
      updateConfigContext(config, validation);
    } catch (error) {
      console.error('Failed to reload configuration:', error);
      setConfigContext(prev => ({ 
        ...prev, 
        isLoading: false,
        validationErrors: [{
          field: 'reload',
          message: `Failed to reload: ${error}`,
          severity: 'error'
        }]
      }));
    }
  };

  const handleConfigChange = useCallback((changes: ConfigurationChange[]) => {
    setPreviewChanges(changes);
    setConfigContext(prev => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  const handleSaveConfiguration = async () => {
    if (!coreConfigManager) {
      console.error('Configuration manager not initialized');
      return;
    }

    try {
      setConfigContext(prev => ({ ...prev, isLoading: true }));
      
      // Apply changes to configuration
      const updatedConfig = applyChanges(configContext.resolvedConfig, previewChanges);
      
      // Validate before saving
      const validationResult = await coreConfigManager.validateConfiguration(updatedConfig);
      
      if (!validationResult.valid) {
        setConfigContext(prev => ({ 
          ...prev, 
          validationErrors: [
            ...validationResult.errors.map(error => ({ field: 'validation', message: error, severity: 'error' as const })),
            ...validationResult.warnings.map(warning => ({ field: 'validation', message: warning, severity: 'warning' as const }))
          ],
          isLoading: false 
        }));
        return;
      }
      
      // Determine what type of update this is
      const configType = determineConfigType(previewChanges);
      if (configType) {
        await coreConfigManager.updateConfiguration(configType, updatedConfig);
      }
      
      setConfigContext(prev => ({
        ...prev,
        resolvedConfig: updatedConfig,
        validationErrors: [],
        hasUnsavedChanges: false,
        isLoading: false
      }));
      
      setPreviewChanges([]);
      
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setConfigContext(prev => ({ 
        ...prev,
        isLoading: false,
        validationErrors: [{
          field: 'save',
          message: `Failed to save: ${error}`,
          severity: 'error'
        }]
      }));
    }
  };

  const determineConfigType = (changes: ConfigurationChange[]): 'orchestration' | 'user' | 'models' | 'security' | null => {
    if (changes.some(c => c.type === 'agent')) return 'orchestration';
    if (changes.some(c => c.type === 'model')) return 'models';
    if (changes.some(c => c.type === 'credential')) return 'security';
    if (changes.some(c => c.path.includes('user'))) return 'user';
    return 'orchestration'; // Default
  };

  const handleDiscardChanges = () => {
    setPreviewChanges([]);
    setConfigContext(prev => ({ ...prev, hasUnsavedChanges: false }));
    setShowPreview(false);
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      if (showPreview) {
        setShowPreview(false);
      } else if (configContext.hasUnsavedChanges) {
        // Show confirmation dialog
        const confirm = window.confirm('You have unsaved changes. Discard them?');
        if (confirm) {
          handleDiscardChanges();
          onExit?.();
        }
      } else {
        onExit?.();
      }
    } else if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          if (configContext.hasUnsavedChanges) {
            handleSaveConfiguration();
          }
          break;
        case 'p':
          event.preventDefault();
          setShowPreview(!showPreview);
          break;
      }
    }
  };

  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        padding: '16px',
        fontFamily: 'monospace',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4'
      }}
      onKeyDown={handleKeyPress}
      tabIndex={0}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#569cd6' }}>
          <Text>AI Code Configuration Manager</Text>
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#808080' }}>
            <Text>
              {initializationError ? `Init Error: ${initializationError}` :
               configContext.isLoading ? 'Loading...' : 
               configContext.hasUnsavedChanges ? 'Unsaved changes' : 
               coreConfigManager ? 'Connected to core config system' : 'Initializing...'}
            </Text>
          </div>
          <div style={{ fontSize: '12px', color: '#808080' }}>
            <Text>Ctrl+S: Save | Ctrl+P: Preview | Esc: Exit</Text>
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {configContext.validationErrors.length > 0 && (
        <div style={{ 
          marginBottom: '16px', 
          padding: '8px', 
          backgroundColor: '#3c1e1e', 
          border: '1px solid #f44747',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#f44747' }}><Text>Configuration Issues</Text></h3>
          {configContext.validationErrors.map((error, index) => (
            <div key={index} style={{ 
              fontSize: '12px', 
              color: error.severity === 'error' ? '#f44747' : 
                     error.severity === 'warning' ? '#ffcc02' : '#4fc1ff',
              marginBottom: '4px' 
            }}>
              <Text>[{error.severity.toUpperCase()}] {error.field}: {error.message}</Text>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, gap: '16px' }}>
        {/* Tab Navigation */}
        <div style={{ width: '200px', flexShrink: 0 }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '4px',
                backgroundColor: activeTab === tab.id ? '#264f78' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : '#cccccc',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                textAlign: 'left'
              }}
            >
              <Text>{tab.label}</Text>
            </button>
          ))}
          
          {/* Action Buttons */}
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={handleSaveConfiguration}
              disabled={!configContext.hasUnsavedChanges || configContext.isLoading}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '8px',
                backgroundColor: configContext.hasUnsavedChanges ? '#0e639c' : '#3c3c3c',
                color: configContext.hasUnsavedChanges ? '#ffffff' : '#808080',
                border: 'none',
                borderRadius: '4px',
                cursor: configContext.hasUnsavedChanges ? 'pointer' : 'not-allowed',
                fontSize: '12px'
              }}
            >
              <Text>Save Configuration</Text>
            </button>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              disabled={previewChanges.length === 0}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                marginBottom: '8px',
                backgroundColor: showPreview ? '#264f78' : 'transparent',
                color: previewChanges.length > 0 ? '#cccccc' : '#808080',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                cursor: previewChanges.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '12px'
              }}
            >
              <Text>Preview Changes ({previewChanges.length})</Text>
            </button>
            
            <button
              onClick={handleDiscardChanges}
              disabled={!configContext.hasUnsavedChanges}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: configContext.hasUnsavedChanges ? '#f44747' : '#808080',
                border: '1px solid #3c3c3c',
                borderRadius: '4px',
                cursor: configContext.hasUnsavedChanges ? 'pointer' : 'not-allowed',
                fontSize: '12px'
              }}
            >
              <Text>Discard Changes</Text>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {tabs.map(tab => (
            <TabPanel key={tab.id} value={activeTab} index={tab.id}>
              <tab.component />
            </TabPanel>
          ))}
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div style={{ 
            width: '300px', 
            flexShrink: 0,
            backgroundColor: '#252526',
            border: '1px solid #3c3c3c',
            borderRadius: '4px',
            padding: '16px'
          }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#569cd6' }}><Text>Configuration Preview</Text></h3>
            <ConfigurationPreview changes={previewChanges} context={configContext} />
          </div>
        )}
      </div>
    </div>
  );
};

// Configuration panels using the specialized components
const AgentConfigurationPanel: React.FC<{ 
  context: ConfigurationContext; 
  onChange: (changes: ConfigurationChange[]) => void; 
}> = ({ context, onChange }) => {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentConfigs, setAgentConfigs] = useState<any[]>(context.resolvedConfig?.agents || []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#569cd6', margin: 0 }}><Text>Agent Configuration</Text></h2>
        <button
          onClick={() => setSelectedAgent('new')}
          style={{
            padding: '6px 12px',
            backgroundColor: '#0e639c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          <Text>Add Agent</Text>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '16px', height: '500px' }}>
        {/* Agent List */}
        <div style={{ 
          backgroundColor: '#252526', 
          border: '1px solid #3c3c3c', 
          borderRadius: '4px',
          padding: '8px',
          overflow: 'auto'
        }}>
          <h3 style={{ color: '#569cd6', margin: '0 0 8px 0', fontSize: '12px' }}><Text>Agents</Text></h3>
          {agentConfigs.map((agent, index) => (
            <div
              key={agent.id || index}
              onClick={() => setSelectedAgent(agent.id || index.toString())}
              style={{
                padding: '6px',
                marginBottom: '4px',
                backgroundColor: selectedAgent === (agent.id || index.toString()) ? '#264f78' : 'transparent',
                border: '1px solid #3c3c3c',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              <div style={{ color: '#569cd6', fontWeight: 'bold' }}><Text>{agent.name || agent.id}</Text></div>
              <div style={{ color: '#808080' }}><Text>{agent.description}</Text></div>
            </div>
          ))}
        </div>

        {/* Agent Editor */}
        <div style={{ overflow: 'hidden' }}>
          {selectedAgent ? (
            <AgentConfigEditor
              configFile={selectedAgent === 'new' ? undefined : {
                id: selectedAgent,
                name: agentConfigs.find(a => a.id === selectedAgent)?.name || 'Agent',
                description: agentConfigs.find(a => a.id === selectedAgent)?.description || '',
                filePath: `.ai-code/agents/${selectedAgent}.agent.ts`,
                content: generateAgentFileContent(agentConfigs.find(a => a.id === selectedAgent)),
                lastModified: new Date(),
                isValid: true
              }}
              onChange={onChange}
              onSave={(content) => {
                // Handle saving agent configuration
                console.log('Saving agent:', content);
              }}
            />
          ) : (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center', 
              color: '#808080',
              backgroundColor: '#252526',
              border: '1px solid #3c3c3c',
              borderRadius: '4px'
            }}>
              <Text>Select an agent to edit or create a new one</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ModelConfigurationPanel: React.FC<{ 
  context: ConfigurationContext; 
  onChange: (changes: ConfigurationChange[]) => void; 
}> = ({ context, onChange }) => {
  const [modelConfig, setModelConfig] = useState(context.resolvedConfig?.modelSelection || {});

  const updateModelConfig = (field: string, value: any) => {
    const newConfig = { ...modelConfig, [field]: value };
    setModelConfig(newConfig);
    
    const change: ConfigurationChange = {
      id: `model-${field}-${Date.now()}`,
      type: 'model',
      action: 'update',
      path: `modelSelection.${field}`,
      oldValue: modelConfig[field],
      newValue: value,
      timestamp: new Date(),
      impact: `Updated model ${field}`
    };
    onChange([change]);
  };

  return (
    <div>
      <h2 style={{ color: '#569cd6', marginBottom: '16px' }}><Text>Model Selection Configuration</Text></h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <h3 style={{ color: '#569cd6', marginBottom: '12px', fontSize: '14px' }}><Text>Default Model</Text></h3>
          <select
            value={modelConfig.defaultModel || ''}
            onChange={(e) => updateModelConfig('defaultModel', e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              backgroundColor: '#3c3c3c',
              color: '#d4d4d4',
              border: '1px solid #5a5a5a',
              borderRadius: '3px',
              fontSize: '12px'
            }}
          >
            <option value="claude-3-5-sonnet"><Text>Claude 3.5 Sonnet</Text></option>
            <option value="claude-3-haiku"><Text>Claude 3 Haiku</Text></option>
            <option value="claude-3-opus"><Text>Claude 3 Opus</Text></option>
            <option value="gpt-4"><Text>GPT-4</Text></option>
            <option value="gpt-3.5-turbo"><Text>GPT-3.5 Turbo</Text></option>
          </select>
        </div>

        <div>
          <h3 style={{ color: '#569cd6', marginBottom: '12px', fontSize: '14px' }}><Text>Selection Strategy</Text></h3>
          <select
            value={modelConfig.selectionStrategy || 'balanced'}
            onChange={(e) => updateModelConfig('selectionStrategy', e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              backgroundColor: '#3c3c3c',
              color: '#d4d4d4',
              border: '1px solid #5a5a5a',
              borderRadius: '3px',
              fontSize: '12px'
            }}
          >
            <option value="cost-optimized"><Text>Cost Optimized</Text></option>
            <option value="performance-optimized"><Text>Performance Optimized</Text></option>
            <option value="balanced"><Text>Balanced</Text></option>
            <option value="custom"><Text>Custom</Text></option>
          </select>
        </div>
      </div>

      {/* Auto Mode Configuration */}
      <div style={{ marginTop: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <input
            type="checkbox"
            checked={modelConfig.autoMode?.enabled || false}
            onChange={(e) => updateModelConfig('autoMode', { 
              ...modelConfig.autoMode, 
              enabled: e.target.checked 
            })}
            style={{ marginRight: '8px' }}
          />
          <span style={{ color: '#cccccc', fontSize: '14px' }}><Text>Enable Auto Mode</Text></span>
        </label>

        {modelConfig.autoMode?.enabled && (
          <div style={{ 
            padding: '12px', 
            backgroundColor: '#252526', 
            border: '1px solid #3c3c3c', 
            borderRadius: '4px' 
          }}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#cccccc' }}>
                <Text>Cost Threshold (USD per request)</Text>
              </label>
              <input
                type="number"
                step="0.01"
                value={modelConfig.autoMode?.costThreshold || 0.05}
                onChange={(e) => updateModelConfig('autoMode', {
                  ...modelConfig.autoMode,
                  costThreshold: parseFloat(e.target.value)
                })}
                style={{
                  width: '200px',
                  padding: '6px',
                  backgroundColor: '#3c3c3c',
                  color: '#d4d4d4',
                  border: '1px solid #5a5a5a',
                  borderRadius: '3px',
                  fontSize: '12px'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CredentialsPanel: React.FC<{ 
  context: ConfigurationContext; 
  onChange: (changes: ConfigurationChange[]) => void; 
}> = ({ context, onChange }) => (
  <CredentialManager
    context={context}
    onChange={onChange}
  />
);

const SecurityPanel: React.FC<{ 
  context: ConfigurationContext; 
  onChange: (changes: ConfigurationChange[]) => void; 
}> = ({ context, onChange }) => (
  <div>
    <h2 style={{ color: '#569cd6', marginBottom: '16px' }}><Text>Security & Access Patterns</Text></h2>
    
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div>
        <h3 style={{ color: '#569cd6', marginBottom: '12px', fontSize: '14px' }}><Text>Default Permissions</Text></h3>
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={context.resolvedConfig?.defaultPermissions?.requireExplicitToolGrants || false}
            onChange={(e) => {
              const change: ConfigurationChange = {
                id: `security-permissions-${Date.now()}`,
                type: 'setting',
                action: 'update',
                path: 'defaultPermissions.requireExplicitToolGrants',
                oldValue: context.resolvedConfig?.defaultPermissions?.requireExplicitToolGrants,
                newValue: e.target.checked,
                timestamp: new Date(),
                impact: 'Updated tool grant requirements'
              };
              onChange([change]);
            }}
            style={{ marginRight: '8px' }}
          />
          <span style={{ color: '#cccccc', fontSize: '12px' }}><Text>Require Explicit Tool Grants</Text></span>
        </label>
      </div>

      <div>
        <h3 style={{ color: '#569cd6', marginBottom: '12px', fontSize: '14px' }}><Text>Access Patterns</Text></h3>
        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <input
            type="checkbox"
            checked={context.resolvedConfig?.accessPatterns?.enabled || false}
            onChange={(e) => {
              const change: ConfigurationChange = {
                id: `security-access-${Date.now()}`,
                type: 'setting',
                action: 'update',
                path: 'accessPatterns.enabled',
                oldValue: context.resolvedConfig?.accessPatterns?.enabled,
                newValue: e.target.checked,
                timestamp: new Date(),
                impact: 'Updated access pattern enforcement'
              };
              onChange([change]);
            }}
            style={{ marginRight: '8px' }}
          />
          <span style={{ color: '#cccccc', fontSize: '12px' }}><Text>Enable Access Pattern Validation</Text></span>
        </label>
      </div>
    </div>

    {/* Real-time Configuration Validation */}
    <div style={{ marginTop: '24px' }}>
      <ConfigurationValidator
        context={context}
        realTime={true}
        showSuggestions={true}
      />
    </div>
  </div>
);

const ImportExportPanel: React.FC<{ 
  context: ConfigurationContext; 
  onChange?: (changes: ConfigurationChange[]) => void; 
}> = ({ context, onChange }) => (
  <ConfigurationImportExport
    context={context}
    onChange={onChange}
  />
);

// Helper function to generate agent file content
function generateAgentFileContent(agent: any): string {
  if (!agent) return '';
  
  return `import { AgentCapability } from '@ai-code/core';
import { CommonTools } from '@ai-code/tools';

export const ${agent.id?.replace(/-/g, '_') || 'agent'}: AgentCapability = {
  id: '${agent.id || ''}',
  name: '${agent.name || ''}',
  description: '${agent.description || ''}',
  
  tools: [
    // Tools configuration
    ...CommonTools.createBasicTools()
  ],
  
  endpoints: [
    { name: 'question', description: 'Answer questions' },
    { name: 'handle', description: 'Handle operations' }
  ]
};`;
}

// Utility functions
function applyChanges(config: any, changes: ConfigurationChange[]): any {
  let result = { ...config };
  
  for (const change of changes) {
    const pathParts = change.path.split('.');
    let target = result;
    
    // Navigate to the parent object
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!target[pathParts[i]]) {
        target[pathParts[i]] = {};
      }
      target = target[pathParts[i]];
    }
    
    const finalKey = pathParts[pathParts.length - 1];
    
    switch (change.action) {
      case 'create':
      case 'update':
        target[finalKey] = change.newValue;
        break;
      case 'delete':
        delete target[finalKey];
        break;
    }
  }
  
  return result;
}