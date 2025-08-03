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
    this.io = io;
    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logMessage('info', `Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      // Send initial data when client connects
      this.sendInitialData(socket);

      socket.on('disconnect', () => {
        logMessage('info', `Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      // Existing handlers
      socket.on('join-guardian', (guardianId) => {
        socket.join(`guardian-${guardianId}`);
        logMessage('info', `Guardian ${guardianId} joined room`);
      });

      socket.on('join-bike', (bikeId) => {
        socket.join(`bike-${bikeId}`);
        logMessage('info', `Client joined bike room: ${bikeId}`);
      });

      // New geofencing handlers
      socket.on('setGeofence', async (data) => {
        try {
          const geofencingService = require('./geofencingService');
          const geofence = await geofencingService.setGeofence(data);
          
          // Broadcast geofence update to all clients
          this.io.emit('geofenceUpdated', geofence);
          
          socket.emit('geofenceSet', {
            success: true,
            geofence
          });

          logMessage('info', 'Geofence updated via WebSocket', {
            location: data.baseLocation,
            radius: data.radius
          });

        } catch (error) {
          socket.emit('geofenceSet', {
            success: false,
            error: error.message
          });
          logMessage('error', 'Error setting geofence via WebSocket:', error);
        }
      });

      // Handle alert acknowledgment
      socket.on('acknowledgeAlert', async (alertId) => {
        try {
          const geofencingService = require('./geofencingService');
          const alert = await geofencingService.acknowledgeAlert(alertId);
          if (alert) {
            this.io.emit('alertAcknowledged', alert);
            logMessage('info', `Alert ${alertId} acknowledged via WebSocket`);
          }
        } catch (error) {
          logMessage('error', 'Error acknowledging alert via WebSocket:', error);
        }
      });

      // Handle subscription to specific bike updates
      socket.on('subscribeToBike', (bikeId) => {
        socket.join(`bike_${bikeId}`);
        logMessage('info', `Client subscribed to bike ${bikeId}`);
      });

      // Handle unsubscription
      socket.on('unsubscribeFromBike', (bikeId) => {
        socket.leave(`bike_${bikeId}`);
        logMessage('info', `Client unsubscribed from bike ${bikeId}`);
      });

      // Handle bike data from IoT devices/simulators
      socket.on('bikeData', async (data) => {
        try {
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
          logMessage('error', 'Error processing bike data via WebSocket:', error);
          socket.emit('dataReceived', {
            bikeId: data.bikeId,
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      });
    });
    
    
  }

  /**
   * Send initial data to newly connected clients
   * @param {object} socket - Socket instance
   */
  async sendInitialData(socket) {
    try {
      const BikeService = require('./bikeService');
      const geofencingService = require('./geofencingService');

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

      logMessage('info', `Sent initial data to client ${socket.id}`);

    } catch (error) {
      logMessage('error', 'Error sending initial data:', error);
    }
  }

  /**
   * Broadcast bike data to all connected clients
   * @param {object} bikeData - Bike data to broadcast
   */
  broadcastBikeData(bikeData) {
    if (!this.io) return;

    // Original bike data event
    this.io.emit('bikeData', bikeData);
    
    // Enhanced bike update with geofencing info
    this.io.emit('bikeUpdate', {
      bikeId: bikeData.bikeId,
      data: bikeData.data,
      timestamp: bikeData.timestamp,
      geofencing: bikeData.geofencing
    });

    // Emit to specific bike room
    this.io.to(`bike-${bikeData.bikeId}`).emit('bikeSpecificUpdate', bikeData);
    this.io.to(`bike_${bikeData.bikeId}`).emit('bikeSpecificUpdate', bikeData);

    logMessage('info', `Broadcasted bike data for ${bikeData.bikeId}`, {
      speed: bikeData.data?.avgSpeed,
      location: bikeData.data?.location,
      battery: bikeData.data?.battery,
      isOutsideFence: bikeData.geofencing?.isOutsideFence,
      distanceFromBase: bikeData.geofencing?.distanceFromBase
    });
  }

  /**
   * Broadcast geofence alert to all clients
   * @param {object} alert - Alert data
   */
  broadcastGeofenceAlert(alert) {
    if (!this.io) return;

    this.io.emit('geofenceAlert', alert);
    logMessage('info', `Broadcasted geofence alert for bike ${alert.bikeId}`);
  }

  /**
   * Broadcast geofencing summary update
   */
  async broadcastGeofencingSummary() {
    if (!this.io) return;

    try {
      const BikeService = require('./bikeService');
      const summaryResult = await BikeService.getGeofencingSummary();
      if (summaryResult.success) {
        this.io.emit('geofencingSummary', summaryResult.summary);
        logMessage('info', 'Broadcasted geofencing summary update');
      }
    } catch (error) {
      logMessage('error', 'Error broadcasting geofencing summary:', error);
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
    logMessage('info', `Sent ${event} to guardian ${guardianId}`);
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
    logMessage('info', `Sent ${event} to bike ${bikeId}`);
  }

  /**
   * Broadcast general event to all connected clients
   * @param {string} event - Event name
   * @param {object} data - Data to broadcast
   */
  broadcast(event, data) {
    if (!this.io) return;

    this.io.emit(event, data);
    logMessage('info', `Broadcasted ${event} to all clients`);
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