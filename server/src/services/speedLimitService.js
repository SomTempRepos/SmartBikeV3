const path = require('path');
const config = require('../config/environment');
const FileManager = require('../utils/fileManager');
const socketService = require('./socketService');
const { getCurrentTimestamp, logMessage, parseFloatSafe } = require('../utils/helpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

class SpeedLimitService {
  constructor() {
    this.speedLimitsFile = path.join(config.DATA_DIR || './data', 'speedLimits.json');
  }

  /**
   * Initialize speed limits file if it doesn't exist
   */
  async initializeSpeedLimitsFile() {
    try {
      if (!(await FileManager.exists(this.speedLimitsFile))) {
        await FileManager.writeJson(this.speedLimitsFile, []);
        logMessage('info', 'Created speedLimits.json file');
      }
    } catch (error) {
      logMessage('error', 'Error initializing speed limits file:', error);
      throw error;
    }
  }

  /**
   * Set speed limit for a specific bike
   * @param {string} bikeId - Bike ID
   * @param {number} speedLimit - Speed limit in km/h
   * @param {string} setBy - Who set the limit (optional)
   * @returns {Promise<object>} - { success: boolean, speedLimit?: object, error?: string }
   */
  async setSpeedLimit(bikeId, speedLimit, setBy = 'system') {
    try {
      logMessage('info', 'SpeedLimitService', 'setSpeedLimit', `Setting speed limit for bike ${bikeId}`, {
        bikeId,
        speedLimit,
        setBy
      });

      // Validate inputs
      if (!bikeId || typeof bikeId !== 'string') {
        return { success: false, error: 'Valid bike ID is required' };
      }

      const parsedSpeedLimit = parseFloatSafe(speedLimit);
      if (parsedSpeedLimit === null || parsedSpeedLimit < 0) {
        return { success: false, error: 'Valid speed limit (>= 0) is required' };
      }

      await this.initializeSpeedLimitsFile();

      // Read existing speed limits
      let speedLimits = [];
      if (await FileManager.exists(this.speedLimitsFile)) {
        speedLimits = await FileManager.readJson(this.speedLimitsFile);
      }

      // Find existing speed limit for this bike
      const existingIndex = speedLimits.findIndex(limit => limit.bikeId === bikeId);
      
      const speedLimitData = {
        bikeId,
        speedLimit: parsedSpeedLimit,
        setAt: getCurrentTimestamp(),
        setBy
      };

      if (existingIndex !== -1) {
        // Update existing speed limit
        speedLimits[existingIndex] = { ...speedLimits[existingIndex], ...speedLimitData };
        logMessage('debug', 'SpeedLimitService', 'setSpeedLimit', `Updated existing speed limit for bike ${bikeId}`);
      } else {
        // Add new speed limit
        speedLimits.push(speedLimitData);
        logMessage('debug', 'SpeedLimitService', 'setSpeedLimit', `Added new speed limit for bike ${bikeId}`);
      }

      // Save to file
      await FileManager.writeJson(this.speedLimitsFile, speedLimits);

      // Broadcast speed limit update via WebSocket
      if (socketService.getIO()) {
        socketService.broadcast('speedLimitUpdated', {
          bikeId,
          speedLimit: parsedSpeedLimit,
          setAt: speedLimitData.setAt
        });

        // Also send to specific bike subscribers
        socketService.sendToBike(bikeId, 'speedLimitChanged', {
          speedLimit: parsedSpeedLimit,
          setAt: speedLimitData.setAt
        });
      }

      logMessage('info', 'SpeedLimitService', 'setSpeedLimit', `Speed limit set successfully for bike ${bikeId}`, {
        speedLimit: parsedSpeedLimit
      });

      return { 
        success: true, 
        speedLimit: speedLimitData,
        message: `Speed limit set to ${parsedSpeedLimit} km/h for bike ${bikeId}`
      };

    } catch (error) {
      logMessage('error', 'SpeedLimitService', 'setSpeedLimit', 'Error setting speed limit', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get speed limit for a specific bike
   * @param {string} bikeId - Bike ID
   * @returns {Promise<object>} - { success: boolean, speedLimit?: object, error?: string }
   */
  async getSpeedLimit(bikeId) {
    try {
      logMessage('debug', 'SpeedLimitService', 'getSpeedLimit', `Getting speed limit for bike ${bikeId}`);

      if (!bikeId || typeof bikeId !== 'string') {
        return { success: false, error: 'Valid bike ID is required' };
      }

      await this.initializeSpeedLimitsFile();

      if (await FileManager.exists(this.speedLimitsFile)) {
        const speedLimits = await FileManager.readJson(this.speedLimitsFile);
        const speedLimit = speedLimits.find(limit => limit.bikeId === bikeId);

        if (speedLimit) {
          logMessage('debug', 'SpeedLimitService', 'getSpeedLimit', `Found speed limit for bike ${bikeId}`, {
            speedLimit: speedLimit.speedLimit
          });
          return { success: true, speedLimit };
        } else {
          logMessage('debug', 'SpeedLimitService', 'getSpeedLimit', `No speed limit found for bike ${bikeId}`);
          return { 
            success: true, 
            speedLimit: {
              bikeId,
              speedLimit: 50, // default speed limit
              setAt: getCurrentTimestamp(),
              setBy: 'default'
            }
          };
        }
      }

      // Return default if file doesn't exist
      return { 
        success: true, 
        speedLimit: {
          bikeId,
          speedLimit: 50,
          setAt: getCurrentTimestamp(),
          setBy: 'default'
        }
      };

    } catch (error) {
      logMessage('error', 'SpeedLimitService', 'getSpeedLimit', 'Error getting speed limit', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get all speed limits
   * @returns {Promise<object>} - { success: boolean, speedLimits?: array, error?: string }
   */
  async getAllSpeedLimits() {
    try {
      logMessage('debug', 'SpeedLimitService', 'getAllSpeedLimits', 'Getting all speed limits');

      await this.initializeSpeedLimitsFile();

      if (await FileManager.exists(this.speedLimitsFile)) {
        const speedLimits = await FileManager.readJson(this.speedLimitsFile);
        logMessage('debug', 'SpeedLimitService', 'getAllSpeedLimits', `Found ${speedLimits.length} speed limits`);
        return { success: true, speedLimits };
      }

      return { success: true, speedLimits: [] };

    } catch (error) {
      logMessage('error', 'SpeedLimitService', 'getAllSpeedLimits', 'Error getting all speed limits', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Delete speed limit for a specific bike
   * @param {string} bikeId - Bike ID
   * @returns {Promise<object>} - { success: boolean, message?: string, error?: string }
   */
  async deleteSpeedLimit(bikeId) {
    try {
      logMessage('info', 'SpeedLimitService', 'deleteSpeedLimit', `Deleting speed limit for bike ${bikeId}`);

      if (!bikeId || typeof bikeId !== 'string') {
        return { success: false, error: 'Valid bike ID is required' };
      }

      await this.initializeSpeedLimitsFile();

      if (await FileManager.exists(this.speedLimitsFile)) {
        let speedLimits = await FileManager.readJson(this.speedLimitsFile);
        const initialLength = speedLimits.length;
        
        speedLimits = speedLimits.filter(limit => limit.bikeId !== bikeId);
        
        if (speedLimits.length < initialLength) {
          await FileManager.writeJson(this.speedLimitsFile, speedLimits);
          
          // Broadcast deletion via WebSocket
          if (socketService.getIO()) {
            socketService.broadcast('speedLimitDeleted', { bikeId });
            socketService.sendToBike(bikeId, 'speedLimitDeleted', { bikeId });
          }

          logMessage('info', 'SpeedLimitService', 'deleteSpeedLimit', `Speed limit deleted for bike ${bikeId}`);
          return { success: true, message: `Speed limit deleted for bike ${bikeId}` };
        } else {
          return { success: false, error: 'Speed limit not found for this bike' };
        }
      }

      return { success: false, error: 'No speed limits found' };

    } catch (error) {
      logMessage('error', 'SpeedLimitService', 'deleteSpeedLimit', 'Error deleting speed limit', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Check if bike exceeds speed limit
   * @param {string} bikeId - Bike ID
   * @param {number} currentSpeed - Current speed in km/h
   * @returns {Promise<object>} - { success: boolean, isExceeded?: boolean, speedLimit?: number, error?: string }
   */
  async checkSpeedViolation(bikeId, currentSpeed) {
    try {
      const result = await this.getSpeedLimit(bikeId);
      
      if (!result.success) {
        return result;
      }

      const speedLimit = result.speedLimit.speedLimit;
      const isExceeded = currentSpeed > speedLimit;

      if (isExceeded) {
        logMessage('warn', 'SpeedLimitService', 'checkSpeedViolation', `Speed limit exceeded for bike ${bikeId}`, {
          currentSpeed,
          speedLimit,
          excess: currentSpeed - speedLimit
        });
      }

      return {
        success: true,
        isExceeded,
        speedLimit,
        currentSpeed,
        violation: isExceeded ? {
          bikeId,
          currentSpeed,
          speedLimit,
          excess: currentSpeed - speedLimit,
          timestamp: getCurrentTimestamp()
        } : null
      };

    } catch (error) {
      logMessage('error', 'SpeedLimitService', 'checkSpeedViolation', 'Error checking speed violation', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get speed limits for multiple bikes
   * @param {array} bikeIds - Array of bike IDs
   * @returns {Promise<object>} - { success: boolean, speedLimits?: object, error?: string }
   */
  async getSpeedLimitsForBikes(bikeIds) {
    try {
      logMessage('debug', 'SpeedLimitService', 'getSpeedLimitsForBikes', `Getting speed limits for ${bikeIds.length} bikes`);

      const speedLimitsMap = {};
      
      for (const bikeId of bikeIds) {
        const result = await this.getSpeedLimit(bikeId);
        if (result.success) {
          speedLimitsMap[bikeId] = result.speedLimit;
        }
      }

      return { success: true, speedLimits: speedLimitsMap };

    } catch (error) {
      logMessage('error', 'SpeedLimitService', 'getSpeedLimitsForBikes', 'Error getting speed limits for bikes', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }
}

// Create singleton instance
const speedLimitService = new SpeedLimitService();

module.exports = speedLimitService;