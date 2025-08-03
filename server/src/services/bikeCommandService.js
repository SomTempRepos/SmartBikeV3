const path = require('path');
const config = require('../config/environment');
const FileManager = require('../utils/fileManager');
const mqttClientService = require('./mqttClientService');
const socketService = require('./socketService');
const { logMessage, getCurrentTimestamp } = require('../utils/helpers');

class BikeCommandService {
  constructor() {
    this.pendingCommands = new Map(); // In-memory storage for quick access
    this.commandHistory = []; // Command history
    this.commandsFile = path.join(config.DATA_DIR || './data', 'commands.json');
    this.isInitialized = false;
  }

  /**
   * Initialize the command service
   */
  async initialize() {
    try {
      // Load existing commands from file
      await this.loadCommandsFromFile();
      
      // Setup MQTT subscriptions for acknowledgments
      await this.setupMQTTSubscriptions();
      
      this.isInitialized = true;
      logMessage('info', 'BikeCommandService initialized successfully');
      
      return { success: true };
    } catch (error) {
      logMessage('error', 'Failed to initialize BikeCommandService:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Load commands from JSON file
   */
  async loadCommandsFromFile() {
    try {
      if (await FileManager.exists(this.commandsFile)) {
        const data = await FileManager.readJson(this.commandsFile);
        this.commandHistory = data.history || [];
        
        // Load pending commands
        const pending = data.pending || [];
        pending.forEach(cmd => {
          this.pendingCommands.set(`${cmd.bikeId}_${cmd.commandId}`, cmd);
        });

        logMessage('info', `Loaded ${this.commandHistory.length} command history entries and ${pending.length} pending commands`);
      }
    } catch (error) {
      logMessage('error', 'Error loading commands from file:', error);
    }
  }

  /**
   * Save commands to JSON file
   */
  async saveCommandsToFile() {
    try {
      const data = {
        history: this.commandHistory,
        pending: Array.from(this.pendingCommands.values()),
        lastUpdated: getCurrentTimestamp()
      };

      await FileManager.writeJson(this.commandsFile, data);
      logMessage('debug', 'Commands saved to file successfully');
    } catch (error) {
      logMessage('error', 'Error saving commands to file:', error);
    }
  }

  /**
   * Setup MQTT subscriptions for bike acknowledgments
   */
  async setupMQTTSubscriptions() {
    try {
      // Subscribe to acknowledgment topic for all bikes
      await mqttClientService.subscribe(
        'status/+/ack',
        this.handleBikeAcknowledgment.bind(this)
      );

      // Subscribe to bike status updates
      await mqttClientService.subscribe(
        'status/+/online',
        this.handleBikeOnlineStatus.bind(this)
      );

      logMessage('info', 'MQTT subscriptions setup for bike command service');
    } catch (error) {
      logMessage('error', 'Error setting up MQTT subscriptions:', error);
    }
  }

  /**
   * Handle bike acknowledgment messages
   * @param {string} topic - MQTT topic
   * @param {object} payload - Message payload
   */
  handleBikeAcknowledgment(topic, payload) {
    try {
      // Extract bike ID from topic: status/{bikeId}/ack
      const bikeId = topic.split('/')[1];
      
      logMessage('info', `Received acknowledgment from bike ${bikeId}`, payload);

      if (payload.commandId) {
        this.markCommandAsAcknowledged(bikeId, payload.commandId, payload);
      }

      // Broadcast to frontend clients
      socketService.broadcast('bikeAcknowledgment', {
        bikeId,
        ...payload,
        timestamp: getCurrentTimestamp()
      });

    } catch (error) {
      logMessage('error', 'Error handling bike acknowledgment:', error);
    }
  }

  /**
   * Handle bike online status messages
   * @param {string} topic - MQTT topic
   * @param {object} payload - Message payload
   */
  handleBikeOnlineStatus(topic, payload) {
    try {
      // Extract bike ID from topic: status/{bikeId}/online
      const bikeId = topic.split('/')[1];
      
      logMessage('info', `Bike ${bikeId} online status:`, payload);

      // If bike came online, resend pending commands
      if (payload.online) {
        this.resendPendingCommands(bikeId);
      }

    } catch (error) {
      logMessage('error', 'Error handling bike online status:', error);
    }
  }

  /**
   * Send speed limit command to bike
   * @param {string} bikeId - Target bike ID
   * @param {number} speedLimit - Speed limit in km/h
   * @param {string} setBy - Who set the speed limit
   * @returns {Promise<object>} - Command result
   */
  async setSpeedLimit(bikeId, speedLimit, setBy = 'system') {
    try {
      // Validate speed limit
      if (typeof speedLimit !== 'number' || speedLimit < 5 || speedLimit > 100) {
        return {
          success: false,
          error: 'Speed limit must be between 5 and 100 km/h'
        };
      }

      // Create command
      const command = {
        commandId: `cmd_${Date.now()}`,
        bikeId,
        type: 'speed_limit',
        payload: {
          speedLimit,
          unit: 'km/h'
        },
        setBy,
        createdAt: getCurrentTimestamp(),
        status: 'pending',
        retryCount: 0,
        maxRetries: 3
      };

      // Store command
      this.pendingCommands.set(`${bikeId}_${command.commandId}`, command);
      this.commandHistory.push(command);

      // Send via MQTT
      const topic = `commands/${bikeId}/speed_limit`;
      const mqttResult = await mqttClientService.publish(topic, {
        commandId: command.commandId,
        speedLimit,
        unit: 'km/h',
        timestamp: getCurrentTimestamp(),
        setBy
      });

      if (mqttResult.success) {
        logMessage('info', `Speed limit command sent to bike ${bikeId}`, {
          commandId: command.commandId,
          speedLimit,
          setBy
        });

        // Save to file
        await this.saveCommandsToFile();

        // Broadcast to frontend
        socketService.broadcast('commandSent', {
          bikeId,
          command: {
            ...command,
            mqttTopic: topic
          }
        });

        return {
          success: true,
          commandId: command.commandId,
          message: `Speed limit ${speedLimit} km/h sent to bike ${bikeId}`
        };
      } else {
        // Update command status to failed
        command.status = 'failed';
        command.error = mqttResult.error;
        
        return {
          success: false,
          error: `Failed to send command via MQTT: ${mqttResult.error}`
        };
      }

    } catch (error) {
      logMessage('error', 'Error setting speed limit:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Mark command as acknowledged by bike
   * @param {string} bikeId - Bike ID
   * @param {string} commandId - Command ID
   * @param {object} ackPayload - Acknowledgment payload
   */
  markCommandAsAcknowledged(bikeId, commandId, ackPayload) {
    try {
      const commandKey = `${bikeId}_${commandId}`;
      const command = this.pendingCommands.get(commandKey);

      if (command) {
        // Update command status
        command.status = ackPayload.success ? 'acknowledged' : 'failed';
        command.acknowledgedAt = getCurrentTimestamp();
        command.acknowledgment = ackPayload;

        // Remove from pending if acknowledged successfully
        if (ackPayload.success) {
          this.pendingCommands.delete(commandKey);
        }

        // Save to file
        this.saveCommandsToFile();

        logMessage('info', `Command ${commandId} for bike ${bikeId} marked as ${command.status}`);
      } else {
        logMessage('warn', `No pending command found for ${commandId} from bike ${bikeId}`);
      }

    } catch (error) {
      logMessage('error', 'Error marking command as acknowledged:', error);
    }
  }

  /**
   * Resend pending commands to a bike
   * @param {string} bikeId - Bike ID
   */
  async resendPendingCommands(bikeId) {
    try {
      const bikeCommands = Array.from(this.pendingCommands.values())
        .filter(cmd => cmd.bikeId === bikeId && cmd.retryCount < cmd.maxRetries);

      if (bikeCommands.length === 0) {
        logMessage('info', `No pending commands to resend for bike ${bikeId}`);
        return;
      }

      logMessage('info', `Resending ${bikeCommands.length} pending commands to bike ${bikeId}`);

      for (const command of bikeCommands) {
        command.retryCount++;
        command.lastRetryAt = getCurrentTimestamp();

        const topic = `commands/${bikeId}/${command.type}`;
        const result = await mqttClientService.publish(topic, {
          commandId: command.commandId,
          ...command.payload,
          timestamp: getCurrentTimestamp(),
          retryCount: command.retryCount
        });

        if (result.success) {
          logMessage('info', `Resent command ${command.commandId} to bike ${bikeId} (retry ${command.retryCount})`);
        } else {
          logMessage('error', `Failed to resend command ${command.commandId} to bike ${bikeId}:`, result.error);
        }
      }

      await this.saveCommandsToFile();

    } catch (error) {
      logMessage('error', 'Error resending pending commands:', error);
    }
  }

  /**
   * Get pending commands for a bike
   * @param {string} bikeId - Bike ID
   * @returns {Array} - Pending commands
   */
  getPendingCommands(bikeId) {
    return Array.from(this.pendingCommands.values())
      .filter(cmd => cmd.bikeId === bikeId);
  }

  /**
   * Get command history for a bike
   * @param {string} bikeId - Bike ID
   * @param {number} limit - Number of commands to return
   * @returns {Array} - Command history
   */
  getCommandHistory(bikeId, limit = 50) {
    return this.commandHistory
      .filter(cmd => cmd.bikeId === bikeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get all command statistics
   * @returns {object} - Command stats
   */
  getCommandStats() {
    const pending = Array.from(this.pendingCommands.values());
    const acknowledged = this.commandHistory.filter(cmd => cmd.status === 'acknowledged');
    const failed = this.commandHistory.filter(cmd => cmd.status === 'failed');

    return {
      total: this.commandHistory.length,
      pending: pending.length,
      acknowledged: acknowledged.length,
      failed: failed.length,
      byBike: this.getCommandStatsByBike()
    };
  }

  /**
   * Get command statistics by bike
   * @returns {object} - Stats grouped by bike
   */
  getCommandStatsByBike() {
    const stats = {};
    
    this.commandHistory.forEach(cmd => {
      if (!stats[cmd.bikeId]) {
        stats[cmd.bikeId] = {
          total: 0,
          pending: 0,
          acknowledged: 0,
          failed: 0
        };
      }
      
      stats[cmd.bikeId].total++;
      stats[cmd.bikeId][cmd.status]++;
    });

    return stats;
  }

  /**
   * Clean up old commands (optional maintenance function)
   * @param {number} daysOld - Remove commands older than this many days
   */
  async cleanupOldCommands(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const originalCount = this.commandHistory.length;
      this.commandHistory = this.commandHistory.filter(cmd => {
        return new Date(cmd.createdAt) > cutoffDate;
      });

      const removedCount = originalCount - this.commandHistory.length;
      
      if (removedCount > 0) {
        await this.saveCommandsToFile();
        logMessage('info', `Cleaned up ${removedCount} old commands older than ${daysOld} days`);
      }

      return { success: true, removedCount };
    } catch (error) {
      logMessage('error', 'Error cleaning up old commands:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a pending command
   * @param {string} bikeId - Bike ID
   * @param {string} commandId - Command ID to cancel
   * @returns {object} - Cancel result
   */
  cancelCommand(bikeId, commandId) {
    try {
      const commandKey = `${bikeId}_${commandId}`;
      const command = this.pendingCommands.get(commandKey);

      if (command) {
        command.status = 'cancelled';
        command.cancelledAt = getCurrentTimestamp();
        
        this.pendingCommands.delete(commandKey);
        this.saveCommandsToFile();

        logMessage('info', `Command ${commandId} for bike ${bikeId} cancelled`);
        
        return {
          success: true,
          message: `Command ${commandId} cancelled successfully`
        };
      } else {
        return {
          success: false,
          error: 'Command not found or already completed'
        };
      }
    } catch (error) {
      logMessage('error', 'Error cancelling command:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get service status
   * @returns {object} - Service status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      mqttConnected: mqttClientService.isClientConnected(),
      pendingCommands: this.pendingCommands.size,
      totalCommands: this.commandHistory.length,
      commandsFile: this.commandsFile
    };
  }
}

// Create singleton instance
const bikeCommandService = new BikeCommandService();

module.exports = bikeCommandService;