import React from 'react';
import { Box, Text } from 'ink';

export const Logo: React.FC = () => {
	return (
		<Box borderStyle="round" borderColor="cyan" padding={1}>
			<Text color="cyan">✦ </Text>
			<Text color="cyan" bold>AI-CODE</Text>
			<Text color="white"> work like a magic</Text>
		</Box>
	);
};