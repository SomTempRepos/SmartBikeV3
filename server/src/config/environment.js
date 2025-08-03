// Load environment variables first
require('dotenv').config();

const path = require('path');

// Environment variables with fallback defaults
const config = {
  // Server configuration
  PORT: process.env.PORT || 3001,
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Security
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretkey',
  
  // CORS configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // Directory and file paths
  DATA_DIR: process.env.DATA_DIR || path.join(__dirname, '../../data'),
  DAILY_DIR: process.env.DAILY_DIR || path.join(__dirname, '../../data', 'daily'),
  USERS_FILE: process.env.USERS_FILE || path.join(__dirname, '../../data', 'users.json'),
  RANKS_FILE: process.env.RANKS_FILE || path.join(__dirname, '../../data', 'ranks.json'),
  GUARDIANS_FILE: process.env.GUARDIANS_FILE || path.join(__dirname, '../../data', 'guardians.json'),
  BIKES_FILE: process.env.BIKES_FILE || path.join(__dirname, '../../data', 'bikes.json'),
  
  // Socket.IO configuration
  SOCKET_PING_TIMEOUT: parseInt(process.env.SOCKET_PING_TIMEOUT) || 30000,
  SOCKET_PING_INTERVAL: parseInt(process.env.SOCKET_PING_INTERVAL) || 5000,
};

// Security warning for development
if (config.NODE_ENV === 'production' && config.JWT_SECRET === 'supersecretkey') {
  console.warn('⚠️  WARNING: Using default JWT secret in production! Please set JWT_SECRET environment variable.');
}

module.exports = config;