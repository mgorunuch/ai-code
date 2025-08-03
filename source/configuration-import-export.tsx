import React, { useState, useRef } from 'react';
import {
	ConfigurationPreset,
	ConfigurationContext,
	ValidationError,
	ConfigurationChange
} from './types';

export interface ConfigurationImportExportProps {
	context: ConfigurationContext;
	onChange?: (changes: ConfigurationChange[]) => void;
}

interface ExportOptions {
	format: 'json' | 'yaml' | 'typescript';
	includeCredentials: boolean;
	includeUserSettings: boolean;
	includeComments: boolean;
	compressOutput: boolean;
	selectedComponents: string[];
}

interface ImportResult {
	success: boolean;
	errors: ValidationError[];
	warnings: ValidationError[];
	preview: any;
	changes: ConfigurationChange[];
}

interface PresetMetadata {
	name: string;
	description: string;
	version: string;
	tags: string[];
	author?: string;
	created: Date;
}

export const ConfigurationImportExport: React.FC<
	ConfigurationImportExportProps
> = ({ context, onChange }) => {
	const [activeTab, setActiveTab] = useState<'export' | 'import' | 'presets'>(
		'export'
	);
	const [exportOptions, setExportOptions] = useState<ExportOptions>({
		format: 'json',
		includeCredentials: false,
		includeUserSettings: true,
		includeComments: true,
		compressOutput: false,
		selectedComponents: ['agents', 'models', 'security']
	});
	const [exportResult, setExportResult] = useState<string>('');
	const [importResult, setImportResult] = useState<ImportResult | null>(null);
	const [presets, setPresets] = useState<ConfigurationPreset[]>([]);
	const [newPreset, setNewPreset] = useState<PresetMetadata>({
		name: '',
		description: '',
		version: '1.0.0',
		tags: [],
		created: new Date()
	});
	const [showNewPresetForm, setShowNewPresetForm] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [dragOver, setDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const availableComponents = [
		{
			id: 'agents',
			name: 'Agent Configurations',
			description: 'All agent definitions and tools'
		},
		{
			id: 'models',
			name: 'Model Selection',
			description: 'Model configuration and selection rules'
		},
		{
			id: 'security',
			name: 'Security Settings',
			description:
				'Access patterns and security configuration (excluding credentials)'
		},
		{
			id: 'logging',
			name: 'Logging Configuration',
			description: 'Logging levels and output settings'
		},
		{
			id: 'orchestration',
			name: 'Orchestration Settings',
			description: 'Core orchestration and permission settings'
		}
	];

	const handleExport = async () => {
		setIsProcessing(true);
		try {
			const configToExport = filterConfigForExport(
				context.resolvedConfig,
				exportOptions
			);
			const formatted = await formatConfiguration(
				configToExport,
				exportOptions
			);
			setExportResult(formatted);
		} catch (error) {
			console.error('Export failed:', error);
			setExportResult(`Error: ${error}`);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleDownloadExport = () => {
		if (!exportResult) return;

		const blob = new Blob([exportResult], {
			type: getContentType(exportOptions.format)
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ai-code-config.${exportOptions.format}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const handleFileImport = async (file: File) => {
		setIsProcessing(true);
		try {
			const content = await file.text();
			const result = await processImportContent(content, file.name);
			setImportResult(result);
		} catch (error) {
			console.error('Import failed:', error);
			setImportResult({
				success: false,
				errors: [
					{
						field: 'import',
						message: `Failed to import file: ${error}`,
						severity: 'error'
					}
				],
				warnings: [],
				preview: null,
				changes: []
			});
		} finally {
			setIsProcessing(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			handleFileImport(files[0]);
		}
	};

	const handleApplyImport = () => {
		if (importResult?.changes) {
			onChange?.(importResult.changes);
			setImportResult(null);
		}
	};

	const handleSaveAsPreset = async () => {
		if (!newPreset.name.trim()) return;

		const preset: ConfigurationPreset = {
			id: `preset-${Date.now()}`,
			name: newPreset.name,
			description: newPreset.description,
			version: newPreset.version,
			created: new Date(),
			modified: new Date(),
			config: {
				agents: context.resolvedConfig.agents,
				models: context.resolvedConfig.modelSelection,
				settings: {
					logging: context.resolvedConfig.logging,
					defaultPermissions: context.resolvedConfig.defaultPermissions
				}
			},
			tags: newPreset.tags
		};

		setPresets((prev) => [...prev, preset]);
		setNewPreset({
			name: '',
			description: '',
			version: '1.0.0',
			tags: [],
			created: new Date()
		});
		setShowNewPresetForm(false);
	};

	const handleLoadPreset = (preset: ConfigurationPreset) => {
		const changes: ConfigurationChange[] = [];

		if (preset.config.agents) {
			changes.push({
				id: `preset-agents-${Date.now()}`,
				type: 'agent',
				action: 'update',
				path: 'agents',
				oldValue: context.resolvedConfig.agents,
				newValue: preset.config.agents,
				timestamp: new Date(),
				impact: `Loaded agents from preset "${preset.name}"`
			});
		}

		if (preset.config.models) {
			changes.push({
				id: `preset-models-${Date.now()}`,
				type: 'model',
				action: 'update',
				path: 'modelSelection',
				oldValue: context.resolvedConfig.modelSelection,
				newValue: preset.config.models,
				timestamp: new Date(),
				impact: `Loaded model configuration from preset "${preset.name}"`
			});
		}

		onChange?.(changes);
	};

	const processImportContent = async (
		content: string,
		filename: string
	): Promise<ImportResult> => {
		try {
			// Determine format from file extension
			const format =
				filename.endsWith('.yaml') || filename.endsWith('.yml')
					? 'yaml'
					: filename.endsWith('.ts')
					? 'typescript'
					: 'json';

			// Parse content based on format
			let parsed: any;
			switch (format) {
				case 'json':
					parsed = JSON.parse(content);
					break;
				case 'yaml':
					// Simple YAML parsing - in production, use a proper YAML parser
					parsed = parseSimpleYaml(content);
					break;
				case 'typescript':
					// Extract configuration from TypeScript - simplified approach
					parsed = parseTypeScriptConfig(content);
					break;
				default:
					throw new Error(`Unsupported format: ${format}`);
			}

			// Validate the parsed configuration
			const errors: ValidationError[] = [];
			const warnings: ValidationError[] = [];

			if (!parsed || typeof parsed !== 'object') {
				errors.push({
					field: 'format',
					message: 'Invalid configuration format',
					severity: 'error'
				});
			}

			// Check for required fields
			if (parsed.agents && !Array.isArray(parsed.agents)) {
				errors.push({
					field: 'agents',
					message: 'Agents must be an array',
					severity: 'error'
				});
			}

			// Generate changes
			const changes: ConfigurationChange[] = [];
			if (parsed.agents) {
				changes.push({
					id: `import-agents-${Date.now()}`,
					type: 'agent',
					action: 'update',
					path: 'agents',
					oldValue: context.resolvedConfig.agents,
					newValue: parsed.agents,
					timestamp: new Date(),
					impact: `Imported ${parsed.agents.length} agent(s)`
				});
			}

			if (parsed.modelSelection) {
				changes.push({
					id: `import-models-${Date.now()}`,
					type: 'model',
					action: 'update',
					path: 'modelSelection',
					oldValue: context.resolvedConfig.modelSelection,
					newValue: parsed.modelSelection,
					timestamp: new Date(),
					impact: 'Imported model selection configuration'
				});
			}

			return {
				success: errors.length === 0,
				errors,
				warnings,
				preview: parsed,
				changes
			};
		} catch (error) {
			return {
				success: false,
				errors: [
					{
						field: 'parsing',
						message: `Failed to parse configuration: ${error}`,
						severity: 'error'
					}
				],
				warnings: [],
				preview: null,
				changes: []
			};
		}
	};

	return (
		<div style={{ padding: '16px' }}>
			{/* Header */}
			<div style={{ marginBottom: '16px' }}>
				<h2 style={{ color: '#569cd6', marginBottom: '12px' }}>
					Import/Export Configuration
				</h2>

				{/* Tab Navigation */}
				<div style={{ display: 'flex', gap: '4px' }}>
					{[
						{ id: 'export', label: 'Export' },
						{ id: 'import', label: 'Import' },
						{ id: 'presets', label: 'Presets' }
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id as any)}
							style={{
								padding: '6px 12px',
								backgroundColor:
									activeTab === tab.id ? '#0e639c' : 'transparent',
								color: activeTab === tab.id ? '#ffffff' : '#cccccc',
								border: '1px solid #3c3c3c',
								borderRadius: '4px 4px 0 0',
								cursor: 'pointer',
								fontSize: '12px'
							}}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* Export Tab */}
			{activeTab === 'export' && (
				<div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '16px'
						}}
					>
						{/* Export Options */}
						<div>
							<h3
								style={{
									color: '#569cd6',
									marginBottom: '12px',
									fontSize: '14px'
								}}
							>
								Export Options
							</h3>

							<div style={{ marginBottom: '12px' }}>
								<label
									style={{
										display: 'block',
										marginBottom: '4px',
										fontSize: '12px',
										color: '#cccccc'
									}}
								>
									Export Format
								</label>
								<select
									value={exportOptions.format}
									onChange={(e) =>
										setExportOptions((prev) => ({
											...prev,
											format: e.target.value as any
										}))
									}
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
									<option value="json">JSON</option>
									<option value="yaml">YAML</option>
									<option value="typescript">TypeScript</option>
								</select>
							</div>

							<div style={{ marginBottom: '12px' }}>
								<label
									style={{
										display: 'block',
										marginBottom: '8px',
										fontSize: '12px',
										color: '#cccccc'
									}}
								>
									Components to Export
								</label>
								{availableComponents.map((component) => (
									<label
										key={component.id}
										style={{
											display: 'flex',
											alignItems: 'center',
											marginBottom: '4px',
											fontSize: '11px',
											color: '#cccccc'
										}}
									>
										<input
											type="checkbox"
											checked={exportOptions.selectedComponents.includes(
												component.id
											)}
											onChange={(e) => {
												const selected = e.target.checked
													? [...exportOptions.selectedComponents, component.id]
													: exportOptions.selectedComponents.filter(
															(id) => id !== component.id
													  );
												setExportOptions((prev) => ({
													...prev,
													selectedComponents: selected
												}));
											}}
											style={{ marginRight: '6px' }}
										/>
										<div>
											<div>{component.name}</div>
											<div style={{ fontSize: '10px', color: '#808080' }}>
												{component.description}
											</div>
										</div>
									</label>
								))}
							</div>

							<div style={{ marginBottom: '12px' }}>
								<label
									style={{
										display: 'flex',
										alignItems: 'center',
										fontSize: '11px',
										color: '#cccccc',
										marginBottom: '4px'
									}}
								>
									<input
										type="checkbox"
										checked={exportOptions.includeUserSettings}
										onChange={(e) =>
											setExportOptions((prev) => ({
												...prev,
												includeUserSettings: e.target.checked
											}))
										}
										style={{ marginRight: '6px' }}
									/>
									Include User Settings
								</label>
								<label
									style={{
										display: 'flex',
										alignItems: 'center',
										fontSize: '11px',
										color: '#cccccc',
										marginBottom: '4px'
									}}
								>
									<input
										type="checkbox"
										checked={exportOptions.includeComments}
										onChange={(e) =>
											setExportOptions((prev) => ({
												...prev,
												includeComments: e.target.checked
											}))
										}
										style={{ marginRight: '6px' }}
									/>
									Include Comments and Documentation
								</label>
								<label
									style={{
										display: 'flex',
										alignItems: 'center',
										fontSize: '11px',
										color: '#f44747'
									}}
								>
									<input
										type="checkbox"
										checked={exportOptions.includeCredentials}
										onChange={(e) =>
											setExportOptions((prev) => ({
												...prev,
												includeCredentials: e.target.checked
											}))
										}
										style={{ marginRight: '6px' }}
									/>
									Include Credentials (NOT RECOMMENDED)
								</label>
							</div>

							<div style={{ display: 'flex', gap: '8px' }}>
								<button
									onClick={handleExport}
									disabled={isProcessing}
									style={{
										padding: '8px 12px',
										backgroundColor: '#0e639c',
										color: '#ffffff',
										border: 'none',
										borderRadius: '4px',
										cursor: 'pointer',
										fontSize: '12px'
									}}
								>
									{isProcessing ? 'Exporting...' : 'Generate Export'}
								</button>

								{exportResult && (
									<button
										onClick={handleDownloadExport}
										style={{
											padding: '8px 12px',
											backgroundColor: '#4fc1ff',
											color: '#1e1e1e',
											border: 'none',
											borderRadius: '4px',
											cursor: 'pointer',
											fontSize: '12px'
										}}
									>
										Download
									</button>
								)}
							</div>
						</div>

						{/* Export Preview */}
						<div>
							<h3
								style={{
									color: '#569cd6',
									marginBottom: '12px',
									fontSize: '14px'
								}}
							>
								Export Preview
							</h3>
							<textarea
								value={exportResult}
								readOnly
								style={{
									width: '100%',
									height: '300px',
									padding: '8px',
									backgroundColor: '#1e1e1e',
									color: '#d4d4d4',
									border: '1px solid #3c3c3c',
									borderRadius: '4px',
									fontSize: '11px',
									fontFamily: 'Consolas, monospace',
									resize: 'vertical'
								}}
								placeholder="Export output will appear here..."
							/>
						</div>
					</div>
				</div>
			)}

			{/* Import Tab */}
			{activeTab === 'import' && (
				<div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: '16px'
						}}
					>
						{/* Import Area */}
						<div>
							<h3
								style={{
									color: '#569cd6',
									marginBottom: '12px',
									fontSize: '14px'
								}}
							>
								Import Configuration
							</h3>

							{/* File Drop Zone */}
							<div
								onDrop={handleDrop}
								onDragOver={(e) => {
									e.preventDefault();
									setDragOver(true);
								}}
								onDragLeave={() => setDragOver(false)}
								onClick={() => fileInputRef.current?.click()}
								style={{
									padding: '32px',
									border: `2px dashed ${dragOver ? '#0e639c' : '#3c3c3c'}`,
									borderRadius: '4px',
									textAlign: 'center',
									cursor: 'pointer',
									backgroundColor: dragOver ? '#264f78' : '#252526',
									marginBottom: '16px'
								}}
							>
								<div
									style={{
										fontSize: '24px',
										marginBottom: '8px',
										color: '#569cd6'
									}}
								>
									📁
								</div>
								<div style={{ color: '#cccccc', marginBottom: '4px' }}>
									Drop configuration file here or click to browse
								</div>
								<div style={{ fontSize: '11px', color: '#808080' }}>
									Supports JSON, YAML, and TypeScript files
								</div>
							</div>

							<input
								ref={fileInputRef}
								type="file"
								accept=".json,.yaml,.yml,.ts"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) handleFileImport(file);
								}}
								style={{ display: 'none' }}
							/>

							{isProcessing && (
								<div
									style={{
										padding: '8px',
										textAlign: 'center',
										color: '#4fc1ff',
										fontSize: '12px'
									}}
								>
									Processing import...
								</div>
							)}
						</div>

						{/* Import Results */}
						<div>
							<h3
								style={{
									color: '#569cd6',
									marginBottom: '12px',
									fontSize: '14px'
								}}
							>
								Import Results
							</h3>

							{importResult ? (
								<div>
									{/* Import Status */}
									<div
										style={{
											padding: '8px',
											backgroundColor: importResult.success
												? '#1e3a1e'
												: '#3c1e1e',
											border: `1px solid ${
												importResult.success ? '#4fc1ff' : '#f44747'
											}`,
											borderRadius: '4px',
											marginBottom: '12px',
											fontSize: '12px'
										}}
									>
										<div
											style={{
												color: importResult.success ? '#4fc1ff' : '#f44747',
												fontWeight: 'bold',
												marginBottom: '4px'
											}}
										>
											{importResult.success
												? '✓ Import Successful'
												: '✗ Import Failed'}
										</div>
										{importResult.changes.length > 0 && (
											<div style={{ color: '#cccccc' }}>
												{importResult.changes.length} change(s) ready to apply
											</div>
										)}
									</div>

									{/* Errors and Warnings */}
									{[...importResult.errors, ...importResult.warnings].map(
										(issue, index) => (
											<div
												key={index}
												style={{
													padding: '6px',
													backgroundColor:
														issue.severity === 'error' ? '#3c1e1e' : '#3c3c1e',
													border: `1px solid ${
														issue.severity === 'error' ? '#f44747' : '#ffcc02'
													}`,
													borderRadius: '3px',
													marginBottom: '4px',
													fontSize: '11px'
												}}
											>
												<span
													style={{
														color:
															issue.severity === 'error' ? '#f44747' : '#ffcc02'
													}}
												>
													[{issue.severity.toUpperCase()}] {issue.field}:{' '}
													{issue.message}
												</span>
											</div>
										)
									)}

									{/* Apply Button */}
									{importResult.success && importResult.changes.length > 0 && (
										<button
											onClick={handleApplyImport}
											style={{
												padding: '8px 12px',
												backgroundColor: '#0e639c',
												color: '#ffffff',
												border: 'none',
												borderRadius: '4px',
												cursor: 'pointer',
												fontSize: '12px',
												marginTop: '8px'
											}}
										>
											Apply Import
										</button>
									)}
								</div>
							) : (
								<div
									style={{
										padding: '16px',
										textAlign: 'center',
										color: '#808080',
										fontSize: '12px'
									}}
								>
									Import a configuration file to see results here
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Presets Tab */}
			{activeTab === 'presets' && (
				<div>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							marginBottom: '16px'
						}}
					>
						<h3 style={{ color: '#569cd6', margin: 0, fontSize: '14px' }}>
							Configuration Presets
						</h3>
						<button
							onClick={() => setShowNewPresetForm(true)}
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
							Save Current as Preset
						</button>
					</div>

					{/* Preset List */}
					<div style={{ space: '8px' }}>
						{presets.length === 0 ? (
							<div
								style={{
									padding: '24px',
									textAlign: 'center',
									backgroundColor: '#252526',
									border: '1px solid #3c3c3c',
									borderRadius: '4px',
									color: '#808080'
								}}
							>
								No presets saved yet. Save your current configuration as a
								preset to reuse it later.
							</div>
						) : (
							presets.map((preset) => (
								<PresetCard
									key={preset.id}
									preset={preset}
									onLoad={() => handleLoadPreset(preset)}
									onDelete={(id) =>
										setPresets((prev) => prev.filter((p) => p.id !== id))
									}
								/>
							))
						)}
					</div>

					{/* New Preset Form */}
					{showNewPresetForm && (
						<NewPresetForm
							preset={newPreset}
							onChange={setNewPreset}
							onSave={handleSaveAsPreset}
							onCancel={() => setShowNewPresetForm(false)}
						/>
					)}
				</div>
			)}
		</div>
	);
};

// Helper components and functions
interface PresetCardProps {
	preset: ConfigurationPreset;
	onLoad: () => void;
	onDelete: (id: string) => void;
}

const PresetCard: React.FC<PresetCardProps> = ({
	preset,
	onLoad,
	onDelete
}) => (
	<div
		style={{
			padding: '12px',
			backgroundColor: '#252526',
			border: '1px solid #3c3c3c',
			borderRadius: '4px',
			marginBottom: '8px'
		}}
	>
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'flex-start'
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
						{preset.name}
					</span>
					<span style={{ fontSize: '11px', color: '#808080' }}>
						v{preset.version}
					</span>
				</div>

				<div
					style={{ color: '#cccccc', fontSize: '12px', marginBottom: '8px' }}
				>
					{preset.description}
				</div>

				<div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
					{preset.tags.map((tag) => (
						<span
							key={tag}
							style={{
								padding: '2px 6px',
								backgroundColor: '#3c3c3c',
								borderRadius: '10px',
								fontSize: '10px',
								color: '#cccccc'
							}}
						>
							{tag}
						</span>
					))}
				</div>

				<div style={{ fontSize: '11px', color: '#666666' }}>
					Created: {preset.created.toLocaleDateString()}
				</div>
			</div>

			<div style={{ display: 'flex', gap: '4px' }}>
				<button
					onClick={onLoad}
					style={{
						padding: '4px 8px',
						backgroundColor: '#0e639c',
						color: '#ffffff',
						border: 'none',
						borderRadius: '3px',
						cursor: 'pointer',
						fontSize: '11px'
					}}
				>
					Load
				</button>
				<button
					onClick={() => {
						if (window.confirm(`Delete preset "${preset.name}"?`)) {
							onDelete(preset.id);
						}
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
				>
					Delete
				</button>
			</div>
		</div>
	</div>
);

interface NewPresetFormProps {
	preset: PresetMetadata;
	onChange: (preset: PresetMetadata) => void;
	onSave: () => void;
	onCancel: () => void;
}

const NewPresetForm: React.FC<NewPresetFormProps> = ({
	preset,
	onChange,
	onSave,
	onCancel
}) => (
	<div
		style={{
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: 'rgba(0, 0, 0, 0.7)',
			display: 'flex',
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 1000
		}}
	>
		<div
			style={{
				backgroundColor: '#252526',
				border: '1px solid #3c3c3c',
				borderRadius: '4px',
				padding: '16px',
				width: '400px'
			}}
		>
			<h3 style={{ color: '#569cd6', margin: '0 0 16px 0', fontSize: '14px' }}>
				Save Configuration Preset
			</h3>

			<div style={{ marginBottom: '12px' }}>
				<label
					style={{
						display: 'block',
						marginBottom: '4px',
						fontSize: '12px',
						color: '#cccccc'
					}}
				>
					Preset Name
				</label>
				<input
					type="text"
					value={preset.name}
					onChange={(e) => onChange({ ...preset, name: e.target.value })}
					placeholder="Enter preset name..."
					style={{
						width: '100%',
						padding: '6px',
						backgroundColor: '#3c3c3c',
						color: '#d4d4d4',
						border: '1px solid #5a5a5a',
						borderRadius: '3px',
						fontSize: '12px'
					}}
				/>
			</div>

			<div style={{ marginBottom: '12px' }}>
				<label
					style={{
						display: 'block',
						marginBottom: '4px',
						fontSize: '12px',
						color: '#cccccc'
					}}
				>
					Description
				</label>
				<textarea
					value={preset.description}
					onChange={(e) => onChange({ ...preset, description: e.target.value })}
					placeholder="Describe this configuration preset..."
					rows={3}
					style={{
						width: '100%',
						padding: '6px',
						backgroundColor: '#3c3c3c',
						color: '#d4d4d4',
						border: '1px solid #5a5a5a',
						borderRadius: '3px',
						fontSize: '12px',
						resize: 'vertical'
					}}
				/>
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
					onClick={onSave}
					disabled={!preset.name.trim()}
					style={{
						padding: '6px 12px',
						backgroundColor: preset.name.trim() ? '#0e639c' : '#3c3c3c',
						color: preset.name.trim() ? '#ffffff' : '#808080',
						border: 'none',
						borderRadius: '3px',
						cursor: preset.name.trim() ? 'pointer' : 'not-allowed',
						fontSize: '12px'
					}}
				>
					Save Preset
				</button>
			</div>
		</div>
	</div>
);

// Utility functions
function filterConfigForExport(config: any, options: ExportOptions): any {
	const filtered: any = {};

	if (options.selectedComponents.includes('agents') && config.agents) {
		filtered.agents = config.agents;
	}

	if (options.selectedComponents.includes('models') && config.modelSelection) {
		filtered.modelSelection = config.modelSelection;
	}

	if (options.selectedComponents.includes('security') && config.security) {
		// Filter out credentials unless explicitly included
		filtered.security = { ...config.security };
		if (!options.includeCredentials) {
			delete filtered.security.credentials;
		}
	}

	if (options.selectedComponents.includes('logging') && config.logging) {
		filtered.logging = config.logging;
	}

	if (options.selectedComponents.includes('orchestration')) {
		if (config.defaultPermissions)
			filtered.defaultPermissions = config.defaultPermissions;
		if (config.accessPatterns) filtered.accessPatterns = config.accessPatterns;
	}

	return filtered;
}

async function formatConfiguration(
	config: any,
	options: ExportOptions
): Promise<string> {
	switch (options.format) {
		case 'json':
			return JSON.stringify(config, null, options.compressOutput ? 0 : 2);

		case 'yaml':
			// Simple YAML formatting - in production, use a proper YAML library
			return convertToYaml(config, options.includeComments);

		case 'typescript':
			return formatAsTypeScript(config, options.includeComments);

		default:
			return JSON.stringify(config, null, 2);
	}
}

function convertToYaml(obj: any, includeComments: boolean): string {
	// Simplified YAML conversion - in production, use js-yaml or similar
	let yaml = includeComments
		? '# AI Code Configuration Export\n# Generated on ' +
		  new Date().toISOString() +
		  '\n\n'
		: '';
	yaml += JSON.stringify(obj, null, 2)
		.replace(/\{/g, '')
		.replace(/\}/g, '')
		.replace(/\[/g, '')
		.replace(/\]/g, '')
		.replace(/",/g, '"')
		.replace(/"/g, '')
		.replace(/:/g, ': ');
	return yaml;
}

function formatAsTypeScript(config: any, includeComments: boolean): string {
	let ts = includeComments
		? `// AI Code Configuration Export
// Generated on ${new Date().toISOString()}

import { CompleteConfig } from '@ai-code/core';

`
		: '';

	ts += `export const configuration: CompleteConfig = ${JSON.stringify(
		config,
		null,
		2
	)};`;
	return ts;
}

function parseSimpleYaml(content: string): any {
	// Very basic YAML parsing - in production, use js-yaml
	try {
		const lines = content
			.split('\n')
			.filter((line) => !line.trim().startsWith('#'));
		const obj: any = {};

		// This is a simplified parser - real implementation would be much more robust
		lines.forEach((line) => {
			const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
			if (match) {
				const [, indent, key, value] = match;
				obj[key.trim()] = value.trim() || {};
			}
		});

		return obj;
	} catch {
		throw new Error('Failed to parse YAML');
	}
}

function parseTypeScriptConfig(content: string): any {
	// Extract configuration object from TypeScript - simplified approach
	const match = content.match(/export\s+const\s+\w+.*?=\s*({[\s\S]*?});/);
	if (match) {
		// This is dangerous - in production, use proper TypeScript AST parsing
		try {
			return eval('(' + match[1] + ')');
		} catch {
			throw new Error('Failed to parse TypeScript configuration');
		}
	}
	throw new Error('No configuration export found in TypeScript file');
}

function getContentType(format: string): string {
	switch (format) {
		case 'json':
			return 'application/json';
		case 'yaml':
			return 'application/x-yaml';
		case 'typescript':
			return 'text/typescript';
		default:
			return 'text/plain';
	}
}
