import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { ConfigurationManager as CoreConfigurationManager } from './core/configuration-manager.js';
import { CredentialManager as CoreCredentialManager } from './core/credential-manager.js';

interface ConfigurationManagerInkProps {
  onExit?: () => void;
  baseDir?: string;
  autoSave?: boolean;
}

export const ConfigurationManagerInk: React.FC<ConfigurationManagerInkProps> = ({
  onExit,
  baseDir = process.cwd(),
  autoSave = false
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [configManager, setConfigManager] = useState<CoreConfigurationManager | null>(null);
  const [credentialManager, setCredentialManager] = useState<CoreCredentialManager | null>(null);

  const tabs = [
    { id: 'agents', label: 'Agents' },
    { id: 'models', label: 'Model Selection' },
    { id: 'credentials', label: 'Credentials' },
    { id: 'security', label: 'Security' },
    { id: 'import-export', label: 'Import/Export' }
  ];

  useEffect(() => {
    const initializeManagers = async () => {
      try {
        setStatus('Loading configuration system...');
        
        const cm = new CoreConfigurationManager(baseDir);
        await cm.initialize();
        setConfigManager(cm);

        const credPath = cm.getCredentialPath();
        const cred = new CoreCredentialManager({ 
          storagePath: credPath,
          encryption: { algorithm: 'aes-256-gcm' }
        });
        setCredentialManager(cred);

        setStatus('Configuration system loaded');
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setStatus('Error loading configuration');
      }
    };

    initializeManagers();
  }, [baseDir]);

  useInput((input, key) => {
    if (key.escape && onExit) {
      onExit();
      return;
    }

    if (key.leftArrow && activeTab > 0) {
      setActiveTab(activeTab - 1);
    } else if (key.rightArrow && activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1);
    }

    // Number keys for direct tab access
    const num = parseInt(input);
    if (!isNaN(num) && num >= 1 && num <= tabs.length) {
      setActiveTab(num - 1);
    }
  });

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Header */}
      <Box marginBottom={1} paddingX={2}>
        <Text bold color="cyan">AI Code Configuration Manager</Text>
      </Box>

      {/* Status Bar */}
      <Box marginBottom={1} paddingX={2}>
        <Text color={error ? 'red' : 'gray'}>
          {error ? `Error: ${error}` : status}
        </Text>
      </Box>

      {/* Tab Navigation */}
      <Box marginBottom={1} paddingX={2}>
        {tabs.map((tab, index) => (
          <Box key={tab.id} marginRight={2}>
            <Text 
              color={activeTab === index ? 'cyan' : 'white'}
              bold={activeTab === index}
            >
              [{index + 1}] {tab.label}
            </Text>
          </Box>
        ))}
      </Box>

      {/* Tab Content */}
      <Box flexGrow={1} paddingX={2} paddingY={1} borderStyle="single" borderColor="gray">
        {activeTab === 0 && (
          <Box flexDirection="column">
            <Text bold color="cyan" marginBottom={1}>Agent Configuration</Text>
            <Text color="gray">
              Configure AI agents and their capabilities.
            </Text>
            <Box marginTop={1}>
              <Text>• Agents are stored in: .ai-code/agents/*.agent.js</Text>
              <Text>• Each agent has tools, endpoints, and access patterns</Text>
              <Text>• Use TypeScript for type-safe configuration</Text>
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          <Box flexDirection="column">
            <Text bold color="cyan" marginBottom={1}>Model Selection</Text>
            <Text color="gray">
              Configure AI model selection and strategies.
            </Text>
            <Box marginTop={1}>
              <Text>• Default model: Claude 3.5 Sonnet</Text>
              <Text>• Selection strategy: Balanced</Text>
              <Text>• Auto-mode: Enabled</Text>
              <Text>• Cost threshold: $0.05 per request</Text>
            </Box>
          </Box>
        )}

        {activeTab === 2 && (
          <Box flexDirection="column">
            <Text bold color="cyan" marginBottom={1}>Credentials</Text>
            <Text color="gray">
              Manage API keys and authentication tokens.
            </Text>
            <Box marginTop={1}>
              <Text color="yellow">⚠️  Credentials are encrypted with AES-256-GCM</Text>
              <Text>• Store API keys securely</Text>
              <Text>• Automatic credential rotation</Text>
              <Text>• Provider-specific management</Text>
            </Box>
          </Box>
        )}

        {activeTab === 3 && (
          <Box flexDirection="column">
            <Text bold color="cyan" marginBottom={1}>Security & Access Patterns</Text>
            <Text color="gray">
              Configure security policies and access controls.
            </Text>
            <Box marginTop={1}>
              <Text>• Require explicit tool grants: Enabled</Text>
              <Text>• Access pattern validation: Enabled</Text>
              <Text>• Security audit logging: Active</Text>
              <Text>• Default permissions: Restrictive</Text>
            </Box>
          </Box>
        )}

        {activeTab === 4 && (
          <Box flexDirection="column">
            <Text bold color="cyan" marginBottom={1}>Import/Export</Text>
            <Text color="gray">
              Import and export configuration presets.
            </Text>
            <Box marginTop={1}>
              <Text>• Export formats: JSON, YAML, TypeScript</Text>
              <Text>• Import with validation</Text>
              <Text>• Configuration presets</Text>
              <Text>• Backup and restore</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Help Footer */}
      <Box paddingX={2} paddingY={1}>
        <Text color="gray">
          Use ← → arrows or number keys to navigate tabs | ESC to exit
        </Text>
      </Box>
    </Box>
  );
};