const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');

// Route to get all databases
router.get('/', databaseController.getAllDatabases);

// Route to create a new database
router.post('/', databaseController.createDatabase);

// Route to delete a database
router.delete('/:name', databaseController.deleteDatabase);

// Route to get a specific database by name
router.get('/:name', databaseController.getDatabaseByName);

// Route to update a database
router.put('/:name', databaseController.updateDatabase);

module.exports = router;