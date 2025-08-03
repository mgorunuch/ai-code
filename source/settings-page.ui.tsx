import React from 'react';
import { Box, Text } from 'ink';
import { Settings } from './Settings';
import { useSettingsPageLogic, SettingsPageProps } from './settings-page.logic';

export const SettingsPage: React.FC<SettingsPageProps> = (props) => {
	useSettingsPageLogic(props);

	return (
		<Box flexDirection="column">
			<Text bold color="cyan">
				Settings Menu
			</Text>
			<Text dimColor>Press ESC to return to main menu</Text>
			<Box marginTop={1}>
				<Settings />
			</Box>
		</Box>
	);
};