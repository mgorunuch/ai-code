import { useInput } from 'ink';

export interface SettingsPageProps {
	onBack: () => void;
}

export interface SettingsPageState {
	// No additional state needed for the page wrapper
}

export interface SettingsPageActions {
	// No additional actions needed - useInput handles interactions directly
}

export const useSettingsPageLogic = ({
	onBack
}: SettingsPageProps): SettingsPageState & SettingsPageActions => {
	// Handle ESC key to go back
	useInput((_input, key) => {
		if (key.escape) {
			onBack();
		}
	});

	return {};
};