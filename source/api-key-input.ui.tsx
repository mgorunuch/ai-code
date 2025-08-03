import React from 'react';
import { Box, Text } from 'ink';
import { useApiKeyInputLogic, ApiKeyInputProps } from './api-key-input.logic';

export const ApiKeyInput: React.FC<ApiKeyInputProps> = (props) => {
	const { apiKey, showKey, displayKey } = useApiKeyInputLogic(props);

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color="cyan" bold>
				Enter API Key for {props.provider.name}:
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
					Press <Text color="blue">Ctrl+S</Text> to {showKey ? 'hide' : 'show'}{' '}
					key
				</Text>
			</Box>
		</Box>
	);
};