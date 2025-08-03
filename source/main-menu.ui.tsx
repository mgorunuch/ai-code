import React from 'react';
import { Box, Text } from 'ink';
import { useMainMenuLogic, MainMenuProps } from './main-menu.logic';
import { Logo } from './logo';

export const MainMenu: React.FC<MainMenuProps> = (props) => {
	const { selectedIndex, menuItems } = useMainMenuLogic(props);

	return (
		<Box flexDirection="column" paddingTop={1}>
			<Box marginBottom={1}>
				<Logo />
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
				<Text dimColor>Use ↑↓ arrows to navigate, Enter to select, Escape to exit</Text>
			</Box>
		</Box>
	);
};