import React from 'react';
import { Box, Text } from 'ink';
import { AgentStatusDisplay } from './AgentStatusDisplay.js';
import { MessageQueue } from './MessageQueue.js';
import { OperationMonitor } from './OperationMonitor.js';
import type { WidgetTab } from './agent-communication-widget.logic.js';

export interface AgentCommunicationWidgetUIProps {
	activeTab: WidgetTab;
	height: number;
	compact: boolean;
}

export const AgentCommunicationWidgetUI: React.FC<AgentCommunicationWidgetUIProps> = ({
	activeTab,
	height,
	compact
}) => (
	<Box
		flexDirection="column"
		height={height}
		borderStyle="single"
		borderColor="cyan"
	>
		<Box flexDirection="row" justifyContent="space-between" padding={1}>
			<Text color="cyan" bold>
				Agent System
			</Text>
			<Box flexDirection="row" gap={1}>
				<Text color={activeTab === 'status' ? 'cyan' : 'gray'}>Status</Text>
				<Text color={activeTab === 'operations' ? 'cyan' : 'gray'}>
					Ops
				</Text>
				<Text color={activeTab === 'messages' ? 'cyan' : 'gray'}>Msgs</Text>
				<Text dimColor>T:Switch</Text>
			</Box>
		</Box>

		<Box flexGrow={1}>
			{activeTab === 'status' && (
				<AgentStatusDisplay compact maxAgents={8} showTools={false} />
			)}
			{activeTab === 'operations' && (
				<OperationMonitor maxOperations={12} showCompleted={false} />
			)}
			{activeTab === 'messages' && (
				<MessageQueue maxMessages={10} showTimestamp={false} autoScroll />
			)}
		</Box>
	</Box>
);