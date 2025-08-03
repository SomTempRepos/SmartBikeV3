const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config/environment');
const FileManager = require('../utils/fileManager');
const { getNextUserId, validateRequiredFields } = require('../utils/helpers');
const { DEFAULTS, ERROR_MESSAGES } = require('../utils/constants');

class AuthService {
  /**
   * Create JWT token for user
   * @param {object} user - User object
   * @returns {string} - JWT token
   */
  static createToken(user) {
    return jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      config.JWT_SECRET,
      { expiresIn: DEFAULTS.JWT_EXPIRY }
    );
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, DEFAULTS.BCRYPT_ROUNDS);
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} - True if passwords match
   */
  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Authenticate user with email/mobile and password
   * @param {object} credentials - { email?, mobile?, password }
   * @returns {Promise<object>} - { success: boolean, user?: object, token?: string, error?: string }
   */
  static async authenticateUser(credentials) {
    const { email, mobile, password } = credentials;

    // Validate input
    if (!password) {
      return { success: false, error: ERROR_MESSAGES.PASSWORD_REQUIRED };
    }

    if (!email && !mobile) {
      return { success: false, error: ERROR_MESSAGES.EMAIL_OR_MOBILE_REQUIRED };
    }

    try {
      const users = await FileManager.readJson(config.USERS_FILE);
      
      // Find user by email or mobile
      let user;
      if (email) {
        user = users.find(u => u.email === email);
      } else if (mobile) {
        user = users.find(u => u.mobile === mobile);
      }

      if (!user) {
        return { success: false, error: ERROR_MESSAGES.INVALID_CREDENTIALS };
      }

      // Verify password
      const passwordMatch = await this.comparePassword(password, user.password);
      if (!passwordMatch) {
        return { success: false, error: ERROR_MESSAGES.INVALID_CREDENTIALS };
      }

      // Create token
      const token = this.createToken(user);
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      
      return {
        success: true,
        user: userWithoutPassword,
        token
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: ERROR_MESSAGES.SERVER_ERROR };
    }
  }

  /**
   * Register new user
   * @param {object} userData - { name, email, password, mobile }
   * @returns {Promise<object>} - { success: boolean, user?: object, token?: string, error?: string }
   */
  static async registerUser(userData) {
    const { name, email, password, mobile } = userData;

    // Validate required fields
    const validation = validateRequiredFields(userData, ['name', 'email', 'password', 'mobile']);
    if (!validation.isValid) {
      return { success: false, error: ERROR_MESSAGES.ALL_FIELDS_REQUIRED };
    }

    try {
      const users = await FileManager.readJson(config.USERS_FILE);

      // Check if email already exists
      if (users.find(u => u.email === email)) {
        return { success: false, error: ERROR_MESSAGES.EMAIL_EXISTS };
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create new user
      const newUser = {
        id: getNextUserId(users),
        name,
        email,
        password: hashedPassword,
        mobile
      };

      // Save user
      users.push(newUser);
      await FileManager.writeJson(config.USERS_FILE, users, { spaces: 2 });

      // Create token
      const token = this.createToken(newUser);

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;

      return {
        success: true,
        user: userWithoutPassword,
        token
      };

    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: ERROR_MESSAGES.SERVER_ERROR };
    }
  }

  /**
   * Get user by ID
   * @param {number} userId - User ID
   * @returns {Promise<object>} - { success: boolean, user?: object, error?: string }
   */
  static async getUserById(userId) {
    try {
      const users = await FileManager.readJson(config.USERS_FILE);
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        return { success: false, error: ERROR_MESSAGES.USER_NOT_FOUND };
      }

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      
      return { success: true, user: userWithoutPassword };

    } catch (error) {
      console.error('Get user error:', error);
      return { success: false, error: ERROR_MESSAGES.SERVER_ERROR };
    }
  }
}

module.exports = AuthService;