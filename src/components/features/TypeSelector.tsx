import React, { useState } from 'react';
import TypeSpan from './TypeSpan';

interface TypeSelectorProps {
  value: 'string' | 'number' | 'boolean' | 'object' | 'array';
  onChange: (type: 'string' | 'number' | 'boolean' | 'object' | 'array') => void;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
  showTypeSpan?: boolean;
}

const TypeSelector: React.FC<TypeSelectorProps> = ({
  value,
  onChange,
  onClick,
  className = '',
  disabled = false,
  showTypeSpan = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const availableTypes: Array<{
    value: 'string' | 'number' | 'boolean' | 'object' | 'array';
    label: string;
    mongoType: string;
  }> = [
    { value: 'string', label: 'String', mongoType: 'String' },
    { value: 'number', label: 'Number', mongoType: 'Double' },
    { value: 'boolean', label: 'Boolean', mongoType: 'Boolean' },
    { value: 'object', label: 'Object', mongoType: 'Document' },
    { value: 'array', label: 'Array', mongoType: 'Array' }
  ];

  const selectedType = availableTypes.find(type => type.value === value);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      setIsExpanded(!isExpanded);
    }
    onClick?.(e);
  };

  const handleSelect = (selectedValue: typeof value) => {
    onChange(selectedValue);
    setIsExpanded(false);
  };

  return (
    <div className={`flex w-full gap-1 items-center ${className}`}>
      {/* Current Selection Display */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center justify-between gap-1 pb-3
          transition-all duration-200 ease-in-out
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:border-blue-40'}
        `}
      >
        <div className="flex items-center gap-1 min-w-0">
          {showTypeSpan && selectedType && (
            <TypeSpan 
              type={selectedType.mongoType} 
              className="flex-shrink-0" 
            />
          )}
        </div>
        
        {/* Dropdown Arrow */}
        <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
      </button>

      {/* Expanded Horizontal Options */}
      {isExpanded && (
        <div className="overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-w-sm gap-1">
            {availableTypes.map((type) => (
                <button
                key={type.value}
                type="button"
                onClick={() => handleSelect(type.value)}
                className={`
                  mb-3 flex-shrink-0 flex items-center rounded-full transition-all duration-150 ease-in-out hover:shadow-md
                  ${value === type.value ? 'shadow-md' : '' }
                `}
                title={type.label}
                >
                <TypeSpan 
                  type={type.mongoType} 
                  className="flex-shrink-0"
                />
                </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TypeSelector;
