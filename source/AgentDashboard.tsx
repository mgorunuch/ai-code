import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { AgentCommunicationProvider } from './AgentCommunicationProvider.js';
import { AgentStatusDisplay, AgentSummary } from './AgentStatusDisplay.js';
import { MessageQueue, QuestionQueue } from './MessageQueue.js';
import { OperationMonitor, OperationStats } from './OperationMonitor.js';
import { AgentInteractionPanel, QuickActions } from './AgentInteractionPanel.js';
import { ModelSelectionDisplay, ModelConfigDisplay } from './ModelSelectionDisplay.js';
import { ConfigurationManagerInk } from './ConfigurationManagerInk';

type DashboardView = 'overview' | 'agents' | 'operations' | 'messages' | 'models' | 'config' | 'interact';

interface AgentDashboardProps {
  onBack?: () => void;
  showConfiguration?: boolean;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ onBack, showConfiguration = false }) => {
  const [currentView, setCurrentView] = useState<DashboardView>(showConfiguration ? 'config' : 'overview');
  const [showInteractionPanel, setShowInteractionPanel] = useState(false);
  const [showConfigurationManager, setShowConfigurationManager] = useState(showConfiguration);

  useInput((input, key) => {
    if (key.escape) {
      if (showConfigurationManager) {
        setShowConfigurationManager(false);
      } else if (showInteractionPanel) {
        setShowInteractionPanel(false);
      } else if (onBack) {
        onBack();
      }
    }

    if (!showInteractionPanel && !showConfigurationManager) {
      switch (input) {
        case '1':
          setCurrentView('overview');
          break;
        case '2':
          setCurrentView('agents');
          break;
        case '3':
          setCurrentView('operations');
          break;
        case '4':
          setCurrentView('messages');
          break;
        case '5':
          setCurrentView('models');
          break;
        case '6':
          setCurrentView('config');
          setShowConfigurationManager(true);
          break;
        case 'i':
          setShowInteractionPanel(true);
          break;
        case 'c':
          setShowConfigurationManager(true);
          break;
        case 'q':
          if (onBack) onBack();
          break;
      }
    }
  });

  if (showConfigurationManager) {
    return (
      <ConfigurationManagerInk 
        onExit={() => setShowConfigurationManager(false)}
        baseDir={process.cwd()}
        autoSave={false}
      />
    );
  }

  if (showInteractionPanel) {
    return (
      <AgentCommunicationProvider autoInit>
        <AgentInteractionPanel onClose={() => setShowInteractionPanel(false)} />
      </AgentCommunicationProvider>
    );
  }

  return (
    <AgentCommunicationProvider autoInit>
      <Box flexDirection="column" height={process.stdout.rows || 40}>
        <DashboardHeader currentView={currentView} />
        <DashboardContent currentView={currentView} />
        <DashboardFooter />
      </Box>
    </AgentCommunicationProvider>
  );
};

const DashboardHeader: React.FC<{ currentView: DashboardView }> = ({ currentView }) => (
  <Box flexDirection="column" borderStyle="double" borderColor="cyan" padding={1}>
    <Box flexDirection="row" justifyContent="space-between">
      <Text color="cyan" bold>Agent Orchestration Dashboard</Text>
      <AgentSummary />
    </Box>
    
    <Box flexDirection="row" gap={1} marginTop={1}>
      <NavButton label="1:Overview" active={currentView === 'overview'} />
      <NavButton label="2:Agents" active={currentView === 'agents'} />
      <NavButton label="3:Operations" active={currentView === 'operations'} />
      <NavButton label="4:Messages" active={currentView === 'messages'} />
      <NavButton label="5:Models" active={currentView === 'models'} />
      <NavButton label="6:Config" active={currentView === 'config'} />
    </Box>
  </Box>
);

const NavButton: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <Text color={active ? 'cyan' : 'gray'} bold={active}>
    [{label}]
  </Text>
);

const DashboardContent: React.FC<{ currentView: DashboardView }> = ({ currentView }) => {
  switch (currentView) {
    case 'overview':
      return <OverviewView />;
    case 'agents':
      return <AgentsView />;
    case 'operations':
      return <OperationsView />;
    case 'messages':
      return <MessagesView />;
    case 'models':
      return <ModelsView />;
    case 'config':
      return <ConfigView />;
    default:
      return <OverviewView />;
  }
};

const OverviewView: React.FC = () => (
  <Box flexDirection="column" flexGrow={1} padding={1}>
    <Text color="yellow" bold>System Overview</Text>
    
    <Box flexDirection="row" gap={2} marginTop={1}>
      <Box flexDirection="column" flexGrow={1}>
        <AgentStatusDisplay compact maxAgents={5} />
        <Box marginTop={1}>
          <OperationStats showDetailed />
        </Box>
      </Box>
      
      <Box flexDirection="column" flexGrow={1}>
        <ModelConfigDisplay />
        <Box marginTop={1}>
          <MessageQueue maxMessages={8} showTimestamp={false} />
        </Box>
      </Box>
    </Box>
    
    <Box marginTop={1}>
      <QuickActions 
        onQuestionClick={() => {}} 
        onOperationClick={() => {}} 
      />
    </Box>
  </Box>
);

const AgentsView: React.FC = () => (
  <Box flexDirection="column" flexGrow={1} padding={1}>
    <AgentStatusDisplay showTools maxAgents={15} />
  </Box>
);

const OperationsView: React.FC = () => (
  <Box flexDirection="column" flexGrow={1} padding={1}>
    <OperationMonitor maxOperations={20} showCompleted />
  </Box>
);

const MessagesView: React.FC = () => (
  <Box flexDirection="row" gap={2} flexGrow={1} padding={1}>
    <Box flexDirection="column" flexGrow={1}>
      <MessageQueue maxMessages={15} showTimestamp autoScroll />
    </Box>
    <Box flexDirection="column" flexGrow={1}>
      <QuestionQueue maxQuestions={10} showAnswers />
    </Box>
  </Box>
);

const ModelsView: React.FC = () => (
  <Box flexDirection="row" gap={2} flexGrow={1} padding={1}>
    <Box flexDirection="column" flexGrow={1}>
      <ModelSelectionDisplay maxSelections={15} showDetails showStats />
    </Box>
    <Box flexDirection="column" width={30}>
      <ModelConfigDisplay />
    </Box>
  </Box>
);

const ConfigView: React.FC = () => (
  <Box flexDirection="column" flexGrow={1} padding={1}>
    <Text color="yellow" bold>Configuration Management</Text>
    <Box marginTop={1}>
      <Text>
        Press 'C' to open the Configuration Manager
      </Text>
    </Box>
    <Box marginTop={1}>
      <Text dimColor>
        The Configuration Manager provides:
      </Text>
    </Box>
    <Box flexDirection="column" marginTop={1} marginLeft={2}>
      <Text dimColor>• Agent configuration editing with TypeScript support</Text>
      <Text dimColor>• Secure credential management</Text>
      <Text dimColor>• Real-time validation and error checking</Text>
      <Text dimColor>• Configuration import/export</Text>
      <Text dimColor>• Live preview of changes</Text>
    </Box>
  </Box>
);

const DashboardFooter: React.FC = () => (
  <Box flexDirection="row" justifyContent="space-between" borderStyle="single" borderColor="gray" padding={1}>
    <Box flexDirection="row" gap={2}>
      <Text dimColor>1-6: Switch Views</Text>
      <Text dimColor>C: Config</Text>
      <Text dimColor>I: Interact</Text>
      <Text dimColor>Q: Quit</Text>
      <Text dimColor>ESC: Back</Text>
    </Box>
    
    <Box flexDirection="row" gap={1}>
      <Text dimColor>Agent Communication Dashboard v1.0</Text>
    </Box>
  </Box>
);

// Standalone component for embedding in existing apps
interface AgentCommunicationWidgetProps {
  compact?: boolean;
  height?: number;
}

export const AgentCommunicationWidget: React.FC<AgentCommunicationWidgetProps> = ({ 
  compact = true,
  height = 20 
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'operations' | 'messages'>('status');

  useInput((input) => {
    if (input === 't') {
      setActiveTab(current => {
        switch (current) {
          case 'status': return 'operations';
          case 'operations': return 'messages';
          case 'messages': return 'status';
          default: return 'status';
        }
      });
    }
  });

  return (
    <AgentCommunicationProvider autoInit>
      <Box flexDirection="column" height={height} borderStyle="single" borderColor="cyan">
        <Box flexDirection="row" justifyContent="space-between" padding={1}>
          <Text color="cyan" bold>Agent System</Text>
          <Box flexDirection="row" gap={1}>
            <Text color={activeTab === 'status' ? 'cyan' : 'gray'}>Status</Text>
            <Text color={activeTab === 'operations' ? 'cyan' : 'gray'}>Ops</Text>
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
    </AgentCommunicationProvider>
  );
};