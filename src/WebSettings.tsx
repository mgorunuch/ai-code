import React, { useState, useEffect } from 'react';
import { Provider } from './types';

// Mock storage for web demo - in production, use localStorage or secure storage
const webApiKeyStorage = {
  getApiKey: (providerId: string): string | undefined => {
    return localStorage.getItem(`apiKey_${providerId}`) || undefined;
  },
  setApiKey: (providerId: string, apiKey: string): void => {
    localStorage.setItem(`apiKey_${providerId}`, apiKey);
  },
  removeApiKey: (providerId: string): void => {
    localStorage.removeItem(`apiKey_${providerId}`);
  }
};

export const WebSettings: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([
    { id: 'openai', name: 'OpenAI' },
    { id: 'anthropic', name: 'Anthropic' }
  ]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    // Load existing API keys
    const updatedProviders = providers.map(provider => ({
      ...provider,
      apiKey: webApiKeyStorage.getApiKey(provider.id)
    }));
    setProviders(updatedProviders);
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleSelectProvider = (provider: Provider) => {
    setSelectedProvider(provider);
    setApiKeyInput(provider.apiKey || '');
    setShowKey(false);
  };

  const handleSave = () => {
    if (selectedProvider && apiKeyInput.trim()) {
      webApiKeyStorage.setApiKey(selectedProvider.id, apiKeyInput.trim());
      
      setProviders(providers.map(p => 
        p.id === selectedProvider.id 
          ? { ...p, apiKey: apiKeyInput.trim() } 
          : p
      ));

      setMessage({
        text: `API key saved for ${selectedProvider.name}!`,
        type: 'success'
      });
      
      setSelectedProvider(null);
      setApiKeyInput('');
    }
  };

  const handleCancel = () => {
    setSelectedProvider(null);
    setApiKeyInput('');
    setShowKey(false);
  };

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1e40af',
      marginBottom: '20px'
    },
    providerList: {
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    providerItem: {
      padding: '16px',
      borderBottom: '1px solid #e5e7eb',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#fff',
      transition: 'background-color 0.2s'
    },
    providerItemHover: {
      backgroundColor: '#f3f4f6'
    },
    providerName: {
      fontWeight: '500',
      fontSize: '16px'
    },
    configured: {
      color: '#10b981',
      fontSize: '14px'
    },
    modal: {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: '#fff',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      width: '90%',
      maxWidth: '400px'
    },
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      marginBottom: '16px'
    },
    buttonContainer: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    },
    button: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'opacity 0.2s'
    },
    saveButton: {
      backgroundColor: '#3b82f6',
      color: '#fff'
    },
    cancelButton: {
      backgroundColor: '#e5e7eb',
      color: '#374151'
    },
    message: {
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '16px',
      fontSize: '14px'
    },
    successMessage: {
      backgroundColor: '#d1fae5',
      color: '#065f46'
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#991b1b'
    },
    infoMessage: {
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>API Key Settings</h1>
      
      {message && (
        <div 
          style={{
            ...styles.message,
            ...(message.type === 'success' ? styles.successMessage : 
               message.type === 'error' ? styles.errorMessage : 
               styles.infoMessage)
          }}
        >
          {message.text}
        </div>
      )}

      <div style={styles.providerList}>
        {providers.map((provider, index) => (
          <div
            key={provider.id}
            style={styles.providerItem}
            onClick={() => handleSelectProvider(provider)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = styles.providerItemHover.backgroundColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = styles.providerItem.backgroundColor;
            }}
          >
            <span style={styles.providerName}>{provider.name}</span>
            {provider.apiKey && (
              <span style={styles.configured}>✓ Configured</span>
            )}
          </div>
        ))}
      </div>

      {selectedProvider && (
        <div style={styles.overlay} onClick={handleCancel}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '16px' }}>
              Configure {selectedProvider.name} API Key
            </h2>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                API Key:
              </label>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your API key"
                style={styles.input}
                autoFocus
              />
              
              <label style={{ fontSize: '14px', marginBottom: '16px', display: 'block' }}>
                <input
                  type="checkbox"
                  checked={showKey}
                  onChange={(e) => setShowKey(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Show API key
              </label>
            </div>

            <div style={styles.buttonContainer}>
              <button
                style={{ ...styles.button, ...styles.cancelButton }}
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.button, ...styles.saveButton }}
                onClick={handleSave}
                disabled={!apiKeyInput.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};