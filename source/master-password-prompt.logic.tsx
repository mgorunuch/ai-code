import { useState, useEffect } from 'react';
import { useInput } from 'ink';
import { useOrchestrator } from './OrchestratorProvider';
import { MAX_PASSWORD_ATTEMPTS } from './const';
import { isPasswordError, getMessageFromError } from './core/errors.js';

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

const texts = {
	tooManyAttempts: `❌ Too many failed attempts (${MAX_PASSWORD_ATTEMPTS}). Access locked.`,
	wrongPassword: (attemptsRemaining: number) => `❌ Wrong password. ${attemptsRemaining} attempts remaining.`,
	passwordSetupFailed: (attemptsRemaining: number) => `❌ Password setup failed. ${attemptsRemaining} attempts remaining.`,
	authenticationFailed: (errorMsg: string) => `❌ Authentication failed: ${errorMsg}`,
};

export const useMasterPasswordPromptLogic = ({
	onAuthenticated,
	onExit
}: MasterPasswordPromptProps): MasterPasswordPromptState & MasterPasswordPromptActions => {
	const orchestratorContext = useOrchestrator();
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

			const result = await orchestratorContext.checkCredentialSystem();
			setNeedsPassword(result.needsPassword);
			setHasExistingCredentials(result.hasExistingCredentials);
		} catch (error) {
			console.error('Failed to check credential system:', error);
			setError(getMessageFromError(error));
			setNeedsPassword(true);
		} finally {
			setIsLoading(false);
		}
	};

	const initializeCredentials = async () => {
		if (
			!masterPassword.trim() ||
			attemptCount >= MAX_PASSWORD_ATTEMPTS
		) {
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			await orchestratorContext.initializeCredentials(masterPassword);

			// Only proceed if authentication succeeded
			onAuthenticated();
		} catch (error) {
			const newAttemptCount = attemptCount + 1;
			setAttemptCount(newAttemptCount);

			// Use type-safe error checking
			if (!isPasswordError(error)) {
				setError(texts.authenticationFailed(getMessageFromError(error)));
				setMasterPassword('');
				return;
			}

			if (newAttemptCount >= MAX_PASSWORD_ATTEMPTS) {
				setError(texts.tooManyAttempts);
				setIsLocked(true);
				setTimeout(() => {
					onExit();
				}, 1000);
				return;
			}

			setError(
				hasExistingCredentials
					? texts.wrongPassword(MAX_PASSWORD_ATTEMPTS - newAttemptCount)
					: texts.passwordSetupFailed(MAX_PASSWORD_ATTEMPTS - newAttemptCount)
			);

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
