import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAgentCommunication } from './AgentCommunicationProvider.js';
import { OperationType } from './core/types.js';
import type {
	AgentId,
	QuestionRequest,
	OperationRequest
} from './core/types.js';

interface AgentInteractionPanelProps {
	onClose?: () => void;
}

export const AgentInteractionPanel: React.FC<AgentInteractionPanelProps> = ({
	onClose
}) => {
	const { agents, sendRequest, askQuestion, isConnected } =
		useAgentCommunication();
	const [mode, setMode] = useState<
		'menu' | 'ask-question' | 'send-operation' | 'select-agent'
	>('menu');
	const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
	const [inputText, setInputText] = useState('');
	const [operationType, setOperationType] = useState<OperationType>(
		OperationType.QUESTION
	);
	const [targetPath, setTargetPath] = useState('');
	const [isExecuting, setIsExecuting] = useState(false);
	const [lastResult, setLastResult] = useState<any>(null);
	const [error, setError] = useState<string | null>(null);

	useInput((input, key) => {
		if (key.escape) {
			if (mode !== 'menu') {
				setMode('menu');
				setError(null);
			} else if (onClose) {
				onClose();
			}
		}

		if (mode === 'menu') {
			if (input === '1') setMode('ask-question');
			if (input === '2') setMode('send-operation');
			if (input === 'q' && onClose) onClose();
		}

		if (mode === 'select-agent') {
			if (key.upArrow && selectedAgentIndex > 0) {
				setSelectedAgentIndex(selectedAgentIndex - 1);
			}
			if (key.downArrow && selectedAgentIndex < agents.length - 1) {
				setSelectedAgentIndex(selectedAgentIndex + 1);
			}
			if (key.return) {
				handleAgentSelected();
			}
		}

		if (mode === 'ask-question' || mode === 'send-operation') {
			if (key.return && !key.shift) {
				handleExecuteAction();
			}
			if (key.backspace) {
				setInputText((prev) => prev.slice(0, -1));
			} else if (input && input.length === 1 && !key.ctrl && !key.meta) {
				setInputText((prev) => prev + input);
			}
		}
	});

	const handleAgentSelected = () => {
		const selectedAgent = agents[selectedAgentIndex];
		if (mode === 'ask-question') {
			executeQuestion(selectedAgent.id);
		} else if (mode === 'send-operation') {
			executeOperation(selectedAgent.id);
		}
	};

	const handleExecuteAction = () => {
		if (!inputText.trim()) return;

		if (agents.length === 0) {
			setError('No agents available');
			return;
		}

		if (agents.length === 1) {
			const agent = agents[0];
			if (mode === 'ask-question') {
				executeQuestion(agent.id);
			} else if (mode === 'send-operation') {
				executeOperation(agent.id);
			}
		} else {
			setMode('select-agent');
		}
	};

	const executeQuestion = async (targetAgent: AgentId) => {
		if (!inputText.trim()) return;

		setIsExecuting(true);
		setError(null);

		try {
			const question: QuestionRequest = {
				question: inputText,
				context: {
					filePaths: targetPath ? [targetPath] : undefined
				}
			};

			const result = await askQuestion('user', question, targetAgent);
			setLastResult(result);
			setInputText('');
			setTargetPath('');
			setMode('menu');
		} catch (err) {
			setError(`Failed to ask question: ${(err as Error).message}`);
		} finally {
			setIsExecuting(false);
		}
	};

	const executeOperation = async (targetAgent: AgentId) => {
		if (!inputText.trim()) return;

		setIsExecuting(true);
		setError(null);

		try {
			const operation: Omit<OperationRequest, 'requestId'> = {
				type: operationType,
				filePath: targetPath || undefined,
				payload: {
					content: inputText,
					userInitiated: true
				},
				requestingAgent: 'user'
			};

			const result = await sendRequest(operation);
			setLastResult(result);
			setInputText('');
			setTargetPath('');
			setMode('menu');
		} catch (err) {
			setError(`Failed to execute operation: ${(err as Error).message}`);
		} finally {
			setIsExecuting(false);
		}
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
					Agent Interaction Unavailable
				</Text>
				<Text dimColor>
					Initialize the orchestrator to interact with agents
				</Text>
				<Box marginTop={1}>
					<Text dimColor>Press ESC to close</Text>
				</Box>
			</Box>
		);
	}

	if (isExecuting) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="yellow"
				padding={1}
			>
				<Text color="yellow" bold>
					Executing...
				</Text>
				<Text dimColor>Please wait while the operation completes</Text>
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
			<Text color="cyan" bold>
				Agent Interaction Panel
			</Text>

			{error && (
				<Box marginTop={1} borderStyle="single" borderColor="red" padding={1}>
					<Text color="red">Error: {error}</Text>
				</Box>
			)}

			{lastResult && (
				<Box marginTop={1} borderStyle="single" borderColor="green" padding={1}>
					<Text color="green" bold>
						Last Result:
					</Text>
					<Text>{JSON.stringify(lastResult, null, 2)}</Text>
				</Box>
			)}

			{mode === 'menu' && <MenuView agents={agents} />}

			{mode === 'ask-question' && (
				<AskQuestionView
					inputText={inputText}
					targetPath={targetPath}
					onInputChange={setInputText}
					onPathChange={setTargetPath}
				/>
			)}

			{mode === 'send-operation' && (
				<SendOperationView
					inputText={inputText}
					targetPath={targetPath}
					operationType={operationType}
					onInputChange={setInputText}
					onPathChange={setTargetPath}
					onTypeChange={setOperationType}
				/>
			)}

			{mode === 'select-agent' && (
				<SelectAgentView agents={agents} selectedIndex={selectedAgentIndex} />
			)}
		</Box>
	);
};

const MenuView: React.FC<{ agents: any[] }> = ({ agents }) => (
	<Box flexDirection="column" marginTop={1}>
		<Text>Available Actions:</Text>
		<Text>1. Ask Question to Agent</Text>
		<Text>2. Send Operation to Agent</Text>
		<Text dimColor>q. Quit</Text>

		<Box marginTop={1}>
			<Text dimColor>Available Agents: {agents.length}</Text>
			{agents.map((agent, idx) => (
				<Text key={agent.id} dimColor>
					• {agent.name} ({agent.id})
				</Text>
			))}
		</Box>

		<Box marginTop={1}>
			<Text dimColor>Press 1, 2, or q | ESC to close</Text>
		</Box>
	</Box>
);

const AskQuestionView: React.FC<{
	inputText: string;
	targetPath: string;
	onInputChange: (text: string) => void;
	onPathChange: (path: string) => void;
}> = ({ inputText, targetPath }) => (
	<Box flexDirection="column" marginTop={1}>
		<Text color="yellow" bold>
			Ask Question to Agent
		</Text>

		<Box marginTop={1}>
			<Text>Question: </Text>
			<Text color="cyan">{inputText}</Text>
			<Text color="gray">|</Text>
		</Box>

		<Box marginTop={1}>
			<Text dimColor>Context Path (optional): {targetPath || 'none'}</Text>
		</Box>

		<Box marginTop={1}>
			<Text dimColor>Type your question and press Enter</Text>
			<Text dimColor>ESC to cancel</Text>
		</Box>
	</Box>
);

const SendOperationView: React.FC<{
	inputText: string;
	targetPath: string;
	operationType: OperationType;
	onInputChange: (text: string) => void;
	onPathChange: (path: string) => void;
	onTypeChange: (type: OperationType) => void;
}> = ({ inputText, targetPath, operationType }) => (
	<Box flexDirection="column" marginTop={1}>
		<Text color="green" bold>
			Send Operation to Agent
		</Text>

		<Box marginTop={1}>
			<Text>
				Operation Type: <Text color="yellow">{operationType}</Text>
			</Text>
		</Box>

		<Box marginTop={1}>
			<Text>Content: </Text>
			<Text color="cyan">{inputText}</Text>
			<Text color="gray">|</Text>
		</Box>

		<Box marginTop={1}>
			<Text dimColor>Target Path: {targetPath || 'none'}</Text>
		</Box>

		<Box marginTop={1}>
			<Text dimColor>Type operation content and press Enter</Text>
			<Text dimColor>ESC to cancel</Text>
		</Box>
	</Box>
);

const SelectAgentView: React.FC<{
	agents: any[];
	selectedIndex: number;
}> = ({ agents, selectedIndex }) => (
	<Box flexDirection="column" marginTop={1}>
		<Text color="cyan" bold>
			Select Target Agent
		</Text>

		<Box marginTop={1} flexDirection="column">
			{agents.map((agent, index) => (
				<Box key={agent.id} flexDirection="row">
					<Text
						color={index === selectedIndex ? 'cyan' : 'white'}
						bold={index === selectedIndex}
					>
						{index === selectedIndex ? '→ ' : '  '}
						{agent.name}
					</Text>
					<Text dimColor> ({agent.id})</Text>
				</Box>
			))}
		</Box>

		<Box marginTop={1}>
			<Text dimColor>↑↓: Navigate • Enter: Select • ESC: Cancel</Text>
		</Box>
	</Box>
);

interface QuickActionsProps {
	onQuestionClick?: () => void;
	onOperationClick?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
	onQuestionClick,
	onOperationClick
}) => {
	const { agents, isConnected } = useAgentCommunication();

	if (!isConnected) {
		return (
			<Box flexDirection="row" gap={2}>
				<Text dimColor>Agent system not connected</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="row" gap={2}>
			<Text>Quick Actions:</Text>
			<Text
				color={agents.length > 0 ? 'cyan' : 'gray'}
				bold={agents.length > 0}
				onClick={onQuestionClick}
			>
				[Q] Ask Question
			</Text>
			<Text
				color={agents.length > 0 ? 'green' : 'gray'}
				bold={agents.length > 0}
				onClick={onOperationClick}
			>
				[O] Send Operation
			</Text>
			<Text dimColor>({agents.length} agents available)</Text>
		</Box>
	);
};
