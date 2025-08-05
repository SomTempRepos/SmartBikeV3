// const { logMessage } = require('../utils/helpers');

// class SocketService {
//   constructor() {
//     this.io = null;
//     this.connectedClients = new Set();
//   }

//   /**
//    * Initialize socket service with Socket.IO instance
//    * @param {object} io - Socket.IO server instance
//    */
//   initialize(io) {
//     this.io = io;
//     this.setupEventHandlers();
//   }

//   /**
//    * Setup Socket.IO event handlers
//    */
//   setupEventHandlers() {
//     if (!this.io) return;

//     this.io.on('connection', (socket) => {
//       logMessage('info', `Client connected: ${socket.id}`);
//       this.connectedClients.add(socket.id);

//       // Send initial data when client connects
//       this.sendInitialData(socket);

//       socket.on('disconnect', () => {
//         logMessage('info', `Client disconnected: ${socket.id}`);
//         this.connectedClients.delete(socket.id);
//       });

//       // Existing handlers
//       socket.on('join-guardian', (guardianId) => {
//         socket.join(`guardian-${guardianId}`);
//         logMessage('info', `Guardian ${guardianId} joined room`);
//       });

//       socket.on('join-bike', (bikeId) => {
//         socket.join(`bike-${bikeId}`);
//         logMessage('info', `Client joined bike room: ${bikeId}`);
//       });

//       // New geofencing handlers
//       socket.on('setGeofence', async (data) => {
//         try {
//           const geofencingService = require('./geofencingService');
//           const geofence = await geofencingService.setGeofence(data);
          
//           // Broadcast geofence update to all clients
//           this.io.emit('geofenceUpdated', geofence);
          
//           socket.emit('geofenceSet', {
//             success: true,
//             geofence
//           });

//           logMessage('info', 'Geofence updated via WebSocket', {
//             location: data.baseLocation,
//             radius: data.radius
//           });

//         } catch (error) {
//           socket.emit('geofenceSet', {
//             success: false,
//             error: error.message
//           });
//           logMessage('error', 'Error setting geofence via WebSocket:', error);
//         }
//       });

//       // Handle alert acknowledgment
//       socket.on('acknowledgeAlert', async (alertId) => {
//         try {
//           const geofencingService = require('./geofencingService');
//           const alert = await geofencingService.acknowledgeAlert(alertId);
//           if (alert) {
//             this.io.emit('alertAcknowledged', alert);
//             logMessage('info', `Alert ${alertId} acknowledged via WebSocket`);
//           }
//         } catch (error) {
//           logMessage('error', 'Error acknowledging alert via WebSocket:', error);
//         }
//       });

//       // Handle subscription to specific bike updates
//       socket.on('subscribeToBike', (bikeId) => {
//         socket.join(`bike_${bikeId}`);
//         logMessage('info', `Client subscribed to bike ${bikeId}`);
//       });

//       // Handle unsubscription
//       socket.on('unsubscribeFromBike', (bikeId) => {
//         socket.leave(`bike_${bikeId}`);
//         logMessage('info', `Client unsubscribed from bike ${bikeId}`);
//       });

//       // Handle bike data from IoT devices/simulators
//       socket.on('bikeData', async (data) => {
//         try {
//           const BikeService = require('./bikeService');
//           const result = await BikeService.processBikeData(data);
          
//           // Acknowledge receipt
//           socket.emit('dataReceived', {
//             bikeId: data.bikeId,
//             status: result.success ? 'success' : 'error',
//             message: result.message || result.error,
//             timestamp: new Date().toISOString()
//           });

//         } catch (error) {
//           logMessage('error', 'Error processing bike data via WebSocket:', error);
//           socket.emit('dataReceived', {
//             bikeId: data.bikeId,
//             status: 'error',
//             error: error.message,
//             timestamp: new Date().toISOString()
//           });
//         }
//       });
//     });
    
    
//   }

//   /**
//    * Send initial data to newly connected clients
//    * @param {object} socket - Socket instance
//    */
//   async sendInitialData(socket) {
//     try {
//       const BikeService = require('./bikeService');
//       const geofencingService = require('./geofencingService');

//       // Send current bikes data
//       const bikesResult = await BikeService.getAllBikes();
//       if (bikesResult.success) {
//         socket.emit('initialBikesData', bikesResult.bikes);
//       }

//       // Send active geofence
//       const activeGeofence = geofencingService.getActiveGeofence();
//       if (activeGeofence) {
//         socket.emit('activeGeofence', activeGeofence);
//       }

//       // Send recent alerts
//       const recentAlerts = geofencingService.getAlerts({ limit: 10, status: 'active' });
//       socket.emit('recentAlerts', recentAlerts);

//       // Send geofencing summary
//       const summaryResult = await BikeService.getGeofencingSummary();
//       if (summaryResult.success) {
//         socket.emit('geofencingSummary', summaryResult.summary);
//       }

//       logMessage('info', `Sent initial data to client ${socket.id}`);

//     } catch (error) {
//       logMessage('error', 'Error sending initial data:', error);
//     }
//   }

//   /**
//    * Broadcast bike data to all connected clients
//    * @param {object} bikeData - Bike data to broadcast
//    */
//   broadcastBikeData(bikeData) {
//     if (!this.io) return;

//     // Original bike data event
//     this.io.emit('bikeData', bikeData);
    
//     // Enhanced bike update with geofencing info
//     this.io.emit('bikeUpdate', {
//       bikeId: bikeData.bikeId,
//       data: bikeData.data,
//       timestamp: bikeData.timestamp,
//       geofencing: bikeData.geofencing
//     });

//     // Emit to specific bike room
//     this.io.to(`bike-${bikeData.bikeId}`).emit('bikeSpecificUpdate', bikeData);
//     this.io.to(`bike_${bikeData.bikeId}`).emit('bikeSpecificUpdate', bikeData);

//     logMessage('info', `Broadcasted bike data for ${bikeData.bikeId}`, {
//       speed: bikeData.data?.avgSpeed,
//       location: bikeData.data?.location,
//       battery: bikeData.data?.battery,
//       isOutsideFence: bikeData.geofencing?.isOutsideFence,
//       distanceFromBase: bikeData.geofencing?.distanceFromBase
//     });
//   }

//   /**
//    * Broadcast geofence alert to all clients
//    * @param {object} alert - Alert data
//    */
//   broadcastGeofenceAlert(alert) {
//     if (!this.io) return;

//     this.io.emit('geofenceAlert', alert);
//     logMessage('info', `Broadcasted geofence alert for bike ${alert.bikeId}`);
//   }

//   /**
//    * Broadcast geofencing summary update
//    */
//   async broadcastGeofencingSummary() {
//     if (!this.io) return;

//     try {
//       const BikeService = require('./bikeService');
//       const summaryResult = await BikeService.getGeofencingSummary();
//       if (summaryResult.success) {
//         this.io.emit('geofencingSummary', summaryResult.summary);
//         logMessage('info', 'Broadcasted geofencing summary update');
//       }
//     } catch (error) {
//       logMessage('error', 'Error broadcasting geofencing summary:', error);
//     }
//   }

//   /**
//    * Send data to specific guardian
//    * @param {string} guardianId - Guardian ID
//    * @param {string} event - Event name
//    * @param {object} data - Data to send
//    */
//   sendToGuardian(guardianId, event, data) {
//     if (!this.io) return;

//     this.io.to(`guardian-${guardianId}`).emit(event, data);
//     logMessage('info', `Sent ${event} to guardian ${guardianId}`);
//   }

//   /**
//    * Send data to specific bike room
//    * @param {string} bikeId - Bike ID
//    * @param {string} event - Event name
//    * @param {object} data - Data to send
//    */
//   sendToBike(bikeId, event, data) {
//     if (!this.io) return;

//     this.io.to(`bike-${bikeId}`).emit(event, data);
//     this.io.to(`bike_${bikeId}`).emit(event, data);
//     logMessage('info', `Sent ${event} to bike ${bikeId}`);
//   }

//   /**
//    * Broadcast general event to all connected clients
//    * @param {string} event - Event name
//    * @param {object} data - Data to broadcast
//    */
//   broadcast(event, data) {
//     if (!this.io) return;

//     this.io.emit(event, data);
//     logMessage('info', `Broadcasted ${event} to all clients`);
//   }

//   /**
//    * Get number of connected clients
//    * @returns {number} - Number of connected clients
//    */
//   getConnectedClientsCount() {
//     return this.connectedClients.size;
//   }

//   /**
//    * Get Socket.IO instance
//    * @returns {object} - Socket.IO instance
//    */
//   getIO() {
//     return this.io;
//   }
// }

// // Create singleton instance
// const socketService = new SocketService();

// module.exports = socketService;

const { logMessage } = require('../utils/helpers');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Set();
  }

  /**
   * Initialize socket service with Socket.IO instance
   * @param {object} io - Socket.IO server instance
   */
  initialize(io) {
    logMessage('info', 'SocketService', 'initialize', 'Initializing socket service');
    this.io = io;
    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    if (!this.io) return;

    logMessage('info', 'SocketService', 'setupEventHandlers', 'Setting up socket event handlers');

    this.io.on('connection', (socket) => {
      logMessage('info', 'SocketService', 'connection', `Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial data when client connects
      this.sendInitialData(socket);

      socket.on('disconnect', () => {
        logMessage('info', 'SocketService', 'disconnect', `Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Existing handlers
      socket.on('join-guardian', (guardianId) => {
        socket.join(`guardian-${guardianId}`);
        logMessage('info', 'SocketService', 'join-guardian', `Guardian ${guardianId} joined room`);
      });

      socket.on('join-bike', (bikeId) => {
        socket.join(`bike-${bikeId}`);
        logMessage('info', 'SocketService', 'join-bike', `Client joined bike room: ${bikeId}`);
      });

      // New geofencing handlers
      socket.on('setGeofence', async (data) => {
        try {
          logMessage('info', 'SocketService', 'setGeofence', 'Processing geofence update via WebSocket', data);
          
          const geofencingService = require('./geofencingService');
          const geofence = await geofencingService.setGeofence(data);
          
          // Broadcast geofence update to all clients
          this.io.emit('geofenceUpdated', geofence);
          
          socket.emit('geofenceSet', {
            success: true,
            geofence
          });

          logMessage('info', 'SocketService', 'setGeofence', 'Geofence updated via WebSocket', {
            location: data.baseLocation,
            radius: data.radius
          });

        } catch (error) {
          socket.emit('geofenceSet', {
            success: false,
            error: error.message
          });
          logMessage('error', 'SocketService', 'setGeofence', 'Error setting geofence via WebSocket', error);
        }
      });

      // Speed limit handlers
      socket.on('setSpeedLimit', async (data) => {
        try {
          const { bikeId, speedLimit, setBy } = data;
          logMessage('info', 'SocketService', 'setSpeedLimit', 'Processing speed limit update via WebSocket', {
            bikeId,
            speedLimit,
            setBy
          });
          
          const speedLimitService = require('./speedLimitService');
          const result = await speedLimitService.setSpeedLimit(bikeId, speedLimit, setBy || 'websocket');
          
          if (result.success) {
            // Broadcast speed limit update to all clients
            this.io.emit('speedLimitUpdated', {
              bikeId,
              speedLimit: result.speedLimit.speedLimit,
              setAt: result.speedLimit.setAt
            });
            
            // Send to specific bike subscribers
            this.sendToBike(bikeId, 'speedLimitChanged', {
              speedLimit: result.speedLimit.speedLimit,
              setAt: result.speedLimit.setAt
            });

            socket.emit('speedLimitSet', {
              success: true,
              speedLimit: result.speedLimit
            });

            logMessage('info', 'SocketService', 'setSpeedLimit', 'Speed limit updated via WebSocket', {
              bikeId,
              speedLimit: result.speedLimit.speedLimit
            });
          } else {
            socket.emit('speedLimitSet', {
              success: false,
              error: result.error
            });
          }

        } catch (error) {
          socket.emit('speedLimitSet', {
            success: false,
            error: error.message
          });
          logMessage('error', 'SocketService', 'setSpeedLimit', 'Error setting speed limit via WebSocket', error);
        }
      });

      socket.on('getSpeedLimit', async (data) => {
        try {
          const { bikeId } = data;
          logMessage('debug', 'SocketService', 'getSpeedLimit', `Getting speed limit for bike ${bikeId}`);
          
          const speedLimitService = require('./speedLimitService');
          const result = await speedLimitService.getSpeedLimit(bikeId);
          
          socket.emit('speedLimitData', {
            success: result.success,
            speedLimit: result.speedLimit,
            error: result.error
          });

        } catch (error) {
          socket.emit('speedLimitData', {
            success: false,
            error: error.message
          });
          logMessage('error', 'SocketService', 'getSpeedLimit', 'Error getting speed limit via WebSocket', error);
        }
      });

      // Handle alert acknowledgment
      socket.on('acknowledgeAlert', async (alertId) => {
        try {
          logMessage('info', 'SocketService', 'acknowledgeAlert', `Acknowledging alert ${alertId}`);
          
          const geofencingService = require('./geofencingService');
          const alert = await geofencingService.acknowledgeAlert(alertId);
          if (alert) {
            this.io.emit('alertAcknowledged', alert);
            logMessage('info', 'SocketService', 'acknowledgeAlert', `Alert ${alertId} acknowledged via WebSocket`);
          }
        } catch (error) {
          logMessage('error', 'SocketService', 'acknowledgeAlert', 'Error acknowledging alert via WebSocket', error);
        }
      });

      // Handle subscription to specific bike updates
      socket.on('subscribeToBike', (bikeId) => {
        socket.join(`bike_${bikeId}`);
        logMessage('info', 'SocketService', 'subscribeToBike', `Client subscribed to bike ${bikeId}`);
      });

      // Handle unsubscription
      socket.on('unsubscribeFromBike', (bikeId) => {
        socket.leave(`bike_${bikeId}`);
        logMessage('info', 'SocketService', 'unsubscribeFromBike', `Client unsubscribed from bike ${bikeId}`);
      });

      // Handle bike data from IoT devices/simulators
      socket.on('bikeData', async (data) => {
        try {
          logMessage('debug', 'SocketService', 'bikeData', 'Processing bike data via WebSocket', {
            bikeId: data.bikeId,
            speed: data.data?.avgSpeed
          });
          
          const BikeService = require('./bikeService');
          const result = await BikeService.processBikeData(data);
          
          // Acknowledge receipt
          socket.emit('dataReceived', {
            bikeId: data.bikeId,
            status: result.success ? 'success' : 'error',
            message: result.message || result.error,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          logMessage('error', 'SocketService', 'bikeData', 'Error processing bike data via WebSocket', error);
          socket.emit('dataReceived', {
            bikeId: data.bikeId,
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
    
    logMessage('info', 'SocketService', 'setupEventHandlers', 'Socket event handlers setup completed');
  }

  /**
   * Send initial data to newly connected clients
   * @param {object} socket - Socket instance
   */
  async sendInitialData(socket) {
    try {
      logMessage('debug', 'SocketService', 'sendInitialData', `Sending initial data to client ${socket.id}`);
      
      const BikeService = require('./bikeService');
      const geofencingService = require('./geofencingService');
      const speedLimitService = require('./speedLimitService');

      // Send current bikes data
      const bikesResult = await BikeService.getAllBikes();
      if (bikesResult.success) {
        socket.emit('initialBikesData', bikesResult.bikes);
      }

      // Send active geofence
      const activeGeofence = geofencingService.getActiveGeofence();
      if (activeGeofence) {
        socket.emit('activeGeofence', activeGeofence);
      }

      // Send recent alerts
      const recentAlerts = geofencingService.getAlerts({ limit: 10, status: 'active' });
      socket.emit('recentAlerts', recentAlerts);

      // Send geofencing summary
      const summaryResult = await BikeService.getGeofencingSummary();
      if (summaryResult.success) {
        socket.emit('geofencingSummary', summaryResult.summary);
      }

      // Send all speed limits
      const speedLimitsResult = await speedLimitService.getAllSpeedLimits();
      if (speedLimitsResult.success) {
        socket.emit('initialSpeedLimits', speedLimitsResult.speedLimits);
      }

      logMessage('info', 'SocketService', 'sendInitialData', `Sent initial data to client ${socket.id}`);

    } catch (error) {
      logMessage('error', 'SocketService', 'sendInitialData', 'Error sending initial data', error);
    }
  }

  /**
   * Broadcast bike data to all connected clients
   * @param {object} bikeData - Bike data to broadcast
   */
  broadcastBikeData(bikeData) {
    if (!this.io) return;

    logMessage('debug', 'SocketService', 'broadcastBikeData', `Broadcasting bike data for ${bikeData.bikeId}`, {
      speed: bikeData.data?.avgSpeed,
      location: bikeData.data?.location,
      battery: bikeData.data?.battery,
      isOutsideFence: bikeData.geofencing?.isOutsideFence,
      distanceFromBase: bikeData.geofencing?.distanceFromBase,
      speedLimitExceeded: bikeData.speedLimit?.isExceeded
    });

    // Original bike data event
    this.io.emit('bikeData', bikeData);
    
    // Enhanced bike update with geofencing and speed limit info
    this.io.emit('bikeUpdate', {
      bikeId: bikeData.bikeId,
      data: bikeData.data,
      timestamp: bikeData.timestamp,
      geofencing: bikeData.geofencing,
      speedLimit: bikeData.speedLimit
    });

    // Emit to specific bike room
    this.io.to(`bike-${bikeData.bikeId}`).emit('bikeSpecificUpdate', bikeData);
    this.io.to(`bike_${bikeData.bikeId}`).emit('bikeSpecificUpdate', bikeData);

    logMessage('info', 'SocketService', 'broadcastBikeData', `Broadcasted bike data for ${bikeData.bikeId}`);
  }

  /**
   * Broadcast geofence alert to all clients
   * @param {object} alert - Alert data
   */
  broadcastGeofenceAlert(alert) {
    if (!this.io) return;

    logMessage('info', 'SocketService', 'broadcastGeofenceAlert', `Broadcasting geofence alert for bike ${alert.bikeId}`);
    this.io.emit('geofenceAlert', alert);
  }

  /**
   * Broadcast speed limit violation to all clients
   * @param {object} violation - Speed violation data
   */
  broadcastSpeedLimitViolation(violation) {
    if (!this.io) return;

    logMessage('warn', 'SocketService', 'broadcastSpeedLimitViolation', `Broadcasting speed limit violation for bike ${violation.bikeId}`, {
      currentSpeed: violation.currentSpeed,
      speedLimit: violation.speedLimit,
      excess: violation.excess
    });

    this.io.emit('speedLimitViolation', violation);
    
    // Also send to specific bike subscribers
    this.sendToBike(violation.bikeId, 'speedViolationAlert', violation);
  }

  /**
   * Broadcast geofencing summary update
   */
  async broadcastGeofencingSummary() {
    if (!this.io) return;

    try {
      logMessage('debug', 'SocketService', 'broadcastGeofencingSummary', 'Broadcasting geofencing summary update');
      
      const BikeService = require('./bikeService');
      const summaryResult = await BikeService.getGeofencingSummary();
      if (summaryResult.success) {
        this.io.emit('geofencingSummary', summaryResult.summary);
        logMessage('info', 'SocketService', 'broadcastGeofencingSummary', 'Broadcasted geofencing summary update');
      }
    } catch (error) {
      logMessage('error', 'SocketService', 'broadcastGeofencingSummary', 'Error broadcasting geofencing summary', error);
    }
  }

  /**
   * Send data to specific guardian
   * @param {string} guardianId - Guardian ID
   * @param {string} event - Event name
   * @param {object} data - Data to send
   */
  sendToGuardian(guardianId, event, data) {
    if (!this.io) return;

    this.io.to(`guardian-${guardianId}`).emit(event, data);
    logMessage('info', 'SocketService', 'sendToGuardian', `Sent ${event} to guardian ${guardianId}`);
  }

  /**
   * Send data to specific bike room
   * @param {string} bikeId - Bike ID
   * @param {string} event - Event name
   * @param {object} data - Data to send
   */
  sendToBike(bikeId, event, data) {
    if (!this.io) return;

    this.io.to(`bike-${bikeId}`).emit(event, data);
    this.io.to(`bike_${bikeId}`).emit(event, data);
    logMessage('debug', 'SocketService', 'sendToBike', `Sent ${event} to bike ${bikeId}`);
  }

  /**
   * Broadcast general event to all connected clients
   * @param {string} event - Event name
   * @param {object} data - Data to broadcast
   */
  broadcast(event, data) {
    if (!this.io) return;

    this.io.emit(event, data);
    logMessage('info', 'SocketService', 'broadcast', `Broadcasted ${event} to all clients`);
  }

  /**
   * Get number of connected clients
   * @returns {number} - Number of connected clients
   */
  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  /**
   * Get Socket.IO instance
   * @returns {object} - Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

// Create singleton instance
const socketService = new SocketService();

module.exports = socketService;