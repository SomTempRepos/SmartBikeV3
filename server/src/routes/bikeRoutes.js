const express = require('express');
const BikeController = require('../controllers/bikeController');

const router = express.Router();

// POST /api/bike/data - Receive data from ESP32/simulator
router.post('/bike/data', BikeController.receiveData);

// GET /api/bikes - Get all bikes
router.get('/bikes', BikeController.getAllBikes);

// GET /api/bikes/:bikeId - Get bike by ID
router.get('/bikes/:bikeId', BikeController.getBikeById);

// GET /api/bikes/:bikeId/latest - Get latest bike data
router.get('/bikes/:bikeId/latest', BikeController.getLatestBikeData);

module.exports = router;