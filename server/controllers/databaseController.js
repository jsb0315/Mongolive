// filepath: /mongodb-admin-console/mongodb-admin-console/server/controllers/databaseController.js
const { MongoClient, ObjectId } = require('mongodb');
const { connectToDatabase } = require('../services/mongodb');

// Function to get all databases
exports.getDatabases = async (req, res) => {
  try {
    const db = await connectToDatabase();
    const databases = await db.admin().listDatabases();
    res.status(200).json(databases.databases);
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to get collections in a specific database
exports.getCollections = async (req, res) => {
  const { dbName } = req.params;
  try {
    const db = await connectToDatabase();
    const collections = await db.db(dbName).listCollections().toArray();
    res.status(200).json(collections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to create a new collection
exports.createCollection = async (req, res) => {
  const { dbName, collectionName } = req.params;
  try {
    const db = await connectToDatabase();
    await db.db(dbName).createCollection(collectionName);
    res.status(201).json({ message: 'Collection created successfully' });
  } catch (error) {
    console.error('Error creating collection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Function to delete a collection
exports.deleteCollection = async (req, res) => {
  const { dbName, collectionName } = req.params;
  try {
    const db = await connectToDatabase();
    await db.db(dbName).dropCollection(collectionName);
    res.status(200).json({ message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};