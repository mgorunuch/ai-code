import React from 'react';
import { Box, Text } from 'ink';
import { AgentStatusDisplay, AgentSummary } from './AgentStatusDisplay.js';
import { MessageQueue, QuestionQueue } from './MessageQueue.js';
import { OperationMonitor, OperationStats } from './OperationMonitor.js';
import { QuickActions } from './AgentInteractionPanel.js';
import {
	ModelSelectionDisplay,
	ModelConfigDisplay
} from './ModelSelectionDisplay.js';
import type { DashboardView } from './agent-dashboard.logic.js';

export interface DashboardHeaderProps {
	currentView: DashboardView;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
	currentView
}) => (
	<Box
		flexDirection="column"
		borderStyle="double"
		borderColor="cyan"
		padding={1}
	>
		<Box flexDirection="row" justifyContent="space-between">
			<Text color="cyan" bold>
				Agent Orchestration Dashboard
			</Text>
			<AgentSummary />
		</Box>

		<Box flexDirection="row" gap={1} marginTop={1}>
			<NavButton label="1:Overview" active={currentView === 'overview'} />
			<NavButton label="2:Agents" active={currentView === 'agents'} />
			<NavButton label="3:Operations" active={currentView === 'operations'} />
			<NavButton label="4:Messages" active={currentView === 'messages'} />
			<NavButton label="5:Models" active={currentView === 'models'} />
			<NavButton label="6:Config" active={currentView === 'config'} />
		</Box>
	</Box>
);

export interface NavButtonProps {
	label: string;
	active: boolean;
}

export const NavButton: React.FC<NavButtonProps> = ({ label, active }) => (
	<Text color={active ? 'cyan' : 'gray'} bold={active}>
		[{label}]
	</Text>
);

export interface DashboardContentProps {
	currentView: DashboardView;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
	currentView
}) => {
	switch (currentView) {
		case 'overview':
			return <OverviewView />;
		case 'agents':
			return <AgentsView />;
		case 'operations':
			return <OperationsView />;
		case 'messages':
			return <MessagesView />;
		case 'models':
			return <ModelsView />;
		case 'config':
			return <ConfigView />;
		default:
			return <OverviewView />;
	}
};

export const OverviewView: React.FC = () => (
	<Box flexDirection="column" flexGrow={1} padding={1}>
		<Text color="yellow" bold>
			System Overview
		</Text>

		<Box flexDirection="row" gap={2} marginTop={1}>
			<Box flexDirection="column" flexGrow={1}>
				<AgentStatusDisplay compact maxAgents={5} />
				<Box marginTop={1}>
					<OperationStats showDetailed />
				</Box>
			</Box>

			<Box flexDirection="column" flexGrow={1}>
				<ModelConfigDisplay />
				<Box marginTop={1}>
					<MessageQueue maxMessages={8} showTimestamp={false} />
				</Box>
			</Box>
		</Box>

		<Box marginTop={1}>
			<QuickActions onQuestionClick={() => {}} onOperationClick={() => {}} />
		</Box>
	</Box>
);

export const AgentsView: React.FC = () => (
	<Box flexDirection="column" flexGrow={1} padding={1}>
		<AgentStatusDisplay showTools maxAgents={15} />
	</Box>
);

export const OperationsView: React.FC = () => (
	<Box flexDirection="column" flexGrow={1} padding={1}>
		<OperationMonitor maxOperations={20} showCompleted />
	</Box>
);

export const MessagesView: React.FC = () => (
	<Box flexDirection="row" gap={2} flexGrow={1} padding={1}>
		<Box flexDirection="column" flexGrow={1}>
			<MessageQueue maxMessages={15} showTimestamp autoScroll />
		</Box>
		<Box flexDirection="column" flexGrow={1}>
			<QuestionQueue maxQuestions={10} showAnswers />
		</Box>
	</Box>
);

export const ModelsView: React.FC = () => (
	<Box flexDirection="row" gap={2} flexGrow={1} padding={1}>
		<Box flexDirection="column" flexGrow={1}>
			<ModelSelectionDisplay maxSelections={15} showDetails showStats />
		</Box>
		<Box flexDirection="column" width={30}>
			<ModelConfigDisplay />
		</Box>
	</Box>
);

export const ConfigView: React.FC = () => (
	<Box flexDirection="column" flexGrow={1} padding={1}>
		<Text color="yellow" bold>
			Configuration Management
		</Text>
		<Box marginTop={1}>
			<Text>Press 'C' to open the Configuration Manager</Text>
		</Box>
		<Box marginTop={1}>
			<Text dimColor>The Configuration Manager provides:</Text>
		</Box>
		<Box flexDirection="column" marginTop={1} marginLeft={2}>
			<Text dimColor>
				• Agent configuration editing with TypeScript support
			</Text>
			<Text dimColor>• Secure credential management</Text>
			<Text dimColor>• Real-time validation and error checking</Text>
			<Text dimColor>• Configuration import/export</Text>
			<Text dimColor>• Live preview of changes</Text>
		</Box>
	</Box>
);

export const DashboardFooter: React.FC = () => (
	<Box
		flexDirection="row"
		justifyContent="space-between"
		borderStyle="single"
		borderColor="gray"
		padding={1}
	>
		<Box flexDirection="row" gap={2}>
			<Text dimColor>1-6: Switch Views</Text>
			<Text dimColor>C: Config</Text>
			<Text dimColor>I: Interact</Text>
			<Text dimColor>Q: Quit</Text>
			<Text dimColor>ESC: Back</Text>
		</Box>

		<Box flexDirection="row" gap={1}>
			<Text dimColor>Agent Communication Dashboard v1.0</Text>
		</Box>
	</Box>
);