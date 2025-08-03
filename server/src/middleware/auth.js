const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user data to request
 */
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      error: ERROR_MESSAGES.NO_TOKEN 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      error: ERROR_MESSAGES.MALFORMED_TOKEN 
    });
  }
  
  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ 
        error: ERROR_MESSAGES.INVALID_TOKEN 
      });
    }
    
    req.user = user;
    next();
  });
};

module.exports = {
  authenticateJWT
};