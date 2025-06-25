import React from 'react';
import Field from './Field';
import { FieldPath } from '../../types/collectionTypes';

interface FieldSectionProps {
  depth: number;
  title: string;
  icon: React.ReactNode;
  fields: FieldPath[];
  selectedFieldAtDepth: string | null;
  currentDepth: number;
  isActive: boolean;
  hasReferenceSection: boolean;
  referencedIdSection: string | null | undefined;
  referencedDatabase?: string | null;
  referencedCollection?: string[] | null;
  parentFieldPath?: string[];
  colSpan?: number;
  onFieldSelect: (fieldName: string, parentPath: string[], depth: number) => void;
  onBackNavigation: (targetDepth: number) => void;
}

const FieldSection: React.FC<FieldSectionProps> = ({
  depth,
  title,
  icon,
  fields,
  selectedFieldAtDepth,
  currentDepth,
  isActive,
  hasReferenceSection,
  referencedIdSection,
  referencedDatabase,
  referencedCollection,
  parentFieldPath,
  colSpan = 1,
  onFieldSelect,
  onBackNavigation
}) => {
  const isRefField = fields
  return (
    <div
      className={`${colSpan === 2 ? 'col-span-2' : ''} bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full transition-all duration-300 ${
        isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      } ${hasReferenceSection ? 'border-blue-300 shadow-blue-100' : ''} ${hasReferenceSection && referencedIdSection ? 'border-cyan-300 shadow-cyan-100' : ''}`}
      style={{
        transform: isActive ? 'translateX(0)' : 'translateX(100%)',
      }}
    >
      {/* Header */}
      <div className={`p-3 border-b border-gray-200 overflow-hidden ${
        hasReferenceSection ? 'bg-blue-50' :
        referencedIdSection ? 'bg-cyan-50' :
        'bg-gray-50'
      }`}>
        <div className="flex items-center justify-between min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center truncate flex-1 min-w-0">
            {hasReferenceSection ? (  // 체인
              <svg className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            ) : hasReferenceSection && referencedIdSection ? ( // 참조
              <svg className="w-4 h-4 mr-2 text-cyan-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            ) : icon  // RefDoc icon
            }
            <span className="truncate">{title}</span>
            {(referencedIdSection && referencedDatabase && referencedCollection) && referencedDatabase && referencedCollection && (
              <span className={'ml-2 px-2 py-1 text-xs rounded bg-cyan-100 text-cyan-700'}>
                {referencedDatabase}/{referencedCollection}
              </span>
            )}
          </h3>
          {depth > 0 && (
            <button
              onClick={() => onBackNavigation(depth - 1)}
              className="p-1 hover:bg-gray-200 rounded transition-colors duration-200 flex-shrink-0 ml-2"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex-col overflow-y-auto p-2 max-h-full overflow-x-hidden">
        {fields.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <div className="truncate">
              {depth === 0 ? 'Select a document to view fields' :
                hasReferenceSection ? 'Reference not resolved' :
                referencedIdSection ? 'Document has no fields' :
                'No nested fields'}
            </div>
          </div>
        ) : (
          fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              selectedFieldName={selectedFieldAtDepth}
              depth={depth}
              currentDepth={currentDepth}
              onFieldSelect={onFieldSelect}
              parentPath={depth === 0 ? [] : parentFieldPath}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FieldSection;