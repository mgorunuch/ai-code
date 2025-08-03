import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAgentCommunication } from './AgentCommunicationProvider.js';
import type { AgentMessage, AgentId } from './core/types.js';

interface MessageQueueProps {
	maxMessages?: number;
	showTimestamp?: boolean;
	filterByAgent?: AgentId;
	autoScroll?: boolean;
}

export const MessageQueue: React.FC<MessageQueueProps> = ({
	maxMessages = 20,
	showTimestamp = true,
	filterByAgent,
	autoScroll = true
}) => {
	const { messageHistory, questionHistory, isConnected } =
		useAgentCommunication();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [showDetails, setShowDetails] = useState(false);
	const [isPaused, setIsPaused] = useState(false);

	useInput((input, key) => {
		if (key.upArrow && selectedIndex > 0) {
			setSelectedIndex(selectedIndex - 1);
		}
		if (
			key.downArrow &&
			selectedIndex < Math.min(displayMessages.length - 1, maxMessages - 1)
		) {
			setSelectedIndex(selectedIndex + 1);
		}
		if (key.return && displayMessages.length > 0) {
			setShowDetails(!showDetails);
		}
		if (input === 'p') {
			setIsPaused(!isPaused);
		}
	});

	// Filter and combine messages
	const filteredMessages = filterByAgent
		? messageHistory.filter(
				(msg) => msg.from === filterByAgent || msg.to === filterByAgent
		  )
		: messageHistory;

	const displayMessages = filteredMessages.slice(0, maxMessages);

	// Auto-scroll to newest message when not paused
	useEffect(() => {
		if (autoScroll && !isPaused && displayMessages.length > 0) {
			setSelectedIndex(0);
		}
	}, [messageHistory.length, autoScroll, isPaused]);

	const formatTimestamp = (timestamp: Date): string => {
		return timestamp.toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	};

	const getMessageTypeColor = (endpoint: string): string => {
		switch (endpoint) {
			case 'question':
				return 'cyan';
			case 'validate':
				return 'yellow';
			case 'transform':
				return 'magenta';
			case 'handle':
				return 'green';
			default:
				return 'white';
		}
	};

	const truncatePayload = (payload: any, maxLength = 50): string => {
		const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
		return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
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
					Message Queue Unavailable
				</Text>
				<Text dimColor>Agent communication system not connected</Text>
			</Box>
		);
	}

	const selectedMessage = displayMessages[selectedIndex];

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="green"
			padding={1}
		>
			<Box flexDirection="row" justifyContent="space-between">
				<Text color="green" bold>
					Message Queue {filterByAgent && `(${filterByAgent})`}
				</Text>
				<Box flexDirection="row" gap={1}>
					<Text dimColor>{isPaused ? '⏸ PAUSED' : '▶ LIVE'}</Text>
					<Text dimColor>↑↓: Navigate • Enter: Details • P: Pause</Text>
				</Box>
			</Box>

			{displayMessages.length === 0 ? (
				<Box marginTop={1}>
					<Text dimColor>No messages to display</Text>
				</Box>
			) : (
				<Box marginTop={1} flexDirection="column">
					<Box
						flexDirection="row"
						justifyContent="space-between"
						marginBottom={1}
					>
						{showTimestamp && <Text dimColor>Time</Text>}
						<Text dimColor>From → To</Text>
						<Text dimColor>Endpoint</Text>
						<Text dimColor>Payload</Text>
					</Box>

					{displayMessages.map((message, index) => {
						const isSelected = index === selectedIndex;

						return (
							<Box
								key={message.messageId}
								flexDirection="row"
								justifyContent="space-between"
							>
								{showTimestamp && (
									<Box width={10}>
										<Text
											color={isSelected ? 'cyan' : 'gray'}
											bold={isSelected}
										>
											{formatTimestamp(message.timestamp)}
										</Text>
									</Box>
								)}

								<Box width={20}>
									<Text
										color={isSelected ? 'cyan' : 'white'}
										bold={isSelected}
										wrap="truncate"
									>
										{isSelected ? '→ ' : '  '}
										{message.from} → {message.to}
									</Text>
								</Box>

								<Box width={12}>
									<Text color={getMessageTypeColor(message.endpoint)}>
										{message.endpoint}
									</Text>
								</Box>

								<Box width={30}>
									<Text dimColor wrap="truncate">
										{truncatePayload(message.payload)}
									</Text>
								</Box>
							</Box>
						);
					})}
				</Box>
			)}

			{showDetails && selectedMessage && (
				<Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
					<Text color="cyan" bold>
						Message Details
					</Text>
					<Text dimColor>ID: {selectedMessage.messageId}</Text>
					<Text dimColor>Time: {selectedMessage.timestamp.toISOString()}</Text>
					<Text>
						From: <Text color="yellow">{selectedMessage.from}</Text>
					</Text>
					<Text>
						To: <Text color="yellow">{selectedMessage.to}</Text>
					</Text>
					<Text>
						Endpoint:{' '}
						<Text color={getMessageTypeColor(selectedMessage.endpoint)}>
							{selectedMessage.endpoint}
						</Text>
					</Text>

					<Box marginTop={1} flexDirection="column">
						<Text color="green" bold>
							Payload:
						</Text>
						<Text>{JSON.stringify(selectedMessage.payload, null, 2)}</Text>
					</Box>

					<Box marginTop={1}>
						<Text dimColor>Press Enter to close details</Text>
					</Box>
				</Box>
			)}

			{filteredMessages.length > maxMessages && (
				<Box marginTop={1}>
					<Text dimColor>
						... and {filteredMessages.length - maxMessages} more messages
					</Text>
				</Box>
			)}
		</Box>
	);
};

interface QuestionQueueProps {
	maxQuestions?: number;
	showAnswers?: boolean;
}

export const QuestionQueue: React.FC<QuestionQueueProps> = ({
	maxQuestions = 10,
	showAnswers = true
}) => {
	const { questionHistory, isConnected } = useAgentCommunication();
	const [selectedIndex, setSelectedIndex] = useState(0);

	useInput((input, key) => {
		if (key.upArrow && selectedIndex > 0) {
			setSelectedIndex(selectedIndex - 1);
		}
		if (
			key.downArrow &&
			selectedIndex < Math.min(questionHistory.length - 1, maxQuestions - 1)
		) {
			setSelectedIndex(selectedIndex + 1);
		}
	});

	if (!isConnected) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="red"
				padding={1}
			>
				<Text color="red" bold>
					Question Queue Unavailable
				</Text>
				<Text dimColor>Agent communication system not connected</Text>
			</Box>
		);
	}

	const displayQuestions = questionHistory.slice(0, maxQuestions);

	return (
		<Box
			flexDirection="column"
			borderStyle="single"
			borderColor="magenta"
			padding={1}
		>
			<Text color="magenta" bold>
				Question Queue
			</Text>

			{displayQuestions.length === 0 ? (
				<Box marginTop={1}>
					<Text dimColor>No questions to display</Text>
				</Box>
			) : (
				<Box marginTop={1} flexDirection="column">
					{displayQuestions.map((entry, index) => {
						const isSelected = index === selectedIndex;
						const hasAnswer = !!entry.response;

						return (
							<Box
								key={index}
								marginBottom={1}
								borderStyle="single"
								borderColor={hasAnswer ? 'green' : 'yellow'}
								padding={1}
							>
								<Box flexDirection="row" justifyContent="space-between">
									<Text color={isSelected ? 'cyan' : 'white'} bold={isSelected}>
										{isSelected ? '→ ' : '  '}
										{entry.from} asks {entry.to}
									</Text>
									<Text color={hasAnswer ? 'green' : 'yellow'}>
										{hasAnswer ? '✓ Answered' : '⏳ Pending'}
									</Text>
								</Box>

								<Text dimColor wrap="truncate">
									Q: {entry.question.question}
								</Text>

								{showAnswers && entry.response && (
									<Box marginTop={1}>
										<Text color="green">A: {entry.response.answer}</Text>
										<Text dimColor>
											Confidence: {(entry.response.confidence * 100).toFixed(1)}
											%
										</Text>
									</Box>
								)}
							</Box>
						);
					})}
				</Box>
			)}

			{questionHistory.length > maxQuestions && (
				<Box marginTop={1}>
					<Text dimColor>
						... and {questionHistory.length - maxQuestions} more questions
					</Text>
				</Box>
			)}
		</Box>
	);
};
