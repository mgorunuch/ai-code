import { useState } from 'react';
import { useInput } from 'ink';

export type WidgetTab = 'status' | 'operations' | 'messages';

export interface AgentCommunicationWidgetState {
	activeTab: WidgetTab;
}

export interface AgentCommunicationWidgetActions {
	setActiveTab: (tab: WidgetTab) => void;
}

export const useAgentCommunicationWidgetLogic = () => {
	const [activeTab, setActiveTab] = useState<WidgetTab>('status');

	useInput((input) => {
		if (input === 't') {
			setActiveTab((current) => {
				switch (current) {
					case 'status':
						return 'operations';
					case 'operations':
						return 'messages';
					case 'messages':
						return 'status';
					default:
						return 'status';
				}
			});
		}
	});

	const state: AgentCommunicationWidgetState = {
		activeTab
	};

	const actions: AgentCommunicationWidgetActions = {
		setActiveTab
	};

	return { state, actions };
};