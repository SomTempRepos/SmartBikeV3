const config = require('../config/environment');
const FileManager = require('../utils/fileManager');
const { 
  generateId, 
  getCurrentTimestamp, 
  validateRequiredFields,
  parseIntSafe,
  logMessage 
} = require('../utils/helpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, DEFAULTS } = require('../utils/constants');

class GuardianService {
  /**
   * Get or create guardian for user
   * @param {object} user - User object from JWT
   * @returns {Promise<object>} - { success: boolean, guardian?: object, error?: string }
   */
  static async getOrCreateGuardian(user) {
    try {
      const guardians = await FileManager.readJson(config.GUARDIANS_FILE);
      let guardian = guardians.find(g => g.userId === user.id);

      if (!guardian) {
        // Create new guardian
        guardian = {
          guardianId: generateId('G', guardians.length + 1, 3),
          userId: user.id,
          name: user.name,
          email: user.email,
          phone: user.mobile,
          createdAt: getCurrentTimestamp(),
          status: "active",
          wards: []
        };

        guardians.push(guardian);
        await FileManager.writeJson(config.GUARDIANS_FILE, guardians);
        logMessage('info', `Created new guardian: ${guardian.guardianId}`);
      }

      return { success: true, guardian };

    } catch (error) {
      logMessage('error', 'Error getting/creating guardian:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get all guardians
   * @returns {Promise<object>} - { success: boolean, guardians?: array, error?: string }
   */
  static async getAllGuardians() {
    try {
      if (await FileManager.exists(config.GUARDIANS_FILE)) {
        const guardians = await FileManager.readJson(config.GUARDIANS_FILE);
        return { success: true, guardians };
      } else {
        return { success: false, error: ERROR_MESSAGES.GUARDIANS_NOT_FOUND };
      }
    } catch (error) {
      logMessage('error', 'Error retrieving guardians:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Add a new ward to guardian
   * @param {number} userId - User ID from JWT
   * @param {object} wardData - { name, age, grade, bikeName }
   * @returns {Promise<object>} - { success: boolean, ward?: object, bike?: object, error?: string }
   */
  static async addWard(userId, wardData) {
    const { name, age, grade, bikeName } = wardData;

    // Validate required fields
    const validation = validateRequiredFields(wardData, ['name', 'age', 'grade', 'bikeName']);
    if (!validation.isValid) {
      return { success: false, error: ERROR_MESSAGES.ALL_FIELDS_REQUIRED };
    }

    try {
      const guardians = await FileManager.readJson(config.GUARDIANS_FILE);
      const guardianIndex = guardians.findIndex(g => g.userId === userId);

      if (guardianIndex === -1) {
        return { success: false, error: ERROR_MESSAGES.GUARDIAN_NOT_FOUND };
      }

      const guardian = guardians[guardianIndex];
      
      // Generate IDs
      const wardId = generateId('W', guardian.wards.length + 1, 3);
      const bikeId = generateId('BIKE', guardian.wards.length + 1, 3);

      // Create new ward
      const newWard = {
        wardId,
        name,
        age: parseIntSafe(age),
        grade,
        bikeId,
        bikeName,
        createdAt: getCurrentTimestamp(),
        status: "active"
      };

      // Add ward to guardian
      guardians[guardianIndex].wards.push(newWard);
      await FileManager.writeJson(config.GUARDIANS_FILE, guardians);

      // Create corresponding bike entry
      const bikeResult = await this.createBikeForWard(newWard, guardian);

      if (!bikeResult.success) {
        // Rollback ward creation if bike creation fails
        guardians[guardianIndex].wards.pop();
        await FileManager.writeJson(config.GUARDIANS_FILE, guardians);
        return bikeResult;
      }

      logMessage('info', `Added ward ${wardId} to guardian ${guardian.guardianId}`);

      return {
        success: true,
        message: SUCCESS_MESSAGES.WARD_ADDED,
        ward: newWard,
        bike: bikeResult.bike
      };

    } catch (error) {
      logMessage('error', 'Error adding ward:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Create bike entry for ward
   * @param {object} ward - Ward object
   * @param {object} guardian - Guardian object
   * @returns {Promise<object>} - { success: boolean, bike?: object, error?: string }
   */
  static async createBikeForWard(ward, guardian) {
    try {
      let bikes = [];
      if (await FileManager.exists(config.BIKES_FILE)) {
        bikes = await FileManager.readJson(config.BIKES_FILE);
      }

      const newBike = {
        bikeId: ward.bikeId,
        wardId: ward.wardId,
        guardianId: guardian.guardianId,
        bikeName: ward.bikeName,
        wardName: ward.name,
        guardianName: guardian.name,
        status: "active",
        lastSeen: getCurrentTimestamp(),
        totalDistance: 0,
        totalRides: 0,
        avgSpeed: 0,
        batteryLevel: 100,
        currentLocation: DEFAULTS.DEFAULT_LOCATION
      };

      bikes.push(newBike);
      await FileManager.writeJson(config.BIKES_FILE, bikes);

      logMessage('info', `Created bike ${ward.bikeId} for ward ${ward.wardId}`);

      return { success: true, bike: newBike };

    } catch (error) {
      logMessage('error', 'Error creating bike for ward:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get wards for guardian by user ID
   * @param {number} userId - User ID
   * @returns {Promise<object>} - { success: boolean, wards?: array, error?: string }
   */
  static async getWardsByUserId(userId) {
    try {
      const guardians = await FileManager.readJson(config.GUARDIANS_FILE);
      const guardian = guardians.find(g => g.userId === userId);

      if (guardian) {
        return { success: true, wards: guardian.wards };
      } else {
        return { success: true, wards: [] };
      }

    } catch (error) {
      logMessage('error', 'Error retrieving wards:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get bikes for guardian by user ID  
   * @param {number} userId - User ID
   * @returns {Promise<object>} - { success: boolean, bikes?: array, error?: string }
   */
  static async getBikesByUserId(userId) {
    try {
      const guardians = await FileManager.readJson(config.GUARDIANS_FILE);
      const guardian = guardians.find(g => g.userId === userId);

      if (!guardian) {
        return { success: true, bikes: [] };
      }

      if (await FileManager.exists(config.BIKES_FILE)) {
        const bikes = await FileManager.readJson(config.BIKES_FILE);
        const guardianBikes = bikes.filter(bike => bike.guardianId === guardian.guardianId);
        return { success: true, bikes: guardianBikes };
      } else {
        return { success: true, bikes: [] };
      }

    } catch (error) {
      logMessage('error', 'Error retrieving guardian bikes:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get ranks data
   * @returns {Promise<object>} - { success: boolean, ranks?: array, error?: string }
   */
  static async getRanks() {
    try {
      if (await FileManager.exists(config.RANKS_FILE)) {
        const ranks = await FileManager.readJson(config.RANKS_FILE);
        return { success: true, ranks };
      } else {
        return { success: false, error: ERROR_MESSAGES.RANKS_NOT_FOUND };
      }
    } catch (error) {
      logMessage('error', 'Error retrieving ranks:', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }
}

module.exports = GuardianService;