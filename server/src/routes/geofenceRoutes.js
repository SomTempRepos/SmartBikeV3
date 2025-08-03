// src/routes/geofencingRoutes.js
const express = require('express');
const router = express.Router();
const geofencingController = require('../controllers/geofenceController');
const { authenticateJWT } = require('../middleware/auth');

// Set geofence (create or update)
router.post('/geofence',  geofencingController.setGeofence);

// Get all geofences
router.get('/geofences',  geofencingController.getGeofences);

// Get active geofence
router.get('/geofence/active',  geofencingController.getActiveGeofence);

// Get alerts
router.get('/alerts',  geofencingController.getAlerts);

// Acknowledge alert
router.put('/alerts/:alertId/acknowledge',  geofencingController.acknowledgeAlert);

// Clear old alerts
router.delete('/alerts/old',  geofencingController.clearOldAlerts);

// Get bike geofence status
router.get('/bikes/status',  geofencingController.getBikeGeofenceStatus);

module.exports = router;