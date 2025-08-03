import React from 'react';
import { Box, Text } from 'ink';
import { Logo } from './logo';

interface NewPasswordScreenProps {
	masterPassword: string;
	isLoading: boolean;
	error: string | null;
}

export const NewPasswordScreen: React.FC<NewPasswordScreenProps> = ({
	masterPassword,
	isLoading,
	error
}) => {
	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Logo />
			</Box>
			
			<Box marginBottom={1}>
				<Text bold color="cyan">
					🔐 Set Up Secure Credential Storage
				</Text>
			</Box>

			{error && (
				<Box marginBottom={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}

			<Box marginBottom={1}>
				<Text>Create Master Password: </Text>
				<Text color="green">
					{masterPassword.replace(/./g, '•') || '(empty)'}
				</Text>
			</Box>

			<Box marginBottom={1} flexDirection="column">
				<Text dimColor>
					Enter a secure master password and press Enter
				</Text>
				<Text dimColor>
					Press Escape to exit the application
				</Text>
			</Box>

			{isLoading && (
				<Box marginTop={1}>
					<Text color="yellow">⏳ Setting up encryption...</Text>
				</Box>
			)}
		</Box>
	);
};
