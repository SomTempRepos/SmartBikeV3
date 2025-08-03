const express = require('express');
const GuardianController = require('../controllers/guardianController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// GET /api/guardian/me (protected)
router.get('/guardian/me', authenticateJWT, GuardianController.getGuardianProfile);

// GET /api/guardians
router.get('/guardians', GuardianController.getAllGuardians);

// GET /api/ranks
router.get('/ranks', GuardianController.getRanks);

// GET /api/guardian/bikes (protected)
router.get('/guardian/bikes', authenticateJWT, GuardianController.getGuardianBikes);

module.exports = router;