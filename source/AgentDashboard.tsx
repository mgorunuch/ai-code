import React from 'react';
import { Box } from 'ink';
import { AgentCommunicationProvider } from './AgentCommunicationProvider.js';
import { AgentInteractionPanel } from './AgentInteractionPanel.js';
import { ConfigurationManagerInk } from './ConfigurationManagerInk';
import {
	useAgentDashboardLogic,
	type UseAgentDashboardLogicProps
} from './agent-dashboard.logic.js';
import {
	DashboardHeader,
	DashboardContent,
	DashboardFooter
} from './agent-dashboard.ui.js';
import { useAgentCommunicationWidgetLogic } from './agent-communication-widget.logic.js';
import { AgentCommunicationWidgetUI } from './agent-communication-widget.ui.js';

interface AgentDashboardProps extends UseAgentDashboardLogicProps {}

export const AgentDashboard: React.FC<AgentDashboardProps> = (props) => {
	const { state, actions } = useAgentDashboardLogic(props);

	if (state.showConfigurationManager) {
		return (
			<ConfigurationManagerInk
				onExit={() => actions.setShowConfigurationManager(false)}
				baseDir={process.cwd()}
				autoSave={false}
			/>
		);
	}

	if (state.showInteractionPanel) {
		return (
			<AgentCommunicationProvider autoInit>
				<AgentInteractionPanel onClose={() => actions.setShowInteractionPanel(false)} />
			</AgentCommunicationProvider>
		);
	}

	return (
		<AgentCommunicationProvider autoInit>
			<Box flexDirection="column" height={process.stdout.rows || 40}>
				<DashboardHeader currentView={state.currentView} />
				<DashboardContent currentView={state.currentView} />
				<DashboardFooter />
			</Box>
		</AgentCommunicationProvider>
	);
};


// Standalone component for embedding in existing apps
interface AgentCommunicationWidgetProps {
	compact?: boolean;
	height?: number;
}

export const AgentCommunicationWidget: React.FC<
	AgentCommunicationWidgetProps
> = ({ compact = true, height = 20 }) => {
	const { state } = useAgentCommunicationWidgetLogic();

	return (
		<AgentCommunicationProvider autoInit>
			<AgentCommunicationWidgetUI
				activeTab={state.activeTab}
				height={height}
				compact={compact}
			/>
		</AgentCommunicationProvider>
	);
};
