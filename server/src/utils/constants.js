// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// Default values
const DEFAULTS = {
  JWT_EXPIRY: '1h',
  BCRYPT_ROUNDS: 10,
  DEFAULT_LOCATION: {
    lat: 19.0760,
    lng: 72.8777
  }
};

// Error messages
const ERROR_MESSAGES = {
  // Auth errors
  NO_TOKEN: 'No token provided',
  MALFORMED_TOKEN: 'Malformed token',
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_CREDENTIALS: 'Invalid credentials',
  EMAIL_EXISTS: 'Email already registered',
  ALL_FIELDS_REQUIRED: 'All fields are required',
  PASSWORD_REQUIRED: 'Password required',
  EMAIL_OR_MOBILE_REQUIRED: 'Email or mobile number required',
  
  // General errors
  USER_NOT_FOUND: 'User not found',
  SERVER_ERROR: 'Server error',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  
  // Bike errors
  INVALID_DATA_FORMAT: 'Invalid data format. Required: bikeId, data',
  INVALID_DATA_STRUCTURE: 'Invalid data structure. Required: avgSpeed, location, battery',
  BIKE_NOT_FOUND: 'Bike not found',
  NO_DATA_FOR_DATE: 'No data found for this date',
  NO_DATA_FOR_BIKE: 'No data found for this bike today',
  NO_DATA_TODAY: 'No data found for today',
  
  // Guardian/Ward errors
  GUARDIAN_NOT_FOUND: 'Guardian not found',
  RANKS_NOT_FOUND: 'Ranks data not found',
  GUARDIANS_NOT_FOUND: 'Guardians data not found',
  BIKES_NOT_FOUND: 'Bikes data not found'
};

// Success messages
const SUCCESS_MESSAGES = {
  DATA_RECEIVED: 'data received',
  WARD_ADDED: 'Ward added successfully'
};

// File extensions
const FILE_EXTENSIONS = {
  JSON: '.json'
};

// Date formats
const DATE_FORMATS = {
  DAILY_FILE: 'YYYY-MM-DD'
};

module.exports = {
  HTTP_STATUS,
  DEFAULTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FILE_EXTENSIONS,
  DATE_FORMATS
};