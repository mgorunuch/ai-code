import { useState } from 'react';
import { useInput } from 'ink';

export type DashboardView =
	| 'overview'
	| 'agents'
	| 'operations'
	| 'messages'
	| 'models'
	| 'config'
	| 'interact';

export interface AgentDashboardState {
	currentView: DashboardView;
	showInteractionPanel: boolean;
	showConfigurationManager: boolean;
}

export interface AgentDashboardActions {
	setCurrentView: (view: DashboardView) => void;
	setShowInteractionPanel: (show: boolean) => void;
	setShowConfigurationManager: (show: boolean) => void;
}

export interface UseAgentDashboardLogicProps {
	onBack?: () => void;
	showConfiguration?: boolean;
}

export const useAgentDashboardLogic = ({
	onBack,
	showConfiguration = false
}: UseAgentDashboardLogicProps) => {
	const [currentView, setCurrentView] = useState<DashboardView>(
		showConfiguration ? 'config' : 'overview'
	);
	const [showInteractionPanel, setShowInteractionPanel] = useState(false);
	const [showConfigurationManager, setShowConfigurationManager] =
		useState(showConfiguration);

	useInput((input, key) => {
		if (key.escape) {
			if (showConfigurationManager) {
				setShowConfigurationManager(false);
			} else if (showInteractionPanel) {
				setShowInteractionPanel(false);
			} else if (onBack) {
				onBack();
			}
		}

		if (!showInteractionPanel && !showConfigurationManager) {
			switch (input) {
				case '1':
					setCurrentView('overview');
					break;
				case '2':
					setCurrentView('agents');
					break;
				case '3':
					setCurrentView('operations');
					break;
				case '4':
					setCurrentView('messages');
					break;
				case '5':
					setCurrentView('models');
					break;
				case '6':
					setCurrentView('config');
					setShowConfigurationManager(true);
					break;
				case 'i':
					setShowInteractionPanel(true);
					break;
				case 'c':
					setShowConfigurationManager(true);
					break;
				case 'q':
					if (onBack) onBack();
					break;
			}
		}
	});

	const state: AgentDashboardState = {
		currentView,
		showInteractionPanel,
		showConfigurationManager
	};

	const actions: AgentDashboardActions = {
		setCurrentView,
		setShowInteractionPanel,
		setShowConfigurationManager
	};

	return { state, actions };
};