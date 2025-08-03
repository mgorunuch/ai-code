import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAgentCommunication } from './AgentCommunicationProvider.js';
import type {
	ModelSelectionResult,
	ModelSelectionCriteria,
	AIModel
} from './core/types.js';

interface ModelSelectionDisplayProps {
	maxSelections?: number;
	showDetails?: boolean;
	showStats?: boolean;
}

export const ModelSelectionDisplay: React.FC<ModelSelectionDisplayProps> = ({
	maxSelections = 10,
	showDetails = false,
	showStats = true
}) => {
	const { modelSelections, isConnected, orchestrator } =
		useAgentCommunication();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showDetailView, setShowDetailView] = useState(showDetails);

	useInput((input, key) => {
		if (key.upArrow && selectedIndex > 0) {
			setSelectedIndex(selectedIndex - 1);
		}
		if (
			key.downArrow &&
			selectedIndex < Math.min(modelSelections.length - 1, maxSelections - 1)
		) {
			setSelectedIndex(selectedIndex + 1);
		}
		if (key.return && modelSelections.length > 0) {
			setShowDetailView(!showDetailView);
		}
	});

	if (!isConnected || !orchestrator) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="red"
				padding={1}
			>
				<Text color="red" bold>
					Model Selection Display Unavailable
				</Text>
				<Text dimColor>Agent orchestrator not connected</Text>
			</Box>
		);
	}

	const displaySelections = modelSelections.slice(0, maxSelections);
	const selectedSelection = displaySelections[selectedIndex];

	// Get model selection configuration
	const modelConfig = orchestrator.getModelSelectionConfig();

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="purple"
			padding={1}
		>
			<Text color="purple" bold>
				Model Selection Monitor
			</Text>

			{showStats && (
				<ModelSelectionStats
					selections={modelSelections}
					config={modelConfig}
				/>
			)}

			{displaySelections.length === 0 ? (
				<Box marginTop={1}>
					<Text dimColor>No model selections recorded</Text>
				</Box>
			) : (
				<Box marginTop={1} flexDirection="column">
					<Box
						flexDirection="row"
						justifyContent="space-between"
						marginBottom={1}
					>
						<Text dimColor>Model</Text>
						<Text dimColor>Operation</Text>
						<Text dimColor>Confidence</Text>
						<Text dimColor>Cost</Text>
					</Box>

					{displaySelections.map((selection, index) => {
						const isSelected = index === selectedIndex;

						return (
							<Box
								key={index}
								flexDirection="row"
								justifyContent="space-between"
							>
								<Box width={20}>
									<Text
										color={
											isSelected
												? 'cyan'
												: getModelColor(selection.result.selectedModel)
										}
										bold={isSelected}
										wrap="truncate"
									>
										{isSelected ? '→ ' : '  '}
										{selection.result.selectedModel}
									</Text>
								</Box>

								<Box width={15}>
									<Text color="yellow">{selection.criteria.operationType}</Text>
								</Box>

								<Box width={10}>
									<Text color="green">
										{(selection.result.confidence * 100).toFixed(1)}%
									</Text>
								</Box>

								<Box width={10}>
									<Text dimColor>
										{selection.result.estimatedCost
											? `$${selection.result.estimatedCost.toFixed(4)}`
											: 'N/A'}
									</Text>
								</Box>
							</Box>
						);
					})}
				</Box>
			)}

			{showDetailView && selectedSelection && (
				<Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
					<ModelSelectionDetails selection={selectedSelection} />
					<Box marginTop={1}>
						<Text dimColor>Press Enter to close details</Text>
					</Box>
				</Box>
			)}

			{modelSelections.length > maxSelections && (
				<Box marginTop={1}>
					<Text dimColor>
						... and {modelSelections.length - maxSelections} more selections
					</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>↑↓: Navigate • Enter: Details</Text>
			</Box>
		</Box>
	);
};

const ModelSelectionStats: React.FC<{
	selections: Array<{
		criteria: ModelSelectionCriteria;
		result: ModelSelectionResult;
	}>;
	config: any;
}> = ({ selections, config }) => {
	// Calculate model usage statistics
	const modelUsage = new Map<AIModel, number>();
	const operationTypeUsage = new Map<string, number>();
	let totalCost = 0;
	let avgConfidence = 0;

	selections.forEach((selection) => {
		const model = selection.result.selectedModel;
		modelUsage.set(model, (modelUsage.get(model) || 0) + 1);

		const opType = selection.criteria.operationType;
		operationTypeUsage.set(opType, (operationTypeUsage.get(opType) || 0) + 1);

		if (selection.result.estimatedCost) {
			totalCost += selection.result.estimatedCost;
		}

		avgConfidence += selection.result.confidence;
	});

	avgConfidence = selections.length > 0 ? avgConfidence / selections.length : 0;

	const mostUsedModel = Array.from(modelUsage.entries()).sort(
		(a, b) => b[1] - a[1]
	)[0];

	return (
		<Box flexDirection="column" marginTop={1} marginBottom={1}>
			<Box flexDirection="row" gap={3}>
				<Box flexDirection="column">
					<Text color="cyan" bold>
						Total Selections
					</Text>
					<Text>{selections.length}</Text>
				</Box>

				<Box flexDirection="column">
					<Text color="green" bold>
						Avg Confidence
					</Text>
					<Text>{(avgConfidence * 100).toFixed(1)}%</Text>
				</Box>

				<Box flexDirection="column">
					<Text color="yellow" bold>
						Total Cost
					</Text>
					<Text>${totalCost.toFixed(4)}</Text>
				</Box>

				<Box flexDirection="column">
					<Text color="purple" bold>
						Most Used
					</Text>
					<Text>{mostUsedModel ? mostUsedModel[0] : 'N/A'}</Text>
				</Box>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>
					Auto Mode: {config.autoModeConfig?.enabled ? 'ON' : 'OFF'}
				</Text>
				<Text dimColor>
					{' '}
					| Available Models: {config.availableModels?.length || 0}
				</Text>
			</Box>
		</Box>
	);
};

const ModelSelectionDetails: React.FC<{
	selection: { criteria: ModelSelectionCriteria; result: ModelSelectionResult };
}> = ({ selection }) => {
	const { criteria, result } = selection;

	return (
		<Box flexDirection="column">
			<Text color="purple" bold>
				Model Selection Details
			</Text>

			<Box marginTop={1} flexDirection="column">
				<Text color="cyan" bold>
					Selected Model:
				</Text>
				<Text>{result.selectedModel}</Text>
				<Text dimColor>Reason: {result.reason}</Text>
				<Text dimColor>
					Confidence: {(result.confidence * 100).toFixed(1)}%
				</Text>
				{result.estimatedCost && (
					<Text dimColor>
						Estimated Cost: ${result.estimatedCost.toFixed(4)}
					</Text>
				)}
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text color="yellow" bold>
					Selection Criteria:
				</Text>
				<Text>Operation: {criteria.operationType}</Text>
				{criteria.agentId && <Text>Agent: {criteria.agentId}</Text>}
				{criteria.complexity && (
					<Text>Complexity: {criteria.complexity}/10</Text>
				)}
				{criteria.contextLength && (
					<Text>Context Length: {criteria.contextLength}</Text>
				)}
				{criteria.priority && <Text>Priority: {criteria.priority}/10</Text>}
				{criteria.maxCost && (
					<Text>Max Cost: ${criteria.maxCost.toFixed(4)}</Text>
				)}
			</Box>

			{result.alternatives && result.alternatives.length > 0 && (
				<Box marginTop={1} flexDirection="column">
					<Text color="green" bold>
						Alternative Models Considered:
					</Text>
					{result.alternatives.slice(0, 3).map((alt, idx) => (
						<Text key={idx} dimColor>
							• {alt.model} (score: {alt.score.toFixed(2)}) - {alt.reason}
						</Text>
					))}
				</Box>
			)}

			{result.metadata && Object.keys(result.metadata).length > 0 && (
				<Box marginTop={1} flexDirection="column">
					<Text color="blue" bold>
						Metadata:
					</Text>
					<Text>{JSON.stringify(result.metadata, null, 2)}</Text>
				</Box>
			)}
		</Box>
	);
};

const getModelColor = (model: AIModel): string => {
	if (model.includes('claude')) return 'cyan';
	if (model.includes('gpt')) return 'green';
	if (model.includes('opus')) return 'magenta';
	if (model.includes('sonnet')) return 'blue';
	if (model.includes('haiku')) return 'yellow';
	return 'white';
};

interface ModelConfigDisplayProps {
	compact?: boolean;
}

export const ModelConfigDisplay: React.FC<ModelConfigDisplayProps> = ({
	compact = false
}) => {
	const { orchestrator, isConnected } = useAgentCommunication();
	const [selectedModelIndex, setSelectedModelIndex] = useState(0);

	useInput((input, key) => {
		if (key.upArrow && selectedModelIndex > 0) {
			setSelectedModelIndex(selectedModelIndex - 1);
		}
		if (key.downArrow) {
			const config = orchestrator?.getModelSelectionConfig();
			const maxIndex = (config?.availableModels?.length || 1) - 1;
			if (selectedModelIndex < maxIndex) {
				setSelectedModelIndex(selectedModelIndex + 1);
			}
		}
	});

	if (!isConnected || !orchestrator) {
		return (
			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="red"
				padding={1}
			>
				<Text color="red">Model configuration unavailable</Text>
			</Box>
		);
	}

	const config = orchestrator.getModelSelectionConfig();

	if (compact) {
		return (
			<Box flexDirection="row" gap={2}>
				<Text color="purple">Models:</Text>
				<Text>{config.availableModels?.length || 0}</Text>
				<Text color="cyan">Auto:</Text>
				<Text>{config.autoModeConfig?.enabled ? 'ON' : 'OFF'}</Text>
			</Box>
		);
	}

	return (
		<Box
			flexDirection="column"
			borderStyle="single"
			borderColor="purple"
			padding={1}
		>
			<Text color="purple" bold>
				Model Configuration
			</Text>

			<Box marginTop={1} flexDirection="column">
				<Text color="cyan">
					Auto Mode: {config.autoModeConfig?.enabled ? 'ENABLED' : 'DISABLED'}
				</Text>
				<Text>Strategy: {config.selectionStats?.strategy || 'balanced'}</Text>
				<Text>Available Models: {config.availableModels?.length || 0}</Text>
			</Box>

			{config.availableModels && config.availableModels.length > 0 && (
				<Box marginTop={1} flexDirection="column">
					<Text color="green" bold>
						Available Models:
					</Text>
					{config.availableModels.map((model, index) => (
						<Box key={model.model} flexDirection="row">
							<Text
								color={
									index === selectedModelIndex
										? 'cyan'
										: getModelColor(model.model)
								}
								bold={index === selectedModelIndex}
							>
								{index === selectedModelIndex ? '→ ' : '  '}
								{model.name}
							</Text>
							<Text dimColor>
								{' '}
								- {model.available ? 'Available' : 'Unavailable'}
							</Text>
						</Box>
					))}
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>↑↓: Navigate models</Text>
			</Box>
		</Box>
	);
};
