import { useState } from 'react';
import { useInput } from 'ink';
import { Provider } from './types';

export interface ProviderListProps {
	providers: Provider[];
	onSelectProvider: (provider: Provider) => void;
	onExit?: () => void;
}

export interface ProviderListState {
	selectedIndex: number;
}

export interface ProviderListActions {
	// No additional actions needed - useInput handles interactions directly
}

export const useProviderListLogic = ({
	providers,
	onSelectProvider,
	onExit
}: ProviderListProps): ProviderListState & ProviderListActions => {
	const [selectedIndex, setSelectedIndex] = useState(0);

	useInput((_input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		}

		if (key.downArrow) {
			setSelectedIndex(Math.min(providers.length - 1, selectedIndex + 1));
		}

		if (key.return) {
			const provider = providers[selectedIndex];
			if (provider) {
				onSelectProvider(provider);
			}
		}

		if (key.escape && onExit) {
			onExit();
		}
	});

	return {
		selectedIndex
	};
};