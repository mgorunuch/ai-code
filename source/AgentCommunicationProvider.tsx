import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { CoreOrchestrator } from './core/orchestrator.js';
import type { 
  AgentCapability, 
  AgentId, 
  OperationRequest, 
  OperationResponse, 
  AgentMessage,
  QuestionRequest,
  QuestionResponse,
  ModelSelectionResult,
  ModelSelectionCriteria
} from './core/types.js';

export interface AgentCommunicationState {
  orchestrator: CoreOrchestrator | null;
  agents: AgentCapability[];
  activeOperations: Map<string, OperationRequest>;
  recentResponses: OperationResponse[];
  messageHistory: AgentMessage[];
  questionHistory: Array<{ from: AgentId; to: AgentId; question: QuestionRequest; response?: QuestionResponse }>;
  modelSelections: Array<{ criteria: ModelSelectionCriteria; result: ModelSelectionResult }>;
  isConnected: boolean;
  stats: {
    totalRequests: number;
    totalResponses: number;
    totalMessages: number;
    activeAgents: number;
  };
}

interface AgentCommunicationContextType extends AgentCommunicationState {
  initializeOrchestrator: () => void;
  sendRequest: (request: Omit<OperationRequest, 'requestId'>) => Promise<OperationResponse>;
  askQuestion: (fromAgent: AgentId, question: QuestionRequest, targetAgent?: AgentId) => Promise<QuestionResponse | Map<AgentId, QuestionResponse | Error>>;
  getAgentStatus: (agentId: AgentId) => { registered: boolean; active: boolean; tools: string[] };
  clearHistory: () => void;
  updateStats: () => void;
}

const AgentCommunicationContext = createContext<AgentCommunicationContextType | null>(null);

export const useAgentCommunication = () => {
  const context = useContext(AgentCommunicationContext);
  if (!context) {
    throw new Error('useAgentCommunication must be used within an AgentCommunicationProvider');
  }
  return context;
};

interface AgentCommunicationProviderProps {
  children: ReactNode;
  autoInit?: boolean;
}

export const AgentCommunicationProvider: React.FC<AgentCommunicationProviderProps> = ({ 
  children, 
  autoInit = false 
}) => {
  const [state, setState] = useState<AgentCommunicationState>({
    orchestrator: null,
    agents: [],
    activeOperations: new Map(),
    recentResponses: [],
    messageHistory: [],
    questionHistory: [],
    modelSelections: [],
    isConnected: false,
    stats: {
      totalRequests: 0,
      totalResponses: 0,
      totalMessages: 0,
      activeAgents: 0
    }
  });

  const initializeOrchestrator = () => {
    try {
      const orchestrator = new CoreOrchestrator({
        logging: {
          level: 'info',
          logCommunications: true,
          logModelSelection: true,
          logAccessPatterns: false
        },
        defaultPermissions: {
          requireExplicitToolGrants: true
        }
      });

      // Set up event listeners for real-time updates
      setupEventListeners(orchestrator);

      setState(prev => ({
        ...prev,
        orchestrator,
        isConnected: true,
        agents: orchestrator.getAgents()
      }));

      console.log('Agent orchestrator initialized successfully');
    } catch (error) {
      console.error('Failed to initialize agent orchestrator:', error);
      setState(prev => ({ ...prev, isConnected: false }));
    }
  };

  const setupEventListeners = (orchestrator: CoreOrchestrator) => {
    // Request/Response events
    orchestrator.on('requestReceived', (request: OperationRequest) => {
      setState(prev => ({
        ...prev,
        activeOperations: new Map(prev.activeOperations).set(request.requestId, request),
        stats: { ...prev.stats, totalRequests: prev.stats.totalRequests + 1 }
      }));
    });

    orchestrator.on('requestCompleted', (response: OperationResponse) => {
      setState(prev => {
        const newActiveOps = new Map(prev.activeOperations);
        newActiveOps.delete(response.requestId);
        
        const newResponses = [response, ...prev.recentResponses].slice(0, 50); // Keep last 50

        return {
          ...prev,
          activeOperations: newActiveOps,
          recentResponses: newResponses,
          stats: { ...prev.stats, totalResponses: prev.stats.totalResponses + 1 }
        };
      });
    });

    orchestrator.on('requestFailed', (request: OperationRequest, error: Error) => {
      setState(prev => {
        const newActiveOps = new Map(prev.activeOperations);
        newActiveOps.delete(request.requestId);

        const errorResponse: OperationResponse = {
          success: false,
          error: error.message,
          handledBy: 'orchestrator',
          requestId: request.requestId
        };

        const newResponses = [errorResponse, ...prev.recentResponses].slice(0, 50);

        return {
          ...prev,
          activeOperations: newActiveOps,
          recentResponses: newResponses,
          stats: { ...prev.stats, totalResponses: prev.stats.totalResponses + 1 }
        };
      });
    });

    // Agent registration events
    orchestrator.on('agentRegistered', (agent: AgentCapability) => {
      setState(prev => ({
        ...prev,
        agents: [...prev.agents, agent],
        stats: { ...prev.stats, activeAgents: prev.stats.activeAgents + 1 }
      }));
    });

    orchestrator.on('agentUnregistered', (agentId: AgentId) => {
      setState(prev => ({
        ...prev,
        agents: prev.agents.filter(a => a.id !== agentId),
        stats: { ...prev.stats, activeAgents: Math.max(0, prev.stats.activeAgents - 1) }
      }));
    });

    // Model selection events
    orchestrator.on('modelSelected', (criteria: ModelSelectionCriteria, result: ModelSelectionResult) => {
      setState(prev => ({
        ...prev,
        modelSelections: [{ criteria, result }, ...prev.modelSelections].slice(0, 20) // Keep last 20
      }));
    });

    // Communication events (we'll access the communication system directly)
    const commSystem = (orchestrator as any).communicationSystem;
    if (commSystem) {
      commSystem.on('messageSent', (message: AgentMessage) => {
        setState(prev => ({
          ...prev,
          messageHistory: [message, ...prev.messageHistory].slice(0, 100), // Keep last 100
          stats: { ...prev.stats, totalMessages: prev.stats.totalMessages + 1 }
        }));
      });

      commSystem.on('questionAsked', (from: AgentId, to: AgentId, question: QuestionRequest) => {
        setState(prev => ({
          ...prev,
          questionHistory: [{ from, to, question }, ...prev.questionHistory].slice(0, 50)
        }));
      });

      commSystem.on('questionAnswered', (from: AgentId, to: AgentId, response: QuestionResponse) => {
        setState(prev => {
          const newHistory = [...prev.questionHistory];
          const questionIndex = newHistory.findIndex(q => q.from === from && q.to === to && !q.response);
          if (questionIndex >= 0) {
            newHistory[questionIndex] = { ...newHistory[questionIndex], response };
          }
          return { ...prev, questionHistory: newHistory };
        });
      });
    }
  };

  const sendRequest = async (request: Omit<OperationRequest, 'requestId'>): Promise<OperationResponse> => {
    if (!state.orchestrator) {
      throw new Error('Orchestrator not initialized');
    }

    const fullRequest: OperationRequest = {
      ...request,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    return await state.orchestrator.executeRequest(fullRequest);
  };

  const askQuestion = async (
    fromAgent: AgentId, 
    question: QuestionRequest, 
    targetAgent?: AgentId
  ): Promise<QuestionResponse | Map<AgentId, QuestionResponse | Error>> => {
    if (!state.orchestrator) {
      throw new Error('Orchestrator not initialized');
    }

    return await state.orchestrator.askQuestion(fromAgent, question, targetAgent);
  };

  const getAgentStatus = (agentId: AgentId) => {
    const agent = state.agents.find(a => a.id === agentId);
    return {
      registered: !!agent,
      active: !!agent && state.activeOperations.size > 0,
      tools: agent?.tools.map(tool => tool.name || tool.id) || []
    };
  };

  const clearHistory = () => {
    if (state.orchestrator) {
      state.orchestrator.clearHistory();
    }
    setState(prev => ({
      ...prev,
      activeOperations: new Map(),
      recentResponses: [],
      messageHistory: [],
      questionHistory: [],
      modelSelections: [],
      stats: {
        totalRequests: 0,
        totalResponses: 0,
        totalMessages: 0,
        activeAgents: prev.agents.length
      }
    }));
  };

  const updateStats = () => {
    if (state.orchestrator) {
      const orchestratorStats = state.orchestrator.getStats();
      setState(prev => ({
        ...prev,
        stats: {
          totalRequests: orchestratorStats.totalRequests,
          totalResponses: orchestratorStats.totalResponses,
          totalMessages: orchestratorStats.communicationStats.totalMessages,
          activeAgents: orchestratorStats.totalAgents
        }
      }));
    }
  };

  // Auto-initialize if requested
  useEffect(() => {
    if (autoInit && !state.orchestrator) {
      initializeOrchestrator();
    }
  }, [autoInit]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [state.orchestrator]);

  const contextValue: AgentCommunicationContextType = {
    ...state,
    initializeOrchestrator,
    sendRequest,
    askQuestion,
    getAgentStatus,
    clearHistory,
    updateStats
  };

  return (
    <AgentCommunicationContext.Provider value={contextValue}>
      {children}
    </AgentCommunicationContext.Provider>
  );
};