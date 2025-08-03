import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CoreOrchestrator } from './core/orchestrator.js';
import { 
  InvalidPasswordError, 
  VerificationError, 
  SetupError,
  isAuthenticationError,
  isPasswordError 
} from './core/errors.js';

export interface OrchestratorState {
	orchestrator: CoreOrchestrator | null;
	isInitialized: boolean;
	isCredentialsInitialized: boolean;
	hasExistingCredentials: boolean;
	error: string | null;
}

export interface OrchestratorContextType extends OrchestratorState {
	initializeOrchestrator: () => Promise<void>;
	initializeCredentials: (masterPassword: string) => Promise<void>;
	storeCredential: (providerId: string, apiKey: string) => Promise<void>;
	getCredential: (providerId: string) => Promise<string>;
	checkCredentialSystem: () => Promise<{
		needsPassword: boolean;
		hasExistingCredentials: boolean;
	}>;
	reset: () => void;
}

const OrchestratorContext = createContext<OrchestratorContextType | null>(null);

export const useOrchestrator = () => {
	const context = useContext(OrchestratorContext);
	if (!context) {
		throw new Error('useOrchestrator must be used within an OrchestratorProvider');
	}
	return context;
};

interface OrchestratorProviderProps {
	children: ReactNode;
}

export const OrchestratorProvider: React.FC<OrchestratorProviderProps> = ({
	children
}) => {
	const [state, setState] = useState<OrchestratorState>({
		orchestrator: null,
		isInitialized: false,
		isCredentialsInitialized: false,
		hasExistingCredentials: false,
		error: null
	});

	const initializeOrchestrator = async () => {
		try {
			setState(prev => ({ ...prev, error: null }));

			if (!state.orchestrator) {
				const orchestrator = new CoreOrchestrator({
					agents: [],
					defaultPermissions: { requireExplicitToolGrants: false },
					logging: { level: 'warn', logCommunications: false }
				});

				try {
					await orchestrator.initializeFromConfigFiles({
						validateOnLoad: false,
						enableHotReload: false
					});
				} catch (configError) {
					// Config files don't exist or failed to load - this is normal
					console.warn('Config files not available');
				}

				setState(prev => ({
					...prev,
					orchestrator,
					isInitialized: true
				}));
			}
		} catch (error) {
			setState(prev => ({
				...prev,
				error: (error as Error).message
			}));
			throw error;
		}
	};

	const checkCredentialSystem = async () => {
		if (!state.orchestrator) {
			await initializeOrchestrator();
		}

		try {
			// Check if credential files exist
			const fs = await import('fs/promises');
			const path = await import('path');

			const credentialsDir = '.ai-code/credentials';
			const apiKeysFile = path.join(credentialsDir, 'api-keys.enc');

			await fs.access(apiKeysFile);
			// Read the file to check if it has actual encrypted content
			const fileContent = await fs.readFile(apiKeysFile, 'utf8');
			const credentialData = JSON.parse(fileContent);

			const hasExistingCredentials = credentialData.credentials &&
				Object.keys(credentialData.credentials).length > 0;

			setState(prev => ({
				...prev,
				hasExistingCredentials
			}));

			return {
				needsPassword: true,
				hasExistingCredentials
			};
		} catch (fileError) {
			// No credential files exist yet - first run
			setState(prev => ({
				...prev,
				hasExistingCredentials: false
			}));

			return {
				needsPassword: true,
				hasExistingCredentials: false
			};
		}
	};

	const initializeCredentials = async (masterPassword: string) => {
		if (!state.orchestrator) {
			throw new Error('Orchestrator not initialized');
		}

		try {
			await state.orchestrator.initializeCredentialsForSettings(masterPassword);

			// Verify the password based on whether we have existing credentials
			if (state.hasExistingCredentials) {
				// We have existing credentials - must validate password by trying to decrypt them
				try {
					const fs = await import('fs/promises');
					const path = await import('path');
					const credentialsDir = '.ai-code/credentials';
					const apiKeysFile = path.join(credentialsDir, 'api-keys.enc');

					const fileContent = await fs.readFile(apiKeysFile, 'utf8');
					const credentialData = JSON.parse(fileContent);
					const existingProviders = Object.keys(credentialData.credentials);

					if (existingProviders.length > 0) {
						// Try to decrypt an existing credential
						const testProvider = existingProviders[0];
						await state.orchestrator.getCredential(testProvider);
						// If we get here, password is correct
					}
				} catch (verifyError) {
					// Check if it's a password-related error
					if (isPasswordError(verifyError)) {
						throw new InvalidPasswordError('Invalid master password. Please try again.');
					}
					// Legacy string-based error detection for backward compatibility
					const errorMsg = (verifyError as Error).message;
					if (
						errorMsg.includes('Invalid master password') ||
						errorMsg.includes('authentication') ||
						errorMsg.includes('decrypt') ||
						errorMsg.includes('Unsupported state') ||
						errorMsg.includes('bad decrypt') ||
						errorMsg.includes('unable to authenticate data')
					) {
						throw new InvalidPasswordError('Invalid master password. Please try again.');
					}
					throw verifyError; // Re-throw other errors
				}
			} else {
				// First time setup - verify by storing and retrieving a test credential
				try {
					const testValue = 'test-credential-verification-' + Date.now();
					await state.orchestrator.storeCredential(
						'__password_test__',
						testValue
					);

					// Try to retrieve it back to confirm password is correct
					const retrieved = await state.orchestrator.getCredential(
						'__password_test__'
					);

					if (retrieved !== testValue) {
						throw new Error(
							'Password verification failed - credential mismatch'
						);
					}
				} catch (verifyError) {
					// Check if it's a password-related error
					if (isPasswordError(verifyError)) {
						throw new SetupError('Password setup failed. Please try again.');
					}
					// Legacy string-based error detection
					const errorMsg = (verifyError as Error).message;
					if (errorMsg.includes('verification failed')) {
						throw new VerificationError('Password verification failed. Please try again.');
					}
					throw verifyError; // Re-throw other errors
				}
			}

			setState(prev => ({
				...prev,
				isCredentialsInitialized: true
			}));
		} catch (error) {
			throw error;
		}
	};

	const storeCredential = async (providerId: string, apiKey: string) => {
		if (!state.orchestrator || !state.isCredentialsInitialized) {
			throw new Error('Orchestrator or credentials not initialized');
		}

		await state.orchestrator.storeCredential(providerId, apiKey);
	};

	const getCredential = async (providerId: string) => {
		if (!state.orchestrator || !state.isCredentialsInitialized) {
			throw new Error('Orchestrator or credentials not initialized');
		}

		return await state.orchestrator.getCredential(providerId);
	};

	const reset = () => {
		setState({
			orchestrator: null,
			isInitialized: false,
			isCredentialsInitialized: false,
			hasExistingCredentials: false,
			error: null
		});
	};

	const contextValue: OrchestratorContextType = {
		...state,
		initializeOrchestrator,
		initializeCredentials,
		storeCredential,
		getCredential,
		checkCredentialSystem,
		reset
	};

	return (
		<OrchestratorContext.Provider value={contextValue}>
			{children}
		</OrchestratorContext.Provider>
	);
};