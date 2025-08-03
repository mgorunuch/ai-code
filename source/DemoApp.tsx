import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Settings } from './Settings';

export const App: React.FC = () => {
	const [showSettings, setShowSettings] = useState(false);
	const { exit } = useApp();

	useInput((input, key) => {
		if (!showSettings) {
			if (input === 's') {
				setShowSettings(true);
			} else if (input === 'q' || key.escape) {
				exit();
			}
		}
	});

	const handleExitSettings = () => {
		setShowSettings(false);
	};

	if (showSettings) {
		return <Settings onExit={handleExitSettings} />;
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Text color="cyan" bold>
				Welcome to the API Key Manager Demo
			</Text>

			<Box marginTop={1} flexDirection="column">
				<Text>
					Press <Text color="green">s</Text> to open settings
				</Text>
				<Text>
					Press <Text color="red">q</Text> or <Text color="red">Escape</Text> to
					quit
				</Text>
			</Box>
		</Box>
	);
};
