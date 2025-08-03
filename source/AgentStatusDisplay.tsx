import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAgentCommunication } from './AgentCommunicationProvider.js';
import type { AgentCapability, AgentId } from './core/types.js';

interface AgentStatusDisplayProps {
	compact?: boolean;
	showTools?: boolean;
	maxAgents?: number;
}

export const AgentStatusDisplay: React.FC<AgentStatusDisplayProps> = ({
	compact = false,
	showTools = true,
	maxAgents = 10
}) => {
	const { agents, activeOperations, isConnected, stats } =
		useAgentCommunication();
	const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
	const [showDetails, setShowDetails] = useState(false);

	useInput((input, key) => {
		if (key.upArrow && selectedAgentIndex > 0) {
			setSelectedAgentIndex(selectedAgentIndex - 1);
		}
		if (
			key.downArrow &&
			selectedAgentIndex < Math.min(agents.length - 1, maxAgents - 1)
		) {
			setSelectedAgentIndex(selectedAgentIndex + 1);
		}
		if (key.return && agents.length > 0) {
			setShowDetails(!showDetails);
		}
	});

	const getAgentActivityStatus = (
		agent: AgentCapability
	): 'active' | 'idle' | 'busy' => {
		const agentOperations = Array.from(activeOperations.values()).filter(
			(op) => op.requestingAgent === agent.id
		);

		if (agentOperations.length > 0) return 'busy';
		if (isConnected) return 'idle';
		return 'active';
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return 'green';
			case 'busy':
				return 'yellow';
			case 'idle':
				return 'gray';
			default:
				return 'red';
		}
	};

	const displayAgents = agents.slice(0, maxAgents);

	if (!isConnected) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="red"
				padding={1}
			>
				<Text color="red" bold>
					Agent System Disconnected
				</Text>
				<Text dimColor>Initialize the orchestrator to see agent status</Text>
			</Box>
		);
	}

	if (agents.length === 0) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="yellow"
				padding={1}
			>
				<Text color="yellow" bold>
					No Agents Registered
				</Text>
				<Text dimColor>Register agents to see their status here</Text>
			</Box>
		);
	}

	const selectedAgent = displayAgents[selectedAgentIndex];

	if (compact) {
		return (
			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="cyan"
				padding={1}
			>
				<Text color="cyan" bold>
					Agents ({stats.activeAgents})
				</Text>
				<Box flexDirection="row" gap={1}>
					{displayAgents.map((agent, index) => {
						const status = getAgentActivityStatus(agent);
						const isSelected = index === selectedAgentIndex;
						return (
							<Box key={agent.id} flexDirection="row">
								<Text
									color={isSelected ? 'cyan' : getStatusColor(status)}
									bold={isSelected}
								>
									{agent.name}
								</Text>
								<Text color={getStatusColor(status)}>●</Text>
							</Box>
						);
					})}
				</Box>
			</Box>
		);
	}

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			padding={1}
		>
			<Box flexDirection="row" justifyContent="space-between">
				<Text color="cyan" bold>
					Agent Status
				</Text>
				<Text dimColor>↑↓: Navigate • Enter: Details</Text>
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Box
					flexDirection="row"
					justifyContent="space-between"
					marginBottom={1}
				>
					<Text dimColor>Name</Text>
					<Text dimColor>Status</Text>
					<Text dimColor>Tools</Text>
				</Box>

				{displayAgents.map((agent, index) => {
					const status = getAgentActivityStatus(agent);
					const isSelected = index === selectedAgentIndex;

					return (
						<Box
							key={agent.id}
							flexDirection="row"
							justifyContent="space-between"
						>
							<Box width={20}>
								<Text
									color={isSelected ? 'cyan' : 'white'}
									bold={isSelected}
									wrap="truncate"
								>
									{isSelected ? '→ ' : '  '}
									{agent.name}
								</Text>
							</Box>

							<Box width={10} justifyContent="center">
								<Text color={getStatusColor(status)}>● {status}</Text>
							</Box>

							<Box width={15}>
								<Text dimColor wrap="truncate">
									{agent.tools?.length || 0} tools
								</Text>
							</Box>
						</Box>
					);
				})}
			</Box>

			{showDetails && selectedAgent && (
				<Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
					<Text color="cyan" bold>
						{selectedAgent.name} Details
					</Text>
					<Text dimColor>ID: {selectedAgent.id}</Text>
					<Text>{selectedAgent.description}</Text>

					{showTools &&
						selectedAgent.tools &&
						selectedAgent.tools.length > 0 && (
							<Box marginTop={1} flexDirection="column">
								<Text color="yellow" bold>
									Tools:
								</Text>
								{selectedAgent.tools.map((tool, idx) => (
									<Text key={idx} dimColor>
										• {tool.name || tool.id}:{' '}
										{tool.description || 'No description'}
									</Text>
								))}
							</Box>
						)}

					{selectedAgent.endpoints && selectedAgent.endpoints.length > 0 && (
						<Box marginTop={1} flexDirection="column">
							<Text color="green" bold>
								Endpoints:
							</Text>
							{selectedAgent.endpoints.map((endpoint, idx) => (
								<Text key={idx} dimColor>
									• {endpoint.name}: {endpoint.description || 'No description'}
								</Text>
							))}
						</Box>
					)}

					<Box marginTop={1}>
						<Text dimColor>Press Enter to close details</Text>
					</Box>
				</Box>
			)}

			{stats.activeAgents > maxAgents && (
				<Box marginTop={1}>
					<Text dimColor>
						... and {stats.activeAgents - maxAgents} more agents
					</Text>
				</Box>
			)}
		</Box>
	);
};

interface AgentSummaryProps {
	agentId?: AgentId;
}

export const AgentSummary: React.FC<AgentSummaryProps> = ({ agentId }) => {
	const { agents, getAgentStatus, activeOperations, recentResponses } =
		useAgentCommunication();

	const agent = agentId ? agents.find((a) => a.id === agentId) : null;

	if (!agent && !agentId) {
		return (
			<Box flexDirection="row" gap={2}>
				<Text color="cyan">Total Agents:</Text>
				<Text color="white">{agents.length}</Text>
				<Text color="yellow">Active Operations:</Text>
				<Text color="white">{activeOperations.size}</Text>
				<Text color="green">Recent Responses:</Text>
				<Text color="white">{recentResponses.length}</Text>
			</Box>
		);
	}

	if (!agent) {
		return (
			<Box>
				<Text color="red">Agent {agentId} not found</Text>
			</Box>
		);
	}

	const status = getAgentStatus(agent.id);
	const agentOps = Array.from(activeOperations.values()).filter(
		(op) => op.requestingAgent === agent.id
	);
	const agentResponses = recentResponses
		.filter((res) => res.handledBy === agent.id)
		.slice(0, 5);

	return (
		<Box
			flexDirection="column"
			borderStyle="single"
			borderColor="cyan"
			padding={1}
		>
			<Text color="cyan" bold>
				{agent.name} Summary
			</Text>

			<Box flexDirection="row" gap={2} marginTop={1}>
				<Text dimColor>Status:</Text>
				<Text color={status.active ? 'green' : 'gray'}>
					{status.active ? 'Active' : 'Idle'}
				</Text>
				<Text dimColor>Tools:</Text>
				<Text>{status.tools.length}</Text>
				<Text dimColor>Operations:</Text>
				<Text color="yellow">{agentOps.length}</Text>
			</Box>

			{agentResponses.length > 0 && (
				<Box marginTop={1} flexDirection="column">
					<Text color="green" bold>
						Recent Responses:
					</Text>
					{agentResponses.map((response, idx) => (
						<Text key={idx} dimColor>
							• {response.success ? '✓' : '✗'} {response.requestId}
							{response.error && ` (${response.error})`}
						</Text>
					))}
				</Box>
			)}
		</Box>
	);
};
