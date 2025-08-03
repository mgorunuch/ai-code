import React, { useState, useEffect, useCallback } from 'react';
import {
	CredentialEntry,
	ValidationError,
	ConfigurationContext,
	ConfigurationChange
} from './types';
import { CredentialManager as CoreCredentialManager } from './core/credential-manager.js';
import type { CredentialConfig } from './core/configuration-types.js';

export interface CredentialManagerProps {
	context: ConfigurationContext;
	onChange?: (changes: ConfigurationChange[]) => void;
	readOnly?: boolean;
}

interface CredentialFormData {
	id: string;
	name: string;
	provider: string;
	type: 'api_key' | 'token' | 'certificate' | 'custom';
	value: string;
	description?: string;
	expiresAt?: string;
}

interface ProviderCredentials {
	anthropic?: string;
	openai?: string;
	custom?: Record<string, string>;
}

interface CredentialStats {
	totalProviders: number;
	encryptionAlgorithm: string;
	lastUpdated: Date;
	rotationEnabled: boolean;
	cacheHitRate: number;
	upcomingRotations: Array<{ provider: string; nextRotation: Date }>;
}

export const CredentialManager: React.FC<CredentialManagerProps> = ({
	context,
	onChange,
	readOnly = false
}) => {
	const [credentials, setCredentials] = useState<CredentialEntry[]>([]);
	const [credentialStats, setCredentialStats] =
		useState<CredentialStats | null>(null);
	const [showNewCredentialForm, setShowNewCredentialForm] = useState(false);
	const [newCredential, setNewCredential] = useState<CredentialFormData>({
		id: '',
		name: '',
		provider: 'anthropic',
		type: 'api_key',
		value: ''
	});
	const [selectedCredential, setSelectedCredential] = useState<string | null>(
		null
	);
	const [masterPassword, setMasterPassword] = useState('');
	const [isInitialized, setIsInitialized] = useState(false);
	const [initializationError, setInitializationError] = useState<string | null>(
		null
	);
	const [coreCredentialManager, setCoreCredentialManager] =
		useState<CoreCredentialManager | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
		[]
	);

	useEffect(() => {
		initializeCredentialManager();
	}, [context.resolvedConfig?.security?.credentials]);

	const initializeCredentialManager = async () => {
		const credentialConfig = context.resolvedConfig?.security?.credentials;
		if (!credentialConfig) {
			setInitializationError('No credential configuration found');
			return;
		}

		try {
			setIsLoading(true);
			setInitializationError(null);

			// Create credential manager from core system
			const configPaths = {
				rootDir: '.ai-code',
				agentsDir: '.ai-code/agents',
				configDir: '.ai-code/config',
				credentialsDir: '.ai-code/credentials',
				userConfig: '.ai-code/user-config.ts',
				orchestrationConfig: '.ai-code/config/orchestration.ts',
				modelsConfig: '.ai-code/config/models.ts',
				securityConfig: '.ai-code/config/security.ts',
				apiKeysFile: '.ai-code/credentials/api-keys.enc',
				tokensFile: '.ai-code/credentials/tokens.enc'
			};

			const manager = new CoreCredentialManager(credentialConfig, configPaths);

			// Set up event listeners
			manager.on('credentialEncrypted', (provider: string, keyId: string) => {
				console.log(`Credential encrypted for ${provider}: ${keyId}`);
				loadCredentials(manager);
			});

			manager.on('credentialDecrypted', (provider: string, keyId: string) => {
				console.log(`Credential decrypted for ${provider}: ${keyId}`);
			});

			manager.on(
				'credentialRotated',
				(provider: string, oldKeyId: string, newKeyId: string) => {
					console.log(
						`Credential rotated for ${provider}: ${oldKeyId} -> ${newKeyId}`
					);
					loadCredentials(manager);
				}
			);

			manager.on('credentialError', (provider: string, error: Error) => {
				setValidationErrors((prev) => [
					...prev,
					{
						field: `credential.${provider}`,
						message: error.message,
						severity: 'error'
					}
				]);
			});

			setCoreCredentialManager(manager);
		} catch (error) {
			console.error('Failed to initialize credential manager:', error);
			setInitializationError(
				error instanceof Error ? error.message : 'Unknown error'
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleInitialize = async () => {
		if (!coreCredentialManager || !masterPassword) return;

		try {
			setIsLoading(true);
			setValidationErrors([]);
			await coreCredentialManager.initialize(masterPassword);
			setIsInitialized(true);
			await loadCredentials(coreCredentialManager);
			await loadCredentialStats(coreCredentialManager);
		} catch (error) {
			console.error('Failed to initialize with master password:', error);
			setValidationErrors([
				{
					field: 'masterPassword',
					message:
						error instanceof Error ? error.message : 'Failed to initialize',
					severity: 'error'
				}
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const loadCredentials = async (manager: CoreCredentialManager) => {
		try {
			const providers = await manager.listProviders();
			const credentialEntries: CredentialEntry[] = providers.map(
				(provider) => ({
					id: provider,
					name: getProviderDisplayName(provider),
					provider,
					type: 'api_key',
					value: '••••••••••••••••', // Masked
					masked: true,
					lastUpdated: new Date()
				})
			);
			setCredentials(credentialEntries);
		} catch (error) {
			console.error('Failed to load credentials:', error);
		}
	};

	const loadCredentialStats = async (manager: CoreCredentialManager) => {
		try {
			const stats = await manager.getCredentialStats();
			setCredentialStats(stats);
		} catch (error) {
			console.error('Failed to load credential stats:', error);
		}
	};

	const handleAddCredential = async () => {
		if (!coreCredentialManager || !newCredential.value.trim()) return;

		const validation = validateCredential(newCredential);
		if (validation.length > 0) {
			setValidationErrors(validation);
			return;
		}

		try {
			setIsLoading(true);
			setValidationErrors([]);

			await coreCredentialManager.storeCredential(
				newCredential.provider,
				newCredential.value
			);

			// Update UI
			await loadCredentials(coreCredentialManager);
			await loadCredentialStats(coreCredentialManager);

			// Track change
			const change: ConfigurationChange = {
				id: `credential-${Date.now()}`,
				type: 'credential',
				action: 'create',
				path: `credentials.${newCredential.provider}`,
				newValue: {
					provider: newCredential.provider,
					type: newCredential.type
				},
				timestamp: new Date(),
				impact: `Added ${newCredential.provider} credentials`
			};
			onChange?.([change]);

			// Reset form
			setNewCredential({
				id: '',
				name: '',
				provider: 'anthropic',
				type: 'api_key',
				value: ''
			});
			setShowNewCredentialForm(false);
		} catch (error) {
			console.error('Failed to add credential:', error);
			setValidationErrors([
				{
					field: 'credential',
					message:
						error instanceof Error ? error.message : 'Failed to add credential',
					severity: 'error'
				}
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleRemoveCredential = async (providerId: string) => {
		if (!coreCredentialManager) return;

		const confirm = window.confirm(
			`Are you sure you want to remove credentials for ${providerId}?`
		);
		if (!confirm) return;

		try {
			setIsLoading(true);
			const removed = await coreCredentialManager.removeCredential(providerId);

			if (removed) {
				await loadCredentials(coreCredentialManager);
				await loadCredentialStats(coreCredentialManager);

				const change: ConfigurationChange = {
					id: `credential-remove-${Date.now()}`,
					type: 'credential',
					action: 'delete',
					path: `credentials.${providerId}`,
					timestamp: new Date(),
					impact: `Removed ${providerId} credentials`
				};
				onChange?.([change]);
			}
		} catch (error) {
			console.error('Failed to remove credential:', error);
			setValidationErrors([
				{
					field: 'credential',
					message:
						error instanceof Error
							? error.message
							: 'Failed to remove credential',
					severity: 'error'
				}
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleTestCredential = async (providerId: string) => {
		if (!coreCredentialManager) return;

		try {
			setIsLoading(true);
			const credential = await coreCredentialManager.getCredential(providerId);

			// For demo purposes, we'll just check if we can retrieve it
			if (credential) {
				alert(
					`✓ Credential for ${providerId} is accessible (length: ${credential.length})`
				);
			}
		} catch (error) {
			console.error('Failed to test credential:', error);
			alert(`✗ Failed to test ${providerId} credential: ${error}`);
		} finally {
			setIsLoading(false);
		}
	};

	const validateCredential = (
		credential: CredentialFormData
	): ValidationError[] => {
		const errors: ValidationError[] = [];

		if (!credential.provider.trim()) {
			errors.push({
				field: 'provider',
				message: 'Provider is required',
				severity: 'error'
			});
		}

		if (!credential.value.trim()) {
			errors.push({
				field: 'value',
				message: 'Credential value is required',
				severity: 'error'
			});
		} else {
			// Basic validation for API keys
			if (credential.type === 'api_key') {
				if (
					credential.provider === 'anthropic' &&
					!credential.value.startsWith('sk-ant-')
				) {
					errors.push({
						field: 'value',
						message: 'Anthropic API keys should start with "sk-ant-"',
						severity: 'warning'
					});
				}
				if (
					credential.provider === 'openai' &&
					!credential.value.startsWith('sk-')
				) {
					errors.push({
						field: 'value',
						message: 'OpenAI API keys should start with "sk-"',
						severity: 'warning'
					});
				}
				if (credential.value.length < 20) {
					errors.push({
						field: 'value',
						message: 'API key seems too short',
						severity: 'warning'
					});
				}
			}
		}

		return errors;
	};

	const getProviderDisplayName = (provider: string): string => {
		switch (provider) {
			case 'anthropic':
				return 'Anthropic (Claude)';
			case 'openai':
				return 'OpenAI (GPT)';
			default:
				return provider.charAt(0).toUpperCase() + provider.slice(1);
		}
	};

	if (!isInitialized && coreCredentialManager) {
		return (
			<div style={{ padding: '16px' }}>
				<h2 style={{ color: '#569cd6', marginBottom: '16px' }}>
					Initialize Credential Manager
				</h2>

				{initializationError && (
					<div
						style={{
							padding: '8px',
							backgroundColor: '#3c1e1e',
							border: '1px solid #f44747',
							borderRadius: '4px',
							marginBottom: '16px',
							color: '#f44747'
						}}
					>
						Error: {initializationError}
					</div>
				)}

				<div style={{ marginBottom: '16px' }}>
					<label
						style={{ display: 'block', marginBottom: '8px', color: '#cccccc' }}
					>
						Master Password
					</label>
					<input
						type="password"
						value={masterPassword}
						onChange={(e) => setMasterPassword(e.target.value)}
						placeholder="Enter master password to unlock credentials"
						style={{
							width: '300px',
							padding: '8px',
							backgroundColor: '#3c3c3c',
							color: '#d4d4d4',
							border: '1px solid #5a5a5a',
							borderRadius: '4px',
							fontSize: '14px'
						}}
						onKeyPress={(e) => e.key === 'Enter' && handleInitialize()}
					/>
				</div>

				<button
					onClick={handleInitialize}
					disabled={!masterPassword.trim() || isLoading}
					style={{
						padding: '8px 16px',
						backgroundColor: masterPassword.trim() ? '#0e639c' : '#3c3c3c',
						color: masterPassword.trim() ? '#ffffff' : '#808080',
						border: 'none',
						borderRadius: '4px',
						cursor: masterPassword.trim() ? 'pointer' : 'not-allowed',
						fontSize: '14px'
					}}
				>
					{isLoading ? 'Initializing...' : 'Initialize'}
				</button>

				<div style={{ marginTop: '16px', fontSize: '12px', color: '#808080' }}>
					<p>
						The master password is used to encrypt/decrypt stored credentials.
					</p>
					<p>This password is not stored and must be entered each session.</p>
				</div>
			</div>
		);
	}

	return (
		<div style={{ padding: '16px' }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '16px'
				}}
			>
				<h2 style={{ color: '#569cd6', margin: 0 }}>Credential Management</h2>
				<div style={{ display: 'flex', gap: '8px' }}>
					{!readOnly && (
						<button
							onClick={() => setShowNewCredentialForm(true)}
							style={{
								padding: '6px 12px',
								backgroundColor: '#0e639c',
								color: '#ffffff',
								border: 'none',
								borderRadius: '4px',
								cursor: 'pointer',
								fontSize: '12px'
							}}
						>
							Add Credential
						</button>
					)}
				</div>
			</div>

			{/* Validation Errors */}
			{validationErrors.length > 0 && (
				<div style={{ marginBottom: '16px' }}>
					{validationErrors.map((error, index) => (
						<div
							key={index}
							style={{
								padding: '8px',
								backgroundColor:
									error.severity === 'error' ? '#3c1e1e' : '#3c3c1e',
								border: `1px solid ${
									error.severity === 'error' ? '#f44747' : '#ffcc02'
								}`,
								borderRadius: '4px',
								marginBottom: '4px',
								fontSize: '12px'
							}}
						>
							<span
								style={{
									color: error.severity === 'error' ? '#f44747' : '#ffcc02'
								}}
							>
								[{error.severity.toUpperCase()}] {error.field}: {error.message}
							</span>
						</div>
					))}
				</div>
			)}

			{/* Credential Stats */}
			{credentialStats && (
				<div
					style={{
						backgroundColor: '#252526',
						border: '1px solid #3c3c3c',
						borderRadius: '4px',
						padding: '12px',
						marginBottom: '16px'
					}}
				>
					<h3
						style={{ color: '#569cd6', margin: '0 0 8px 0', fontSize: '14px' }}
					>
						Security Status
					</h3>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
							gap: '8px',
							fontSize: '12px'
						}}
					>
						<div>
							<span style={{ color: '#cccccc' }}>Providers: </span>
							<span style={{ color: '#4fc1ff' }}>
								{credentialStats.totalProviders}
							</span>
						</div>
						<div>
							<span style={{ color: '#cccccc' }}>Encryption: </span>
							<span style={{ color: '#4fc1ff' }}>
								{credentialStats.encryptionAlgorithm}
							</span>
						</div>
						<div>
							<span style={{ color: '#cccccc' }}>Last Updated: </span>
							<span style={{ color: '#4fc1ff' }}>
								{credentialStats.lastUpdated.toLocaleDateString()}
							</span>
						</div>
						<div>
							<span style={{ color: '#cccccc' }}>Rotation: </span>
							<span
								style={{
									color: credentialStats.rotationEnabled ? '#4fc1ff' : '#808080'
								}}
							>
								{credentialStats.rotationEnabled ? 'Enabled' : 'Disabled'}
							</span>
						</div>
					</div>
				</div>
			)}

			{/* Credentials List */}
			<div style={{ marginBottom: '16px' }}>
				<h3
					style={{ color: '#569cd6', marginBottom: '12px', fontSize: '14px' }}
				>
					Stored Credentials
				</h3>

				{credentials.length === 0 ? (
					<div
						style={{
							padding: '24px',
							textAlign: 'center',
							color: '#808080',
							backgroundColor: '#252526',
							border: '1px solid #3c3c3c',
							borderRadius: '4px'
						}}
					>
						No credentials stored yet. Add your first API key to get started.
					</div>
				) : (
					<div style={{ space: '8px' }}>
						{credentials.map((credential) => (
							<CredentialCard
								key={credential.id}
								credential={credential}
								onRemove={() => handleRemoveCredential(credential.provider)}
								onTest={() => handleTestCredential(credential.provider)}
								readOnly={readOnly}
								isSelected={selectedCredential === credential.id}
								onClick={() => setSelectedCredential(credential.id)}
							/>
						))}
					</div>
				)}
			</div>

			{/* Add Credential Form */}
			{showNewCredentialForm && !readOnly && (
				<NewCredentialForm
					credential={newCredential}
					onChange={setNewCredential}
					onSubmit={handleAddCredential}
					onCancel={() => {
						setShowNewCredentialForm(false);
						setValidationErrors([]);
					}}
					validationErrors={validationErrors}
					isLoading={isLoading}
				/>
			)}
		</div>
	);
};

interface CredentialCardProps {
	credential: CredentialEntry;
	onRemove: () => void;
	onTest: () => void;
	readOnly: boolean;
	isSelected: boolean;
	onClick: () => void;
}

const CredentialCard: React.FC<CredentialCardProps> = ({
	credential,
	onRemove,
	onTest,
	readOnly,
	isSelected,
	onClick
}) => {
	return (
		<div
			onClick={onClick}
			style={{
				padding: '12px',
				backgroundColor: isSelected ? '#264f78' : '#252526',
				border: `1px solid ${isSelected ? '#0e639c' : '#3c3c3c'}`,
				borderRadius: '4px',
				marginBottom: '8px',
				cursor: 'pointer'
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center'
				}}
			>
				<div style={{ flex: 1 }}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '8px',
							marginBottom: '4px'
						}}
					>
						<span
							style={{ color: '#569cd6', fontWeight: 'bold', fontSize: '14px' }}
						>
							{credential.name}
						</span>
						<span
							style={{
								padding: '2px 6px',
								backgroundColor: '#3c3c3c',
								borderRadius: '10px',
								fontSize: '10px',
								color: '#cccccc'
							}}
						>
							{credential.type}
						</span>
					</div>

					<div
						style={{ fontSize: '12px', color: '#cccccc', marginBottom: '4px' }}
					>
						Provider: {credential.provider}
					</div>

					<div style={{ fontSize: '12px', color: '#808080' }}>
						Value: {credential.value}
					</div>

					<div style={{ fontSize: '11px', color: '#666666', marginTop: '4px' }}>
						Last updated: {credential.lastUpdated.toLocaleString()}
					</div>
				</div>

				{!readOnly && (
					<div style={{ display: 'flex', gap: '4px' }}>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onTest();
							}}
							style={{
								padding: '4px 8px',
								backgroundColor: 'transparent',
								color: '#4fc1ff',
								border: '1px solid #4fc1ff',
								borderRadius: '3px',
								cursor: 'pointer',
								fontSize: '11px'
							}}
							title="Test credential"
						>
							Test
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								onRemove();
							}}
							style={{
								padding: '4px 8px',
								backgroundColor: 'transparent',
								color: '#f44747',
								border: '1px solid #f44747',
								borderRadius: '3px',
								cursor: 'pointer',
								fontSize: '11px'
							}}
							title="Remove credential"
						>
							Remove
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

interface NewCredentialFormProps {
	credential: CredentialFormData;
	onChange: (credential: CredentialFormData) => void;
	onSubmit: () => void;
	onCancel: () => void;
	validationErrors: ValidationError[];
	isLoading: boolean;
}

const NewCredentialForm: React.FC<NewCredentialFormProps> = ({
	credential,
	onChange,
	onSubmit,
	onCancel,
	validationErrors,
	isLoading
}) => {
	const updateField = (field: keyof CredentialFormData, value: string) => {
		onChange({ ...credential, [field]: value });
	};

	const getFieldError = (field: string) => {
		return validationErrors.find((error) => error.field === field);
	};

	return (
		<div
			style={{
				backgroundColor: '#252526',
				border: '1px solid #3c3c3c',
				borderRadius: '4px',
				padding: '16px',
				marginTop: '16px'
			}}
		>
			<h3 style={{ color: '#569cd6', margin: '0 0 16px 0', fontSize: '14px' }}>
				Add New Credential
			</h3>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: '12px',
					marginBottom: '16px'
				}}
			>
				<div>
					<label
						style={{
							display: 'block',
							marginBottom: '4px',
							fontSize: '12px',
							color: '#cccccc'
						}}
					>
						Provider
					</label>
					<select
						value={credential.provider}
						onChange={(e) => updateField('provider', e.target.value)}
						style={{
							width: '100%',
							padding: '6px',
							backgroundColor: '#3c3c3c',
							color: '#d4d4d4',
							border: `1px solid ${
								getFieldError('provider') ? '#f44747' : '#5a5a5a'
							}`,
							borderRadius: '3px',
							fontSize: '12px'
						}}
					>
						<option value="anthropic">Anthropic (Claude)</option>
						<option value="openai">OpenAI (GPT)</option>
						<option value="custom">Custom Provider</option>
					</select>
					{getFieldError('provider') && (
						<div
							style={{ color: '#f44747', fontSize: '10px', marginTop: '2px' }}
						>
							{getFieldError('provider')?.message}
						</div>
					)}
				</div>

				<div>
					<label
						style={{
							display: 'block',
							marginBottom: '4px',
							fontSize: '12px',
							color: '#cccccc'
						}}
					>
						Type
					</label>
					<select
						value={credential.type}
						onChange={(e) => updateField('type', e.target.value as any)}
						style={{
							width: '100%',
							padding: '6px',
							backgroundColor: '#3c3c3c',
							color: '#d4d4d4',
							border: '1px solid #5a5a5a',
							borderRadius: '3px',
							fontSize: '12px'
						}}
					>
						<option value="api_key">API Key</option>
						<option value="token">Token</option>
						<option value="certificate">Certificate</option>
						<option value="custom">Custom</option>
					</select>
				</div>
			</div>

			<div style={{ marginBottom: '16px' }}>
				<label
					style={{
						display: 'block',
						marginBottom: '4px',
						fontSize: '12px',
						color: '#cccccc'
					}}
				>
					Credential Value
				</label>
				<input
					type="password"
					value={credential.value}
					onChange={(e) => updateField('value', e.target.value)}
					placeholder="Enter API key, token, or credential value..."
					style={{
						width: '100%',
						padding: '8px',
						backgroundColor: '#3c3c3c',
						color: '#d4d4d4',
						border: `1px solid ${
							getFieldError('value') ? '#f44747' : '#5a5a5a'
						}`,
						borderRadius: '3px',
						fontSize: '12px'
					}}
				/>
				{getFieldError('value') && (
					<div
						style={{
							color:
								getFieldError('value')?.severity === 'error'
									? '#f44747'
									: '#ffcc02',
							fontSize: '10px',
							marginTop: '2px'
						}}
					>
						{getFieldError('value')?.message}
					</div>
				)}
			</div>

			<div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
				<button
					onClick={onCancel}
					style={{
						padding: '6px 12px',
						backgroundColor: 'transparent',
						color: '#cccccc',
						border: '1px solid #3c3c3c',
						borderRadius: '3px',
						cursor: 'pointer',
						fontSize: '12px'
					}}
				>
					Cancel
				</button>
				<button
					onClick={onSubmit}
					disabled={isLoading || !credential.value.trim()}
					style={{
						padding: '6px 12px',
						backgroundColor: credential.value.trim() ? '#0e639c' : '#3c3c3c',
						color: credential.value.trim() ? '#ffffff' : '#808080',
						border: 'none',
						borderRadius: '3px',
						cursor: credential.value.trim() ? 'pointer' : 'not-allowed',
						fontSize: '12px'
					}}
				>
					{isLoading ? 'Adding...' : 'Add Credential'}
				</button>
			</div>
		</div>
	);
};
