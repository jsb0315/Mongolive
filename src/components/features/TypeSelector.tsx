import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const scrollX = window.scrollX || document.documentElement.scrollLeft;
      
      setDropdownPosition({
        top: rect.bottom + scrollY + 4, // 4px gap
        left: rect.left + scrollX,
        width: rect.width
      });
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    const handleResize = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    if (isOpen) {
      updateDropdownPosition();
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
    onClick?.(e);
  };

  const handleSelect = (selectedValue: typeof value) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  // Dropdown component to be rendered in portal
  const dropdownContent = isOpen && (
    <div 
      ref={dropdownRef}
      className="w-24 bg-white border border-gray-300 rounded-md shadow-lg z-50 overflow-hidden"
      style={{
        position: 'absolute',
        top: dropdownPosition.top,
        left: dropdownPosition.left-9,
        width: dropdownPosition.width,
      }}
    >
      <div className="w-24 flex flex-col items-center">
        {availableTypes.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => handleSelect(type.value)}
            className={`
              w-full flex items-center gap-2 px-2 py-2 text-xs
              hover:bg-blue-50 hover:text-blue-700 
              transition-colors duration-150 ease-in-out
              ${value === type.value ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}
            `}
          >
            <TypeSpan 
              type={type.mongoType} 
              className="flex-shrink-0" 
            />
            {value === type.value && (
              <svg className="w-3 h-3 ml-auto text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`relative flex ${className}`}>
      {/* Custom Select Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
         w-24 flex items-center justify-start
          text-xs gap-1
          transition-all duration-200 ease-in-out
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}}
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          {showTypeSpan && selectedType && (
            <TypeSpan 
              type={selectedType.mongoType} 
              className="flex-shrink-0" 
            />
          )}
        </div>
        
        {/* Dropdown Arrow */}
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Render dropdown in portal to avoid overflow issues */}
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </div>
  );
};

export default TypeSelector;
