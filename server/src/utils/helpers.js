const moment = require('moment');
const { DATE_FORMATS } = require('./constants');

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
const getCurrentDate = () => {
  return moment().format(DATE_FORMATS.DAILY_FILE);
};

/**
 * Get current ISO timestamp
 * @returns {string} - ISO timestamp
 */
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Generate unique ID with prefix and padding
 * @param {string} prefix - ID prefix (e.g., 'G', 'W', 'BIKE')
 * @param {number} count - Current count for padding
 * @param {number} padding - Number of digits for padding (default: 3)
 * @returns {string} - Generated ID
 */
const generateId = (prefix, count, padding = 3) => {
  return `${prefix}${String(count).padStart(padding, '0')}`;
};

/**
 * Get next user ID from users array
 * @param {Array} users - Array of user objects
 * @returns {number} - Next available user ID
 */
const getNextUserId = (users) => {
  return users.length ? Math.max(...users.map(u => u.id)) + 1 : 1;
};

/**
 * Validate required fields in an object
 * @param {object} obj - Object to validate
 * @param {string[]} requiredFields - Array of required field names
 * @returns {object} - { isValid: boolean, missingFields: string[] }
 */
const validateRequiredFields = (obj, requiredFields) => {
  const missingFields = requiredFields.filter(field => !obj[field]);
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Log formatted message with timestamp
 * @param {string} level - Log level (info, error, warn)
 * @param {string} message - Message to log
 * @param {object} data - Additional data to log
 */
const logMessage = (level, message, data = null) => {
  const timestamp = getCurrentTimestamp();
  const logData = data ? JSON.stringify(data, null, 2) : '';
  console[level](`[${timestamp}] ${message}${logData ? '\n' + logData : ''}`);
};

/**
 * Parse float with fallback
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value (default: 0)
 * @returns {number} - Parsed float or fallback
 */
const parseFloatSafe = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Parse int with fallback
 * @param {any} value - Value to parse
 * @param {number} fallback - Fallback value (default: 0)
 * @returns {number} - Parsed int or fallback
 */
const parseIntSafe = (value, fallback = 0) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Create enriched data object with timestamps
 * @param {object} data - Original data
 * @returns {object} - Enriched data with timestamps
 */
const enrichDataWithTimestamps = (data) => {
  const now = new Date();
  return {
    ...data,
    timestamp: now.toISOString(),
    serverTimestamp: now.toISOString(),
    receivedAt: now.getTime()
  };
};

module.exports = {
  getCurrentDate,
  getCurrentTimestamp,
  generateId,
  getNextUserId,
  validateRequiredFields,
  logMessage,
  parseFloatSafe,
  parseIntSafe,
  enrichDataWithTimestamps
};