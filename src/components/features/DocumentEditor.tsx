import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface DocumentEditorProps {
  document?: any;
  onSave?: (document: any) => void;
  onClose?: () => void;
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({ 
  document = { _id: '1', name: 'Sample Document', content: 'Sample content' }, 
  onSave, 
  onClose 
}) => {
  const [editedDocument, setEditedDocument] = useState(document);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setEditedDocument({ ...editedDocument, [name]: value });
  };

  const handleSave = (): void => {
    // onSave?.(editedDocument);
    console.log('Saving document:', editedDocument);
    setIsModalOpen(false);
    console.log('Document saved successfully');
  };

  const handleEdit = (): void => {
    setIsModalOpen(true);
    console.log('Opening document editor for document:', editedDocument._id);
  };

  const handleModalClose = (): void => {
    setIsModalOpen(false);
    // onClose?.();
    console.log('Document editor closed');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Document Editor</h2>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Current Document</h3>
        <pre className="bg-gray-100 p-2 rounded mb-4">
          {JSON.stringify(editedDocument, null, 2)}
        </pre>
        <Button text="Edit Document" onClick={handleEdit} />
      </div>

      <Modal
        isVisible={isModalOpen}
        title="Edit Document"
        onClose={handleModalClose}
        content={
          <div className="p-4">
            {Object.keys(editedDocument).map((key) => (
              <div key={key} className="mb-4">
                <label className="block text-sm font-medium text-gray-700">{key}</label>
                <Input
                  value={String(editedDocument[key])}
                  onChange={(e) => setEditedDocument({ ...editedDocument, [key]: e.target.value })}
                  placeholder={`Enter ${key}`}
                  className="mt-1 w-full"
                />
              </div>
            ))}
            <div className="flex justify-end mt-4">
              <Button text="Save" onClick={handleSave} className="mr-2" />
              <Button text="Cancel" onClick={handleModalClose} className="bg-gray-500" />
            </div>
          </div>
        }
      />
    </div>
  );
};

export default DocumentEditor;