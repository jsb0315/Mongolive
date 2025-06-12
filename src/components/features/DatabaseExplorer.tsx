import React, { useEffect, useState } from 'react';
import Table from '../ui/Table';
import useDatabase from '../../hooks/useDatabase';

const DatabaseExplorer: React.FC = () => {
  const { fetchCollections, fetchDocuments } = useDatabase();
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    const loadCollections = async () => {
      const collectionsData = await fetchCollections();
      setCollections(collectionsData);
    };

    loadCollections();
  }, [fetchCollections]);

  const handleCollectionSelect = async (collection: string) => {
    setSelectedCollection(collection);
    const documentsData = await fetchDocuments(collection);
    setDocuments(documentsData);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Database Explorer</h2>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Collections</h3>
        <ul className="list-disc pl-5">
          {collections.map((collection) => (
            <li key={collection} className="cursor-pointer hover:text-blue-500" onClick={() => handleCollectionSelect(collection)}>
              {collection}
            </li>
          ))}
        </ul>
      </div>
      {selectedCollection && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Documents in {selectedCollection}</h3>
          <Table
            columns={[
              { header: 'ID', accessor: '_id' },
              { header: 'Data', accessor: 'data' },
            ]}
            data={documents}
          />
        </div>
      )}
    </div>
  );
};

export default DatabaseExplorer;