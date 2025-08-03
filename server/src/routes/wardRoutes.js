const express = require('express');
const WardController = require('../controllers/wardController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// POST /api/guardian/wards (protected)
router.post('/guardian/wards', authenticateJWT, WardController.addWard);

// GET /api/guardian/wards (protected)
router.get('/guardian/wards', authenticateJWT, WardController.getWards);

module.exports = router;