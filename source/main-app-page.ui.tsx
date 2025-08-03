import React from 'react';
import { Box, Text } from 'ink';
import { AgentCommunicationWidget } from './agent-dashboard.ui';
import { useMainAppPageLogic, MainAppPageProps } from './main-app-page.logic';

export const MainAppPage: React.FC<MainAppPageProps> = (props) => {
	const { name } = props;
	useMainAppPageLogic(props);

	return (
		<Box flexDirection="column">
			<Text>
				Hello, <Text color="green">{name}</Text>
			</Text>
			<Text>Welcome to the main application!</Text>

			<Box marginTop={1}>
				<AgentCommunicationWidget compact height={15} />
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Press 's' to open settings</Text>
				<Text dimColor>Press ESC to return to main menu</Text>
			</Box>
		</Box>
	);
};