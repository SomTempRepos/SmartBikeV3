const cors = require('cors');
const config = require('../config/environment');

// Configure CORS options
const corsOptions = {
  origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST'],
  credentials: true
};

// CORS middleware
const corsMiddleware = cors(corsOptions);

module.exports = {
  corsOptions,
  corsMiddleware
};