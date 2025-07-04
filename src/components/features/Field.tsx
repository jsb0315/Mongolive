import React, { useState, useEffect } from 'react';
import { FieldPath } from '../../types/collectionTypes';
import { formatValue, canTraverse } from '../../utils/mongoUtils';
import { useDocumentContext } from '../../contexts/DocumentContext';

interface FieldProps {
  field: FieldPath;
  selectedFieldName: string | null;
  depth: number;
  currentDepth: number;
  isHighlighted?: boolean;
  onFieldSelect: (selectedField: FieldPath, parentPath: string[], depth: number) => void;
  parentPath?: string[];
}

const Field: React.FC<FieldProps> = ({
  field,
  selectedFieldName,
  depth,
  currentDepth,
  isHighlighted = false,
  onFieldSelect,
  parentPath = []
}) => {
  const isSelected = selectedFieldName === field.name;
  const fieldValue = field.value;
  const fieldType = field.type || [];

  // Document context for updates
  const { updateField, deleteField, isUpdating, error, clearError } = useDocumentContext();

  // 편집 모드 상태 관리
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(field.name);
  const [editedValue, setEditedValue] = useState(
    typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue)
  );

  // const isRefField = fieldType.includes('Referenced') && field.referencedId;  // ReferencedDocument 탐색 여부
  const isRefField = fieldType.length === 2 && fieldType.includes("ObjectId") && fieldType.includes("Referenced");

  // ESC 키 처리 useEffect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isEditing) {
          // 편집 모드에서 ESC 키: 편집 취소
          handleEditCancel();
        } else if (isSelected && depth === currentDepth) {
          // 필드 상세정보가 펼쳐진 상태에서 ESC 키: 선택 해제
          onFieldSelect(field, parentPath, depth);
        }
      }
    };

    // isEditing 상태이거나 선택된 필드일 때만 이벤트 리스너 추가
    if (isEditing || (isSelected && depth === currentDepth)) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isEditing, isSelected, depth, currentDepth, field, parentPath, onFieldSelect]);

  // 편집 모드 핸들러 함수들
  const handleEditStart = () => {
    setIsEditing(true);
    clearError(); // Clear any previous errors
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditedName(field.name);
    setEditedValue(typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue));
    clearError();
  };

  const handleEditSave = async () => {
    const isTraversable = canTraverse(fieldValue, fieldType);
    
    try {
      // Determine what changes to make
      const nameChanged = editedName !== field.name;
      const valueChanged = !isTraversable && editedValue !== (typeof fieldValue === 'string' ? fieldValue : JSON.stringify(fieldValue));
      
      if (!nameChanged && !valueChanged) {
        // No changes made
        setIsEditing(false);
        return;
      }

      // Build field path from parent path and current field name
      const fieldPath = [...parentPath, field.name];
      
      let newValue = undefined;
      if (valueChanged && !isTraversable) {
        // Try to parse the value for non-traversable fields
        try {
          newValue = JSON.parse(editedValue);
        } catch {
          // If parsing fails, treat as string
          newValue = editedValue;
        }
      }
      
      console.log('Saving field changes:', {
        originalName: field.name,
        newName: nameChanged ? editedName : undefined,
        originalValue: fieldValue,
        newValue: newValue,
        isTraversable: isTraversable,
        fieldType: fieldType,
        fieldPath: fieldPath
      });

      const success = await updateField(
        fieldPath,
        nameChanged ? editedName : undefined,
        newValue
      );
      
      if (success) {
        setIsEditing(false);
        console.log('✅ Field updated successfully');
      }
      // Error handling is done in the context
      
    } catch (err) {
      console.error('❌ Failed to save field:', err);
      // Error is handled by the context
    }
  };

  const handleEditDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the field "${field.name}"?`)) {
      return;
    }

    try {
      const fieldPath = [...parentPath, field.name];
      
      console.log('Deleting field:', {
        fieldName: field.name,
        fieldPath: fieldPath
      });

      const success = await deleteField(fieldPath);
      
      if (success) {
        setIsEditing(false);
        console.log('✅ Field deleted successfully');
      }
      // Error handling is done in the context
      
    } catch (err) {
      console.error('❌ Failed to delete field:', err);
      // Error is handled by the context
    }
  };

  const renderFieldValue = () => {
    const {
      value,
      type,
      referencedId,
      referencedDocuments,
      referencedCollection,
      referencedDatabase,
    } = field;

    // if (isRefField) {
    //   console.log(`Rendering field: ${field.name}, `, 'hasReference:', hasReference, 'referencedId:', referencedId, 'Original Document:', originalDocument, 'refDoc:', referencedDocuments, 'refCollection:', referencedCollection, 'refDatabase:', referencedDatabase);
    // }

    const isRefDoc = type.length === 2 && type.includes("ObjectId") && type.includes("Referenced");
    const refDocLength = isRefDoc && referencedDocuments ? Object.keys(referencedDocuments[0]).length : null;
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
        </div>

        {/* Reference 정보 프리뷰 */}
        {type.includes('Referenced') && referencedDocuments && typeof referencedDocuments[0] === 'object' && (
          <div className="text-xs mt-2">
            <div className="bg-cyan-50 p-1.5 px-2 rounded border">

              <div className="font-medium text-cyan-500 mb-1">Referenced Documents</div>

              <div className="flex items-end justify-between flex-wrap gap-1">
                <div className="text-cyan-600">
                  {refDocLength ? `${refDocLength} Field${refDocLength !== 1 ? 's' : ''} found` : 'document not found'}
                </div>
                {referencedDatabase && referencedCollection && (
                  <span className="text-cyan-600 text-xs bg-white/100 p-1 py-0.5 rounded">
                    {referencedDatabase}/{referencedCollection}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}


      </div>
    );
  };

  const fieldNameArray = field.name.split(' ');
  const isArrayRefDoc = fieldNameArray[fieldNameArray.length - 1] === '_';  // 단독 RefDoc의 경우 마지막 부분이 '_'로 끝남
  const displayName = isRefField ? fieldNameArray[0] : field.name; // 필드 이름 표시
  const displayValue = isRefField ? fieldValue.toString() : formatValue(fieldValue, fieldType);  // 필드 값 표시
  return (
    <div
      onClick={() => !isEditing && onFieldSelect(field, parentPath, depth)}
      className={`relative group p-2 rounded-lg ${!isEditing ? 'cursor-pointer' : 'cursor-default'} transition-all duration-200 overflow-hidden mb-1 ${
        isHighlighted 
          ? 'bg-yellow-100 border-2 border-yellow-400 shadow-md animate-pulse' 
          : isSelected
            ? 'bg-slate-100 border border-slate-200 shadow-sm'
            : isEditing
              ? 'bg-blue-50 border border-blue-200 shadow-sm'
              : 'hover:bg-gray-50 border border-transparent'
      } ${fieldType.includes('ObjectId') ? 'ring-1 ring-blue-200' : ''} ${isRefField ? 'ring-1 ring-cyan-200' : ''}`}
    >
      {/* Loading overlay */}
      {isUpdating && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span className="text-sm">Updating...</span>
          </div>
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                clearError();
              }}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* 키 이름 */}
          <div className="flex items-center gap-2 ml-1 mb-1 min-w-0 truncate justify-between">

            <div className="flex items-center justify-center gap-1 min-w-0 truncate text-ellipsis">
              {isEditing ? (
                // 편집 모드: 입력 필드
                <div className="CancelESC flex items-center gap-1 w-full">
                  {canTraverse(fieldValue, fieldType) ? (
                    // traversable 필드: name만 편집 가능
                    !isArrayRefDoc ? (
                      <>
                        <input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="flex font-medium text-gray-900 text-sm bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-w-28 flex-shrink"
                          style={{ width: `${Math.min(editedName.length + 1, 20)}ch` }}
                        />
                        <span className="text-gray-900">:</span>
                        <span 
                          className="text-sm text-gray-600 font-mono bg-gray-100 border border-gray-300 rounded px-1 py-0.5 min-w-0 flex-1 inline-block"
                          title="Complex values (ObjectId, Array, Document) cannot be edited directly"
                        >
                          {displayValue}
                        </span>
                      </>
                    ) : (
                      // Array reference document의 경우 값만 표시
                      <span 
                        className="text-sm text-gray-600 font-mono bg-gray-100 border border-gray-300 rounded px-1 py-0.5 min-w-0 flex-1 inline-block"
                        title="Complex values (ObjectId, Array, Document) cannot be edited directly"
                      >
                        {displayValue}
                      </span>
                    )
                  ) : (
                    // non-traversable 필드: name과 value 모두 편집 가능
                    <>
                      {!isArrayRefDoc && (
                        <>
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex font-medium text-gray-900 text-sm bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 max-w-28 flex-shrink"
                            style={{ width: `${Math.min(editedName.length + 1, 20)}ch` }}
                          />
                          <span className="text-gray-900">:</span>
                        </>
                      )}
                      <input
                        type="text"
                        value={editedValue}
                        onChange={(e) => setEditedValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-gray-600 font-mono bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-0 flex-1"
                      />
                    </>
                  )}
                </div>
              ) : (
                // 보기 모드: 기존 디스플레이
                <>
                  {!isArrayRefDoc && (
                    <span 
                      className="font-medium text-gray-900 text-sm cursor-pointer hover:bg-gray-100 px-1 rounded"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleEditStart();
                      }}
                    >
                      {displayName}:
                    </span>
                  )}
                  <span 
                    className="text-sm text-gray-600 font-mono truncate cursor-pointer hover:bg-gray-100 px-1 rounded"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleEditStart();
                    }}
                  >
                    {displayValue}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-1">
              {/* MongoDB 특화 아이콘들 */}
              {/* Edit Mode Icons */}
              {isEditing ? (
                <div className="flex items-center space-x-1">
                  {/* Delete Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditDelete();
                    }}
                    className="p-1 rounded hover:bg-red-100 transition-colors duration-200"
                    title="Delete field"
                  >
                    <svg className="w-4 h-4 text-red-500 hover:text-red-700 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  {/* Save Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditSave();
                    }}
                    className="p-1 rounded hover:bg-green-100 transition-colors duration-200"
                    title="Save changes"
                  >
                    <svg className="w-4 h-4 text-green-500 hover:text-green-700 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  {/* Cancel Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditCancel();
                    }}
                    className="p-1 rounded hover:bg-gray-200 transition-colors duration-200"
                    title="Cancel edit"
                  >
                    <svg className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  {/* Edit Icon - 호버 시에만 표시 */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart();
                      }}
                      className="p-1 rounded hover:bg-gray-200 transition-colors duration-200"
                      title="Edit field value"
                    >
                      <svg className="w-4 h-4 text-gray-500 hover:text-gray-700 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
              {/* Chain */}
              {fieldType.includes('ObjectId') && (
                <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              )}
              {/* Reference Document */}
              {isRefField && (
                <svg className="w-4 h-4 text-cyan-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              {/* Embedded Document */}
              {fieldType.includes('Document') && fieldType.includes('Embedded') && (
                <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              )}
              {/* CanTraverse */}
              {canTraverse(fieldValue, fieldType) && (
                <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </div>

          {/* 필드 값 */}
          <div className="overflow-hidden">
            {renderFieldValue()}
          </div>
        </div>
      </div>

      {/* 선택된 필드의 상세 정보 - 편집 모드가 아닐 때만 표시 */}
      {isSelected && depth === currentDepth && !isEditing && (
        <div className="mt-3 pt-3 border-t border-purple-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          <pre className="CancelESC bg-gray-50 p-3 rounded text-xs overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
            {JSON.stringify(fieldValue, null, 2)}
          </pre>
          <div className="mt-2 flex space-x-2 flex-wrap">
            {fieldType.includes('Referenced') && (
              <button className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors duration-200">
                Query Reference
              </button>
            )}
            {isRefField && (
              <button className="px-3 py-1 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600 transition-colors duration-200">
                Explore Document
              </button>
            )}
            {canTraverse(fieldValue, fieldType) && (
              <button className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors duration-200">
                Explore Structure
              </button>
            )}
            {/* <button className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors duration-200">
              Edit Value
            </button> */}
          </div>
        </div>
      )}
    </div>
  );
};

export default Field;