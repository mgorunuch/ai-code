import { useInput } from 'ink';

export interface HelpProps {
	onBack: () => void;
}

export interface HelpState {
	// No additional state needed for static help content
}

export interface HelpActions {
	// No additional actions needed - useInput handles interactions directly
}

export const useHelpLogic = ({
	onBack
}: HelpProps): HelpState & HelpActions => {
	// Handle ESC key and 'b' key to go back
	useInput((input, key) => {
		if (key.escape || input === 'b') {
			onBack();
		}
	});

	return {};
};