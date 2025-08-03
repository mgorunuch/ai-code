import { useState, useEffect } from 'react';
import { Provider } from './types';
import { apiKeyStorage } from './storage';
import { useOrchestrator } from './orchestrator-provider';

export interface SettingsProps {
	onExit?: () => void;
}

export interface SettingsState {
	providers: Provider[];
	selectedProvider: Provider | null;
	message: { text: string; color: string } | null;
	isLoading: boolean;
	orchestratorError: string | null;
}

export interface SettingsActions {
	handleSelectProvider: (provider: Provider) => void;
	handleSaveApiKey: (apiKey: string) => Promise<void>;
	handleCancel: () => void;
	handleExit: () => void;
}

export const useSettingsLogic = ({
	onExit
}: SettingsProps): SettingsState & SettingsActions => {
	const orchestratorContext = useOrchestrator();
	const [providers, setProviders] = useState<Provider[]>([
		{ id: 'openai', name: 'OpenAI' },
		{ id: 'anthropic', name: 'Anthropic' }
	]);
	const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
		null
	);
	const [message, setMessage] = useState<{
		text: string;
		color: string;
	} | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [orchestratorError, setOrchestratorError] = useState<string | null>(
		null
	);

	// Initialize orchestrator and load existing API keys
	useEffect(() => {
		initializeOrchestratorAndLoadKeys();
	}, []);

	const initializeOrchestratorAndLoadKeys = async () => {
		try {
			setIsLoading(true);
			setOrchestratorError(null);

			if (!orchestratorContext.isInitialized) {
				await orchestratorContext.initializeOrchestrator();
			}

			await loadProvidersFromBothSystems();
		} catch (error) {
			console.error('Failed to initialize orchestrator:', error);
			setOrchestratorError((error as Error).message);
			// Fall back to legacy storage
			await loadProvidersFromLegacyStorage();
		} finally {
			setIsLoading(false);
		}
	};

	const loadProvidersFromBothSystems = async () => {
		const updatedProviders = await Promise.all(
			providers.map(async (provider) => {
				let apiKey: string | undefined;
				let isFromSecureStorage = false;

				// Try to get from core system first
				if (orchestratorContext.orchestrator && orchestratorContext.isCredentialsInitialized) {
					try {
						apiKey = await orchestratorContext.getCredential(provider.id);
						isFromSecureStorage = true;
					} catch (error) {
						if ((error as Error).message.includes('No credential found')) {
							// This is normal - provider just doesn't have a credential yet
							// Fall back to legacy storage
							apiKey = apiKeyStorage.getApiKey(provider.id);
						} else {
							// Fall back to legacy storage for other errors
							apiKey = apiKeyStorage.getApiKey(provider.id);
						}
					}
				} else {
					// Use legacy storage
					apiKey = apiKeyStorage.getApiKey(provider.id);
				}

				return {
					...provider,
					apiKey: apiKey ? '••••••••••••' + apiKey.slice(-4) : undefined,
					isSecure: isFromSecureStorage
				};
			})
		);

		setProviders(updatedProviders);
	};

	const loadProvidersFromLegacyStorage = async () => {
		const updatedProviders = providers.map((provider) => ({
			...provider,
			apiKey: apiKeyStorage.getApiKey(provider.id)
		}));
		setProviders(updatedProviders);
	};

	const handleSelectProvider = (provider: Provider) => {
		setSelectedProvider(provider);
		setMessage(null);
	};

	const handleSaveApiKey = async (apiKey: string) => {
		if (!selectedProvider) return;

		try {
			setIsLoading(true);
			setMessage(null);

			// Try to save to core system first
			if (orchestratorContext.orchestrator && orchestratorContext.isCredentialsInitialized) {
				try {
					await orchestratorContext.storeCredential(selectedProvider.id, apiKey);
					setMessage({
						text: `API key securely saved for ${selectedProvider.name}! (Encrypted storage)`,
						color: 'green'
					});
				} catch (error) {
					console.warn('Core storage failed, falling back to legacy:', error);
					// Fall back to legacy storage
					apiKeyStorage.setApiKey(selectedProvider.id, apiKey);
					setMessage({
						text: `API key saved for ${selectedProvider.name}! (Session storage - will not persist after restart)`,
						color: 'yellow'
					});
				}
			} else {
				// Use legacy storage
				apiKeyStorage.setApiKey(selectedProvider.id, apiKey);
				setMessage({
					text: `API key saved for ${selectedProvider.name}! (Session storage - will not persist after restart)`,
					color: 'yellow'
				});
			}

			// Refresh the provider list
			await loadProvidersFromBothSystems();
			setSelectedProvider(null);
		} catch (error) {
			setMessage({
				text: `Failed to save API key: ${(error as Error).message}`,
				color: 'red'
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setMessage({
			text: 'Cancelled without saving',
			color: 'yellow'
		});
		setSelectedProvider(null);
	};

	const handleExit = () => {
		if (selectedProvider) {
			setSelectedProvider(null);
		} else if (onExit) {
			onExit();
		}
	};

	return {
		providers,
		selectedProvider,
		message,
		isLoading,
		orchestratorError,
		handleSelectProvider,
		handleSaveApiKey,
		handleCancel,
		handleExit
	};
};