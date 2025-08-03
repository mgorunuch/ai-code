import React from 'react';
import { Box, Text } from 'ink';
import { useMasterPasswordPromptLogic, MasterPasswordPromptProps } from './master-password-prompt.logic';
import { NewPasswordScreen } from './master-password-new.ui';
import { EnterPasswordScreen } from './master-password-enter.ui';
import { LockedScreen } from './master-password-locked.ui';

export { MasterPasswordPromptProps } from './master-password-prompt.logic';

export const MasterPasswordPrompt: React.FC<MasterPasswordPromptProps> = (props) => {
	const {
		masterPassword,
		isLoading,
		error,
		needsPassword,
		hasExistingCredentials,
		attemptCount,
		isLocked
	} = useMasterPasswordPromptLogic(props);
	if (isLoading && !needsPassword) {
		return (
			<Box flexDirection="column" padding={1}>
				<Text color="yellow">⏳ Checking credential system...</Text>
			</Box>
		);
	}

	if (!needsPassword) {
		return null;
	}

	if (isLocked) {
		return <LockedScreen error={error} />;
	}

	if (hasExistingCredentials) {
		return (
			<EnterPasswordScreen
				masterPassword={masterPassword}
				isLoading={isLoading}
				error={error}
				attemptCount={attemptCount}
			/>
		);
	}

	return (
		<NewPasswordScreen
			masterPassword={masterPassword}
			isLoading={isLoading}
			error={error}
		/>
	);
};