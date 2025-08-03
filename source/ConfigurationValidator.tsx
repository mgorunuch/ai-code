import React, { useState, useEffect, useMemo } from 'react';
import {
  ValidationResult,
  ValidationError,
  ConfigurationContext,
  ConfigurationSuggestion
} from './types';
import { ConfigurationManager as CoreConfigurationManager } from './core/configuration-manager.js';
import type { CompleteConfig, ConfigValidationResult, ConfigurationSuggestion as CoreConfigurationSuggestion } from './core/configuration-types.js';

export interface ConfigurationValidatorProps {
  context: ConfigurationContext;
  config?: any;
  realTime?: boolean;
  showSuggestions?: boolean;
  onValidationChange?: (result: ValidationResult) => void;
}

interface ValidationSummary {
  valid: boolean;
  totalErrors: number;
  totalWarnings: number;
  totalSuggestions: number;
  loadedComponents: string[];
  failedComponents: string[];
  validationTime: number;
}

interface ValidationCategory {
  category: string;
  displayName: string;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
  icon: string;
  color: string;
}

export const ConfigurationValidator: React.FC<ConfigurationValidatorProps> = ({
  context,
  config,
  realTime = true,
  showSuggestions = true,
  onValidationChange
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: true,
    errors: [],
    warnings: [],
    suggestions: []
  });
  const [isValidating, setIsValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['errors']));
  const [selectedError, setSelectedError] = useState<ValidationError | null>(null);
  const [coreValidator, setCoreValidator] = useState<CoreConfigurationManager | null>(null);

  // Initialize core validator
  useEffect(() => {
    const initValidator = async () => {
      try {
        const manager = new CoreConfigurationManager();
        setCoreValidator(manager);
      } catch (error) {
        console.error('Failed to initialize validator:', error);
      }
    };
    initValidator();
  }, []);

  // Validate configuration when it changes
  useEffect(() => {
    if (realTime && (config || context.resolvedConfig)) {
      validateConfiguration();
    }
  }, [config, context.resolvedConfig, realTime, coreValidator]);

  const validateConfiguration = async () => {
    if (!coreValidator) return;

    const targetConfig = config || context.resolvedConfig;
    if (!targetConfig) return;

    setIsValidating(true);
    const startTime = Date.now();

    try {
      // Use core validator
      const coreResult = await coreValidator.validateConfiguration(targetConfig as CompleteConfig);
      
      // Convert core result to UI format
      const result: ValidationResult = {
        valid: coreResult.valid,
        errors: [
          ...coreResult.errors.map(error => ({ 
            field: 'configuration', 
            message: error, 
            severity: 'error' as const 
          })),
          ...context.validationErrors.filter(e => e.severity === 'error')
        ],
        warnings: [
          ...coreResult.warnings.map(warning => ({ 
            field: 'configuration', 
            message: warning, 
            severity: 'warning' as const 
          })),
          ...context.validationErrors.filter(e => e.severity === 'warning')
        ],
        suggestions: coreResult.suggestions || []
      };

      // Create validation summary
      const validationTime = Date.now() - startTime;
      const summary: ValidationSummary = {
        valid: result.valid,
        totalErrors: result.errors.length,
        totalWarnings: result.warnings.length,
        totalSuggestions: result.suggestions.length,
        loadedComponents: coreResult.loadedComponents || [],
        failedComponents: coreResult.failedComponents || [],
        validationTime
      };

      setValidationResult(result);
      setValidationSummary(summary);
      onValidationChange?.(result);

      // Auto-expand errors if any exist
      if (result.errors.length > 0) {
        setExpandedCategories(prev => new Set([...prev, 'errors']));
      }

    } catch (error) {
      console.error('Validation failed:', error);
      const errorResult: ValidationResult = {
        valid: false,
        errors: [{
          field: 'validator',
          message: `Validation failed: ${error}`,
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      };
      setValidationResult(errorResult);
      onValidationChange?.(errorResult);
    } finally {
      setIsValidating(false);
    }
  };

  const validationCategories = useMemo((): ValidationCategory[] => {
    const categories: ValidationCategory[] = [];

    if (validationResult.errors.length > 0) {
      categories.push({
        category: 'errors',
        displayName: 'Errors',
        errors: validationResult.errors,
        warnings: [],
        suggestions: [],
        icon: '✗',
        color: '#f44747'
      });
    }

    if (validationResult.warnings.length > 0) {
      categories.push({
        category: 'warnings',
        displayName: 'Warnings',
        errors: [],
        warnings: validationResult.warnings,
        suggestions: [],
        icon: '⚠',
        color: '#ffcc02'
      });
    }

    if (showSuggestions && validationResult.suggestions.length > 0) {
      categories.push({
        category: 'suggestions',
        displayName: 'Suggestions',
        errors: [],
        warnings: [],
        suggestions: validationResult.suggestions,
        icon: '💡',
        color: '#4fc1ff'
      });
    }

    // Group by configuration area
    const errorsByArea = groupErrorsByArea(validationResult.errors);
    const warningsByArea = groupErrorsByArea(validationResult.warnings);

    Object.keys(errorsByArea).forEach(area => {
      if (area !== 'general') {
        categories.push({
          category: `area-${area}`,
          displayName: formatAreaName(area),
          errors: errorsByArea[area] || [],
          warnings: warningsByArea[area] || [],
          suggestions: [],
          icon: getAreaIcon(area),
          color: getAreaColor(area)
        });
      }
    });

    return categories;
  }, [validationResult, showSuggestions]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  if (!validationSummary && !isValidating) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <button
          onClick={validateConfiguration}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0e639c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Validate Configuration
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '16px' 
      }}>
        <h2 style={{ color: '#569cd6', margin: 0, fontSize: '16px' }}>
          Configuration Validation
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isValidating && (
            <span style={{ color: '#4fc1ff', fontSize: '12px' }}>Validating...</span>
          )}
          <button
            onClick={validateConfiguration}
            disabled={isValidating}
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
            Revalidate
          </button>
        </div>
      </div>

      {/* Validation Summary */}
      {validationSummary && (
        <div style={{
          backgroundColor: validationSummary.valid ? '#1e3a1e' : '#3c1e1e',
          border: `1px solid ${validationSummary.valid ? '#4fc1ff' : '#f44747'}`,
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '16px',
                color: validationSummary.valid ? '#4fc1ff' : '#f44747'
              }}>
                {validationSummary.valid ? '✓' : '✗'}
              </span>
              <span style={{ 
                color: validationSummary.valid ? '#4fc1ff' : '#f44747',
                fontWeight: 'bold'
              }}>
                {validationSummary.valid ? 'Valid Configuration' : 'Invalid Configuration'}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#808080' }}>
              Validated in {validationSummary.validationTime}ms
            </span>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
            gap: '12px',
            fontSize: '12px'
          }}>
            <div>
              <span style={{ color: '#cccccc' }}>Errors: </span>
              <span style={{ color: validationSummary.totalErrors > 0 ? '#f44747' : '#4fc1ff' }}>
                {validationSummary.totalErrors}
              </span>
            </div>
            <div>
              <span style={{ color: '#cccccc' }}>Warnings: </span>
              <span style={{ color: validationSummary.totalWarnings > 0 ? '#ffcc02' : '#4fc1ff' }}>
                {validationSummary.totalWarnings}
              </span>
            </div>
            {showSuggestions && (
              <div>
                <span style={{ color: '#cccccc' }}>Suggestions: </span>
                <span style={{ color: '#4fc1ff' }}>{validationSummary.totalSuggestions}</span>
              </div>
            )}
            <div>
              <span style={{ color: '#cccccc' }}>Components: </span>
              <span style={{ color: '#4fc1ff' }}>
                {validationSummary.loadedComponents.length}/{validationSummary.loadedComponents.length + validationSummary.failedComponents.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Validation Categories */}
      {validationCategories.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#252526',
          border: '1px solid #3c3c3c',
          borderRadius: '4px',
          color: '#4fc1ff'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>✓</div>
          <div>No validation issues found</div>
        </div>
      ) : (
        <div style={{ space: '8px' }}>
          {validationCategories.map((category) => (
            <ValidationCategoryPanel
              key={category.category}
              category={category}
              isExpanded={expandedCategories.has(category.category)}
              onToggle={() => toggleCategory(category.category)}
              onSelectError={setSelectedError}
              selectedError={selectedError}
            />
          ))}
        </div>
      )}

      {/* Error Details Modal */}
      {selectedError && (
        <ErrorDetailModal
          error={selectedError}
          onClose={() => setSelectedError(null)}
        />
      )}
    </div>
  );
};

interface ValidationCategoryPanelProps {
  category: ValidationCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectError: (error: ValidationError) => void;
  selectedError: ValidationError | null;
}

const ValidationCategoryPanel: React.FC<ValidationCategoryPanelProps> = ({
  category,
  isExpanded,
  onToggle,
  onSelectError,
  selectedError
}) => {
  const totalItems = category.errors.length + category.warnings.length + category.suggestions.length;

  return (
    <div style={{
      backgroundColor: '#252526',
      border: '1px solid #3c3c3c',
      borderRadius: '4px',
      marginBottom: '8px'
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '12px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isExpanded ? '1px solid #3c3c3c' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>{category.icon}</span>
          <span style={{ color: category.color, fontWeight: 'bold', fontSize: '14px' }}>
            {category.displayName}
          </span>
          <span style={{
            padding: '2px 6px',
            backgroundColor: '#3c3c3c',
            borderRadius: '10px',
            fontSize: '10px',
            color: '#cccccc'
          }}>
            {totalItems}
          </span>
        </div>
        <span style={{ 
          color: '#808080', 
          fontSize: '12px',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▶
        </span>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ padding: '8px 12px 12px 12px' }}>
          {/* Errors */}
          {category.errors.map((error, index) => (
            <ValidationItem
              key={`error-${index}`}
              type="error"
              item={error}
              onClick={() => onSelectError(error)}
              isSelected={selectedError === error}
            />
          ))}

          {/* Warnings */}
          {category.warnings.map((warning, index) => (
            <ValidationItem
              key={`warning-${index}`}
              type="warning"
              item={warning}
              onClick={() => onSelectError(warning)}
              isSelected={selectedError === warning}
            />
          ))}

          {/* Suggestions */}
          {category.suggestions.map((suggestion, index) => (
            <ValidationItem
              key={`suggestion-${index}`}
              type="suggestion"
              item={{ field: 'suggestion', message: suggestion, severity: 'info' as const }}
              onClick={() => {}}
              isSelected={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ValidationItemProps {
  type: 'error' | 'warning' | 'suggestion';
  item: ValidationError;
  onClick: () => void;
  isSelected: boolean;
}

const ValidationItem: React.FC<ValidationItemProps> = ({
  type,
  item,
  onClick,
  isSelected
}) => {
  const getColor = () => {
    switch (type) {
      case 'error': return '#f44747';
      case 'warning': return '#ffcc02';
      case 'suggestion': return '#4fc1ff';
      default: return '#cccccc';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'error': return '✗';
      case 'warning': return '⚠';
      case 'suggestion': return '💡';
      default: return '•';
    }
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '8px',
        marginBottom: '4px',
        backgroundColor: isSelected ? '#264f78' : 'transparent',
        border: `1px solid ${isSelected ? '#0e639c' : 'transparent'}`,
        borderRadius: '3px',
        cursor: type !== 'suggestion' ? 'pointer' : 'default',
        borderLeft: `3px solid ${getColor()}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ color: getColor(), fontSize: '12px', marginTop: '1px' }}>
          {getIcon()}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: '#cccccc', marginBottom: '2px' }}>
            {item.field}
          </div>
          <div style={{ fontSize: '11px', color: '#d4d4d4', lineHeight: '1.4' }}>
            {item.message}
          </div>
          {item.line && (
            <div style={{ fontSize: '10px', color: '#808080', marginTop: '2px' }}>
              Line {item.line}
              {item.column && `, Column ${item.column}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface ErrorDetailModalProps {
  error: ValidationError;
  onClose: () => void;
}

const ErrorDetailModal: React.FC<ErrorDetailModalProps> = ({ error, onClose }) => {
  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: '#252526',
        border: '1px solid #3c3c3c',
        borderRadius: '4px',
        padding: '16px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '70%',
        overflow: 'auto'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            color: error.severity === 'error' ? '#f44747' : '#ffcc02',
            margin: 0,
            fontSize: '14px'
          }}>
            {error.severity.toUpperCase()}: {error.field}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#cccccc',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ color: '#d4d4d4', fontSize: '12px', lineHeight: '1.5' }}>
            {error.message}
          </div>
          
          {(error.line || error.column) && (
            <div style={{ 
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#1e1e1e',
              borderRadius: '3px',
              fontSize: '11px',
              color: '#808080'
            }}>
              Location: Line {error.line || '?'}
              {error.column && `, Column ${error.column}`}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '6px 12px',
            backgroundColor: '#0e639c',
            color: '#ffffff',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Utility functions
function groupErrorsByArea(errors: ValidationError[]): Record<string, ValidationError[]> {
  return errors.reduce((groups, error) => {
    const area = error.field.split('.')[0] || 'general';
    if (!groups[area]) {
      groups[area] = [];
    }
    groups[area].push(error);
    return groups;
  }, {} as Record<string, ValidationError[]>);
}

function formatAreaName(area: string): string {
  switch (area) {
    case 'agents': return 'Agent Configuration';
    case 'models': return 'Model Selection';
    case 'credentials': return 'Credentials';
    case 'security': return 'Security & Access';
    case 'logging': return 'Logging';
    case 'orchestration': return 'Orchestration';
    default: return area.charAt(0).toUpperCase() + area.slice(1);
  }
}

function getAreaIcon(area: string): string {
  switch (area) {
    case 'agents': return '🤖';
    case 'models': return '🧠';
    case 'credentials': return '🔐';
    case 'security': return '🛡️';
    case 'logging': return '📝';
    case 'orchestration': return '🎭';
    default: return '⚙️';
  }
}

function getAreaColor(area: string): string {
  switch (area) {
    case 'agents': return '#569cd6';
    case 'models': return '#dcdcaa';
    case 'credentials': return '#f44747';
    case 'security': return '#ff6b6b';
    case 'logging': return '#4fc1ff';
    case 'orchestration': return '#c586c0';
    default: return '#cccccc';
  }
}