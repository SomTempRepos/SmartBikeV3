const express = require('express');
const SpeedLimitController = require('../controllers/speedLimitController');

const router = express.Router();

// Speed limit routes for specific bikes
router.post('/bikes/:bikeId/speed-limit', SpeedLimitController.setSpeedLimit);
router.get('/bikes/:bikeId/speed-limit', SpeedLimitController.getSpeedLimit);
router.put('/bikes/:bikeId/speed-limit', SpeedLimitController.updateSpeedLimit);
router.delete('/bikes/:bikeId/speed-limit', SpeedLimitController.deleteSpeedLimit);

// Speed violation check
router.post('/bikes/:bikeId/check-speed', SpeedLimitController.checkSpeedViolation);

// Bulk operations
router.get('/speed-limits', SpeedLimitController.getAllSpeedLimits);
router.post('/speed-limits/bulk', SpeedLimitController.getSpeedLimitsForBikes);

module.exports = router;