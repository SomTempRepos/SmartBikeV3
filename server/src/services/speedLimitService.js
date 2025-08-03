const path = require('path');
const config = require('../config/environment');
const FileManager = require('../utils/fileManager');
const socketService = require('./socketService');
const { 
  getCurrentTimestamp, 
  parseFloatSafe,
  logMessage 
} = require('../utils/helpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

class SpeedLimitService {
  /**
   * Set speed limit for a specific bike
   * @param {string} bikeId - Bike ID
   * @param {number} speedLimit - Speed limit in km/h
   * @returns {Promise<object>} - { success: boolean, speedLimit?: object, error?: string }
   */
  static async setSpeedLimit(bikeId, speedLimit) {
    try {
      // Validate inputs
      const validation = this.validateSpeedLimitData(bikeId, speedLimit);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      const parsedSpeedLimit = parseFloatSafe(speedLimit);
      
      // Update bikes.json with speed limit
      const updateResult = await this.updateBikeSpeedLimit(bikeId, parsedSpeedLimit);
      if (!updateResult.success) {
        return updateResult;
      }

      const speedLimitData = {
        bikeId,
        speedLimit: parsedSpeedLimit,
        setAt: getCurrentTimestamp(),
        status: 'active'
      };

      // Save to speed limits history
      await this.saveSpeedLimitHistory(speedLimitData);

      // Broadcast speed limit update via WebSocket
      socketService.sendToBike(bikeId, 'speedLimitUpdated', speedLimitData);
      socketService.broadcast('speedLimitChange', {
        bikeId,
        speedLimit: parsedSpeedLimit,
        timestamp: speedLimitData.setAt
      });

      logMessage('info', `Speed limit set for bike ${bikeId}`, {
        speedLimit: parsedSpeedLimit,
        timestamp: speedLimitData.setAt
      });

      return { 
        success: true, 
        speedLimit: speedLimitData,
        message: SUCCESS_MESSAGES.SPEED_LIMIT_SET || 'Speed limit set successfully'
      };

    } catch (error) {
      logMessage('error', 'Error setting speed limit:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get speed limit for a specific bike from speed_limits.json
   * @param {string} bikeId - Bike ID
   * @returns {Promise<object>} - { success: boolean, speedLimit?: object, error?: string }
   */
  static async getSpeedLimit(bikeId) {
    try {
      if (!bikeId) {
        return { success: false, error: 'Bike ID is required' };
      }

      const speedLimitsFile = path.join(config.DATA_DIR || 'data', 'speed_limits.json');

      // Get from speed_limits.json
      if (await FileManager.exists(speedLimitsFile)) {
        const speedLimits = await FileManager.readJson(speedLimitsFile);
        const speedLimitEntry = speedLimits.find(limit => limit.bikeId === bikeId && limit.status === 'active');
        
        if (speedLimitEntry) {
          return { 
            success: true, 
            speedLimit: speedLimitEntry
          };
        }
      }

      // If not found in speed_limits.json, check history for last set speed limit
      const historyResult = await this.getSpeedLimitHistory(bikeId, 1);
      if (historyResult.success && historyResult.history.length > 0) {
        return { success: true, speedLimit: historyResult.history[0] };
      }

      return { success: false, error: 'No speed limit set for this bike' };

    } catch (error) {
      logMessage('error', 'Error getting speed limit:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get all bikes with their speed limits from separate files
   * @returns {Promise<object>} - { success: boolean, bikesWithSpeedLimits?: array, error?: string }
   */
  static async getAllBikesSpeedLimits() {
    try {
      const speedLimitsFile = path.join(config.DATA_DIR || 'data', 'speed_limits.json');
      
      // Get all bikes from bikes.json
      let bikes = [];
      if (await FileManager.exists(config.BIKES_FILE)) {
        bikes = await FileManager.readJson(config.BIKES_FILE);
      }

      // Get all speed limits from speed_limits.json
      let speedLimits = [];
      if (await FileManager.exists(speedLimitsFile)) {
        speedLimits = await FileManager.readJson(speedLimitsFile);
      }

      // Create a map of speed limits for faster lookup
      const speedLimitMap = {};
      speedLimits
        .filter(limit => limit.status === 'active')
        .forEach(limit => {
          speedLimitMap[limit.bikeId] = limit;
        });

      // Combine bike data with speed limits
      const bikesWithSpeedLimits = bikes.map(bike => {
        const speedLimitEntry = speedLimitMap[bike.bikeId];
        return {
          bikeId: bike.bikeId,
          speedLimit: speedLimitEntry ? speedLimitEntry.speedLimit : null,
          speedLimitSetAt: speedLimitEntry ? speedLimitEntry.setAt : null,
          currentSpeed: bike.avgSpeed || 0,
          isSpeedExceeded: speedLimitEntry ? (bike.avgSpeed || 0) > speedLimitEntry.speedLimit : false,
          lastSeen: bike.lastSeen,
          status: bike.status
        };
      });

      // Also include bikes that have speed limits but don't exist in bikes.json yet
      speedLimits
        .filter(limit => limit.status === 'active' && !bikes.find(bike => bike.bikeId === limit.bikeId))
        .forEach(limit => {
          bikesWithSpeedLimits.push({
            bikeId: limit.bikeId,
            speedLimit: limit.speedLimit,
            speedLimitSetAt: limit.setAt,
            currentSpeed: 0,
            isSpeedExceeded: false,
            lastSeen: null,
            status: 'inactive'
          });
        });

      return { success: true, bikesWithSpeedLimits };

    } catch (error) {
      logMessage('error', 'Error getting all bikes speed limits:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Check if bike is exceeding speed limit
   * @param {string} bikeId - Bike ID
   * @param {number} currentSpeed - Current speed in km/h
   * @returns {Promise<object>} - { success: boolean, isExceeded?: boolean, speedLimit?: number, exceedBy?: number, error?: string }
   */
  static async checkSpeedViolation(bikeId, currentSpeed) {
    try {
      const speedLimitResult = await this.getSpeedLimit(bikeId);
      if (!speedLimitResult.success) {
        return { success: true, isExceeded: false, reason: 'No speed limit set' };
      }

      const speedLimit = speedLimitResult.speedLimit.speedLimit;
      const parsedCurrentSpeed = parseFloatSafe(currentSpeed);
      const isExceeded = parsedCurrentSpeed > speedLimit;
      const exceedBy = isExceeded ? parsedCurrentSpeed - speedLimit : 0;

      // If speed is exceeded, create violation record
      if (isExceeded) {
        await this.recordSpeedViolation(bikeId, parsedCurrentSpeed, speedLimit, exceedBy);
      }

      return {
        success: true,
        isExceeded,
        speedLimit,
        currentSpeed: parsedCurrentSpeed,
        exceedBy: Math.round(exceedBy * 100) / 100 // Round to 2 decimal places
      };

    } catch (error) {
      logMessage('error', 'Error checking speed violation:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get speed violation history for a bike
   * @param {string} bikeId - Bike ID
   * @param {number} limit - Number of records to retrieve (default: 50)
   * @returns {Promise<object>} - { success: boolean, violations?: array, error?: string }
   */
  static async getSpeedViolations(bikeId, limit = 50) {
    try {
      const violationsFile = path.join(config.DATA_DIR || 'data', 'speed_violations.json');
      
      if (await FileManager.exists(violationsFile)) {
        const violations = await FileManager.readJson(violationsFile);
        const bikeViolations = violations
          .filter(v => v.bikeId === bikeId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);

        return { success: true, violations: bikeViolations };
      } else {
        return { success: true, violations: [] };
      }
    } catch (error) {
      logMessage('error', 'Error getting speed violations:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Remove speed limit for a bike from speed_limits.json
   * @param {string} bikeId - Bike ID
   * @returns {Promise<object>} - { success: boolean, message?: string, error?: string }
   */
  static async removeSpeedLimit(bikeId) {
    try {
      if (!bikeId) {
        return { success: false, error: 'Bike ID is required' };
      }

      const speedLimitsFile = path.join(config.DATA_DIR || 'data', 'speed_limits.json');

      // Update speed_limits.json to mark as inactive or remove
      if (await FileManager.exists(speedLimitsFile)) {
        const speedLimits = await FileManager.readJson(speedLimitsFile);
        const speedLimitIndex = speedLimits.findIndex(limit => limit.bikeId === bikeId && limit.status === 'active');
        
        if (speedLimitIndex !== -1) {
          // Mark as inactive instead of removing (for history tracking)
          speedLimits[speedLimitIndex].status = 'inactive';
          speedLimits[speedLimitIndex].removedAt = getCurrentTimestamp();
          
          await FileManager.writeJson(speedLimitsFile, speedLimits);

          // Broadcast speed limit removal
          socketService.sendToBike(bikeId, 'speedLimitRemoved', { bikeId });
          socketService.broadcast('speedLimitChange', {
            bikeId,
            speedLimit: null,
            timestamp: getCurrentTimestamp(),
            action: 'removed'
          });

          logMessage('info', `Speed limit removed for bike ${bikeId}`);
          return { success: true, message: 'Speed limit removed successfully' };
        } else {
          return { success: false, error: 'No active speed limit found for this bike' };
        }
      } else {
        return { success: false, error: 'No speed limits file found' };
      }
    } catch (error) {
      logMessage('error', 'Error removing speed limit:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Validate speed limit data
   * @param {string} bikeId - Bike ID
   * @param {number} speedLimit - Speed limit value
   * @returns {object} - { isValid: boolean, error?: string }
   */
  static validateSpeedLimitData(bikeId, speedLimit) {
    if (!bikeId) {
      return { isValid: false, error: 'Bike ID is required' };
    }

    if (speedLimit === undefined || speedLimit === null) {
      return { isValid: false, error: 'Speed limit is required' };
    }

    const parsedSpeedLimit = parseFloatSafe(speedLimit);
    if (isNaN(parsedSpeedLimit) || parsedSpeedLimit < 0) {
      return { isValid: false, error: 'Speed limit must be a positive number' };
    }

    if (parsedSpeedLimit > 200) {
      return { isValid: false, error: 'Speed limit cannot exceed 200 km/h' };
    }

    return { isValid: true };
  }

  /**
   * Update speed limit in separate speed_limits.json file
   * @param {string} bikeId - Bike ID
   * @param {number} speedLimit - Speed limit value
   * @returns {Promise<object>} - { success: boolean, error?: string }
   */
  static async updateBikeSpeedLimit(bikeId, speedLimit) {
    try {
      const speedLimitsFile = path.join(config.DATA_DIR || 'data', 'speed_limits.json');
      
      let speedLimits = [];
      if (await FileManager.exists(speedLimitsFile)) {
        speedLimits = await FileManager.readJson(speedLimitsFile);
      }

      const speedLimitIndex = speedLimits.findIndex(limit => limit.bikeId === bikeId);
      const currentTimestamp = getCurrentTimestamp();

      const speedLimitEntry = {
        bikeId,
        speedLimit,
        setAt: currentTimestamp,
        status: 'active'
      };

      if (speedLimitIndex !== -1) {
        // Update existing speed limit
        speedLimits[speedLimitIndex] = speedLimitEntry;
      } else {
        // Create new speed limit entry
        speedLimits.push(speedLimitEntry);
      }

      await FileManager.writeJson(speedLimitsFile, speedLimits);
      
      logMessage('info', `Speed limit updated in speed_limits.json for bike ${bikeId}`, {
        speedLimit,
        timestamp: currentTimestamp
      });

      return { success: true };

    } catch (error) {
      logMessage('error', 'Error updating bike speed limit:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Save speed limit change to history
   * @param {object} speedLimitData - Speed limit data
   */
  static async saveSpeedLimitHistory(speedLimitData) {
    try {
      const historyFile = path.join(config.DATA_DIR || 'data', 'speed_limit_history.json');
      
      let history = [];
      if (await FileManager.exists(historyFile)) {
        history = await FileManager.readJson(historyFile);
      }

      history.push(speedLimitData);
      
      // Keep only last 1000 records to prevent file from growing too large
      if (history.length > 1000) {
        history = history.slice(-1000);
      }

      await FileManager.writeJson(historyFile, history);
      logMessage('info', `Saved speed limit history for bike ${speedLimitData.bikeId}`);

    } catch (error) {
      logMessage('error', 'Error saving speed limit history:', error);
      throw error;
    }
  }

  /**
   * Get speed limit history for a bike
   * @param {string} bikeId - Bike ID
   * @param {number} limit - Number of records to retrieve
   * @returns {Promise<object>} - { success: boolean, history?: array, error?: string }
   */
  static async getSpeedLimitHistory(bikeId, limit = 50) {
    try {
      const historyFile = path.join(config.DATA_DIR || 'data', 'speed_limit_history.json');
      
      if (await FileManager.exists(historyFile)) {
        const history = await FileManager.readJson(historyFile);
        const bikeHistory = history
          .filter(entry => entry.bikeId === bikeId)
          .sort((a, b) => new Date(b.setAt).getTime() - new Date(a.setAt).getTime())
          .slice(0, limit);

        return { success: true, history: bikeHistory };
      } else {
        return { success: true, history: [] };
      }
    } catch (error) {
      logMessage('error', 'Error getting speed limit history:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Record speed violation
   * @param {string} bikeId - Bike ID
   * @param {number} currentSpeed - Current speed
   * @param {number} speedLimit - Speed limit
   * @param {number} exceedBy - Amount exceeded by
   */
  static async recordSpeedViolation(bikeId, currentSpeed, speedLimit, exceedBy) {
    try {
      const violationsFile = path.join(config.DATA_DIR || 'data', 'speed_violations.json');
      
      let violations = [];
      if (await FileManager.exists(violationsFile)) {
        violations = await FileManager.readJson(violationsFile);
      }

      const violation = {
        bikeId,
        currentSpeed,
        speedLimit,
        exceedBy,
        timestamp: getCurrentTimestamp(),
        severity: this.getViolationSeverity(exceedBy)
      };

      violations.push(violation);
      
      // Keep only last 5000 records
      if (violations.length > 5000) {
        violations = violations.slice(-5000);
      }

      await FileManager.writeJson(violationsFile, violations);

      // Broadcast speed violation alert
      socketService.sendToBike(bikeId, 'speedViolation', violation);
      socketService.broadcast('speedViolationAlert', violation);

      logMessage('warn', `Speed violation recorded for bike ${bikeId}`, {
        currentSpeed,
        speedLimit,
        exceedBy,
        severity: violation.severity
      });

    } catch (error) {
      logMessage('error', 'Error recording speed violation:', error);
      throw error;
    }
  }

  /**
   * Get violation severity based on how much speed limit is exceeded
   * @param {number} exceedBy - Amount exceeded by in km/h
   * @returns {string} - Severity level
   */
  static getViolationSeverity(exceedBy) {
    if (exceedBy <= 5) return 'low';
    if (exceedBy <= 15) return 'medium';
    if (exceedBy <= 30) return 'high';
    return 'critical';
  }
}

module.exports = SpeedLimitService;