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
const speedLimitRoutes = require('./speedLimitRoutes');

const router = express.Router();

// Mount route modules
router.use('/api', authRoutes);
router.use('/api', bikeRoutes);
router.use('/api', guardianRoutes);
router.use('/api', wardRoutes);
router.use('/api', historyRoutes);
router.use('/api/geofencing', geofencingRoutes);
router.use('/api', speedLimitRoutes);

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
router.get('/', (req, res) => {
  res.json({
    message: 'Smart-Cycle Server API',
    version: '1.0.0',
    features: [
      'Real-time bike tracking',
      'Geofencing with alerts',
      'Speed limit monitoring',
      'WebSocket communication',
      'Historical data storage',
      'User authentication'
    ],
    endpoints: {
      health: '/health',
      auth: '/api/login, /api/signup',
      bikes: '/api/bikes',
      geofencing: '/api/geofence',
      speedLimits: '/api/speed-limits',
      history: '/api/history'
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