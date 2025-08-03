import { useState } from 'react';
import { useInput } from 'ink';
import { Provider } from './types';

export interface ApiKeyInputProps {
	provider: Provider;
	onSave: (apiKey: string) => void;
	onCancel: () => void;
	currentApiKey?: string;
}

export interface ApiKeyInputState {
	apiKey: string;
	showKey: boolean;
	displayKey: string;
}

export interface ApiKeyInputActions {
	// No additional actions needed - useInput handles interactions directly
}

export const useApiKeyInputLogic = ({
	provider,
	onSave,
	onCancel,
	currentApiKey = ''
}: ApiKeyInputProps): ApiKeyInputState & ApiKeyInputActions => {
	const [apiKey, setApiKey] = useState(currentApiKey);
	const [showKey, setShowKey] = useState(false);

	useInput((input, key) => {
		if (key.escape) {
			onCancel();
			return;
		}

		if (key.return) {
			if (apiKey.trim()) {
				onSave(apiKey.trim());
			}
			return;
		}

		if (key.ctrl && input === 's') {
			setShowKey(!showKey);
			return;
		}

		if (key.backspace || key.delete) {
			setApiKey(apiKey.slice(0, -1));
			return;
		}

		// Only allow printable characters
		if (input && !key.ctrl && !key.meta) {
			setApiKey(apiKey + input);
		}
	});

	const displayKey = showKey ? apiKey : apiKey.replace(/./g, '•');

	return {
		apiKey,
		showKey,
		displayKey
	};
};