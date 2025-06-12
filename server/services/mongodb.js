// filepath: /mongodb-admin-console/mongodb-admin-console/server/services/mongodb.js
const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const mongoUrl = process.env.MONGO_ADMIN; // MongoDB connection URL
const dbName = 'test'; // Database name

let db; // Variable to hold the database connection

// Function to connect to the MongoDB database
async function connectToDatabase() {
  if (!db) {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db(dbName);
    console.log("Connected to MongoDB");
  }
  return db;
}

// Function to get all users from the database
async function getAllUsers() {
  const database = await connectToDatabase();
  const collection = database.collection('user');
  return await collection.find({}).toArray(); // Fetch all users
}

// Function to get a user by ID
async function getUserById(id) {
  const database = await connectToDatabase();
  const collection = database.collection('user');
  return await collection.findOne({ _id: new ObjectId(id) }); // Fetch user by ID
}

// Function to create a new user
async function createUser(userData) {
  const database = await connectToDatabase();
  const collection = database.collection('user');
  const result = await collection.insertOne(userData); // Insert new user
  return result.ops[0]; // Return the created user
}

// Function to update a user by ID
async function updateUser(id, userData) {
  const database = await connectToDatabase();
  const collection = database.collection('user');
  await collection.updateOne({ _id: new ObjectId(id) }, { $set: userData }); // Update user
}

// Function to delete a user by ID
async function deleteUser(id) {
  const database = await connectToDatabase();
  const collection = database.collection('user');
  await collection.deleteOne({ _id: new ObjectId(id) }); // Delete user
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};