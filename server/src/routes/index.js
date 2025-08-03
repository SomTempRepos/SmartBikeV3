const express = require('express');
const config = require('../config/environment');
const socketService = require('../services/socketService');

// Import route modules
const authRoutes = require('./authRoutes');
const bikeRoutes = require('./bikeRoutes');
const guardianRoutes = require('./guardianRoutes');
const wardRoutes = require('./wardRoutes');
const historyRoutes = require('./historyRoutes');
const geofencingRoutes = require('./geofenceRoutes');

const router = express.Router();

// Mount route modules
router.use('/api', authRoutes);
router.use('/api', bikeRoutes);
router.use('/api', guardianRoutes);
router.use('/api', wardRoutes);
router.use('/api', historyRoutes);
router.use('/api/geofencing', geofencingRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    clientsConnected: socketService.getConnectedClientsCount(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    features: {
      bikeTracking: true,
      geofencing: true,
      realTimeAlerts: true,
      websocketSupport: true
    }
  });
});

// Environment info endpoint (for debugging - remove in production)
router.get('/env-info', (req, res) => {
  if (config.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    host: config.HOST,
    dataDir: config.DATA_DIR,
    dailyDir: config.DAILY_DIR,
    corsOrigin: config.CORS_ORIGIN,
    jwtSecretSet: !!config.JWT_SECRET && config.JWT_SECRET !== 'supersecretkey',
    geofencingEnabled: true
  });
});

module.exports = router;