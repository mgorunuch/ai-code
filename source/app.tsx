import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { Settings } from './Settings';
import { MainMenu } from './MainMenu';
import { Help } from './Help';
import { AgentDashboard, AgentCommunicationWidget } from './AgentDashboard';
import { MasterPasswordPrompt } from './MasterPasswordPrompt';

type Props = {
	name: string | undefined;
};

enum AppState {
	Auth = 'auth',
	Menu = 'menu',
	App = 'app',
	Settings = 'settings',
	Help = 'help',
	Agents = 'agents'
}

export default function App({ name = 'Stranger' }: Props) {
	const [appState, setAppState] = useState<AppState>(AppState.Auth);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [shouldExit, setShouldExit] = useState(false);
	const { exit } = useApp();

	useInput((input, key) => {
		// Global escape to return to menu from any state (except auth, which handles its own exit)
		if (
			key.escape &&
			appState !== AppState.Menu &&
			appState !== AppState.Auth
		) {
			setAppState(AppState.Menu);
		}

		// Quick settings access from main app
		if (appState === AppState.App && input === 's') {
			setAppState(AppState.Settings);
		}
	});

	const handleAuthenticated = () => {
		setIsAuthenticated(true);
		setAppState(AppState.Menu);
	};

	const handleExitApp = () => {
		setShouldExit(true);
	};

	// Handle exit using useEffect to avoid calling exit during render
	useEffect(() => {
		if (shouldExit) {
			exit();
		}
	}, [shouldExit, exit]);

	const handleStartApp = () => setAppState(AppState.App);
	const handleOpenSettings = () => setAppState(AppState.Settings);
	const handleShowHelp = () => setAppState(AppState.Help);
	const handleOpenAgents = () => setAppState(AppState.Agents);
	const handleBackToMenu = () => setAppState(AppState.Menu);

	// Always show authentication prompt if not authenticated
	if (!isAuthenticated) {
		return (
			<MasterPasswordPrompt
				onAuthenticated={handleAuthenticated}
				onExit={handleExitApp}
			/>
		);
	}

	// Only render authenticated app states when user is authenticated
	switch (appState) {
		case AppState.Auth:
		case AppState.Menu:
			return (
				<MainMenu
					onStartApp={handleStartApp}
					onOpenSettings={handleOpenSettings}
					onShowHelp={handleShowHelp}
					onOpenAgents={handleOpenAgents}
				/>
			);

		case AppState.Settings:
			return (
				<Box flexDirection="column">
					<Text bold color="cyan">
						Settings Menu
					</Text>
					<Text dimColor>Press ESC to return to main menu</Text>
					<Box marginTop={1}>
						<Settings onExit={handleBackToMenu} />
					</Box>
				</Box>
			);

		case AppState.Help:
			return <Help onBack={handleBackToMenu} />;

		case AppState.Agents:
			return <AgentDashboard onBack={handleBackToMenu} />;

		case AppState.App:
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

		default:
			return null;
	}
}
