const GuardianService = require('../services/guardianService');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

class GuardianController {
  /**
   * Get guardian data for logged-in user
   * GET /api/guardian/me (protected)
   */
  static getGuardianProfile = asyncHandler(async (req, res) => {
    const result = await GuardianService.getOrCreateGuardian(req.user);
    
    if (result.success) {
      res.json({ guardian: result.guardian });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: result.error });
    }
  });

  /**
   * Get all guardians
   * GET /api/guardians
   */
  static getAllGuardians = asyncHandler(async (req, res) => {
    const result = await GuardianService.getAllGuardians();
    
    if (result.success) {
      res.json({ guardians: result.guardians });
    } else {
      const statusCode = result.error.includes('not found') 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get ranks data
   * GET /api/ranks
   */
  static getRanks = asyncHandler(async (req, res) => {
    const result = await GuardianService.getRanks();
    
    if (result.success) {
      res.json({ ranks: result.ranks });
    } else {
      const statusCode = result.error.includes('not found') 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get bikes for logged-in guardian
   * GET /api/guardian/bikes (protected)
   */
  static getGuardianBikes = asyncHandler(async (req, res) => {
    const result = await GuardianService.getBikesByUserId(req.user.id);
    
    if (result.success) {
      res.json({ bikes: result.bikes });
    } else {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: result.error });
    }
  });
}

module.exports = GuardianController;