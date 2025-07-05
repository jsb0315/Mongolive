import React from 'react';

interface TypeSpanProps {
  type: string | string[];
  className?: string;
}

const TypeSpan: React.FC<TypeSpanProps> = ({ type, className = '' }) => {
  const getTypeColorClass = (typeStr: string) => {
    switch (typeStr) {
      case 'ObjectId': return 'bg-blue-100 text-blue-700';
      case 'Document': return 'bg-pink-100 text-pink-700';
      case 'Embedded': return 'bg-purple-100 text-purple-700';
      case 'Referenced': return 'bg-cyan-100 text-cyan-700';
      case 'Array': return 'bg-green-100 text-green-700';
      case 'String': return 'bg-orange-100 text-orange-700';
      case 'Int32':
      case 'Double':
      case 'Decimal128': return 'bg-teal-100 text-teal-700';
      case 'Boolean': return 'bg-blue-100 text-blue-700';
      case 'Date': return 'bg-lime-100 text-lime-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderTypeSpans = () => {
    if (Array.isArray(type)) {
      return type.map((typeStr, index) => (
        <span
          key={index}
          className={` bg-am px-2 py-1 text-[10px] rounded-full font-medium ${getTypeColorClass(typeStr)} ${className}`}
        >
          {typeStr}
        </span>
      ));
    } else {
      return (
        <span
          className={`px-2 py-1 text-[10px] rounded-full font-medium ${getTypeColorClass(type)} ${className}`}
        >
          {type}
        </span>
      );
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {renderTypeSpans()}
    </div>
  );
};

export default TypeSpan;
