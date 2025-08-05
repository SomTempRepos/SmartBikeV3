// const express = require('express');
// const http = require('http');

// // Import configuration
// const config = require('./config/environment');
// const { initializeDatabase } = require('./config/database');
// const { createSocketServer } = require('./config/socket');

// // Import middleware
// const { corsMiddleware } = require('./middleware/cors');
// const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// // Import services
// const socketService = require('./services/socketService');

// // Import routes
// const routes = require('./routes');

// class App {
//   constructor() {
//     this.log('INFO', 'App', 'constructor', 'Creating new App instance');
//     this.app = express();
//     this.server = http.createServer(this.app);
//     this.io = null;
//     this.startTime = Date.now();
    
//     this.log('DEBUG', 'App', 'constructor', 'Express app and HTTP server created successfully');
//   }

//   /**
//    * Centralized logging method
//    * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
//    * @param {string} component - Component name
//    * @param {string} method - Method name
//    * @param {string} message - Log message
//    * @param {Object} data - Additional data to log
//    */
//   log(level, component, method, message, data = null) {
//     const timestamp = new Date().toISOString();
//     const logEntry = `[${timestamp}] [${level}] [${component}:${method}] ${message}`;
    
//     if (data) {
//       console.log(logEntry, data);
//     } else {
//       console.log(logEntry);
//     }
//   }

//   /**
//    * Initialize the application
//    */
//   async initialize() {
//     const initStartTime = Date.now();
//     this.log('INFO', 'App', 'initialize', 'Starting application initialization');
    
//     try {
//       console.log('===========================================================================================================');
//       console.log('Initialising the Applications :');
      
//       // Initialize database (ensure directories and files exist)
//       this.log('INFO', 'App', 'initialize', 'Initializing database directories and files');
//       await initializeDatabase();
//       console.log('✅ Data directories initialized');
//       this.log('DEBUG', 'App', 'initialize', 'Database initialization completed successfully');
//       console.log('-----------------------------------------------------------------------------------------------------------');
      
//       // Ensure geofencing data files exist
//       this.log('INFO', 'App', 'initialize', 'Starting geofencing files initialization');
//       await this.initializeGeofencingFiles();
//       console.log('✅ Geofencing initialized');
//       this.log('DEBUG', 'App', 'initialize', 'Geofencing files initialization completed');

//       // Setup middleware
//       this.log('INFO', 'App', 'initialize', 'Setting up Express middleware');
//       this.setupMiddleware();
//       this.log('DEBUG', 'App', 'initialize', 'Middleware setup completed');

//       // Setup routes
//       this.log('INFO', 'App', 'initialize', 'Setting up application routes');
//       this.setupRoutes();
//       this.log('DEBUG', 'App', 'initialize', 'Routes setup completed');

//       // Setup Socket.IO
//       this.log('INFO', 'App', 'initialize', 'Setting up Socket.IO server');
//       this.setupSocket();
//       this.log('DEBUG', 'App', 'initialize', 'Socket.IO setup completed');

//       // Setup error handling (must be last)
//       this.log('INFO', 'App', 'initialize', 'Setting up error handling middleware');
//       this.setupErrorHandling();
//       this.log('DEBUG', 'App', 'initialize', 'Error handling setup completed');

//       const initDuration = Date.now() - initStartTime;
//       this.log('INFO', 'App', 'initialize', `Application initialization completed successfully in ${initDuration}ms`);

//     } catch (error) {
//       this.log('ERROR', 'App', 'initialize', 'Failed to initialize application', error);
//       console.error('❌ Failed to initialize application:', error);
//       throw error;
//     }
//   }

//   /**
//    * Initialize geofencing data files
//    */
//   async initializeGeofencingFiles() {
//     const path = require('path');
//     const FileManager = require('./utils/fileManager');

//     this.log('INFO', 'App', 'initializeGeofencingFiles', 'Starting geofencing files initialization');

//     try {
//       const dataDir = config.DATA_DIR || './data';
//       this.log('DEBUG', 'App', 'initializeGeofencingFiles', `Using data directory: ${dataDir}`);

//       // Create alerts.json if it doesn't exist
//       const alertsFile = path.join(dataDir, 'alerts.json');
//       this.log('DEBUG', 'App', 'initializeGeofencingFiles', `Checking alerts file: ${alertsFile}`);
      
//       if (!(await FileManager.exists(alertsFile))) {
//         this.log('INFO', 'App', 'initializeGeofencingFiles', 'alerts.json does not exist, creating new file');
//         await FileManager.writeJson(alertsFile, []);
//         console.log('✅ Created alerts.json');
//         this.log('DEBUG', 'App', 'initializeGeofencingFiles', 'alerts.json created successfully');
//       } else {
//         this.log('DEBUG', 'App', 'initializeGeofencingFiles', 'alerts.json already exists');
//       }

//       // Create geofences.json if it doesn't exist
//       const geofencesFile = path.join(dataDir, 'geofences.json');
//       this.log('DEBUG', 'App', 'initializeGeofencingFiles', `Checking geofences file: ${geofencesFile}`);
      
//       if (!(await FileManager.exists(geofencesFile))) {
//         this.log('INFO', 'App', 'initializeGeofencingFiles', 'geofences.json does not exist, creating new file');
//         await FileManager.writeJson(geofencesFile, []);
//         console.log('✅ Created geofences.json');
//         this.log('DEBUG', 'App', 'initializeGeofencingFiles', 'geofences.json created successfully');
//       } else {
//         this.log('DEBUG', 'App', 'initializeGeofencingFiles', 'geofences.json already exists');
//       }

//       this.log('INFO', 'App', 'initializeGeofencingFiles', 'Geofencing files initialization completed successfully');

//     } catch (error) {
//       this.log('ERROR', 'App', 'initializeGeofencingFiles', 'Error initializing geofencing files', error);
//       console.error('❌ Error initializing geofencing files:', error);
//       throw error;
//     }
//   }

//   /**
//    * Setup Express middleware
//    */
//   setupMiddleware() {
//     this.log('INFO', 'App', 'setupMiddleware', 'Setting up Express middleware');

//     try {
//       // CORS middleware
//       this.log('DEBUG', 'App', 'setupMiddleware', 'Adding CORS middleware');
//       this.app.use(corsMiddleware);

//       // Body parsing middleware
//       this.log('DEBUG', 'App', 'setupMiddleware', 'Adding body parsing middleware with 10mb limit');
//       this.app.use(express.json({ limit: '10mb' }));
//       this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

//       // Request logging in development
//       if (config.NODE_ENV === 'development') {
//         this.log('DEBUG', 'App', 'setupMiddleware', 'Adding development request logging middleware');
//         this.app.use((req, res, next) => {
//           const requestId = Math.random().toString(36).substr(2, 9);
//           req.requestId = requestId;
          
//           const startTime = Date.now();
//           console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
//           this.log('DEBUG', 'Request', req.method, `Incoming request to ${req.path}`, {
//             requestId,
//             method: req.method,
//             path: req.path,
//             query: req.query,
//             headers: {
//               'user-agent': req.get('User-Agent'),
//               'content-type': req.get('Content-Type'),
//               'content-length': req.get('Content-Length')
//             }
//           });

//           res.on('finish', () => {
//             const duration = Date.now() - startTime;
//             this.log('DEBUG', 'Response', req.method, `Request completed`, {
//               requestId,
//               statusCode: res.statusCode,
//               duration: `${duration}ms`,
//               contentLength: res.get('Content-Length')
//             });
//           });

//           next();
//         });
//       } else {
//         this.log('DEBUG', 'App', 'setupMiddleware', 'Skipping development logging (production mode)');
//       }

//       this.log('INFO', 'App', 'setupMiddleware', 'Express middleware setup completed successfully');

//     } catch (error) {
//       this.log('ERROR', 'App', 'setupMiddleware', 'Error setting up middleware', error);
//       throw error;
//     }
//   }

//   /**
//    * Setup application routes
//    */
//   setupRoutes() {
//     this.log('INFO', 'App', 'setupRoutes', 'Setting up application routes');

//     try {
//       // Mount all routes
//       this.app.use('/', routes);
//       this.log('DEBUG', 'App', 'setupRoutes', 'All routes mounted successfully');

//       this.log('INFO', 'App', 'setupRoutes', 'Application routes setup completed successfully');

//     } catch (error) {
//       this.log('ERROR', 'App', 'setupRoutes', 'Error setting up routes', error);
//       throw error;
//     }
//   }

//   /**
//    * Setup Socket.IO server
//    */
//   setupSocket() {
//     this.log('INFO', 'App', 'setupSocket', 'Setting up Socket.IO server');

//     try {
//       const corsOptions = {
//         origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
//         methods: ['GET', 'POST'],
//         credentials: true
//       };

//       this.log('DEBUG', 'App', 'setupSocket', 'Creating Socket.IO server with CORS options', corsOptions);

//       this.io = createSocketServer(this.server, corsOptions);
//       this.log('DEBUG', 'App', 'setupSocket', 'Socket.IO server created successfully');

//       this.log('DEBUG', 'App', 'setupSocket', 'Initializing socket service');
//       socketService.initialize(this.io);
//       this.log('DEBUG', 'App', 'setupSocket', 'Socket service initialized successfully');
      
//       console.log('✅ Socket.IO  initialized');
//       console.log('===========================================================================================================');

//       this.log('INFO', 'App', 'setupSocket', 'Socket.IO setup completed successfully');

//     } catch (error) {
//       this.log('ERROR', 'App', 'setupSocket', 'Error setting up Socket.IO', error);
//       throw error;
//     }
//   }

//   /**
//    * Setup error handling middleware
//    */
//   setupErrorHandling() {
//     this.log('INFO', 'App', 'setupErrorHandling', 'Setting up error handling middleware');

//     try {
//       // 404 handler
//       this.log('DEBUG', 'App', 'setupErrorHandling', 'Adding 404 not found handler');
//       this.app.use(notFoundHandler);

//       // Global error handler
//       this.log('DEBUG', 'App', 'setupErrorHandling', 'Adding global error handler');
//       this.app.use(errorHandler);

//       this.log('INFO', 'App', 'setupErrorHandling', 'Error handling setup completed successfully');

//     } catch (error) {
//       this.log('ERROR', 'App', 'setupErrorHandling', 'Error setting up error handling', error);
//       throw error;
//     }
//   }

//   /**
//    * Start the server
//    */
//   async start() {
//     const serverStartTime = Date.now();
//     this.log('INFO', 'App', 'start', 'Starting server');

//     try {
//       await this.initialize();

//       this.server.listen(config.PORT, config.HOST, () => {
//         const serverStartDuration = Date.now() - serverStartTime;
//         const totalStartDuration = Date.now() - this.startTime;

//         this.log('INFO', 'App', 'start', `Server started successfully on ${config.HOST}:${config.PORT}`, {
//           host: config.HOST,
//           port: config.PORT,
//           environment: config.NODE_ENV,
//           serverStartTime: `${serverStartDuration}ms`,
//           totalStartTime: `${totalStartDuration}ms`,
//           pid: process.pid
//         });

//         console.log(`🚴 Smart-Cycle Server  running on ${config.HOST}:${config.PORT}`);
//         console.log(`🌍 Environment: ${config.NODE_ENV}`);
//         console.log(`📡 WebSocket server ready for real-time connections`);
//         console.log(`💾 Data will be saved to: ${config.DAILY_DIR}`);
//         console.log(`🚨 Real-time alerts: Active`);
//         console.log(`🔑 JWT Secret: ${config.JWT_SECRET === 'supersecretkey' ? '⚠️  Using default (change in production!)' : '✅ Custom secret set'}`);
//         console.log(`🌐 CORS Origin: ${config.CORS_ORIGIN}`);
//         console.log('======================================');
//         console.log('Features enabled:');
//         console.log('✅ Real-time bike tracking');
//         console.log('✅ Server-side geofencing calculations');
//         console.log('✅ Automated alert generation');
//         console.log('✅ WebSocket real-time communication');
//         console.log('✅ Persistent data storage');
//         console.log('✅ Historical data tracking');
//         console.log('======================================');

//         this.log('INFO', 'App', 'start', 'All features initialized and server is ready to accept connections');
//       });

//       // Graceful shutdown handling
//       this.log('DEBUG', 'App', 'start', 'Setting up graceful shutdown handlers');
//       this.setupGracefulShutdown();

//     } catch (error) {
//       this.log('ERROR', 'App', 'start', 'Failed to start server', error);
//       console.error('❌ Failed to start server:', error);
//       process.exit(1);
//     }
//   }

//   /**
//    * Setup graceful shutdown
//    */
//   setupGracefulShutdown() {
//     this.log('INFO', 'App', 'setupGracefulShutdown', 'Setting up graceful shutdown handlers');

//     const gracefulShutdown = (signal) => {
//       this.log('WARN', 'App', 'gracefulShutdown', `Received ${signal} signal, initiating graceful shutdown`);
//       console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
//       const shutdownStartTime = Date.now();
      
//       this.server.close((err) => {
//         const shutdownDuration = Date.now() - shutdownStartTime;
        
//         if (err) {
//           this.log('ERROR', 'App', 'gracefulShutdown', 'Error during server shutdown', {
//             error: err,
//             shutdownDuration: `${shutdownDuration}ms`
//           });
//           console.error('❌ Error during server shutdown:', err);
//           process.exit(1);
//         }
        
//         this.log('INFO', 'App', 'gracefulShutdown', `Server closed successfully after ${shutdownDuration}ms`);
//         console.log('✅ Server closed');
//         process.exit(0);
//       });

//       // Force close after 30 seconds
//       setTimeout(() => {
//         this.log('ERROR', 'App', 'gracefulShutdown', 'Forced shutdown after 30 second timeout');
//         console.error('❌ Could not close connections in time, forcefully shutting down');
//         process.exit(1);
//       }, 30000);
//     };

//     process.on('SIGTERM', () => {
//       this.log('DEBUG', 'App', 'setupGracefulShutdown', 'SIGTERM handler attached');
//       gracefulShutdown('SIGTERM');
//     });
    
//     process.on('SIGINT', () => {
//       this.log('DEBUG', 'App', 'setupGracefulShutdown', 'SIGINT handler attached');
//       gracefulShutdown('SIGINT');
//     });

//     // Handle uncaught exceptions
//     process.on('uncaughtException', (error) => {
//       this.log('ERROR', 'App', 'uncaughtException', 'Uncaught exception occurred', error);
//       console.error('❌ Uncaught Exception:', error);
//       process.exit(1);
//     });

//     // Handle unhandled promise rejections
//     process.on('unhandledRejection', (reason, promise) => {
//       this.log('ERROR', 'App', 'unhandledRejection', 'Unhandled promise rejection', {
//         reason,
//         promise: promise.toString()
//       });
//       console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
//       process.exit(1);
//     });

//     this.log('DEBUG', 'App', 'setupGracefulShutdown', 'All shutdown handlers configured successfully');
//   }

//   /**
//    * Get Express app instance
//    */
//   getApp() {
//     this.log('DEBUG', 'App', 'getApp', 'Returning Express app instance');
//     return this.app;
//   }

//   /**
//    * Get HTTP server instance
//    */
//   getServer() {
//     this.log('DEBUG', 'App', 'getServer', 'Returning HTTP server instance');
//     return this.server;
//   }

//   /**
//    * Get Socket.IO instance
//    */
//   getIO() {
//     this.log('DEBUG', 'App', 'getIO', 'Returning Socket.IO instance');
//     return this.io;
//   }
// }

// module.exports = App;
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
const speedLimitService = require('./services/speedLimitService');

// Import routes
const routes = require('./routes');

class App {
  constructor() {
    this.log('INFO', 'App', 'constructor', 'Creating new App instance');
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = null;
    this.startTime = Date.now();
    
    this.log('DEBUG', 'App', 'constructor', 'Express app and HTTP server created successfully');
  }

  /**
   * Centralized logging method
   * @param {string} level - Log level (DEBUG, INFO, WARN, ERROR)
   * @param {string} component - Component name
   * @param {string} method - Method name
   * @param {string} message - Log message
   * @param {Object} data - Additional data to log
   */
  log(level, component, method, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${component}:${method}] ${message}`;
    
    if (data) {
      console.log(logEntry, data);
    } else {
      console.log(logEntry);
    }
  }

  /**
   * Initialize the application
   */
  async initialize() {
    const initStartTime = Date.now();
    this.log('INFO', 'App', 'initialize', 'Starting application initialization');
    
    try {
      console.log('===========================================================================================================');
      console.log('Initialising the Applications :');
      
      // Initialize database (ensure directories and files exist)
      this.log('INFO', 'App', 'initialize', 'Initializing database directories and files');
      await initializeDatabase();
      console.log('✅ Data directories initialized');
      this.log('DEBUG', 'App', 'initialize', 'Database initialization completed successfully');
      console.log('-----------------------------------------------------------------------------------------------------------');
      
      // Ensure geofencing data files exist
      this.log('INFO', 'App', 'initialize', 'Starting geofencing files initialization');
      await this.initializeGeofencingFiles();
      console.log('✅ Geofencing initialized');
      this.log('DEBUG', 'App', 'initialize', 'Geofencing files initialization completed');

      // Initialize speed limit files
      this.log('INFO', 'App', 'initialize', 'Starting speed limit files initialization');
      await this.initializeSpeedLimitFiles();
      console.log('✅ Speed limits initialized');
      this.log('DEBUG', 'App', 'initialize', 'Speed limit files initialization completed');

      // Setup middleware
      this.log('INFO', 'App', 'initialize', 'Setting up Express middleware');
      this.setupMiddleware();
      this.log('DEBUG', 'App', 'initialize', 'Middleware setup completed');

      // Setup routes
      this.log('INFO', 'App', 'initialize', 'Setting up application routes');
      this.setupRoutes();
      this.log('DEBUG', 'App', 'initialize', 'Routes setup completed');

      // Setup Socket.IO
      this.log('INFO', 'App', 'initialize', 'Setting up Socket.IO server');
      this.setupSocket();
      this.log('DEBUG', 'App', 'initialize', 'Socket.IO setup completed');

      // Setup error handling (must be last)
      this.log('INFO', 'App', 'initialize', 'Setting up error handling middleware');
      this.setupErrorHandling();
      this.log('DEBUG', 'App', 'initialize', 'Error handling setup completed');

      const initDuration = Date.now() - initStartTime;
      this.log('INFO', 'App', 'initialize', `Application initialization completed successfully in ${initDuration}ms`);

    } catch (error) {
      this.log('ERROR', 'App', 'initialize', 'Failed to initialize application', error);
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

    this.log('INFO', 'App', 'initializeGeofencingFiles', 'Starting geofencing files initialization');

    try {
      const dataDir = config.DATA_DIR || './data';
      this.log('DEBUG', 'App', 'initializeGeofencingFiles', `Using data directory: ${dataDir}`);

      // Create alerts.json if it doesn't exist
      const alertsFile = path.join(dataDir, 'alerts.json');
      this.log('DEBUG', 'App', 'initializeGeofencingFiles', `Checking alerts file: ${alertsFile}`);
      
      if (!(await FileManager.exists(alertsFile))) {
        this.log('INFO', 'App', 'initializeGeofencingFiles', 'alerts.json does not exist, creating new file');
        await FileManager.writeJson(alertsFile, []);
        console.log('✅ Created alerts.json');
        this.log('DEBUG', 'App', 'initializeGeofencingFiles', 'alerts.json created successfully');
      } else {
        this.log('DEBUG', 'App', 'initializeGeofencingFiles', 'alerts.json already exists');
      }

      // Create geofences.json if it doesn't exist
      const geofencesFile = path.join(dataDir, 'geofences.json');
      this.log('DEBUG', 'App', 'initializeGeofencingFiles', `Checking geofences file: ${geofencesFile}`);
      
      if (!(await FileManager.exists(geofencesFile))) {
        this.log('INFO', 'App', 'initializeGeofencingFiles', 'geofences.json does not exist, creating new file');
        await FileManager.writeJson(geofencesFile, []);
        console.log('✅ Created geofences.json');
        this.log('DEBUG', 'App', 'initializeGeofencingFiles', 'geofences.json created successfully');
      } else {
        this.log('DEBUG', 'App', 'initializeGeofencingFiles', 'geofences.json already exists');
      }

      this.log('INFO', 'App', 'initializeGeofencingFiles', 'Geofencing files initialization completed successfully');

    } catch (error) {
      this.log('ERROR', 'App', 'initializeGeofencingFiles', 'Error initializing geofencing files', error);
      console.error('❌ Error initializing geofencing files:', error);
      throw error;
    }
  }

  /**
   * Initialize speed limit data files
   */
  async initializeSpeedLimitFiles() {
    this.log('INFO', 'App', 'initializeSpeedLimitFiles', 'Starting speed limit files initialization');

    try {
      await speedLimitService.initializeSpeedLimitsFile();
      this.log('DEBUG', 'App', 'initializeSpeedLimitFiles', 'Speed limit files initialized successfully');

    } catch (error) {
      this.log('ERROR', 'App', 'initializeSpeedLimitFiles', 'Error initializing speed limit files', error);
      console.error('❌ Error initializing speed limit files:', error);
      throw error;
    }
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    this.log('INFO', 'App', 'setupMiddleware', 'Setting up Express middleware');

    try {
      // CORS middleware
      this.log('DEBUG', 'App', 'setupMiddleware', 'Adding CORS middleware');
      this.app.use(corsMiddleware);

      // Body parsing middleware
      this.log('DEBUG', 'App', 'setupMiddleware', 'Adding body parsing middleware with 10mb limit');
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

      // Request logging in development
      if (config.NODE_ENV === 'development') {
        this.log('DEBUG', 'App', 'setupMiddleware', 'Adding development request logging middleware');
        this.app.use((req, res, next) => {
          const requestId = Math.random().toString(36).substr(2, 9);
          req.requestId = requestId;
          
          const startTime = Date.now();
          console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
          this.log('DEBUG', 'Request', req.method, `Incoming request to ${req.path}`, {
            requestId,
            method: req.method,
            path: req.path,
            query: req.query,
            headers: {
              'user-agent': req.get('User-Agent'),
              'content-type': req.get('Content-Type'),
              'content-length': req.get('Content-Length')
            }
          });

          res.on('finish', () => {
            const duration = Date.now() - startTime;
            this.log('DEBUG', 'Response', req.method, `Request completed`, {
              requestId,
              statusCode: res.statusCode,
              duration: `${duration}ms`,
              contentLength: res.get('Content-Length')
            });
          });

          next();
        });
      } else {
        this.log('DEBUG', 'App', 'setupMiddleware', 'Skipping development logging (production mode)');
      }

      this.log('INFO', 'App', 'setupMiddleware', 'Express middleware setup completed successfully');

    } catch (error) {
      this.log('ERROR', 'App', 'setupMiddleware', 'Error setting up middleware', error);
      throw error;
    }
  }

  /**
   * Setup application routes
   */
  setupRoutes() {
    this.log('INFO', 'App', 'setupRoutes', 'Setting up application routes');

    try {
      // Mount all routes
      this.app.use('/', routes);
      this.log('DEBUG', 'App', 'setupRoutes', 'All routes mounted successfully');

      this.log('INFO', 'App', 'setupRoutes', 'Application routes setup completed successfully');

    } catch (error) {
      this.log('ERROR', 'App', 'setupRoutes', 'Error setting up routes', error);
      throw error;
    }
  }

  /**
   * Setup Socket.IO server
   */
  setupSocket() {
    this.log('INFO', 'App', 'setupSocket', 'Setting up Socket.IO server');

    try {
      const corsOptions = {
        origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
        methods: ['GET', 'POST'],
        credentials: true
      };

      this.log('DEBUG', 'App', 'setupSocket', 'Creating Socket.IO server with CORS options', corsOptions);

      this.io = createSocketServer(this.server, corsOptions);
      this.log('DEBUG', 'App', 'setupSocket', 'Socket.IO server created successfully');

      this.log('DEBUG', 'App', 'setupSocket', 'Initializing socket service');
      socketService.initialize(this.io);
      this.log('DEBUG', 'App', 'setupSocket', 'Socket service initialized successfully');
      
      console.log('✅ Socket.IO  initialized');
      console.log('===========================================================================================================');

      this.log('INFO', 'App', 'setupSocket', 'Socket.IO setup completed successfully');

    } catch (error) {
      this.log('ERROR', 'App', 'setupSocket', 'Error setting up Socket.IO', error);
      throw error;
    }
  }

  /**
   * Setup error handling middleware
   */
  setupErrorHandling() {
    this.log('INFO', 'App', 'setupErrorHandling', 'Setting up error handling middleware');

    try {
      // 404 handler
      this.log('DEBUG', 'App', 'setupErrorHandling', 'Adding 404 not found handler');
      this.app.use(notFoundHandler);

      // Global error handler
      this.log('DEBUG', 'App', 'setupErrorHandling', 'Adding global error handler');
      this.app.use(errorHandler);

      this.log('INFO', 'App', 'setupErrorHandling', 'Error handling setup completed successfully');

    } catch (error) {
      this.log('ERROR', 'App', 'setupErrorHandling', 'Error setting up error handling', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    const serverStartTime = Date.now();
    this.log('INFO', 'App', 'start', 'Starting server');

    try {
      await this.initialize();

      this.server.listen(config.PORT, config.HOST, () => {
        const serverStartDuration = Date.now() - serverStartTime;
        const totalStartDuration = Date.now() - this.startTime;

        this.log('INFO', 'App', 'start', `Server started successfully on ${config.HOST}:${config.PORT}`, {
          host: config.HOST,
          port: config.PORT,
          environment: config.NODE_ENV,
          serverStartTime: `${serverStartDuration}ms`,
          totalStartTime: `${totalStartDuration}ms`,
          pid: process.pid
        });

        console.log(`🚴 Smart-Cycle Server  running on ${config.HOST}:${config.PORT}`);
        console.log(`🌍 Environment: ${config.NODE_ENV}`);
        console.log(`📡 WebSocket server ready for real-time connections`);
        console.log(`💾 Data will be saved to: ${config.DAILY_DIR}`);
        console.log(`🚨 Real-time alerts: Active`);
        console.log(`🔑 JWT Secret: ${config.JWT_SECRET === 'supersecretkey' ? '⚠️  Using default (change in production!)' : '✅ Custom secret set'}`);
        console.log(`🌐 CORS Origin: ${config.CORS_ORIGIN}`);
        console.log('======================================');
        console.log('Features enabled:');
        console.log('✅ Real-time bike tracking');
        console.log('✅ Server-side geofencing calculations');
        console.log('✅ Automated alert generation');
        console.log('✅ WebSocket real-time communication');
        console.log('✅ Persistent data storage');
        console.log('✅ Historical data tracking');
        console.log('✅ Speed limit monitoring');
        console.log('======================================');

        this.log('INFO', 'App', 'start', 'All features initialized and server is ready to accept connections');
      });

      // Graceful shutdown handling
      this.log('DEBUG', 'App', 'start', 'Setting up graceful shutdown handlers');
      this.setupGracefulShutdown();

    } catch (error) {
      this.log('ERROR', 'App', 'start', 'Failed to start server', error);
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown
   */
  setupGracefulShutdown() {
    this.log('INFO', 'App', 'setupGracefulShutdown', 'Setting up graceful shutdown handlers');

    const gracefulShutdown = (signal) => {
      this.log('WARN', 'App', 'gracefulShutdown', `Received ${signal} signal, initiating graceful shutdown`);
      console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
      
      const shutdownStartTime = Date.now();
      
      this.server.close((err) => {
        const shutdownDuration = Date.now() - shutdownStartTime;
        
        if (err) {
          this.log('ERROR', 'App', 'gracefulShutdown', 'Error during server shutdown', {
            error: err,
            shutdownDuration: `${shutdownDuration}ms`
          });
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }
        
        this.log('INFO', 'App', 'gracefulShutdown', `Server closed successfully after ${shutdownDuration}ms`);
        console.log('✅ Server closed');
        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        this.log('ERROR', 'App', 'gracefulShutdown', 'Forced shutdown after 30 second timeout');
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => {
      this.log('DEBUG', 'App', 'setupGracefulShutdown', 'SIGTERM handler attached');
      gracefulShutdown('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      this.log('DEBUG', 'App', 'setupGracefulShutdown', 'SIGINT handler attached');
      gracefulShutdown('SIGINT');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.log('ERROR', 'App', 'uncaughtException', 'Uncaught exception occurred', error);
      console.error('❌ Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.log('ERROR', 'App', 'unhandledRejection', 'Unhandled promise rejection', {
        reason,
        promise: promise.toString()
      });
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    this.log('DEBUG', 'App', 'setupGracefulShutdown', 'All shutdown handlers configured successfully');
  }

  /**
   * Get Express app instance
   */
  getApp() {
    this.log('DEBUG', 'App', 'getApp', 'Returning Express app instance');
    return this.app;
  }

  /**
   * Get HTTP server instance
   */
  getServer() {
    this.log('DEBUG', 'App', 'getServer', 'Returning HTTP server instance');
    return this.server;
  }

  /**
   * Get Socket.IO instance
   */
  getIO() {
    this.log('DEBUG', 'App', 'getIO', 'Returning Socket.IO instance');
    return this.io;
  }
}

module.exports = App;