import React, { useState, useEffect } from 'react';
import { useDocumentContext } from '../../contexts/DocumentContext';

export interface AddFieldProps {
  parentPath: string[];
  depth: number;
  mode?: 'field' | 'array-element';
  onCancel?: () => void;
  onSuccess?: () => void;
  className?: string;
}

interface AddFieldComponentProps extends AddFieldProps {
  isActive: boolean;
  onActivate: () => void;
}

export const AddFieldButton: React.FC<AddFieldComponentProps> = ({
  parentPath,
  depth,
  mode = 'field',
  isActive,
  onActivate,
  onCancel,
  onSuccess,
  className = ''
}) => {
  const { addField, isUpdating, error, clearError } = useDocumentContext();
  
  // Form state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [newFieldType, setNewFieldType] = useState<'string' | 'number' | 'boolean' | 'object' | 'array'>('string');

  // ESC 키 처리 - AddField가 활성화된 상태에서만
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isActive) {
        // ESC 키 이벤트를 방지하여 상위 컴포넌트에서 처리되지 않도록 함
        event.preventDefault();
        event.stopPropagation();
        handleCancel();
      }
    };

    if (isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isActive]);

  // Reset form when becoming active
  const handleActivate = () => {
    setNewFieldName('');
    setNewFieldValue('');
    setNewFieldType('string');
    clearError();
    onActivate();
  };

  // Cancel and reset form
  const handleCancel = () => {
    setNewFieldName('');
    setNewFieldValue('');
    setNewFieldType('string');
    clearError();
    onCancel?.();
  };

  // Save new field
  const handleSave = async () => {
    if (!newFieldName.trim()) {
      return;
    }

    let parsedValue: any = newFieldValue;

    // Parse value based on type
    try {
      switch (newFieldType) {
        case 'number':
          parsedValue = parseFloat(newFieldValue);
          if (isNaN(parsedValue)) {
            throw new Error('Invalid number');
          }
          break;
        case 'boolean':
          parsedValue = newFieldValue.toLowerCase() === 'true';
          break;
        case 'object':
          parsedValue = JSON.parse(newFieldValue || '{}');
          break;
        case 'array':
          parsedValue = JSON.parse(newFieldValue || '[]');
          break;
        default:
          parsedValue = newFieldValue;
      }
    } catch (err) {
      console.error('❌ Failed to parse field value:', err);
      return;
    }

    const success = await addField(parentPath, newFieldName, parsedValue);
    
    if (success) {
      handleCancel(); // Reset and close
      onSuccess?.();
    }
  };

  if (!isActive) {
    // Show the "Add Field" button
    return (
      <div
        onClick={handleActivate}
        className={`group p-2 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden mb-1 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 ${className}`}
      >
        <div className="flex items-center justify-center gap-2 min-w-0 py-2">
          <svg 
            className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-sm text-gray-500 group-hover:text-blue-600 transition-colors duration-200 font-medium">
            Add new {mode === 'array-element' ? 'element' : depth === 0 ? 'field' : 'property'}
          </span>
        </div>
      </div>
    );
  }

  // Show the form when active
  return (
    <div className={`CancelESC group p-3 rounded-lg border-2 border-blue-300 bg-blue-50 mb-1 ${className}`}>
      {/* Error display */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button 
              onClick={clearError}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-2">
        {/* Field name input (skip for array elements in some cases) */}
        {mode === 'field' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Field Name</label>
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              placeholder="Enter field name..."
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
          </div>
        )}
        
        {/* Field type selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as any)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="object">Object</option>
            <option value="array">Array</option>
          </select>
        </div>
        
        {/* Field value input */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
          {newFieldType === 'boolean' ? (
            <select
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : newFieldType === 'object' ? (
            <textarea
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              placeholder='{"key": "value"}'
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
              rows={2}
            />
          ) : newFieldType === 'array' ? (
            <textarea
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              placeholder='["item1", "item2"]'
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-mono"
              rows={2}
            />
          ) : (
            <input
              type={newFieldType === 'number' ? 'number' : 'text'}
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              placeholder={`Enter ${newFieldType} value...`}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          )}
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-end space-x-2 pt-2">
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!newFieldName.trim() || isUpdating}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-1"
          >
            {isUpdating && (
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>Add {mode === 'array-element' ? 'Element' : 'Field'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Higher-order component that manages its own active state
export const AddField: React.FC<AddFieldProps> = (props) => {
  const [isActive, setIsActive] = useState(false);

  const handleCancel = () => {
    setIsActive(false);
    props.onCancel?.();
  };

  const handleSuccess = () => {
    setIsActive(false);
    props.onSuccess?.();
  };

  return (
    <AddFieldButton
      {...props}
      isActive={isActive}
      onActivate={() => setIsActive(true)}
      onCancel={handleCancel}
      onSuccess={handleSuccess}
    />
  );
};

export default AddField;
