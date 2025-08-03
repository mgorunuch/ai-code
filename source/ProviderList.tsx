import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Provider } from './types';

interface ProviderListProps {
	providers: Provider[];
	onSelectProvider: (provider: Provider) => void;
	onExit?: () => void;
}

export const ProviderList: React.FC<ProviderListProps> = ({
	providers,
	onSelectProvider,
	onExit
}) => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	useInput((_input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(Math.min(providers.length - 1, selectedIndex + 1));
		}

		if (key.return) {
			const provider = providers[selectedIndex];
			if (provider) {
				onSelectProvider(provider);
			}
		}

		if (key.escape && onExit) {
			onExit();
		}
	});

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
