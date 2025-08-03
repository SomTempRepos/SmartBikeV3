const geofencingService = require('../services/geofencingService');
const BikeService = require('../services/bikeService');
const { logMessage } = require('../utils/helpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

class GeofencingController {
  /**
   * Set or update geofence
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async setGeofence(req, res) {
    try {
      const { baseLocation, radius, name } = req.body;

      if (!baseLocation || !baseLocation.lat || !baseLocation.lng) {
        return res.status(400).json({
          success: false,
          error: 'Base location with lat and lng is required'
        });
      }

      if (!radius || radius <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid radius (> 0) is required'
        });
      }

      const geofence = await geofencingService.setGeofence({
        baseLocation,
        radius,
        name: name || 'Default Fence'
      });

      logMessage('info', 'Geofence set via API', {
        location: baseLocation,
        radius: radius
      });

      res.json({
        success: true,
        geofence,
        message: 'Geofence set successfully'
      });
    } catch (error) {
      logMessage('error', 'Error setting geofence:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Get all geofences
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getGeofences(req, res) {
    try {
      const geofences = geofencingService.getGeofences();
      res.json({
        success: true,
        geofences,
        count: geofences.length
      });
    } catch (error) {
      logMessage('error', 'Error getting geofences:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Get active geofence
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getActiveGeofence(req, res) {
    try {
      const activeGeofence = geofencingService.getActiveGeofence();
      res.json({
        success: true,
        geofence: activeGeofence || null
      });
    } catch (error) {
      logMessage('error', 'Error getting active geofence:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Get alerts
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getAlerts(req, res) {
    try {
      const {
        bikeId,
        status = 'active',
        type,
        limit = 50
      } = req.query;

      const filters = {
        ...(bikeId && { bikeId }),
        ...(status && { status }),
        ...(type && { type }),
        limit: parseInt(limit)
      };

      const alerts = geofencingService.getAlerts(filters);
      
      res.json({
        success: true,
        alerts,
        count: alerts.length,
        filters
      });
    } catch (error) {
      logMessage('error', 'Error getting alerts:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Acknowledge alert
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async acknowledgeAlert(req, res) {
    try {
      const { alertId } = req.params;
      
      const alert = await geofencingService.acknowledgeAlert(alertId);
      
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }

      res.json({
        success: true,
        alert,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      logMessage('error', 'Error acknowledging alert:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Clear old alerts
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async clearOldAlerts(req, res) {
    try {
      const { hours = 24 } = req.query;
      const clearedCount = await geofencingService.clearOldAlerts(parseInt(hours));
      
      res.json({
        success: true,
        clearedCount,
        message: `Cleared ${clearedCount} old alerts`
      });
    } catch (error) {
      logMessage('error', 'Error clearing old alerts:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Get geofence status for all bikes
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getBikeGeofenceStatus(req, res) {
    try {
      const bikesResult = await BikeService.getAllBikes();
      
      if (!bikesResult.success) {
        return res.status(404).json({
          success: false,
          error: bikesResult.error
        });
      }

      const bikes = bikesResult.bikes;
      
      const bikeStatuses = bikes.map(bike => ({
        bikeId: bike.bikeId,
        location: bike.currentLocation,
        isOutsideFence: bike.isOutsideFence || false,
        distanceFromBase: bike.distanceFromBase || 0,
        geofenceId: bike.geofenceId || null
      }));

      const summary = {
        total: bikeStatuses.length,
        inside: bikeStatuses.filter(b => !b.isOutsideFence).length,
        outside: bikeStatuses.filter(b => b.isOutsideFence).length
      };

      res.json({
        success: true,
        bikeStatuses,
        summary
      });
    } catch (error) {
      logMessage('error', 'Error getting bike geofence status:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Get bikes outside geofence
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getBikesOutsideGeofence(req, res) {
    try {
      const result = await BikeService.getBikesOutsideGeofence();
      
      if (result.success) {
        res.json({
          success: true,
          bikes: result.bikes,
          count: result.bikes.length
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logMessage('error', 'Error getting bikes outside geofence:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Get bikes inside geofence
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getBikesInsideGeofence(req, res) {
    try {
      const result = await BikeService.getBikesInsideGeofence();
      
      if (result.success) {
        res.json({
          success: true,
          bikes: result.bikes,
          count: result.bikes.length
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logMessage('error', 'Error getting bikes inside geofence:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }

  /**
   * Get geofencing summary
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   */
  static async getGeofencingSummary(req, res) {
    try {
      const result = await BikeService.getGeofencingSummary();
      
      if (result.success) {
        res.json({
          success: true,
          summary: result.summary
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      logMessage('error', 'Error getting geofencing summary:', error);
      res.status(500).json({
        success: false,
        error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        details: error.message
      });
    }
  }
}

module.exports = GeofencingController;