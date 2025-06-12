const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');

// Route to get all collections
router.get('/', collectionController.getAllCollections);

// Route to create a new collection
router.post('/', collectionController.createCollection);

// Route to get a specific collection by name
router.get('/:name', collectionController.getCollectionByName);

// Route to delete a collection by name
router.delete('/:name', collectionController.deleteCollection);

module.exports = router;