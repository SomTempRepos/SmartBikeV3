const AuthService = require('../services/authService');
const { HTTP_STATUS } = require('../utils/constants');
const { asyncHandler } = require('../middleware/errorHandler');

class AuthController {
  /**
   * Handle user login
   * POST /api/login
   */
  static login = asyncHandler(async (req, res) => {
    const { email, mobile, password } = req.body;
    
    const result = await AuthService.authenticateUser({ email, mobile, password });
    
    if (result.success) {
      res.json({
        token: result.token,
        user: result.user
      });
    } else {
      const statusCode = result.error.includes('credentials') 
        ? HTTP_STATUS.UNAUTHORIZED 
        : HTTP_STATUS.BAD_REQUEST;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Handle user registration
   * POST /api/signup
   */
  static signup = asyncHandler(async (req, res) => {
    const { name, email, password, mobile } = req.body;
    
    const result = await AuthService.registerUser({ name, email, password, mobile });
    
    if (result.success) {
      res.status(HTTP_STATUS.CREATED).json({
        token: result.token,
        user: result.user
      });
    } else {
      const statusCode = result.error.includes('already registered') 
        ? HTTP_STATUS.CONFLICT 
        : HTTP_STATUS.BAD_REQUEST;
      
      res.status(statusCode).json({ error: result.error });
    }
  });

  /**
   * Get current user profile
   * GET /api/me (protected)
   */
  static getProfile = asyncHandler(async (req, res) => {
    const result = await AuthService.getUserById(req.user.id);
    
    if (result.success) {
      res.json(result.user);
    } else {
      const statusCode = result.error.includes('not found') 
        ? HTTP_STATUS.NOT_FOUND 
        : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      
      res.status(statusCode).json({ error: result.error });
    }
  });
}

module.exports = AuthController;