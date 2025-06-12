// filepath: /mongodb-admin-console/mongodb-admin-console/server/middleware/validation.js
const { body, validationResult } = require('express-validator');

// Middleware for validating user input
const validateUser = [
  body('username').isString().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Email is not valid'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

// Middleware for validating database input
const validateDatabase = [
  body('name').isString().notEmpty().withMessage('Database name is required'),
];

// Middleware for validating collection input
const validateCollection = [
  body('name').isString().notEmpty().withMessage('Collection name is required'),
];

// Middleware for handling validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

module.exports = {
  validateUser,
  validateDatabase,
  validateCollection,
  handleValidationErrors,
};