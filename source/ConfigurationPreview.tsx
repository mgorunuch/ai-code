import React from 'react';
import { 
  ConfigurationPreview as IConfigurationPreview,
  ConfigurationChange,
  ConfigurationContext,
  ValidationError
} from './types';

export interface ConfigurationPreviewProps {
  changes: ConfigurationChange[];
  context: ConfigurationContext;
}

export const ConfigurationPreview: React.FC<ConfigurationPreviewProps> = ({
  changes,
  context
}) => {
  const groupedChanges = groupChangesByType(changes);
  const affectedSystems = analyzeAffectedSystems(changes);
  const estimatedImpact = calculateImpact(changes);

  if (changes.length === 0) {
    return (
      <div style={{ color: '#808080', fontStyle: 'italic' }}>
        No changes to preview
      </div>
    );
  }

  return (
    <div style={{ fontSize: '12px' }}>
      {/* Summary */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ color: '#cccccc' }}>Total Changes</span>
          <span style={{ 
            color: '#4fc1ff',
            fontWeight: 'bold'
          }}>
            {changes.length}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ color: '#cccccc' }}>Impact Level</span>
          <span style={{ 
            color: estimatedImpact === 'high' ? '#f44747' : 
                   estimatedImpact === 'medium' ? '#ffcc02' : '#4fc1ff'
          }}>
            {estimatedImpact.toUpperCase()}
          </span>
        </div>

        {affectedSystems.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ color: '#cccccc', marginBottom: '4px' }}>Affected Systems:</div>
            {affectedSystems.map((system, index) => (
              <div key={index} style={{ 
                color: '#569cd6', 
                fontSize: '11px',
                marginLeft: '8px'
              }}>
                • {system}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Changes by Type */}
      {Object.entries(groupedChanges).map(([type, typeChanges]) => (
        <div key={type} style={{ marginBottom: '16px' }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            color: '#569cd6',
            fontSize: '12px',
            textTransform: 'capitalize'
          }}>
            {type} Changes ({typeChanges.length})
          </h4>
          
          {typeChanges.map((change, index) => (
            <ChangeItem key={`${type}-${index}`} change={change} />
          ))}
        </div>
      ))}

      {/* Validation Results */}
      <div style={{ marginTop: '16px' }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          color: '#569cd6',
          fontSize: '12px'
        }}>
          Validation Status
        </h4>
        
        <ValidationPreview changes={changes} context={context} />
      </div>
    </div>
  );
};

interface ChangeItemProps {
  change: ConfigurationChange;
}

const ChangeItem: React.FC<ChangeItemProps> = ({ change }) => {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return '#4fc1ff';
      case 'update': return '#ffcc02';
      case 'delete': return '#f44747';
      default: return '#cccccc';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return '+';
      case 'update': return '~';
      case 'delete': return '-';
      default: return '?';
    }
  };

  return (
    <div style={{ 
      marginBottom: '8px',
      padding: '6px 8px',
      backgroundColor: '#2d2d30',
      borderRadius: '3px',
      borderLeft: `3px solid ${getActionColor(change.action)}`
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        marginBottom: '4px'
      }}>
        <span style={{ 
          color: getActionColor(change.action),
          fontWeight: 'bold',
          marginRight: '6px',
          fontSize: '14px'
        }}>
          {getActionIcon(change.action)}
        </span>
        <span style={{ color: '#cccccc', fontSize: '11px' }}>
          {change.path}
        </span>
      </div>
      
      {change.impact && (
        <div style={{ 
          color: '#808080', 
          fontSize: '10px',
          marginLeft: '20px'
        }}>
          Impact: {change.impact}
        </div>
      )}
      
      {/* Show value changes for updates */}
      {change.action === 'update' && change.oldValue !== undefined && (
        <div style={{ 
          marginLeft: '20px',
          marginTop: '4px',
          fontSize: '10px'
        }}>
          <div style={{ color: '#f44747' }}>
            - {formatValue(change.oldValue)}
          </div>
          <div style={{ color: '#4fc1ff' }}>
            + {formatValue(change.newValue)}
          </div>
        </div>
      )}
      
      {/* Show new value for creates */}
      {change.action === 'create' && change.newValue !== undefined && (
        <div style={{ 
          marginLeft: '20px',
          marginTop: '4px',
          fontSize: '10px',
          color: '#4fc1ff'
        }}>
          + {formatValue(change.newValue)}
        </div>
      )}
    </div>
  );
};

interface ValidationPreviewProps {
  changes: ConfigurationChange[];
  context: ConfigurationContext;
}

const ValidationPreview: React.FC<ValidationPreviewProps> = ({ changes, context }) => {
  // Simulate validation of changes
  const validationResults = validateChanges(changes, context);
  
  const hasErrors = validationResults.some(r => r.severity === 'error');
  const hasWarnings = validationResults.some(r => r.severity === 'warning');
  
  if (validationResults.length === 0) {
    return (
      <div style={{ 
        color: '#4fc1ff',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{ marginRight: '6px' }}>✓</span>
        All changes are valid
      </div>
    );
  }
  
  return (
    <div>
      {hasErrors && (
        <div style={{ 
          color: '#f44747',
          fontSize: '11px',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '6px' }}>✗</span>
          {validationResults.filter(r => r.severity === 'error').length} error(s) found
        </div>
      )}
      
      {hasWarnings && (
        <div style={{ 
          color: '#ffcc02',
          fontSize: '11px',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '6px' }}>⚠</span>
          {validationResults.filter(r => r.severity === 'warning').length} warning(s) found
        </div>
      )}
      
      {/* Show first few validation messages */}
      {validationResults.slice(0, 3).map((result, index) => (
        <div key={index} style={{ 
          fontSize: '10px',
          color: result.severity === 'error' ? '#f44747' : '#ffcc02',
          marginLeft: '16px',
          marginBottom: '2px'
        }}>
          {result.message}
        </div>
      ))}
      
      {validationResults.length > 3 && (
        <div style={{ 
          fontSize: '10px',
          color: '#808080',
          marginLeft: '16px'
        }}>
          ... and {validationResults.length - 3} more
        </div>
      )}
    </div>
  );
};

// Utility functions
function groupChangesByType(changes: ConfigurationChange[]): Record<string, ConfigurationChange[]> {
  return changes.reduce((groups, change) => {
    const type = change.type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(change);
    return groups;
  }, {} as Record<string, ConfigurationChange[]>);
}

function analyzeAffectedSystems(changes: ConfigurationChange[]): string[] {
  const systems = new Set<string>();
  
  changes.forEach(change => {
    switch (change.type) {
      case 'agent':
        systems.add('Agent Orchestration');
        break;
      case 'model':
        systems.add('Model Selection');
        break;
      case 'credential':
        systems.add('Authentication');
        break;
      case 'setting':
        if (change.path.includes('access')) {
          systems.add('Access Control');
        } else if (change.path.includes('logging')) {
          systems.add('Logging System');
        } else {
          systems.add('Core Settings');
        }
        break;
    }
  });
  
  return Array.from(systems);
}

function calculateImpact(changes: ConfigurationChange[]): 'low' | 'medium' | 'high' {
  if (changes.length === 0) return 'low';
  
  // High impact conditions
  const hasAgentChanges = changes.some(c => c.type === 'agent');
  const hasDeleteOperations = changes.some(c => c.action === 'delete');
  const hasSecurityChanges = changes.some(c => 
    c.path.includes('security') || c.path.includes('access') || c.type === 'credential'
  );
  
  if (hasDeleteOperations || (hasAgentChanges && hasSecurityChanges)) {
    return 'high';
  }
  
  // Medium impact conditions
  if (hasAgentChanges || hasSecurityChanges || changes.length > 5) {
    return 'medium';
  }
  
  return 'low';
}

function validateChanges(changes: ConfigurationChange[], context: ConfigurationContext): ValidationError[] {
  const errors: ValidationError[] = [];
  
  changes.forEach(change => {
    // Simulate validation logic
    if (change.type === 'agent' && change.action === 'delete') {
      errors.push({
        field: change.path,
        message: 'Deleting agents may break existing workflows',
        severity: 'warning'
      });
    }
    
    if (change.type === 'credential' && change.action === 'delete') {
      errors.push({
        field: change.path,
        message: 'Removing credentials will disable API access',
        severity: 'error'
      });
    }
    
    if (change.path.includes('access') && change.action === 'delete') {
      errors.push({
        field: change.path,
        message: 'Removing access patterns may grant unintended permissions',
        severity: 'warning'
      });
    }
  });
  
  return errors;
}

function formatValue(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    const str = JSON.stringify(value);
    return str.length > 50 ? `${str.slice(0, 47)}...` : str;
  }
  return String(value);
}