import React from 'react';
import { Box, Text } from 'ink';
import { MAX_PASSWORD_ATTEMPTS } from './const';

interface EnterPasswordScreenProps {
	masterPassword: string;
	isLoading: boolean;
	error: string | null;
	attemptCount: number;
}

export const EnterPasswordScreen: React.FC<EnterPasswordScreenProps> = ({
	masterPassword,
	isLoading,
	error,
	attemptCount
}) => {
	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					🔓 Unlock Credential Storage
				</Text>
			</Box>

			{error && (
				<Box marginBottom={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}

			<Box marginBottom={1}>
				<Text>Master Password: </Text>
				<Text color="blue">
					{masterPassword.replace(/./g, '•') || '(empty)'}
				</Text>
			</Box>

			{attemptCount > 0 && (
				<Box marginBottom={1}>
					<Text color="orange">
						⚠️  Attempts remaining: {MAX_PASSWORD_ATTEMPTS - attemptCount}
					</Text>
				</Box>
			)}

			<Box marginBottom={1} flexDirection="column">
				<Text dimColor>
					Enter the correct master password and press Enter
				</Text>
				<Text dimColor>
					Press Escape to exit (credentials required for app usage)
				</Text>
			</Box>

			{isLoading && (
				<Box marginTop={1}>
					<Text color="yellow">⏳ Authenticating...</Text>
				</Box>
			)}
		</Box>
	);
};
