const GuardianService = require('../services/guardianService');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

class WardController {
  /**
   * Add a new ward
   * POST /api/guardian/wards (protected)
   */
  static addWard = asyncHandler(async (req, res) => {
    const { name, age, grade, bikeName } = req.body;
    
    const result = await GuardianService.addWard(req.user.id, { name, age, grade, bikeName });
    
    if (result.success) {
      res.status(HTTP_STATUS.CREATED).json({
        message: result.message,
        ward: result.ward,
        bike: result.bike
      });
    } else {
      const statusCode = result.error.includes('required') 
        ? HTTP_STATUS.BAD_REQUEST 
        : result.error.includes('not found')
        ? HTTP_STATUS.NOT_FOUND
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get wards for logged-in guardian
   * GET /api/guardian/wards (protected)
   */
  static getWards = asyncHandler(async (req, res) => {
    const result = await GuardianService.getWardsByUserId(req.user.id);
    
    if (result.success) {
      res.json({ wards: result.wards });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: result.error });
    }
  });
}

module.exports = WardController;