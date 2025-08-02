import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {Settings} from '../src/Settings.js';
import {MainMenu} from '../src/MainMenu.js';
import {Help} from '../src/Help.js';

type Props = {
	name: string | undefined;
	settings?: boolean;
};

type AppState = 'menu' | 'app' | 'settings' | 'help';

export default function App({name = 'Stranger', settings = false}: Props) {
	const [appState, setAppState] = useState<AppState>(settings ? 'settings' : 'menu');

	useInput((input, key) => {
		// Global escape to return to menu from any state
		if (key.escape && appState !== 'menu') {
			setAppState('menu');
		}
		// Quick settings access from main app
		if (appState === 'app' && input === 's') {
			setAppState('settings');
		}
	});

	const handleStartApp = () => setAppState('app');
	const handleOpenSettings = () => setAppState('settings');
	const handleShowHelp = () => setAppState('help');
	const handleBackToMenu = () => setAppState('menu');

	switch (appState) {
		case 'menu':
			return (
				<MainMenu
					onStartApp={handleStartApp}
					onOpenSettings={handleOpenSettings}
					onShowHelp={handleShowHelp}
				/>
			);

		case 'settings':
			return (
				<Box flexDirection="column">
					<Text bold color="cyan">Settings Menu</Text>
					<Text dimColor>Press ESC to return to main menu</Text>
					<Box marginTop={1}>
						<Settings onExit={handleBackToMenu} />
					</Box>
				</Box>
			);

		case 'help':
			return <Help onBack={handleBackToMenu} />;

		case 'app':
			return (
				<Box flexDirection="column">
					<Text>
						Hello, <Text color="green">{name}</Text>
					</Text>
					<Text>Welcome to the main application!</Text>
					<Box marginTop={1}>
						<Text dimColor>Press 's' to open settings</Text>
						<Text dimColor>Press ESC to return to main menu</Text>
					</Box>
				</Box>
			);

		default:
			return null;
	}
}
