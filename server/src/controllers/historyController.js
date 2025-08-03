const BikeService = require('../services/bikeService');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

class HistoryController {
  /**
   * Get historical data for a specific date
   * GET /api/history/:date
   */
  static getHistoryByDate = asyncHandler(async (req, res) => {
    const { date } = req.params;
    
    const result = await BikeService.getHistoricalData(date);
    
    if (result.success) {
      res.json({ 
        date: result.date, 
        data: result.data 
      });
    } else {
      res.status(HTTP_STATUS.NOT_FOUND).json({ error: result.error });
    }
  });

  /**
   * Get list of available dates for historical data
   * GET /api/history
   */
  static getAvailableDates = asyncHandler(async (req, res) => {
    const result = await BikeService.getAvailableDates();
    
    if (result.success) {
      res.json({ availableDates: result.availableDates });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: result.error });
    }
  });
}

module.exports = HistoryController;