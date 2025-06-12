// filepath: /mongodb-admin-console/mongodb-admin-console/server/utils/helpers.js

// This file contains helper functions used throughout the server.

// Function to format a response object
const formatResponse = (success, data = null, error = null) => {
  return {
    success,
    data,
    error,
  };
};

// Function to validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Function to handle errors and format them
const handleError = (error) => {
  console.error('Error:', error);
  return formatResponse(false, null, error.message);
};

// Function to extract query parameters from request
const extractQueryParams = (req) => {
  const { query, projection } = req.body;
  return {
    query: query ? JSON.parse(query) : {},
    projection: projection ? JSON.parse(projection) : {},
  };
};

// Exporting the helper functions
module.exports = {
  formatResponse,
  isValidObjectId,
  handleError,
  extractQueryParams,
};