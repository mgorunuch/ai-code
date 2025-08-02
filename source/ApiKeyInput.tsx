import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Provider } from './types';

interface ApiKeyInputProps {
  provider: Provider;
  onSave: (apiKey: string) => void;
  onCancel: () => void;
  currentApiKey?: string;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  provider,
  onSave,
  onCancel,
  currentApiKey = ''
}) => {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [showKey, setShowKey] = useState(false);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (apiKey.trim()) {
        onSave(apiKey.trim());
      }
      return;
    }

    if (key.ctrl && input === 's') {
      setShowKey(!showKey);
      return;
    }

    if (key.backspace || key.delete) {
      setApiKey(apiKey.slice(0, -1));
      return;
    }

    // Only allow printable characters
    if (input && !key.ctrl && !key.meta) {
      setApiKey(apiKey + input);
    }
  });

  const displayKey = showKey ? apiKey : apiKey.replace(/./g, '•');

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan" bold>
        Enter API Key for {provider.name}:
      </Text>
      
      <Box marginTop={1}>
        <Text>API Key: </Text>
        <Text color="yellow">{displayKey || '(empty)'}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Press <Text color="green">Enter</Text> to save
        </Text>
        <Text dimColor>
          Press <Text color="red">Escape</Text> to cancel
        </Text>
        <Text dimColor>
          Press <Text color="blue">Ctrl+S</Text> to {showKey ? 'hide' : 'show'} key
        </Text>
      </Box>
    </Box>
  );
};