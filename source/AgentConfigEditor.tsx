import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
	AgentConfigFile,
	ValidationResult,
	ValidationError,
	EditorSettings,
	AgentToolConfig,
	AccessPatternConfig,
	ConfigurationChange
} from './types';

export interface AgentConfigEditorProps {
	configFile?: AgentConfigFile;
	onSave?: (content: string) => void;
	onChange?: (changes: ConfigurationChange[]) => void;
	onValidationChange?: (result: ValidationResult) => void;
	editorSettings?: EditorSettings;
	readOnly?: boolean;
}

interface AgentCapabilityForm {
	id: string;
	name: string;
	description: string;
	tools: AgentToolConfig[];
	endpoints: { name: string; description: string }[];
}

export const AgentConfigEditor: React.FC<AgentConfigEditorProps> = ({
	configFile,
	onSave,
	onChange,
	onValidationChange,
	editorSettings = {
		theme: 'dark',
		fontSize: 12,
		tabSize: 2,
		wordWrap: true,
		lineNumbers: true,
		minimap: false,
		autoComplete: true,
		syntaxHighlighting: true
	},
	readOnly = false
}) => {
	const [content, setContent] = useState(
		configFile?.content || getDefaultAgentTemplate()
	);
	const [mode, setMode] = useState<'visual' | 'code'>('visual');
	const [agentForm, setAgentForm] = useState<AgentCapabilityForm>(
		parseAgentFromContent(content)
	);
	const [validationResult, setValidationResult] = useState<ValidationResult>({
		valid: true,
		errors: [],
		warnings: [],
		suggestions: []
	});
	const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Validate content on change
	useEffect(() => {
		const validateContent = async () => {
			const result = await validateAgentConfig(content);
			setValidationResult(result);
			onValidationChange?.(result);
		};

		validateContent();
	}, [content, onValidationChange]);

	// Sync form and content
	useEffect(() => {
		if (mode === 'visual') {
			setAgentForm(parseAgentFromContent(content));
		}
	}, [content, mode]);

	const handleContentChange = useCallback(
		(newContent: string) => {
			setContent(newContent);

			// Track changes for preview
			const changes: ConfigurationChange[] = [
				{
					id: `agent-${Date.now()}`,
					type: 'agent',
					action: 'update',
					path: configFile?.filePath || 'new-agent.ts',
					oldValue: configFile?.content,
					newValue: newContent,
					timestamp: new Date(),
					impact: 'Agent configuration updated'
				}
			];

			onChange?.(changes);
		},
		[configFile, onChange]
	);

	const handleFormChange = useCallback(
		(newForm: AgentCapabilityForm) => {
			setAgentForm(newForm);
			const newContent = generateAgentContent(newForm);
			handleContentChange(newContent);
		},
		[handleContentChange]
	);

	const handleSave = () => {
		if (validationResult.errors.length === 0) {
			onSave?.(content);
		}
	};

	const handleKeyPress = (event: React.KeyboardEvent) => {
		if (event.ctrlKey || event.metaKey) {
			switch (event.key) {
				case 's':
					event.preventDefault();
					handleSave();
					break;
				case 'f':
					event.preventDefault();
					// TODO: Implement find functionality
					break;
			}
		}
	};

	const updateCursorPosition = () => {
		if (textareaRef.current) {
			const textarea = textareaRef.current;
			const start = textarea.selectionStart;
			const lines = textarea.value.substring(0, start).split('\n');
			setCursorPosition({
				line: lines.length,
				column: lines[lines.length - 1].length + 1
			});
		}
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				fontFamily: 'monospace'
			}}
		>
			{/* Header */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					padding: '8px 12px',
					borderBottom: '1px solid #3c3c3c',
					backgroundColor: '#2d2d30'
				}}
			>
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
					<h3 style={{ margin: 0, color: '#569cd6', fontSize: '14px' }}>
						{configFile?.name || 'New Agent Configuration'}
					</h3>

					{/* Mode Toggle */}
					<div
						style={{
							display: 'flex',
							border: '1px solid #3c3c3c',
							borderRadius: '4px'
						}}
					>
						<button
							onClick={() => setMode('visual')}
							style={{
								padding: '4px 8px',
								fontSize: '11px',
								backgroundColor: mode === 'visual' ? '#0e639c' : 'transparent',
								color: mode === 'visual' ? '#ffffff' : '#cccccc',
								border: 'none',
								cursor: 'pointer'
							}}
						>
							Visual
						</button>
						<button
							onClick={() => setMode('code')}
							style={{
								padding: '4px 8px',
								fontSize: '11px',
								backgroundColor: mode === 'code' ? '#0e639c' : 'transparent',
								color: mode === 'code' ? '#ffffff' : '#cccccc',
								border: 'none',
								cursor: 'pointer'
							}}
						>
							Code
						</button>
					</div>
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
					{/* Validation Status */}
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '4px',
							fontSize: '11px'
						}}
					>
						{validationResult.errors.length > 0 ? (
							<span style={{ color: '#f44747' }}>
								✗ {validationResult.errors.length} error(s)
							</span>
						) : validationResult.warnings.length > 0 ? (
							<span style={{ color: '#ffcc02' }}>
								⚠ {validationResult.warnings.length} warning(s)
							</span>
						) : (
							<span style={{ color: '#4fc1ff' }}>✓ Valid</span>
						)}
					</div>

					{/* Position indicator */}
					<div style={{ fontSize: '11px', color: '#808080' }}>
						Ln {cursorPosition.line}, Col {cursorPosition.column}
					</div>

					{/* Save button */}
					<button
						onClick={handleSave}
						disabled={readOnly || validationResult.errors.length > 0}
						style={{
							padding: '4px 8px',
							fontSize: '11px',
							backgroundColor:
								validationResult.errors.length === 0 ? '#0e639c' : '#3c3c3c',
							color:
								validationResult.errors.length === 0 ? '#ffffff' : '#808080',
							border: 'none',
							borderRadius: '3px',
							cursor:
								validationResult.errors.length === 0 ? 'pointer' : 'not-allowed'
						}}
					>
						Save
					</button>
				</div>
			</div>

			{/* Editor Content */}
			<div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
				{/* Main Editor */}
				<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
					{mode === 'visual' ? (
						<VisualEditor
							agentForm={agentForm}
							onChange={handleFormChange}
							validationResult={validationResult}
							readOnly={readOnly}
						/>
					) : (
						<CodeEditor
							content={content}
							onChange={handleContentChange}
							editorSettings={editorSettings}
							validationResult={validationResult}
							onKeyPress={handleKeyPress}
							onCursorChange={updateCursorPosition}
							textareaRef={textareaRef}
							readOnly={readOnly}
						/>
					)}
				</div>

				{/* Validation Panel */}
				{(validationResult.errors.length > 0 ||
					validationResult.warnings.length > 0) && (
					<div
						style={{
							width: '300px',
							borderLeft: '1px solid #3c3c3c',
							backgroundColor: '#252526',
							padding: '12px'
						}}
					>
						<ValidationPanel validationResult={validationResult} />
					</div>
				)}
			</div>
		</div>
	);
};

// Visual Editor Component
interface VisualEditorProps {
	agentForm: AgentCapabilityForm;
	onChange: (form: AgentCapabilityForm) => void;
	validationResult: ValidationResult;
	readOnly: boolean;
}

const VisualEditor: React.FC<VisualEditorProps> = ({
	agentForm,
	onChange,
	validationResult,
	readOnly
}) => {
	const updateField = (field: keyof AgentCapabilityForm, value: any) => {
		onChange({ ...agentForm, [field]: value });
	};

	return (
		<div
			style={{
				padding: '16px',
				overflow: 'auto',
				backgroundColor: '#1e1e1e',
				color: '#d4d4d4'
			}}
		>
			{/* Basic Info */}
			<section style={{ marginBottom: '24px' }}>
				<h4 style={{ color: '#569cd6', marginBottom: '12px' }}>
					Basic Information
				</h4>

				<div style={{ marginBottom: '12px' }}>
					<label
						style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}
					>
						Agent ID
					</label>
					<input
						type="text"
						value={agentForm.id}
						onChange={(e) => updateField('id', e.target.value)}
						disabled={readOnly}
						style={{
							width: '100%',
							padding: '6px 8px',
							backgroundColor: '#3c3c3c',
							color: '#d4d4d4',
							border: '1px solid #5a5a5a',
							borderRadius: '3px',
							fontSize: '12px'
						}}
						placeholder="e.g., react-dev"
					/>
				</div>

				<div style={{ marginBottom: '12px' }}>
					<label
						style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}
					>
						Display Name
					</label>
					<input
						type="text"
						value={agentForm.name}
						onChange={(e) => updateField('name', e.target.value)}
						disabled={readOnly}
						style={{
							width: '100%',
							padding: '6px 8px',
							backgroundColor: '#3c3c3c',
							color: '#d4d4d4',
							border: '1px solid #5a5a5a',
							borderRadius: '3px',
							fontSize: '12px'
						}}
						placeholder="e.g., React Development Agent"
					/>
				</div>

				<div style={{ marginBottom: '12px' }}>
					<label
						style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}
					>
						Description
					</label>
					<textarea
						value={agentForm.description}
						onChange={(e) => updateField('description', e.target.value)}
						disabled={readOnly}
						rows={3}
						style={{
							width: '100%',
							padding: '6px 8px',
							backgroundColor: '#3c3c3c',
							color: '#d4d4d4',
							border: '1px solid #5a5a5a',
							borderRadius: '3px',
							fontSize: '12px',
							resize: 'vertical'
						}}
						placeholder="Describe what this agent does..."
					/>
				</div>
			</section>

			{/* Tools Configuration */}
			<ToolsEditor
				tools={agentForm.tools}
				onChange={(tools) => updateField('tools', tools)}
				readOnly={readOnly}
			/>

			{/* Endpoints Configuration */}
			<EndpointsEditor
				endpoints={agentForm.endpoints}
				onChange={(endpoints) => updateField('endpoints', endpoints)}
				readOnly={readOnly}
			/>
		</div>
	);
};

// Code Editor Component
interface CodeEditorProps {
	content: string;
	onChange: (content: string) => void;
	editorSettings: EditorSettings;
	validationResult: ValidationResult;
	onKeyPress: (event: React.KeyboardEvent) => void;
	onCursorChange: () => void;
	textareaRef: React.RefObject<HTMLTextAreaElement>;
	readOnly: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
	content,
	onChange,
	editorSettings,
	validationResult,
	onKeyPress,
	onCursorChange,
	textareaRef,
	readOnly
}) => {
	const lines = content.split('\n');

	return (
		<div
			style={{
				display: 'flex',
				height: '100%',
				backgroundColor: '#1e1e1e'
			}}
		>
			{/* Line Numbers */}
			{editorSettings.lineNumbers && (
				<div
					style={{
						width: '50px',
						backgroundColor: '#252526',
						padding: '8px 4px',
						fontSize: `${editorSettings.fontSize}px`,
						lineHeight: '1.5',
						color: '#858585',
						textAlign: 'right',
						borderRight: '1px solid #3c3c3c',
						userSelect: 'none'
					}}
				>
					{lines.map((_, index) => (
						<div key={index}>{index + 1}</div>
					))}
				</div>
			)}

			{/* Editor */}
			<div style={{ flex: 1, position: 'relative' }}>
				<textarea
					ref={textareaRef}
					value={content}
					onChange={(e) => onChange(e.target.value)}
					onKeyDown={onKeyPress}
					onSelect={onCursorChange}
					onClick={onCursorChange}
					readOnly={readOnly}
					style={{
						width: '100%',
						height: '100%',
						padding: '8px',
						backgroundColor: 'transparent',
						color: '#d4d4d4',
						border: 'none',
						outline: 'none',
						fontSize: `${editorSettings.fontSize}px`,
						fontFamily: 'Consolas, "Courier New", monospace',
						lineHeight: '1.5',
						tabSize: editorSettings.tabSize,
						whiteSpace: editorSettings.wordWrap ? 'pre-wrap' : 'pre',
						resize: 'none'
					}}
					spellCheck={false}
				/>

				{/* Syntax highlighting overlay */}
				{editorSettings.syntaxHighlighting && (
					<SyntaxHighlightOverlay
						content={content}
						editorSettings={editorSettings}
					/>
				)}

				{/* Error indicators */}
				<ErrorIndicators
					validationResult={validationResult}
					editorSettings={editorSettings}
				/>
			</div>
		</div>
	);
};

// Additional components for the editor
const ToolsEditor: React.FC<{
	tools: AgentToolConfig[];
	onChange: (tools: AgentToolConfig[]) => void;
	readOnly: boolean;
}> = ({ tools, onChange, readOnly }) => {
	// Implementation for tools editor
	return (
		<section style={{ marginBottom: '24px' }}>
			<h4 style={{ color: '#569cd6', marginBottom: '12px' }}>
				Tools Configuration
			</h4>
			<div style={{ color: '#808080', fontSize: '12px' }}>
				Tools configuration UI coming soon...
			</div>
		</section>
	);
};

const EndpointsEditor: React.FC<{
	endpoints: { name: string; description: string }[];
	onChange: (endpoints: { name: string; description: string }[]) => void;
	readOnly: boolean;
}> = ({ endpoints, onChange, readOnly }) => {
	// Implementation for endpoints editor
	return (
		<section style={{ marginBottom: '24px' }}>
			<h4 style={{ color: '#569cd6', marginBottom: '12px' }}>
				Endpoints Configuration
			</h4>
			<div style={{ color: '#808080', fontSize: '12px' }}>
				Endpoints configuration UI coming soon...
			</div>
		</section>
	);
};

const ValidationPanel: React.FC<{ validationResult: ValidationResult }> = ({
	validationResult
}) => {
	return (
		<div>
			<h4 style={{ color: '#569cd6', marginBottom: '12px', fontSize: '12px' }}>
				Validation Results
			</h4>

			{validationResult.errors.map((error, index) => (
				<div
					key={`error-${index}`}
					style={{
						marginBottom: '8px',
						padding: '6px',
						backgroundColor: '#3c1e1e',
						border: '1px solid #f44747',
						borderRadius: '3px',
						fontSize: '11px'
					}}
				>
					<div style={{ color: '#f44747', fontWeight: 'bold' }}>Error</div>
					<div style={{ color: '#d4d4d4' }}>{error.message}</div>
					{error.line && (
						<div style={{ color: '#808080' }}>Line {error.line}</div>
					)}
				</div>
			))}

			{validationResult.warnings.map((warning, index) => (
				<div
					key={`warning-${index}`}
					style={{
						marginBottom: '8px',
						padding: '6px',
						backgroundColor: '#3c3c1e',
						border: '1px solid #ffcc02',
						borderRadius: '3px',
						fontSize: '11px'
					}}
				>
					<div style={{ color: '#ffcc02', fontWeight: 'bold' }}>Warning</div>
					<div style={{ color: '#d4d4d4' }}>{warning.message}</div>
					{warning.line && (
						<div style={{ color: '#808080' }}>Line {warning.line}</div>
					)}
				</div>
			))}
		</div>
	);
};

const SyntaxHighlightOverlay: React.FC<{
	content: string;
	editorSettings: EditorSettings;
}> = ({ content, editorSettings }) => {
	// Simple syntax highlighting - could be enhanced with a proper syntax highlighter
	return null;
};

const ErrorIndicators: React.FC<{
	validationResult: ValidationResult;
	editorSettings: EditorSettings;
}> = ({ validationResult, editorSettings }) => {
	// Error indicators in the editor gutter
	return null;
};

// Utility functions
function getDefaultAgentTemplate(): string {
	return `import { AgentCapability } from '@ai-code/core';
import { CommonTools } from '@ai-code/tools';

export const myAgent: AgentCapability = {
  id: 'my-agent',
  name: 'My Agent',
  description: 'Description of what this agent does',
  
  tools: [
    // Add your tools here
    ...CommonTools.createBasicTools()
  ],
  
  endpoints: [
    { name: 'question', description: 'Answer questions' },
    { name: 'handle', description: 'Handle operations' }
  ]
};
`;
}

function parseAgentFromContent(content: string): AgentCapabilityForm {
	// Simple parsing - in production, use proper TypeScript AST parsing
	return {
		id: 'my-agent',
		name: 'My Agent',
		description: 'Description of what this agent does',
		tools: [],
		endpoints: [
			{ name: 'question', description: 'Answer questions' },
			{ name: 'handle', description: 'Handle operations' }
		]
	};
}

function generateAgentContent(form: AgentCapabilityForm): string {
	// Generate TypeScript code from form data
	return `import { AgentCapability } from '@ai-code/core';
import { CommonTools } from '@ai-code/tools';

export const ${form.id.replace(/-/g, '_')}: AgentCapability = {
  id: '${form.id}',
  name: '${form.name}',
  description: '${form.description}',
  
  tools: [
    // Tools will be generated based on configuration
    ...CommonTools.createBasicTools()
  ],
  
  endpoints: [
${form.endpoints
	.map((ep) => `    { name: '${ep.name}', description: '${ep.description}' }`)
	.join(',\n')}
  ]
};
`;
}

async function validateAgentConfig(content: string): Promise<ValidationResult> {
	const errors: ValidationError[] = [];
	const warnings: ValidationError[] = [];
	const suggestions: string[] = [];

	// Basic validation
	if (!content.includes('AgentCapability')) {
		errors.push({
			field: 'imports',
			message: 'Missing AgentCapability import',
			severity: 'error'
		});
	}

	if (!content.includes('export')) {
		errors.push({
			field: 'export',
			message: 'Agent configuration must be exported',
			severity: 'error'
		});
	}

	// Check for common patterns
	if (!content.includes('tools:')) {
		warnings.push({
			field: 'tools',
			message: 'No tools configuration found',
			severity: 'warning'
		});
	}

	if (!content.includes('endpoints:')) {
		warnings.push({
			field: 'endpoints',
			message: 'No endpoints configuration found',
			severity: 'warning'
		});
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
		suggestions
	};
}
