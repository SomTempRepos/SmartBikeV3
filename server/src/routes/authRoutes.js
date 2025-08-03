const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// POST /api/login
router.post('/login', AuthController.login);

// POST /api/signup
router.post('/signup', AuthController.signup);

// GET /api/me (protected)
router.get('/me', authenticateJWT, AuthController.getProfile);

module.exports = router;