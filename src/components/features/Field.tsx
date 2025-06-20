import React from 'react';
import { FieldPath } from '../../types/collectionTypes';
import { formatValue, canTraverse } from '../../utils/mongoUtils';

interface FieldProps {
  field: FieldPath;
  selectedFieldName: string | null;
  depth: number;
  currentDepth: number;
  onFieldSelect: (fieldName: string, parentPath: string[], depth: number) => void;
  parentPath?: string[];
}

const Field: React.FC<FieldProps> = ({
  field,
  selectedFieldName,
  depth,
  currentDepth,
  onFieldSelect,
  parentPath = []
}) => {
  const isSelected = selectedFieldName === field.name;
  
  const refTraverse = field.type === 'Referenced' && field.isReferencedDocument;

  const renderFieldValue = () => {
    const { 
      value, 
      type, 
      hasReference, 
      isReferencedDocument, 
      referencedDocuments, 
      originalDocument, 
      referencedCollection, 
      referencedDatabase,
      hasSubDocuments 
    } = field;

    if (refTraverse) {
      console.log(`Rendering field: ${field.name}, `, 'hasReference:', hasReference, 'isReferencedDocument:', isReferencedDocument, 'Original Document:', originalDocument, 'refDoc:', referencedDocuments, 'refCollection:', referencedCollection, 'refDatabase:', referencedDatabase);
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          {(() => {
            const getTypeColorClass = (typeStr: string) => {
              switch (typeStr) {
                case 'ObjectId': return 'bg-blue-100 text-blue-700';
                case 'Document': return 'bg-pink-100 text-pink-700';
                case 'Embedded': return 'bg-purple-100 text-purple-700';
                case 'Referenced': return 'bg-cyan-100 text-cyan-700';
                case 'Array': return 'bg-green-100 text-green-700';
                case 'String': return 'bg-gray-100 text-gray-700';
                case 'Int32':
                case 'Double':
                case 'Decimal128': return 'bg-yellow-100 text-yellow-700';
                case 'Boolean': return 'bg-orange-100 text-orange-700';
                case 'Date': return 'bg-lime-100 text-lime-700';
                default: return 'bg-gray-100 text-gray-700';
              }
            };

            const renderTypeSpans = () => {
              if (Array.isArray(type)) {
                return type.map((typeStr, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 text-[10px] rounded-full font-medium ${getTypeColorClass(typeStr)}`}
                  >
                    {typeStr}
                  </span>
                ));
              } else {
                return (
                  <span
                    className={`px-2 py-1 text-[10px] rounded-full font-medium ${getTypeColorClass(type)}`}
                  >
                    {type}
                  </span>
                );
              }
            };

            return renderTypeSpans();
          })()}

          {/* Reference 표시 */}
          {hasReference && (
            <span className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-600 border border-blue-200">
              REF
            </span>
          )}

          {/* ReferencedDocument 표시 */}
          { refTraverse && (
            <span className="px-2 py-1 text-xs rounded-full bg-cyan-50 text-cyan-600 border border-cyan-200">
              {referencedDatabase}/{referencedCollection}
            </span>
          )}

          {/* SubDocument 표시 */}
          {hasSubDocuments && (
            <span className="px-2 py-1 text-xs rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
              SUB
            </span>
          )}
        </div>

        {/* Reference 정보 */}
        {hasReference && referencedDocuments && (
          <div className="text-xs mt-2">
            <div className="bg-blue-50 p-2 rounded border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-blue-700">Referenced Documents</span>
                {referencedDatabase && referencedCollection && (
                  <span className="text-blue-600 text-xs bg-white px-2 py-1 rounded">
                    {referencedDatabase}/{referencedCollection}
                  </span>
                )}
              </div>
              <div className="text-blue-600">
                {referencedDocuments.length} document{referencedDocuments.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
        )}

        {/* ReferencedDocument 정보 */}
        {refTraverse && originalDocument && (
          <div className="text-xs mt-2">
            <div className="bg-cyan-50 p-2 rounded border">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-cyan-700">Document Fields</span>
                {referencedDatabase && referencedCollection && (
                  <span className="text-cyan-600 text-xs bg-white px-2 py-1 rounded">
                    {referencedDatabase}/{referencedCollection}
                  </span>
                )}
              </div>
              <div className="text-cyan-600">
                {Object.keys(originalDocument).filter(k => k !== '_id').length} field{Object.keys(originalDocument).filter(k => k !== '_id').length !== 1 ? 's' : ''} available
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      onClick={() => {
        console.log('Field clicked:', field);
        onFieldSelect(field.name, parentPath, depth);
      }}
      className={`p-2 rounded-lg cursor-pointer transition-all duration-200 overflow-hidden mb-1 ${
        isSelected
          ? 'bg-purple-50 border border-purple-200 shadow-sm'
          : 'hover:bg-gray-50 border border-transparent'
      } ${field.hasReference ? 'ring-1 ring-blue-200' : ''} ${refTraverse ? 'ring-1 ring-cyan-200' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* 키 이름 */}
          <div className="flex items-center gap-2 ml-1 mb-1 min-w-0 truncate text-ellipsis">
            <span className="font-medium text-gray-900 text-sm">
              {(() => {
              const fieldNameArray = field.name.split(' ');
              if (fieldNameArray[fieldNameArray.length - 1] === '_') {
                return fieldNameArray[1];
              } else {
                return field.name;
              }
              })()}:
            </span>
            <span className="text-sm text-gray-600 font-mono truncate">
              {formatValue(field.value)}
            </span>

            {/* MongoDB 특화 아이콘들 */}
            {field.hasReference && (
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}

            {refTraverse && (
              <svg className="w-4 h-4 text-cyan-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}

            {field.hasSubDocuments && (
              <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            )}

            {canTraverse(field.value, field.hasReference, field.isReferencedDocument, field.type) && (
              <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>

          {/* 필드 값 */}
          <div className="overflow-hidden">
            {renderFieldValue()}
          </div>
        </div>
      </div>

      {/* 선택된 필드의 상세 정보 */}
      {isSelected && depth === currentDepth && (
        <div className="mt-3 pt-3 border-t border-purple-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
            {JSON.stringify(field.value, null, 2)}
          </pre>
          <div className="mt-2 flex space-x-2 flex-wrap">
            {field.hasReference && (
              <button className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors duration-200">
                Query Reference
              </button>
            )}
            {refTraverse && (
              <button className="px-3 py-1 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600 transition-colors duration-200">
                Explore Document
              </button>
            )}
            {canTraverse(field.value, field.hasReference, field.isReferencedDocument, field.type) && (
              <button className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors duration-200">
                Explore Structure
              </button>
            )}
            <button className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors duration-200">
              Edit Value
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Field;