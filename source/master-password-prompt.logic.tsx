import { useState, useEffect } from 'react';
import { useInput } from 'ink';
import { CoreOrchestrator } from './core';
import { MAX_PASSWORD_ATTEMPTS } from './const';

export interface MasterPasswordPromptProps {
	onAuthenticated: () => void;
	onExit: () => void;
}

export interface MasterPasswordPromptState {
	masterPassword: string;
	isLoading: boolean;
	error: string | null;
	needsPassword: boolean;
	hasExistingCredentials: boolean;
	attemptCount: number;
	isLocked: boolean;
}

export interface MasterPasswordPromptActions {
	// No additional actions needed - useInput handles interactions directly
}

let globalOrchestrator: CoreOrchestrator | null = null;

export const useMasterPasswordPromptLogic = ({
	onAuthenticated,
	onExit
}: MasterPasswordPromptProps): MasterPasswordPromptState & MasterPasswordPromptActions => {
	const [masterPassword, setMasterPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [needsPassword, setNeedsPassword] = useState(false);
	const [hasExistingCredentials, setHasExistingCredentials] = useState(false);
	const [attemptCount, setAttemptCount] = useState(0);
	const [isLocked, setIsLocked] = useState(false);

	const checkCredentialSystem = async () => {
		try {
			setIsLoading(true);
			setError(null);

			if (!globalOrchestrator) {
				globalOrchestrator = new CoreOrchestrator({
					agents: [],
					defaultPermissions: { requireExplicitToolGrants: false },
					logging: { level: 'warn', logCommunications: false }
				});

				try {
					await globalOrchestrator.initializeFromConfigFiles({
						validateOnLoad: false,
						enableHotReload: false
					});

					// Check if credential manager is already initialized by checking for credential files
					// Don't call getCredential yet as it throws if not initialized
					const fs = await import('fs/promises');
					const path = await import('path');

					try {
						// Check if credential files exist
						const credentialsDir = '.ai-code/credentials';
						const apiKeysFile = path.join(credentialsDir, 'api-keys.enc');

						await fs.access(apiKeysFile);
						// Read the file to check if it has actual encrypted content
						const fileContent = await fs.readFile(apiKeysFile, 'utf8');
						const credentialData = JSON.parse(fileContent);

						if (
							credentialData.credentials &&
							Object.keys(credentialData.credentials).length > 0
						) {
							// File exists with actual credentials - need correct password
							setHasExistingCredentials(true);
							setNeedsPassword(true);
						} else {
							// File exists but no credentials stored yet
							setHasExistingCredentials(false);
							setNeedsPassword(true);
						}
					} catch (fileError) {
						// No credential files exist yet - first run
						setHasExistingCredentials(false);
						setNeedsPassword(true);
					}
				} catch (configError) {
					// No config files, definitely need to set up credentials
					setNeedsPassword(true);
				}
			}
		} catch (error) {
			console.error('Failed to check credential system:', error);
			setError((error as Error).message);
			setNeedsPassword(true);
		} finally {
			setIsLoading(false);
		}
	};

	const initializeCredentials = async () => {
		if (
			!globalOrchestrator ||
			!masterPassword.trim() ||
			attemptCount >= MAX_PASSWORD_ATTEMPTS
		)
			return;

		try {
			setIsLoading(true);
			setError(null);

			await globalOrchestrator.initializeCredentialsForSettings(masterPassword);

			// Verify the password based on whether we have existing credentials
			if (hasExistingCredentials) {
				// We have existing credentials - must validate password by trying to decrypt them
				try {
					// Try to decrypt an existing credential to verify the password
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
						await globalOrchestrator.getCredential(testProvider);
						// If we get here, password is correct
					}
				} catch (verifyError) {
					const errorMsg = (verifyError as Error).message;
					if (
						errorMsg.includes('Invalid master password') ||
						errorMsg.includes('authentication') ||
						errorMsg.includes('decrypt') ||
						errorMsg.includes('Unsupported state') ||
						errorMsg.includes('bad decrypt') ||
						errorMsg.includes('unable to authenticate data')
					) {
						throw new Error('Invalid master password. Please try again.');
					}
					throw verifyError; // Re-throw other errors
				}
			} else {
				// First time setup - verify by storing and retrieving a test credential
				try {
					const testValue = 'test-credential-verification-' + Date.now();
					await globalOrchestrator.storeCredential(
						'__password_test__',
						testValue
					);

					// Try to retrieve it back to confirm password is correct
					const retrieved = await globalOrchestrator.getCredential(
						'__password_test__'
					);

					if (retrieved !== testValue) {
						throw new Error(
							'Password verification failed - credential mismatch'
						);
					}
				} catch (verifyError) {
					const errorMsg = (verifyError as Error).message;
					if (errorMsg.includes('verification failed')) {
						throw new Error('Password setup failed. Please try again.');
					}
					// For first time setup, most errors should not block proceeding
					// unless it's clearly a verification failure
				}
			}

			// Only proceed if authentication succeeded
			onAuthenticated();
		} catch (error) {
			const newAttemptCount = attemptCount + 1;
			setAttemptCount(newAttemptCount);

			const errorMsg = (error as Error).message;
			if (
				errorMsg.includes('Invalid master password') ||
				errorMsg.includes('authentication') ||
				errorMsg.includes('decrypt') ||
				errorMsg.includes('bad decrypt') ||
				errorMsg.includes('verification failed') ||
				errorMsg.includes('setup failed')
			) {
				if (newAttemptCount >= MAX_PASSWORD_ATTEMPTS) {
					setError(
						`❌ Too many failed attempts (${MAX_PASSWORD_ATTEMPTS}). Access locked.`
					);
					setIsLocked(true);
					// Exit the app immediately when access is locked
					setTimeout(() => {
						onExit();
					}, 1000); // Give user a moment to see the message
				} else {
					if (hasExistingCredentials) {
						setError(
							`❌ Wrong password. ${
								MAX_PASSWORD_ATTEMPTS - newAttemptCount
							} attempts remaining.`
						);
					} else {
						setError(
							`❌ Password setup failed. ${
								MAX_PASSWORD_ATTEMPTS - newAttemptCount
							} attempts remaining.`
						);
					}
				}
			} else {
				setError(`❌ Authentication failed: ${errorMsg}`);
			}

			// Clear the password field so user can try again
			setMasterPassword('');
		} finally {
			setIsLoading(false);
		}
	};

	useInput((input, key) => {
		if (!needsPassword || isLocked) return;

		if (key.escape) {
			onExit();
			return;
		}

		if (key.return) {
			if (masterPassword.trim() && attemptCount < MAX_PASSWORD_ATTEMPTS) {
				initializeCredentials();
			}
			return;
		}

		if (key.backspace || key.delete) {
			setMasterPassword(masterPassword.slice(0, -1));
			return;
		}

		if (input && !key.ctrl && !key.meta) {
			setMasterPassword(masterPassword + input);
		}
	});

	useEffect(() => {
		checkCredentialSystem();
	}, []);

	return {
		masterPassword,
		isLoading,
		error,
		needsPassword,
		hasExistingCredentials,
		attemptCount,
		isLocked
	};
};