import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAgentCommunication } from './agent-communication-provider.js';
import type {
	OperationRequest,
	OperationResponse,
	OperationType
} from './core/types.js';

interface OperationMonitorProps {
	maxOperations?: number;
	showCompleted?: boolean;
	autoRefresh?: boolean;
	filterByType?: OperationType;
}

export const OperationMonitor: React.FC<OperationMonitorProps> = ({
	maxOperations = 15,
	showCompleted = true,
	autoRefresh = true,
	filterByType
}) => {
	const { activeOperations, recentResponses, isConnected, stats } =
		useAgentCommunication();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showDetails, setShowDetails] = useState(false);
	const [view, setView] = useState<'active' | 'completed' | 'all'>('all');

	useInput((input, key) => {
		if (key.upArrow && selectedIndex > 0) {
			setSelectedIndex(selectedIndex - 1);
		}
		if (
			key.downArrow &&
			selectedIndex < Math.min(displayItems.length - 1, maxOperations - 1)
		) {
			setSelectedIndex(selectedIndex + 1);
		}
		if (key.return && displayItems.length > 0) {
			setShowDetails(!showDetails);
		}
		if (input === 'a') {
			setView('active');
		}
		if (input === 'c') {
			setView('completed');
		}
		if (input === 'l') {
			setView('all');
		}
	});

	// Combine active operations and recent responses
	const activeOps = Array.from(activeOperations.values());
	const completedOps = recentResponses;

	// Filter operations
	const filteredActiveOps = filterByType
		? activeOps.filter((op) => op.type === filterByType)
		: activeOps;

	const filteredCompletedOps = filterByType
		? completedOps.filter((resp) => {
				// Try to find the corresponding request to check type
				const request = Array.from(activeOperations.values()).find(
					(req) => req.requestId === resp.requestId
				);
				return request?.type === filterByType;
		  })
		: completedOps;

	// Create display items based on view
	const getDisplayItems = (): Array<{
		type: 'active' | 'completed';
		data: OperationRequest | OperationResponse;
	}> => {
		const items: Array<{
			type: 'active' | 'completed';
			data: OperationRequest | OperationResponse;
		}> = [];

		if (view === 'active' || view === 'all') {
			filteredActiveOps.forEach((op) => {
				items.push({ type: 'active', data: op });
			});
		}

		if ((view === 'completed' || view === 'all') && showCompleted) {
			filteredCompletedOps.forEach((resp) => {
				items.push({ type: 'completed', data: resp });
			});
		}

		// Sort by timestamp (newest first)
		items.sort((a, b) => {
			const aTime = 'timestamp' in a.data ? a.data.timestamp : new Date();
			const bTime = 'timestamp' in b.data ? b.data.timestamp : new Date();
			return bTime.getTime() - aTime.getTime();
		});

		return items.slice(0, maxOperations);
	};

	const displayItems = getDisplayItems();

	const getOperationTypeColor = (type: OperationType): string => {
		switch (type) {
			case 'read_file':
				return 'blue';
			case 'write_file':
				return 'green';
			case 'edit_file':
				return 'yellow';
			case 'delete_file':
				return 'red';
			case 'create_directory':
				return 'magenta';
			case 'question':
				return 'cyan';
			case 'validate':
				return 'orange';
			case 'transform':
				return 'purple';
			default:
				return 'white';
		}
	};

	const getStatusColor = (item: {
		type: 'active' | 'completed';
		data: OperationRequest | OperationResponse;
	}): string => {
		if (item.type === 'active') return 'yellow';
		const response = item.data as OperationResponse;
		return response.success ? 'green' : 'red';
	};

	const formatDuration = (start: Date, end?: Date): string => {
		const endTime = end || new Date();
		const duration = endTime.getTime() - start.getTime();
		return `${duration}ms`;
	};

	if (!isConnected) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="red"
				padding={1}
			>
				<Text color="red" bold>
					Operation Monitor Unavailable
				</Text>
				<Text dimColor>Agent communication system not connected</Text>
			</Box>
		);
	}

	const selectedItem = displayItems[selectedIndex];

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="blue"
			padding={1}
		>
			<Box flexDirection="row" justifyContent="space-between">
				<Text color="blue" bold>
					Operation Monitor {filterByType && `(${filterByType})`}
				</Text>
				<Box flexDirection="row" gap={1}>
					<Text color={view === 'active' ? 'cyan' : 'gray'}>A:Active</Text>
					<Text color={view === 'completed' ? 'cyan' : 'gray'}>
						C:Completed
					</Text>
					<Text color={view === 'all' ? 'cyan' : 'gray'}>L:All</Text>
				</Box>
			</Box>

			<Box flexDirection="row" justifyContent="space-between" marginTop={1}>
				<Text color="green">Active: {filteredActiveOps.length}</Text>
				<Text color="blue">Total Requests: {stats.totalRequests}</Text>
				<Text color="yellow">Total Responses: {stats.totalResponses}</Text>
			</Box>

			{displayItems.length === 0 ? (
				<Box marginTop={1}>
					<Text dimColor>No operations to display</Text>
				</Box>
			) : (
				<Box marginTop={1} flexDirection="column">
					<Box
						flexDirection="row"
						justifyContent="space-between"
						marginBottom={1}
					>
						<Text dimColor>Status</Text>
						<Text dimColor>Type</Text>
						<Text dimColor>Target</Text>
						<Text dimColor>Agent</Text>
						<Text dimColor>Duration</Text>
					</Box>

					{displayItems.map((item, index) => {
						const isSelected = index === selectedIndex;
						const isActive = item.type === 'active';
						const request = item.data as OperationRequest;
						const response = item.data as OperationResponse;

						return (
							<Box
								key={isActive ? request.requestId : response.requestId}
								flexDirection="row"
								justifyContent="space-between"
							>
								<Box width={10}>
									<Text
										color={isSelected ? 'cyan' : getStatusColor(item)}
										bold={isSelected}
									>
										{isSelected ? '→ ' : '  '}
										{isActive
											? '⏳ RUNNING'
											: response.success
											? '✓ SUCCESS'
											: '✗ FAILED'}
									</Text>
								</Box>

								<Box width={12}>
									<Text
										color={getOperationTypeColor(
											isActive ? request.type : 'read_file'
										)}
									>
										{isActive ? request.type : 'completed'}
									</Text>
								</Box>

								<Box width={20}>
									<Text dimColor wrap="truncate">
										{isActive ? request.filePath || 'system' : 'N/A'}
									</Text>
								</Box>

								<Box width={15}>
									<Text wrap="truncate">
										{isActive
											? request.requestingAgent || 'system'
											: response.handledBy}
									</Text>
								</Box>

								<Box width={10}>
									<Text dimColor>{isActive ? 'ongoing' : 'completed'}</Text>
								</Box>
							</Box>
						);
					})}
				</Box>
			)}

			{showDetails && selectedItem && (
				<Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
					<Text color="cyan" bold>
						Operation Details
					</Text>

					{selectedItem.type === 'active' ? (
						<ActiveOperationDetails
							operation={selectedItem.data as OperationRequest}
						/>
					) : (
						<CompletedOperationDetails
							response={selectedItem.data as OperationResponse}
						/>
					)}

					<Box marginTop={1}>
						<Text dimColor>Press Enter to close details</Text>
					</Box>
				</Box>
			)}

			{filteredActiveOps.length + filteredCompletedOps.length >
				maxOperations && (
				<Box marginTop={1}>
					<Text dimColor>
						... and{' '}
						{filteredActiveOps.length +
							filteredCompletedOps.length -
							maxOperations}{' '}
						more operations
					</Text>
				</Box>
			)}
		</Box>
	);
};

const ActiveOperationDetails: React.FC<{ operation: OperationRequest }> = ({
	operation
}) => (
	<Box flexDirection="column">
		<Text dimColor>Request ID: {operation.requestId}</Text>
		<Text>
			Type: <Text color="yellow">{operation.type}</Text>
		</Text>
		<Text>
			Target: <Text color="cyan">{operation.filePath || 'system'}</Text>
		</Text>
		<Text>
			Requesting Agent:{' '}
			<Text color="green">{operation.requestingAgent || 'system'}</Text>
		</Text>

		{operation.payload && (
			<Box marginTop={1} flexDirection="column">
				<Text color="magenta" bold>
					Payload:
				</Text>
				<Text>{JSON.stringify(operation.payload, null, 2)}</Text>
			</Box>
		)}
	</Box>
);

const CompletedOperationDetails: React.FC<{ response: OperationResponse }> = ({
	response
}) => (
	<Box flexDirection="column">
		<Text dimColor>Request ID: {response.requestId}</Text>
		<Text>
			Status:{' '}
			<Text color={response.success ? 'green' : 'red'}>
				{response.success ? 'SUCCESS' : 'FAILED'}
			</Text>
		</Text>
		<Text>
			Handled By: <Text color="green">{response.handledBy}</Text>
		</Text>

		{response.error && (
			<Box marginTop={1}>
				<Text color="red" bold>
					Error:
				</Text>
				<Text color="red">{response.error}</Text>
			</Box>
		)}

		{response.data && (
			<Box marginTop={1} flexDirection="column">
				<Text color="green" bold>
					Response Data:
				</Text>
				<Text>{JSON.stringify(response.data, null, 2)}</Text>
			</Box>
		)}

		{response.metadata && (
			<Box marginTop={1} flexDirection="column">
				<Text color="blue" bold>
					Metadata:
				</Text>
				<Text>{JSON.stringify(response.metadata, null, 2)}</Text>
			</Box>
		)}
	</Box>
);

interface OperationStatsProps {
	showDetailed?: boolean;
}

export const OperationStats: React.FC<OperationStatsProps> = ({
	showDetailed = false
}) => {
	const { activeOperations, recentResponses, stats } = useAgentCommunication();

	const successCount = recentResponses.filter((r) => r.success).length;
	const failureCount = recentResponses.filter((r) => !r.success).length;
	const successRate =
		recentResponses.length > 0
			? (successCount / recentResponses.length) * 100
			: 0;

	if (!showDetailed) {
		return (
			<Box flexDirection="row" gap={2}>
				<Text color="yellow">Active:</Text>
				<Text color="white">{activeOperations.size}</Text>
				<Text color="green">Success:</Text>
				<Text color="white">{successCount}</Text>
				<Text color="red">Failed:</Text>
				<Text color="white">{failureCount}</Text>
				<Text color="cyan">Rate:</Text>
				<Text color="white">{successRate.toFixed(1)}%</Text>
			</Box>
		);
	}

	return (
		<Box
			flexDirection="column"
			borderStyle="single"
			borderColor="blue"
			padding={1}
		>
			<Text color="blue" bold>
				Operation Statistics
			</Text>

			<Box flexDirection="row" gap={4} marginTop={1}>
				<Box flexDirection="column">
					<Text color="yellow" bold>
						Active Operations
					</Text>
					<Text>{activeOperations.size}</Text>
				</Box>

				<Box flexDirection="column">
					<Text color="green" bold>
						Successful
					</Text>
					<Text>{successCount}</Text>
				</Box>

				<Box flexDirection="column">
					<Text color="red" bold>
						Failed
					</Text>
					<Text>{failureCount}</Text>
				</Box>

				<Box flexDirection="column">
					<Text color="cyan" bold>
						Success Rate
					</Text>
					<Text>{successRate.toFixed(1)}%</Text>
				</Box>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>
					Total Requests: {stats.totalRequests} | Total Responses:{' '}
					{stats.totalResponses}
				</Text>
			</Box>
		</Box>
	);
};
