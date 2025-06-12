// filepath: /mongodb-admin-console/mongodb-admin-console/server/controllers/collectionController.js
const { ObjectId } = require('mongodb');
const { connectToDatabase } = require('../services/mongodb');

// Function to create a new collection
const createCollection = async (req, res) => {
  const { name } = req.body;
  try {
    const db = await connectToDatabase();
    await db.createCollection(name);
    res.status(201).json({ success: true, message: 'Collection created successfully' });
  } catch (error) {
    console.error('Error creating collection:', error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Function to get all collections
const getCollections = async (req, res) => {
  try {
    const db = await connectToDatabase();
    const collections = await db.listCollections().toArray();
    res.status(200).json({ success: true, data: collections });
  } catch (error) {
    console.error('Error fetching collections:', error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Function to delete a collection
const deleteCollection = async (req, res) => {
  const { name } = req.params;
  try {
    const db = await connectToDatabase();
    await db.collection(name).drop();
    res.status(200).json({ success: true, message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error.message);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Exporting the functions
module.exports = {
  createCollection,
  getCollections,
  deleteCollection,
};