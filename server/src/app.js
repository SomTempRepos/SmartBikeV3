const express = require('express');
const http = require('http');

// Import configuration
const config = require('./config/environment');
const { initializeDatabase } = require('./config/database');
const { createSocketServer } = require('./config/socket');

// Import middleware
const { corsMiddleware } = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import services
const socketService = require('./services/socketService');

// Import routes
const routes = require('./routes');

class App {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = null;
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      // Initialize database (ensure directories and files exist)
      await initializeDatabase();

      // Ensure geofencing data files exist
      await this.initializeGeofencingFiles();

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Setup Socket.IO
      this.setupSocket();

      // Setup error handling (must be last)
      this.setupErrorHandling();

      console.log('✅ Application initialized successfully with geofencing support');

    } catch (error) {
      console.error('❌ Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Initialize geofencing data files
   */
  async initializeGeofencingFiles() {
    const path = require('path');
    const FileManager = require('./utils/fileManager');

    try {
      // Create alerts.json if it doesn't exist
      const alertsFile = path.join(config.DATA_DIR || './data', 'alerts.json');
      if (!(await FileManager.exists(alertsFile))) {
        await FileManager.writeJson(alertsFile, []);
        console.log('✅ Created alerts.json');
      }

      // Create geofences.json if it doesn't exist
      const geofencesFile = path.join(config.DATA_DIR || './data', 'geofences.json');
      if (!(await FileManager.exists(geofencesFile))) {
        await FileManager.writeJson(geofencesFile, []);
        console.log('✅ Created geofences.json');
      }

    } catch (error) {
      console.error('❌ Error initializing geofencing files:', error);
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // CORS middleware
    this.app.use(corsMiddleware);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging in development
    if (config.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
        next();
      });
    }
  }

  /**
   * Setup application routes
   */
  setupRoutes() {
    // Mount all routes
    this.app.use('/', routes);
  }

  /**
   * Setup Socket.IO server
   */
  setupSocket() {
    const corsOptions = {
      origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
      credentials: true
    };

    this.io = createSocketServer(this.server, corsOptions);
    socketService.initialize(this.io);
    
    console.log('✅ Socket.IO server initialized with geofencing support');
  }

  /**
   * Setup error handling middleware
   */
  setupErrorHandling() {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();

      this.server.listen(config.PORT, config.HOST, () => {
        console.log(`🚴 Smart-Cycle Server with Geofencing running on ${config.HOST}:${config.PORT}`);
        console.log(`🌍 Environment: ${config.NODE_ENV}`);
        console.log(`📡 WebSocket server ready for real-time connections`);
        console.log(`💾 Data will be saved to: ${config.DAILY_DIR}`);
        console.log(`🛡️ Geofencing: Server-side processing enabled`);
        console.log(`🚨 Real-time alerts: Active`);
        console.log(`🔑 JWT Secret: ${config.JWT_SECRET === 'supersecretkey' ? '⚠️  Using default (change in production!)' : '✅ Custom secret set'}`);
        console.log(`🌐 CORS Origin: ${config.CORS_ORIGIN}`);
        console.log(`🌐 Accessible on local network at: http://${config.HOST}:${config.PORT}`);
        console.log('======================================');
        console.log('Features enabled:');
        console.log('✅ Real-time bike tracking');
        console.log('✅ Server-side geofencing calculations');
        console.log('✅ Automated alert generation');
        console.log('✅ WebSocket real-time communication');
        console.log('✅ Persistent data storage');
        console.log('✅ Historical data tracking');
        console.log('======================================');
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    const gracefulShutdown = (signal) => {
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
      this.server.close((err) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('✅ Server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }

  /**
   * Get Express app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get HTTP server instance
   */
  getServer() {
    return this.server;
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

module.exports = App;