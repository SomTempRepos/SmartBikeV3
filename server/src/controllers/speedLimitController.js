const SpeedLimitService = require('../services/speedLimitService');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

class SpeedLimitController {
  /**
   * Set speed limit for a bike
   * POST /api/bikes/:bikeId/speed-limit
   */
  static setSpeedLimit = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;
    const { speedLimit } = req.body;

    const result = await SpeedLimitService.setSpeedLimit(bikeId, speedLimit);
    
    if (result.success) {
      res.json({ 
        message: result.message,
        speedLimit: result.speedLimit 
      });
    } else {
      const statusCode = result.error.includes('required') || result.error.includes('must be') 
        ? HTTP_STATUS.BAD_REQUEST 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get speed limit for a specific bike
   * GET /api/bikes/:bikeId/speed-limit
   */
  static getSpeedLimit = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;

    const result = await SpeedLimitService.getSpeedLimit(bikeId);
    
    if (result.success) {
      res.json({ speedLimit: result.speedLimit });
    } else {
      const statusCode = result.error.includes('No speed limit') 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get all bikes with their speed limits
   * GET /api/bikes/speed-limits
   */
  static getAllBikesSpeedLimits = asyncHandler(async (req, res) => {
    const result = await SpeedLimitService.getAllBikesSpeedLimits();
    
    if (result.success) {
      res.json({ bikes: result.bikesWithSpeedLimits });
    } else {
      const statusCode = result.error.includes('not found') 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Check speed violation for a bike
   * POST /api/bikes/:bikeId/check-speed
   */
  static checkSpeedViolation = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;
    const { currentSpeed } = req.body;

    if (currentSpeed === undefined || currentSpeed === null) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
        error: 'Current speed is required' 
      });
    }

    const result = await SpeedLimitService.checkSpeedViolation(bikeId, currentSpeed);
    
    if (result.success) {
      res.json({ 
        bikeId,
        speedCheck: {
          isExceeded: result.isExceeded,
          speedLimit: result.speedLimit,
          currentSpeed: result.currentSpeed,
          exceedBy: result.exceedBy,
          reason: result.reason
        }
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: result.error });
    }
  });

  /**
   * Get speed violations for a bike
   * GET /api/bikes/:bikeId/speed-violations
   */
  static getSpeedViolations = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;
    const { limit } = req.query;

    const result = await SpeedLimitService.getSpeedViolations(
      bikeId, 
      limit ? parseInt(limit, 10) : 50
    );
    
    if (result.success) {
      res.json({ 
        bikeId,
        violations: result.violations,
        count: result.violations.length
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: result.error });
    }
  });

  /**
   * Get speed limit history for a bike
   * GET /api/bikes/:bikeId/speed-limit-history
   */
  static getSpeedLimitHistory = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;
    const { limit } = req.query;

    const result = await SpeedLimitService.getSpeedLimitHistory(
      bikeId, 
      limit ? parseInt(limit, 10) : 50
    );
    
    if (result.success) {
      res.json({ 
        bikeId,
        history: result.history,
        count: result.history.length
      });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: result.error });
    }
  });

  /**
   * Remove speed limit for a bike
   * DELETE /api/bikes/:bikeId/speed-limit
   */
  static removeSpeedLimit = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;

    const result = await SpeedLimitService.removeSpeedLimit(bikeId);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      const statusCode = result.error.includes('not found') 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get speed violations summary for all bikes
   * GET /api/speed-violations/summary
   */
  static getSpeedViolationsSummary = asyncHandler(async (req, res) => {
    try {
      const bikesResult = await SpeedLimitService.getAllBikesSpeedLimits();
      
      if (!bikesResult.success) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
          error: bikesResult.error 
        });
      }

      const bikes = bikesResult.bikesWithSpeedLimits;
      const summary = {
        totalBikes: bikes.length,
        bikesWithSpeedLimits: bikes.filter(b => b.speedLimit !== null).length,
        bikesWithoutSpeedLimits: bikes.filter(b => b.speedLimit === null).length,
        currentViolations: bikes.filter(b => b.isSpeedExceeded).length,
        activeBikes: bikes.filter(b => b.status === 'active').length,
        violations: bikes.filter(b => b.isSpeedExceeded).map(bike => ({
          bikeId: bike.bikeId,
          currentSpeed: bike.currentSpeed,
          speedLimit: bike.speedLimit,
          exceedBy: Math.round((bike.currentSpeed - bike.speedLimit) * 100) / 100
        }))
      };

      res.json({ summary });
    } catch (error) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ 
        error: 'Error generating speed violations summary' 
      });
    }
  });
}

module.exports = SpeedLimitController;