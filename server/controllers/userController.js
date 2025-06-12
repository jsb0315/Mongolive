// filepath: /mongodb-admin-console/mongodb-admin-console/server/controllers/userController.js
const { MongoClient, ObjectId } = require('mongodb');
const { connectToDatabase } = require('../services/mongodb');

// Function to get all users
const getAllUsers = async (req, res) => {
  try {
    const db = await connectToDatabase();
    const users = await db.collection('users').find().toArray();
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Function to get a user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const db = await connectToDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Function to create a new user
const createUser = async (req, res) => {
  const newUser = req.body;
  try {
    const db = await connectToDatabase();
    const result = await db.collection('users').insertOne(newUser);
    res.status(201).json({ success: true, data: result.ops[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Function to update a user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  try {
    const db = await connectToDatabase();
    const result = await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

// Function to delete a user
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const db = await connectToDatabase();
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};