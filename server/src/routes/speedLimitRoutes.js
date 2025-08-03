const express = require('express');
const SpeedLimitController = require('../controllers/speedLimitController');

const router = express.Router();

// Speed limit management for individual bikes
// POST /api/bikes/:bikeId/speed-limit - Set speed limit for a bike
router.post('/bikes/:bikeId/speed-limit', SpeedLimitController.setSpeedLimit);

// GET /api/bikes/:bikeId/speed-limit - Get speed limit for a bike
router.get('/bikes/:bikeId/speed-limit', SpeedLimitController.getSpeedLimit);

// DELETE /api/bikes/:bikeId/speed-limit - Remove speed limit for a bike
router.delete('/bikes/:bikeId/speed-limit', SpeedLimitController.removeSpeedLimit);

// POST /api/bikes/:bikeId/check-speed - Check if current speed violates limit
router.post('/bikes/:bikeId/check-speed', SpeedLimitController.checkSpeedViolation);

// GET /api/bikes/:bikeId/speed-violations - Get speed violations for a bike
router.get('/bikes/:bikeId/speed-violations', SpeedLimitController.getSpeedViolations);

// GET /api/bikes/:bikeId/speed-limit-history - Get speed limit history for a bike
router.get('/bikes/:bikeId/speed-limit-history', SpeedLimitController.getSpeedLimitHistory);

// Bulk operations
// GET /api/bikes/speed-limits - Get all bikes with their speed limits
router.get('/bikes/speed-limits', SpeedLimitController.getAllBikesSpeedLimits);

// GET /api/speed-violations/summary - Get summary of all speed violations
router.get('/speed-violations/summary', SpeedLimitController.getSpeedViolationsSummary);

module.exports = router;