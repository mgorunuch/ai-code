import { useInput } from 'ink';

export interface MainAppPageProps {
	name: string;
	onOpenSettings: () => void;
	onBack: () => void;
}

export interface MainAppPageState {
	// No additional state needed for this component
}

export interface MainAppPageActions {
	// No additional actions needed - useInput handles interactions directly
}

export const useMainAppPageLogic = ({
	onOpenSettings,
	onBack
}: MainAppPageProps): MainAppPageState & MainAppPageActions => {
	useInput((input, key) => {
		if (key.escape) {
			onBack();
		}
		
		// Quick settings access
		if (input === 's') {
			onOpenSettings();
		}
	});

	return {};
};