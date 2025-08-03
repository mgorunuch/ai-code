import React from 'react';
import { Box, Text, useInput } from 'ink';

interface HelpProps {
	onBack: () => void;
}

export const Help: React.FC<HelpProps> = ({ onBack }) => {
	useInput((input, key) => {
		if (key.escape || input === 'b') {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Text bold color="cyan">
				Help & About
			</Text>
			<Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
				<Box flexDirection="column">
					<Text bold>ai-code CLI</Text>
					<Text>Version: 1.0.0</Text>
					<Box marginTop={1}>
						<Text>A powerful CLI tool for AI-powered code assistance.</Text>
					</Box>

					<Box marginTop={2}>
						<Text bold>Navigation:</Text>
					</Box>
					<Text>• Use ↑↓ arrow keys to navigate menus</Text>
					<Text>• Press Enter to select an option</Text>
					<Text>• Press ESC or 'b' to go back</Text>

					<Box marginTop={2}>
						<Text bold>Features:</Text>
					</Box>
					<Text>• Manage API keys for different AI providers</Text>
					<Text>• Interactive code generation and assistance</Text>
					<Text>• Seamless integration with popular AI services</Text>

					<Box marginTop={2}>
						<Text bold>Getting Started:</Text>
					</Box>
					<Text>1. Configure your API keys in Settings</Text>
					<Text>2. Select "Start/Enter Main App" from the main menu</Text>
					<Text>3. Begin coding with AI assistance!</Text>
				</Box>
			</Box>

			<Box marginTop={2}>
				<Text dimColor>Press ESC or 'b' to return to main menu</Text>
			</Box>
		</Box>
	);
};
