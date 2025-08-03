import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { MainMenu } from './main-menu.ui';
import { SettingsPage } from './settings-page.ui';
import { MainAppPage } from './main-app-page.ui';
import { Help } from './help.ui';
import { AgentDashboard } from './agent-dashboard.ui';
import { MasterPasswordPrompt } from './master-password-prompt.ui';
import { OrchestratorProvider } from './orchestrator-provider';

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
	return (
		<OrchestratorProvider>
			<AppContent name={name} />
		</OrchestratorProvider>
	);
}

function AppContent({ name = 'Stranger' }: Props) {
	const [appState, setAppState] = useState<AppState>(AppState.Auth);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [shouldExit, setShouldExit] = useState(false);
	const { exit } = useApp();

	useInput((input, key) => {
		// Global escape to return to menu from any state (except auth and app, which handle their own navigation)
		if (
			key.escape &&
			appState !== AppState.Menu &&
			appState !== AppState.Auth &&
			appState !== AppState.App
		) {
			setAppState(AppState.Menu);
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
			return <SettingsPage onBack={handleBackToMenu} />;

		case AppState.Help:
			return <Help onBack={handleBackToMenu} />;

		case AppState.Agents:
			return <AgentDashboard onBack={handleBackToMenu} />;

		case AppState.App:
			return (
				<MainAppPage
					name={name}
					onOpenSettings={handleOpenSettings}
					onBack={handleBackToMenu}
				/>
			);

		default:
			return null;
	}
}
