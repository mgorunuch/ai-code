import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

interface MenuItem {
  id: string;
  label: string;
  action: () => void;
}

interface MainMenuProps {
  onStartApp: () => void;
  onOpenSettings: () => void;
  onShowHelp: () => void;
  onOpenAgents?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onStartApp, 
  onOpenSettings, 
  onShowHelp,
  onOpenAgents 
}) => {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuItems: MenuItem[] = [
    {
      id: 'start',
      label: 'Start/Enter Main App',
      action: onStartApp
    },
    {
      id: 'agents',
      label: 'Agent Dashboard',
      action: onOpenAgents || (() => {})
    },
    {
      id: 'settings',
      label: 'Settings (API Keys)',
      action: onOpenSettings
    },
    {
      id: 'help',
      label: 'Help/About',
      action: onShowHelp
    },
    {
      id: 'exit',
      label: 'Exit',
      action: () => exit()
    }
  ].filter(item => item.id !== 'agents' || onOpenAgents); // Hide agents if no handler

  useInput((_input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev - 1 + menuItems.length) % menuItems.length);
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev + 1) % menuItems.length);
    } else if (key.return) {
      menuItems[selectedIndex]?.action();
    }
  });

  return (
    <Box flexDirection="column" alignItems="center" paddingTop={2}>
      <Box marginBottom={2} flexDirection="column" alignItems="center">
        <Text color="cyan" bold>
          ╔═══════════════════════════╗
        </Text>
        <Text color="cyan" bold>
          ║   Hello to ai-code   ║
        </Text>
        <Text color="cyan" bold>
          ╚═══════════════════════════╝
        </Text>
      </Box>
      
      <Box marginBottom={1}>
        <Text color="cyan" bold>Welcome to ai-code CLI</Text>
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