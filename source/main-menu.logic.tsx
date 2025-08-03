import { useState } from 'react';
import { useInput, useApp } from 'ink';

export interface MenuItem {
	id: string;
	label: string;
	action: () => void;
}

export interface MainMenuProps {
	onStartApp: () => void;
	onOpenSettings: () => void;
	onShowHelp: () => void;
	onOpenAgents?: () => void;
}

export interface MainMenuState {
	selectedIndex: number;
	menuItems: MenuItem[];
}

export interface MainMenuActions {
	// No additional actions needed - useInput handles interactions directly
}

export const useMainMenuLogic = ({
	onStartApp,
	onOpenSettings,
	onShowHelp,
	onOpenAgents
}: MainMenuProps): MainMenuState & MainMenuActions => {
	const { exit } = useApp();
	const [selectedIndex, setSelectedIndex] = useState(0);

	const menuItems: MenuItem[] = [
		{
			id: 'start',
			label: 'Start/Enter Main App',
			action: onStartApp
		},
		{
			id: 'agents',
			label: 'Agent Dashboard',
			action: onOpenAgents || (() => {})
		},
		{
			id: 'settings',
			label: 'Settings (API Keys)',
			action: onOpenSettings
		},
		{
			id: 'help',
			label: 'Help/About',
			action: onShowHelp
		},
		{
			id: 'exit',
			label: 'Exit',
			action: () => exit()
		}
	].filter((item) => item.id !== 'agents' || onOpenAgents); // Hide agents if no handler

	useInput((_input, key) => {
		if (key.upArrow) {
			setSelectedIndex(
				(prev) => (prev - 1 + menuItems.length) % menuItems.length
			);
		} else if (key.downArrow) {
			setSelectedIndex((prev) => (prev + 1) % menuItems.length);
		} else if (key.return) {
			menuItems[selectedIndex]?.action();
		} else if (key.escape) {
			exit();
		}
	});

	return {
		selectedIndex,
		menuItems
	};
};