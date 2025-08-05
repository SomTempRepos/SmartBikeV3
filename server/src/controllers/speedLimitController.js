const speedLimitService = require('../services/speedLimitService');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');
const { logMessage } = require('../utils/helpers');

class SpeedLimitController {
  /**
   * Set speed limit for a specific bike
   * POST /api/bikes/:bikeId/speed-limit
   */
  static setSpeedLimit = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;
    const { speedLimit, setBy } = req.body;

    logMessage('info', 'SpeedLimitController', 'setSpeedLimit', `Setting speed limit for bike ${bikeId}`, {
      bikeId,
      speedLimit,
      setBy
    });

    const result = await speedLimitService.setSpeedLimit(bikeId, speedLimit, setBy);
    
    if (result.success) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        speedLimit: result.speedLimit,
        message: result.message
      });
    } else {
      const statusCode = result.error.includes('required') || result.error.includes('Valid')
        ? HTTP_STATUS.BAD_REQUEST 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }
  });

  /**
   * Get speed limit for a specific bike
   * GET /api/bikes/:bikeId/speed-limit
   */
  static getSpeedLimit = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;

    logMessage('debug', 'SpeedLimitController', 'getSpeedLimit', `Getting speed limit for bike ${bikeId}`);

    const result = await speedLimitService.getSpeedLimit(bikeId);
    
    if (result.success) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        speedLimit: result.speedLimit
      });
    } else {
      const statusCode = result.error.includes('required')
        ? HTTP_STATUS.BAD_REQUEST 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }
  });

  /**
   * Get all speed limits
   * GET /api/speed-limits
   */
  static getAllSpeedLimits = asyncHandler(async (req, res) => {
    logMessage('debug', 'SpeedLimitController', 'getAllSpeedLimits', 'Getting all speed limits');

    const result = await speedLimitService.getAllSpeedLimits();
    
    if (result.success) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        speedLimits: result.speedLimits,
        count: result.speedLimits.length
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: result.error
      });
    }
  });

  /**
   * Delete speed limit for a specific bike
   * DELETE /api/bikes/:bikeId/speed-limit
   */
  static deleteSpeedLimit = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;

    logMessage('info', 'SpeedLimitController', 'deleteSpeedLimit', `Deleting speed limit for bike ${bikeId}`);

    const result = await speedLimitService.deleteSpeedLimit(bikeId);
    
    if (result.success) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message
      });
    } else {
      const statusCode = result.error.includes('not found')
        ? HTTP_STATUS.NOT_FOUND 
        : result.error.includes('required')
        ? HTTP_STATUS.BAD_REQUEST
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({
        success: false,
        error: result.error
      });
    }
  });

  /**
   * Check speed violation for a bike
   * POST /api/bikes/:bikeId/check-speed
   */
  static checkSpeedViolation = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;
    const { currentSpeed } = req.body;

    logMessage('debug', 'SpeedLimitController', 'checkSpeedViolation', `Checking speed violation for bike ${bikeId}`, {
      bikeId,
      currentSpeed
    });

    if (typeof currentSpeed !== 'number' || currentSpeed < 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Valid current speed is required'
      });
    }

    const result = await speedLimitService.checkSpeedViolation(bikeId, currentSpeed);
    
    if (result.success) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        isExceeded: result.isExceeded,
        speedLimit: result.speedLimit,
        currentSpeed: result.currentSpeed,
        violation: result.violation
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: result.error
      });
    }
  });

  /**
   * Get speed limits for multiple bikes
   * POST /api/speed-limits/bulk
   */
  static getSpeedLimitsForBikes = asyncHandler(async (req, res) => {
    const { bikeIds } = req.body;

    logMessage('debug', 'SpeedLimitController', 'getSpeedLimitsForBikes', `Getting speed limits for multiple bikes`, {
      count: bikeIds?.length
    });

    if (!Array.isArray(bikeIds) || bikeIds.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Array of bike IDs is required'
      });
    }

    const result = await speedLimitService.getSpeedLimitsForBikes(bikeIds);
    
    if (result.success) {
      res.status(HTTP_STATUS.OK).json({
        success: true,
        speedLimits: result.speedLimits,
        count: Object.keys(result.speedLimits).length
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: result.error
      });
    }
  });

  /**
   * Update speed limit (alias for setSpeedLimit)
   * PUT /api/bikes/:bikeId/speed-limit
   */
  static updateSpeedLimit = asyncHandler(async (req, res) => {
    // Use the same logic as setSpeedLimit
    await SpeedLimitController.setSpeedLimit(req, res);
  });
}

module.exports = SpeedLimitController;