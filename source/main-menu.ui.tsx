import React from 'react';
import { Box, Text } from 'ink';
import { useMainMenuLogic, MainMenuProps } from './main-menu.logic';

export const MainMenu: React.FC<MainMenuProps> = (props) => {
	const { selectedIndex, menuItems } = useMainMenuLogic(props);

	return (
		<Box flexDirection="column" alignItems="center" paddingTop={2}>
			<Box marginBottom={2} flexDirection="column" alignItems="center">
				<Text color="cyan" bold>
					╔═══════════════════════════╗
				</Text>
				<Text color="cyan" bold>
					║     Hello to ai-code      ║
				</Text>
				<Text color="cyan" bold>
					╚═══════════════════════════╝
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color="cyan" bold>
					Welcome to ai-code CLI
				</Text>
			</Box>

			<Box flexDirection="column" marginTop={2}>
				{menuItems.map((item, index) => (
					<Box key={item.id} paddingX={2}>
						<Text color={selectedIndex === index ? 'green' : 'white'}>
							{selectedIndex === index ? '▶ ' : '  '}
							{item.label}
						</Text>
					</Box>
				))}
			</Box>

			<Box marginTop={2}>
				<Text dimColor>Use ↑↓ arrows to navigate, Enter to select</Text>
			</Box>
		</Box>
	);
};