const path = require('path');
const config = require('../config/environment');
const FileManager = require('../utils/fileManager');
const { logMessage, getCurrentTimestamp } = require('../utils/helpers');

class GeofencingService {
  constructor() {
    this.geofences = new Map();
    this.alerts = [];
    this.alertsFilePath = path.join(config.DATA_DIR || './data', 'alerts.json');
    this.geofencesFilePath = path.join(config.DATA_DIR || './data', 'geofences.json');
    
    this.loadGeofences();
    this.loadAlerts();
  }

  /**
   * Load geofences from file
   */
  async loadGeofences() {
    try {
      if (await FileManager.exists(this.geofencesFilePath)) {
        const data = await FileManager.readJson(this.geofencesFilePath);
        if (data && Array.isArray(data)) {
          data.forEach(fence => {
            this.geofences.set(fence.id, fence);
          });
        }
      }
      logMessage('info', `Loaded ${this.geofences.size} geofences`);
    } catch (error) {
      logMessage('error', 'Error loading geofences:', error);
    }
  }

  /**
   * Load alerts from file
   */
  async loadAlerts() {
    try {
      if (await FileManager.exists(this.alertsFilePath)) {
        const data = await FileManager.readJson(this.alertsFilePath);
        if (data && Array.isArray(data)) {
          this.alerts = data;
        }
      }
      logMessage('info', `Loaded ${this.alerts.length} alerts`);
    } catch (error) {
      logMessage('error', 'Error loading alerts:', error);
    }
  }

  /**
   * Save geofences to file
   */
  async saveGeofences() {
    try {
      const geofencesArray = Array.from(this.geofences.values());
      await FileManager.writeJson(this.geofencesFilePath, geofencesArray);
      logMessage('info', 'Geofences saved to file');
    } catch (error) {
      logMessage('error', 'Error saving geofences:', error);
      throw error;
    }
  }

  /**
   * Save alerts to file
   */
  async saveAlerts() {
    try {
      await FileManager.writeJson(this.alertsFilePath, this.alerts);
      logMessage('info', 'Alerts saved to file');
    } catch (error) {
      logMessage('error', 'Error saving alerts:', error);
      throw error;
    }
  }

  /**
   * Calculate distance using Haversine formula
   * @param {number} lat1 - Latitude 1
   * @param {number} lng1 - Longitude 1
   * @param {number} lat2 - Latitude 2
   * @param {number} lng2 - Longitude 2
   * @returns {number} - Distance in kilometers
   */
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Create or update geofence
   * @param {object} geofenceData - Geofence data
   * @returns {Promise<object>} - Created/updated geofence
   */
  async setGeofence(geofenceData) {
    const geofence = {
      id: geofenceData.id || `fence_${Date.now()}`,
      name: geofenceData.name || 'Default Fence',
      baseLocation: geofenceData.baseLocation,
      radius: geofenceData.radius,
      isActive: true,
      createdAt: geofenceData.createdAt || getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    // DEACTIVATE all existing geofences first
    this.geofences.forEach(fence => {
      fence.isActive = false;
    });

    this.geofences.set(geofence.id, geofence);
    await this.saveGeofences();
    
    logMessage('info', `Geofence ${geofence.id} set/updated`, {
      location: geofence.baseLocation,
      radius: geofence.radius,
      isActive: geofence.isActive
    });

    return geofence;
  }

  /**
   * Get all geofences
   * @returns {Array} - Array of geofences
   */
  getGeofences() {
    return Array.from(this.geofences.values());
  }

  /**
   * Get active geofence (assuming one active fence for now)
   * @returns {object|null} - Active geofence or null
   */
  getActiveGeofence() {
    const activeGeofence = Array.from(this.geofences.values()).find(fence => fence.isActive) || null;
    
    logMessage('debug', 'Getting active geofence', {
      found: !!activeGeofence,
      geofence: activeGeofence ? {
        id: activeGeofence.id,
        baseLocation: activeGeofence.baseLocation,
        radius: activeGeofence.radius,
        isActive: activeGeofence.isActive
      } : null
    });
    
    return activeGeofence;
  }

  /**
   * Check if bike is outside any active geofence
   * @param {object} bikeData - Bike data with location
   * @returns {object} - Geofence check result
   */
  checkBikeGeofence(bikeData) {
    const activeGeofence = this.getActiveGeofence();
    
    logMessage('info', '=== GEOFENCE CHECK START ===');
    
    if (!activeGeofence) {
      logMessage('warn', 'No active geofence found');
      return {
        isOutsideFence: false,
        distanceFromBase: 0,
        geofenceId: null
      };
    }

    if (!bikeData.location) {
      logMessage('warn', 'No bike location provided');
      return {
        isOutsideFence: false,
        distanceFromBase: 0,
        geofenceId: null
      };
    }

    logMessage('info', 'Active geofence details', {
      id: activeGeofence.id,
      baseLocation: activeGeofence.baseLocation,
      radius: activeGeofence.radius,
      isActive: activeGeofence.isActive
    });

    logMessage('info', 'Bike location', bikeData.location);

    const distance = this.calculateDistance(
      activeGeofence.baseLocation.lat,
      activeGeofence.baseLocation.lng,
      bikeData.location.lat,
      bikeData.location.lng
    );

    const isOutsideFence = distance > activeGeofence.radius;

    logMessage('info', 'Geofence calculation result', {
      calculatedDistance: distance,
      geofenceRadius: activeGeofence.radius,
      isOutsideFence: isOutsideFence,
      comparison: `${distance} > ${activeGeofence.radius} = ${isOutsideFence}`
    });

    logMessage('info', '=== GEOFENCE CHECK END ===');

    return {
      isOutsideFence,
      distanceFromBase: distance,
      geofenceId: activeGeofence.id,
      geofence: activeGeofence
    };
  }

  /**
   * Create alert when bike violates geofence
   * @param {string} bikeId - Bike ID
   * @param {object} bikeData - Bike data
   * @param {object} geofenceResult - Geofence check result
   * @returns {Promise<object|null>} - Created alert or null
   */
  async createAlert(bikeId, bikeData, geofenceResult) {
    if (!geofenceResult.isOutsideFence) return null;

    // Check if there's already a recent alert for this bike
    const recentAlert = this.alerts.find(alert => 
      alert.bikeId === bikeId && 
      alert.type === 'fence_breach' &&
      alert.status === 'active' &&
      (Date.now() - new Date(alert.timestamp).getTime()) < 300000 // 5 minutes
    );

    if (recentAlert) return null;

    const alert = {
      id: `alert_${Date.now()}_${bikeId}`,
      bikeId,
      type: 'fence_breach',
      message: `Bike ${bikeId} has left the geo-fence area`,
      distance: geofenceResult.distanceFromBase.toFixed(2),
      geofenceId: geofenceResult.geofenceId,
      location: bikeData.location,
      timestamp: getCurrentTimestamp(),
      status: 'active',
      acknowledged: false
    };

    this.alerts.unshift(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    await this.saveAlerts();
    
    logMessage('info', `Created geofence alert for bike ${bikeId}`, {
      distance: alert.distance,
      location: bikeData.location
    });

    return alert;
  }

  /**
   * Get alerts with optional filters
   * @param {object} filters - Filter options
   * @returns {Array} - Filtered alerts
   */
  getAlerts(filters = {}) {
    let filteredAlerts = [...this.alerts];

    if (filters.bikeId) {
      filteredAlerts = filteredAlerts.filter(alert => alert.bikeId === filters.bikeId);
    }

    if (filters.status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === filters.status);
    }

    if (filters.type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === filters.type);
    }

    if (filters.limit) {
      filteredAlerts = filteredAlerts.slice(0, filters.limit);
    }

    return filteredAlerts;
  }

  /**
   * Acknowledge alert
   * @param {string} alertId - Alert ID
   * @returns {Promise<object|null>} - Acknowledged alert or null
   */
  async acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = getCurrentTimestamp();
      await this.saveAlerts();
      
      logMessage('info', `Alert ${alertId} acknowledged`);
      return alert;
    }
    return null;
  }

  /**
   * Clear old alerts
   * @param {number} olderThanHours - Hours threshold
   * @returns {Promise<number>} - Number of cleared alerts
   */
  async clearOldAlerts(olderThanHours = 24) {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );

    if (this.alerts.length !== initialCount) {
      await this.saveAlerts();
    }

    const clearedCount = initialCount - this.alerts.length;
    if (clearedCount > 0) {
      logMessage('info', `Cleared ${clearedCount} old alerts`);
    }

    return clearedCount;
  }

  /**
   * Process bike update and check geofence
   * @param {string} bikeId - Bike ID
   * @param {object} bikeData - Bike data
   * @returns {Promise<object>} - Processing result
   */
  async processBikeUpdate(bikeId, bikeData) {
    logMessage('info', `Processing bike update for ${bikeId}`, bikeData);
    
    const geofenceResult = this.checkBikeGeofence(bikeData);
    let alert = null;

    if (geofenceResult.isOutsideFence) {
      alert = await this.createAlert(bikeId, bikeData, geofenceResult);
    }

    return {
      bikeId,
      geofenceResult,
      alert,
      processedAt: getCurrentTimestamp()
    };
  }
}

// Create singleton instance
const geofencingService = new GeofencingService();

module.exports = geofencingService;