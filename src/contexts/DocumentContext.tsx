import React, { createContext, useContext, useCallback, useState } from 'react';
import { apiClient } from '../utils/apiClient';

interface MongoDocument {
  _id: any;
  [key: string]: any;
}

interface DocumentContextValue {
  databaseName: string;
  collectionName: string;
  documentId: string;
  document: MongoDocument | null;
  isUpdating: boolean;
  error: string | null;
  updateField: (fieldPath: string[], newName?: string, newValue?: any) => Promise<boolean>;
  deleteField: (fieldPath: string[]) => Promise<boolean>;
  addField: (parentPath: string[], fieldName: string, fieldValue: any) => Promise<boolean>;
  refreshDocument: () => Promise<void>;
  clearError: () => void;
}

const DocumentContext = createContext<DocumentContextValue | null>(null);

export const useDocumentContext = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocumentContext must be used within a DocumentProvider');
  }
  return context;
};

interface DocumentProviderProps {
  children: React.ReactNode;
  databaseName: string;
  collectionName: string;
  documentId: string;
  document: MongoDocument | null;
  onDocumentChange: (document: MongoDocument | null) => void;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({
  children,
  databaseName,
  collectionName,
  documentId,
  document,
  onDocumentChange
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get value by field path
  const getValueByPath = useCallback((obj: any, path: string[]): any => {
    return path.reduce((current, key) => {
      if (current && typeof current === 'object') {
        // Handle array indices like [0], [1]
        if (key.startsWith('[') && key.endsWith(']')) {
          const index = parseInt(key.slice(1, -1));
          return Array.isArray(current) ? current[index] : undefined;
        }
        return current[key];
      }
      return undefined;
    }, obj);
  }, []);

  // Refresh document from server
  const refreshDocument = useCallback(async () => {
    try {
      const updatedDocument = await apiClient.getDocument(databaseName, collectionName, documentId);
      onDocumentChange(updatedDocument);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh document';
      setError(errorMessage);
      console.error('❌ Failed to refresh document:', err);
    }
  }, [databaseName, collectionName, documentId, onDocumentChange]);

  // Update field value and/or name
  const updateField = useCallback(async (
    fieldPath: string[],
    newName?: string,
    newValue?: any
  ): Promise<boolean> => {
    if (!document) {
      setError('No document available for update');
      return false;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const currentFieldName = fieldPath[fieldPath.length - 1];
      const dotPath = fieldPath.join('.');
      
      // Determine what needs to be updated
      const nameChanged = newName && newName !== currentFieldName;
      const valueChanged = newValue !== undefined;
      
      if (!nameChanged && !valueChanged) {
        // No changes to make
        setIsUpdating(false);
        return true;
      }

      let updateOperation: any = {};

      if (nameChanged && valueChanged) {
        // Both name and value changed
        const newPath = [...fieldPath.slice(0, -1), newName].join('.');
        updateOperation = {
          $unset: { [dotPath]: "" },
          $set: { [newPath]: newValue }
        };
      } else if (nameChanged) {
        // Only name changed, keep existing value
        const currentValue = getValueByPath(document, fieldPath);
        const newPath = [...fieldPath.slice(0, -1), newName].join('.');
        updateOperation = {
          $unset: { [dotPath]: "" },
          $set: { [newPath]: currentValue }
        };
      } else if (valueChanged) {
        // Only value changed
        updateOperation = {
          $set: { [dotPath]: newValue }
        };
      }

      console.log('🔄 Updating field:', {
        fieldPath,
        dotPath,
        newName,
        newValue,
        updateOperation
      });

      const response = await apiClient.updateDocument(databaseName, collectionName, documentId, updateOperation);
      
      if (response.success) {
        await refreshDocument();
        console.log('✅ Field updated successfully');
        return true;
      } else {
        setError(response.error || 'Update failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update field';
      setError(errorMessage);
      console.error('❌ Field update failed:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [document, databaseName, collectionName, documentId, getValueByPath, refreshDocument]);

  // Delete field
  const deleteField = useCallback(async (fieldPath: string[]): Promise<boolean> => {
    if (!document) {
      setError('No document available for deletion');
      return false;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const dotPath = fieldPath.join('.');
      const updateOperation = {
        $unset: { [dotPath]: "" }
      };

      console.log('🗑️ Deleting field:', {
        fieldPath,
        dotPath,
        updateOperation
      });

      const response = await apiClient.updateDocument(databaseName, collectionName, documentId, updateOperation);
      
      if (response.success) {
        await refreshDocument();
        console.log('✅ Field deleted successfully');
        return true;
      } else {
        setError(response.error || 'Delete failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete field';
      setError(errorMessage);
      console.error('❌ Field deletion failed:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [document, databaseName, collectionName, documentId, refreshDocument]);

  // Add new field
  const addField = useCallback(async (parentPath: string[], fieldName: string, fieldValue: any): Promise<boolean> => {
    if (!document) {
      setError('No document available for field addition');
      return false;
    }

    if (!fieldName.trim()) {
      setError('Field name is required');
      return false;
    }

    setIsUpdating(true);
    setError(null);

    try {
      // Build the full path for the new field
      const fullPath = parentPath.length > 0 ? [...parentPath, fieldName] : [fieldName];
      const dotPath = fullPath.join('.');

      // Check if field already exists
      const existingValue = getValueByPath(document, fullPath);
      if (existingValue !== undefined) {
        setError(`Field "${fieldName}" already exists`);
        setIsUpdating(false);
        return false;
      }

      const updateOperation = {
        $set: { [dotPath]: fieldValue }
      };

      console.log('➕ Adding field:', {
        parentPath,
        fieldName,
        fieldValue,
        fullPath,
        dotPath,
        updateOperation
      });

      const response = await apiClient.updateDocument(databaseName, collectionName, documentId, updateOperation);
      
      if (response.success) {
        await refreshDocument();
        console.log('✅ Field added successfully');
        return true;
      } else {
        setError(response.error || 'Add field failed');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add field';
      setError(errorMessage);
      console.error('❌ Field addition failed:', err);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, [document, databaseName, collectionName, documentId, getValueByPath, refreshDocument]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: DocumentContextValue = {
    databaseName,
    collectionName,
    documentId,
    document,
    isUpdating,
    error,
    updateField,
    deleteField,
    addField,
    refreshDocument,
    clearError
  };

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

export default DocumentProvider;
