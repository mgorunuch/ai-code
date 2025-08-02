import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ProviderList } from './ProviderList.js';
import { ApiKeyInput } from './ApiKeyInput.js';
import { Provider } from './types.js';
import { apiKeyStorage } from './storage.js';

export interface SettingsProps {
  onExit?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onExit }) => {
  const [providers, setProviders] = useState<Provider[]>([
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' }
  ]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [message, setMessage] = useState<{ text: string; color: string } | null>(null);

  // Load existing API keys on mount
  useEffect(() => {
    const updatedProviders = providers.map(provider => ({
      ...provider,
      apiKey: apiKeyStorage.getApiKey(provider.id)
    }));
    setProviders(updatedProviders);
  }, []);

  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setMessage(null);
  };

  const handleSaveApiKey = (apiKey: string) => {
    if (selectedProvider) {
      apiKeyStorage.setApiKey(selectedProvider.id, apiKey);
      
      // Update the provider list to reflect the new key
      setProviders(providers.map(p => 
        p.id === selectedProvider.id 
          ? { ...p, apiKey } 
          : p
      ));

      setMessage({
        text: `API key saved for ${selectedProvider.name}!`,
        color: 'green'
      });
      
      setSelectedProvider(null);
    }
  };

  const handleCancel = () => {
    setMessage({
      text: 'Cancelled without saving',
      color: 'yellow'
    });
    setSelectedProvider(null);
  };

  const handleExit = () => {
    if (selectedProvider) {
      setSelectedProvider(null);
    } else if (onExit) {
      onExit();
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {!selectedProvider ? (
        <>
          <ProviderList
            providers={providers}
            onSelectProvider={handleSelectProvider}
            onExit={handleExit}
          />
          
          {message && (
            <Box marginTop={1}>
              <Text color={message.color}>{message.text}</Text>
            </Box>
          )}
        </>
      ) : (
        <ApiKeyInput
          provider={selectedProvider}
          currentApiKey={selectedProvider.apiKey}
          onSave={handleSaveApiKey}
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
};