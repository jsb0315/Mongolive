import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Table from '../ui/Table';

const CollectionManager: React.FC = () => {
  const [collections, setCollections] = useState<string[]>([]);
  const [newCollectionName, setNewCollectionName] = useState<string>('');

  useEffect(() => {
    const loadCollections = async (): Promise<void> => {
      console.log('Fetching collections...');
      // Mock data for prototype
      const mockCollections = ['users', 'products', 'orders', 'categories'];
      setCollections(mockCollections);
    };
    loadCollections();
  }, []);

  const handleCreateCollection = async (): Promise<void> => {
    if (newCollectionName) {
      console.log(`Creating collection: ${newCollectionName}`);
      
      setNewCollectionName('');
      
      // Mock: Add new collection to state
      setCollections(prev => [...prev, newCollectionName]);
      console.log('Collection created successfully');
    }
  };

  const handleDeleteCollection = async (collectionName: string): Promise<void> => {
    console.log(`Deleting collection: ${collectionName}`);
    
    // Mock: Remove collection from state
    setCollections(prev => prev.filter(col => col !== collectionName));
    console.log('Collection deleted successfully');
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Collection Manager</h2>
      <div className="mb-4">
        <Input
          value={newCollectionName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCollectionName(e.target.value)}
          placeholder="New Collection Name"
        />
        <Button onClick={handleCreateCollection} text="Create Collection" />
      </div>
      <Table
        columns={[
          { header: 'Collection Name', accessor: 'name' },
          { header: 'Actions', accessor: 'actions' },
        ]}
        data={collections.map((collection: string) => ({
          name: collection,
          actions: (
            <Button
              onClick={() => handleDeleteCollection(collection)}
              text="Delete"
              className="bg-red-500 text-white"
            />
          ),
        }))}
      />
    </div>
  );
};

export default CollectionManager;