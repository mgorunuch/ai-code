import React from 'react';
import { Box, Text } from 'ink';
import { MAX_PASSWORD_ATTEMPTS } from './const';

interface LockedScreenProps {
	error: string | null;
}

export const LockedScreen: React.FC<LockedScreenProps> = ({ error }) => {
	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="red">
					🔒 Access Locked
				</Text>
			</Box>

			<Box marginBottom={1} flexDirection="column">
				<Text color="red">
					❌ Too many failed password attempts ({MAX_PASSWORD_ATTEMPTS})
				</Text>
				<Text color="orange">
					Access to the credential system has been temporarily locked.
				</Text>
			</Box>

			{error && (
				<Box marginBottom={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}

			<Box marginBottom={1} flexDirection="column">
				<Text dimColor>
					🛡️  This security measure protects your encrypted credentials.
				</Text>
				<Text dimColor>
					Please restart the application to try again.
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text dimColor>Press Escape to exit the application</Text>
			</Box>
		</Box>
	);
};