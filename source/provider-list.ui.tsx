import React from 'react';
import { Box, Text } from 'ink';
import { useProviderListLogic, ProviderListProps } from './provider-list.logic';

export const ProviderList: React.FC<ProviderListProps> = (props) => {
	const { providers, onExit } = props;
	const { selectedIndex } = useProviderListLogic(props);

	return (
		<Box flexDirection="column">
			<Text color="cyan" bold>
				API Key Settings
			</Text>
			<Box marginBottom={1}>
				<Text dimColor>Select a provider to configure:</Text>
			</Box>

			{providers.map((provider, index) => {
				const isSelected = index === selectedIndex;
				const hasApiKey = !!provider.apiKey;

				return (
					<Box key={provider.id} marginLeft={2}>
						<Text color={isSelected ? 'green' : 'white'}>
							{isSelected ? '❯ ' : '  '}
							{provider.name}
						</Text>
						{hasApiKey && (
							<Text color="green" dimColor>
								{' '}
								✓ Configured
							</Text>
						)}
					</Box>
				);
			})}

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>
					Use <Text color="blue">↑↓</Text> to navigate
				</Text>
				<Text dimColor>
					Press <Text color="green">Enter</Text> to select
				</Text>
				{onExit && (
					<Text dimColor>
						Press <Text color="red">Escape</Text> to exit
					</Text>
				)}
			</Box>
		</Box>
	);
};