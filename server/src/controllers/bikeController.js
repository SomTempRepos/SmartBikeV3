const BikeService = require('../services/bikeService');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

class BikeController {
  /**
   * Receive data from ESP32/ESP32-simulator
   * POST /api/bike/data
   */
  static receiveData = asyncHandler(async (req, res) => {
    const result = await BikeService.processBikeData(req.body);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      const statusCode = result.error.includes('Invalid data') 
        ? HTTP_STATUS.BAD_REQUEST 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get all bikes
   * GET /api/bikes
   */
  static getAllBikes = asyncHandler(async (req, res) => {
    const result = await BikeService.getAllBikes();
    
    if (result.success) {
      res.json({ bikes: result.bikes });
    } else {
      const statusCode = result.error.includes('not found') 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get bike by ID
   * GET /api/bikes/:bikeId
   */
  static getBikeById = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;
    const result = await BikeService.getBikeById(bikeId);
    
    if (result.success) {
      res.json({ bike: result.bike });
    } else {
      const statusCode = result.error.includes('not found') 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get latest bike data
   * GET /api/bikes/:bikeId/latest
   */
  static getLatestBikeData = asyncHandler(async (req, res) => {
    const { bikeId } = req.params;
    const result = await BikeService.getLatestBikeData(bikeId);
    
    if (result.success) {
      res.json({ latestData: result.latestData });
    } else {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: result.error });
    }
  });
}

module.exports = BikeController;