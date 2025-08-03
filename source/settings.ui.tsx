import React from 'react';
import { Box, Text } from 'ink';
import { ProviderList } from './ProviderList';
import { ApiKeyInput } from './ApiKeyInput';
import { useSettingsLogic, SettingsProps } from './settings.logic';

export const Settings: React.FC<SettingsProps> = (props) => {
	const {
		providers,
		selectedProvider,
		message,
		isLoading,
		orchestratorError,
		handleSelectProvider,
		handleSaveApiKey,
		handleCancel,
		handleExit
	} = useSettingsLogic(props);

	return (
		<Box flexDirection="column" padding={1}>
			{/* Loading indicator */}
			{isLoading && (
				<Box marginBottom={1}>
					<Text color="yellow">⏳ Loading...</Text>
				</Box>
			)}

			{/* Orchestrator Error */}
			{orchestratorError && (
				<Box marginBottom={1} flexDirection="column">
					<Text color="red">⚠️ Core system error: {orchestratorError}</Text>
					<Text color="gray">
						Falling back to session storage (non-persistent)
					</Text>
				</Box>
			)}

			{!selectedProvider ? (
				<>
					<Box marginBottom={1} flexDirection="column">
						<Text color="green">✓ Secure credential storage available</Text>
						<Text color="gray">API keys will be encrypted and persistent</Text>
					</Box>

					<ProviderList
						providers={providers}
						onSelectProvider={handleSelectProvider}
						onExit={handleExit}
					/>

					{/* Show storage status for each provider */}
					{providers.some((p) => p.apiKey) && (
						<Box marginTop={1} marginBottom={1}>
							<Text dimColor>Storage status:</Text>
							{providers
								.filter((p) => p.apiKey)
								.map((provider) => (
									<Text key={provider.id} dimColor>
										{provider.name}:{' '}
										{provider.isSecure ? '🔒 Encrypted' : '⚠️  Session only'}
									</Text>
								))}
						</Box>
					)}

					{message && (
						<Box marginTop={1}>
							<Text color={message.color}>{message.text}</Text>
						</Box>
					)}
				</>
			) : (
				<ApiKeyInput
					provider={selectedProvider!}
					currentApiKey={selectedProvider?.apiKey}
					onSave={handleSaveApiKey}
					onCancel={handleCancel}
				/>
			)}
		</Box>
	);
};