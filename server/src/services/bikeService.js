// const path = require('path');
// const moment = require('moment');
// const config = require('../config/environment');
// const FileManager = require('../utils/fileManager');
// const socketService = require('./socketService');
// const geofencingService = require('./geofencingService');
// const { 
//   getCurrentDate, 
//   getCurrentTimestamp, 
//   enrichDataWithTimestamps,
//   parseFloatSafe,
//   logMessage 
// } = require('../utils/helpers');
// const { ERROR_MESSAGES, SUCCESS_MESSAGES, DATE_FORMATS } = require('../utils/constants');

// class BikeService {
//   /**
//    * Process and store bike data from ESP32/simulator
//    * @param {object} rawData - Raw bike data
//    * @returns {Promise<object>} - { success: boolean, message?: string, error?: string }
//    */
//   static async processBikeData(rawData) {
//     try {
//       // Validate incoming data structure
//       const validation = this.validateBikeData(rawData);
//       if (!validation.isValid) {
//         return { success: false, error: validation.error };
//       }

//       // Enrich data with timestamps
//       const enrichedData = enrichDataWithTimestamps(rawData);

//       // Process geofencing and create alerts if needed - SINGLE SOURCE OF TRUTH
//       const geofenceResult = await geofencingService.processBikeUpdate(rawData.bikeId, rawData.data);

//       // Save to daily log
//       await this.saveToDailyLog(enrichedData);

//       // Update bike status with the SAME geofencing result from above
//       const bikeWithGeofencing = await this.updateBikeStatusWithGeofencing(rawData, geofenceResult.geofenceResult);

//       // Broadcast to connected clients with geofencing info
//       socketService.broadcastBikeData({
//         ...enrichedData,
//         geofencing: {
//           isOutsideFence: geofenceResult.geofenceResult.isOutsideFence,
//           distanceFromBase: geofenceResult.geofenceResult.distanceFromBase,
//           geofenceId: geofenceResult.geofenceResult.geofenceId
//         }
//       });

//       // Broadcast alert if generated
//       if (geofenceResult.alert) {
//         socketService.broadcastGeofenceAlert(geofenceResult.alert);
//       }

//       logMessage('info', `Data received from ${rawData.bikeId}`, {
//         speed: rawData.data.avgSpeed,
//         location: rawData.data.location,
//         battery: rawData.data.battery,
//         isOutsideFence: geofenceResult.geofenceResult.isOutsideFence,
//         distanceFromBase: geofenceResult.geofenceResult.distanceFromBase
//       });

//       return { 
//         success: true, 
//         message: SUCCESS_MESSAGES.DATA_RECEIVED,
//         geofencing: geofenceResult.geofenceResult,
//         alert: geofenceResult.alert
//       };

//     } catch (error) {
//       logMessage('error', 'Error processing bike data:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }

//   /**
//    * Validate bike data structure
//    * @param {object} data - Bike data to validate
//    * @returns {object} - { isValid: boolean, error?: string }
//    */
//   static validateBikeData(data) {
//     if (!data || !data.bikeId || !data.data) {
//       return { 
//         isValid: false, 
//         error: ERROR_MESSAGES.INVALID_DATA_FORMAT 
//       };
//     }

//     if (!data.data.avgSpeed || !data.data.location || !data.data.battery) {
//       return { 
//         isValid: false, 
//         error: ERROR_MESSAGES.INVALID_DATA_STRUCTURE 
//       };
//     }

//     return { isValid: true };
//   }

//   /**
//    * Update bike status in bikes.json with provided geofencing result
//    * @param {object} bikeData - Bike data
//    * @param {object} geofenceResult - Pre-calculated geofencing result from geofencingService
//    */
//   static async updateBikeStatusWithGeofencing(bikeData, geofenceResult) {
//     try {
//       let bikes = [];
//       if (await FileManager.exists(config.BIKES_FILE)) {
//         bikes = await FileManager.readJson(config.BIKES_FILE);
//       }

//       const bikeIndex = bikes.findIndex(bike => bike.bikeId === bikeData.bikeId);
//       const currentTimestamp = getCurrentTimestamp();

//       const updatedBike = {
//         bikeId: bikeData.bikeId,
//         lastSeen: currentTimestamp,
//         currentLocation: bikeData.data.location,
//         avgSpeed: parseFloatSafe(bikeData.data.avgSpeed),
//         batteryLevel: parseFloatSafe(bikeData.data.battery),
//         status: "active",
//         // Use the provided geofencing result - NO CALCULATION HERE
//         isOutsideFence: geofenceResult.isOutsideFence,
//         distanceFromBase: geofenceResult.distanceFromBase,
//         geofenceId: geofenceResult.geofenceId
//       };

//       if (bikeIndex !== -1) {
//         // Update existing bike
//         bikes[bikeIndex] = { ...bikes[bikeIndex], ...updatedBike };
//       } else {
//         // Create new bike entry
//         updatedBike.createdAt = currentTimestamp;
//         bikes.push(updatedBike);
//       }

//       await FileManager.writeJson(config.BIKES_FILE, bikes);
//       logMessage('info', `Updated bike ${bikeData.bikeId} in bikes.json with geofencing`, {
//         isOutsideFence: geofenceResult.isOutsideFence,
//         distanceFromBase: geofenceResult.distanceFromBase
//       });

//       return updatedBike;

//     } catch (error) {
//       logMessage('error', 'Error updating bike status:', error);
//       throw error;
//     }
//   }

//   /**
//    * Save bike data to daily log file
//    * @param {object} enrichedData - Enriched bike data
//    */
//   static async saveToDailyLog(enrichedData) {
//     try {
//       const today = getCurrentDate();
//       const dailyFile = path.join(config.DAILY_DIR, `${today}.json`);

//       let dailyData = [];
//       if (await FileManager.exists(dailyFile)) {
//         dailyData = await FileManager.readJson(dailyFile);
//       }

//       dailyData.push(enrichedData);
//       await FileManager.writeJson(dailyFile, dailyData);
      
//       logMessage('info', `Saved data to daily log: ${dailyFile}`);

//     } catch (error) {
//       logMessage('error', 'Error saving to daily log:', error);
//       throw error;
//     }
//   }

//   /**
//    * Get all bikes with FRESH geofencing status from geofencingService
//    * @returns {Promise<object>} - { success: boolean, bikes?: array, error?: string }
//    */
//   static async getAllBikes() {
//     try {
//       if (await FileManager.exists(config.BIKES_FILE)) {
//         const bikes = await FileManager.readJson(config.BIKES_FILE);
        
//         // Refresh geofencing status for all bikes using geofencingService ONLY
//         const bikesWithGeofencing = bikes.map(bike => {
//           if (bike.currentLocation) {
//             // Use geofencingService to get fresh calculation
//             const geofenceResult = geofencingService.checkBikeGeofence({
//               location: bike.currentLocation
//             });
            
//             logMessage('debug', `Fresh geofencing for bike ${bike.bikeId}`, {
//               location: bike.currentLocation,
//               isOutsideFence: geofenceResult.isOutsideFence,
//               distanceFromBase: geofenceResult.distanceFromBase
//             });
            
//             return {
//               ...bike,
//               isOutsideFence: geofenceResult.isOutsideFence,
//               distanceFromBase: geofenceResult.distanceFromBase,
//               geofenceId: geofenceResult.geofenceId
//             };
//           }
//           return bike;
//         });

//         return { success: true, bikes: bikesWithGeofencing };
//       } else {
//         return { success: false, error: ERROR_MESSAGES.BIKES_NOT_FOUND };
//       }
//     } catch (error) {
//       logMessage('error', 'Error retrieving bikes:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }

//   /**
//    * Get bike by ID with FRESH geofencing status from geofencingService
//    * @param {string} bikeId - Bike ID
//    * @returns {Promise<object>} - { success: boolean, bike?: object, error?: string }
//    */
//   static async getBikeById(bikeId) {
//     try {
//       if (await FileManager.exists(config.BIKES_FILE)) {
//         const bikes = await FileManager.readJson(config.BIKES_FILE);
//         const bike = bikes.find(b => b.bikeId === bikeId);
        
//         if (bike) {
//           // Add FRESH geofencing status using geofencingService ONLY
//           if (bike.currentLocation) {
//             const geofenceResult = geofencingService.checkBikeGeofence({
//               location: bike.currentLocation
//             });
            
//             logMessage('debug', `Fresh geofencing for bike ${bikeId}`, {
//               location: bike.currentLocation,
//               isOutsideFence: geofenceResult.isOutsideFence,
//               distanceFromBase: geofenceResult.distanceFromBase
//             });
            
//             return { 
//               success: true, 
//               bike: {
//                 ...bike,
//                 isOutsideFence: geofenceResult.isOutsideFence,
//                 distanceFromBase: geofenceResult.distanceFromBase,
//                 geofenceId: geofenceResult.geofenceId
//               }
//             };
//           }
          
//           return { success: true, bike };
//         } else {
//           return { success: false, error: ERROR_MESSAGES.BIKE_NOT_FOUND };
//         }
//       } else {
//         return { success: false, error: ERROR_MESSAGES.BIKES_NOT_FOUND };
//       }
//     } catch (error) {
//       logMessage('error', 'Error retrieving bike:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }

//   /**
//    * Get bikes outside geofence
//    * @returns {Promise<object>} - { success: boolean, bikes?: array, error?: string }
//    */
//   static async getBikesOutsideGeofence() {
//     try {
//       const result = await this.getAllBikes();
//       if (result.success) {
//         const outsideBikes = result.bikes.filter(bike => bike.isOutsideFence);
//         return { success: true, bikes: outsideBikes };
//       }
//       return result;
//     } catch (error) {
//       logMessage('error', 'Error retrieving bikes outside geofence:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }

//   /**
//    * Get bikes inside geofence
//    * @returns {Promise<object>} - { success: boolean, bikes?: array, error?: string }
//    */
//   static async getBikesInsideGeofence() {
//     try {
//       const result = await this.getAllBikes();
//       if (result.success) {
//         const insideBikes = result.bikes.filter(bike => !bike.isOutsideFence);
//         return { success: true, bikes: insideBikes };
//       }
//       return result;
//     } catch (error) {
//       logMessage('error', 'Error retrieving bikes inside geofence:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }

//   /**
//    * Get geofencing summary
//    * @returns {Promise<object>} - { success: boolean, summary?: object, error?: string }
//    */
//   static async getGeofencingSummary() {
//     try {
//       const result = await this.getAllBikes();
//       if (result.success) {
//         const bikes = result.bikes;
//         const inside = bikes.filter(bike => !bike.isOutsideFence);
//         const outside = bikes.filter(bike => bike.isOutsideFence);

//         return {
//           success: true,
//           summary: {
//             total: bikes.length,
//             inside: inside.length,
//             outside: outside.length,
//             insideBikes: inside.map(b => ({ 
//               bikeId: b.bikeId, 
//               distanceFromBase: b.distanceFromBase || 0 
//             })),
//             outsideBikes: outside.map(b => ({ 
//               bikeId: b.bikeId, 
//               distanceFromBase: b.distanceFromBase || 0 
//             }))
//           }
//         };
//       }
//       return result;
//     } catch (error) {
//       logMessage('error', 'Error generating geofencing summary:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }

//   /**
//    * Get latest bike data for a specific bike
//    * @param {string} bikeId - Bike ID
//    * @returns {Promise<object>} - { success: boolean, latestData?: object, error?: string }
//    */
//   static async getLatestBikeData(bikeId) {
//     try {
//       const today = getCurrentDate();
//       const dailyFile = path.join(config.DAILY_DIR, `${today}.json`);

//       if (await FileManager.exists(dailyFile)) {
//         const dailyData = await FileManager.readJson(dailyFile);
//         const bikeData = dailyData
//           .filter(entry => entry.bikeId === bikeId)
//           .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

//         if (bikeData.length > 0) {
//           return { success: true, latestData: bikeData[0] };
//         } else {
//           return { success: false, error: ERROR_MESSAGES.NO_DATA_FOR_BIKE };
//         }
//       } else {
//         return { success: false, error: ERROR_MESSAGES.NO_DATA_TODAY };
//       }
//     } catch (error) {
//       logMessage('error', 'Error retrieving latest bike data:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }

//   /**
//    * Get historical data for a specific date
//    * @param {string} date - Date in YYYY-MM-DD format
//    * @returns {Promise<object>} - { success: boolean, date?: string, data?: array, error?: string }
//    */
//   static async getHistoricalData(date) {
//     try {
//       const historyFile = path.join(config.DAILY_DIR, `${date}.json`);

//       if (await FileManager.exists(historyFile)) {
//         const data = await FileManager.readJson(historyFile);
//         return { success: true, date, data };
//       } else {
//         return { success: false, error: ERROR_MESSAGES.NO_DATA_FOR_DATE };
//       }
//     } catch (error) {
//       logMessage('error', 'Error retrieving historical data:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }

//   /**
//    * Get available dates for historical data
//    * @returns {Promise<object>} - { success: boolean, availableDates?: array, error?: string }
//    */
//   static async getAvailableDates() {
//     try {
//       const files = await FileManager.readDirectory(config.DAILY_DIR);
//       const dates = files
//         .filter(file => file.endsWith('.json'))
//         .map(file => file.replace('.json', ''))
//         .sort();

//       return { success: true, availableDates: dates };
//     } catch (error) {
//       logMessage('error', 'Error listing historical dates:', error);
//       return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
//     }
//   }
// }

// module.exports = BikeService;

const path = require('path');
const moment = require('moment');
const config = require('../config/environment');
const FileManager = require('../utils/fileManager');
const socketService = require('./socketService');
const geofencingService = require('./geofencingService');
const speedLimitService = require('./speedLimitService');
const { 
  getCurrentDate, 
  getCurrentTimestamp, 
  enrichDataWithTimestamps,
  parseFloatSafe,
  logMessage 
} = require('../utils/helpers');
const { ERROR_MESSAGES, SUCCESS_MESSAGES, DATE_FORMATS } = require('../utils/constants');

class BikeService {
  /**
   * Process and store bike data from ESP32/simulator
   * @param {object} rawData - Raw bike data
   * @returns {Promise<object>} - { success: boolean, message?: string, error?: string }
   */
  static async processBikeData(rawData) {
    try {
      logMessage('info', 'BikeService', 'processBikeData', `Processing bike data for ${rawData.bikeId}`, {
        bikeId: rawData.bikeId,
        speed: rawData.data?.avgSpeed,
        location: rawData.data?.location
      });

      // Validate incoming data structure
      const validation = this.validateBikeData(rawData);
      if (!validation.isValid) {
        logMessage('error', 'BikeService', 'processBikeData', 'Data validation failed', validation.error);
        return { success: false, error: validation.error };
      }

      // Enrich data with timestamps
      const enrichedData = enrichDataWithTimestamps(rawData);

      // Process geofencing and create alerts if needed - SINGLE SOURCE OF TRUTH
      const geofenceResult = await geofencingService.processBikeUpdate(rawData.bikeId, rawData.data);

      // Check speed limit violation
      const speedLimitResult = await speedLimitService.checkSpeedViolation(
        rawData.bikeId, 
        rawData.data.avgSpeed
      );

      logMessage('debug', 'BikeService', 'processBikeData', 'Speed limit check completed', {
        bikeId: rawData.bikeId,
        currentSpeed: rawData.data.avgSpeed,
        speedLimit: speedLimitResult.speedLimit,
        isExceeded: speedLimitResult.isExceeded
      });

      // Save to daily log
      await this.saveToDailyLog(enrichedData);

      // Update bike status with the SAME geofencing result from above
      const bikeWithGeofencing = await this.updateBikeStatusWithGeofencing(
        rawData, 
        geofenceResult.geofenceResult,
        speedLimitResult
      );

      // Prepare data for broadcasting
      const broadcastData = {
        ...enrichedData,
        geofencing: {
          isOutsideFence: geofenceResult.geofenceResult.isOutsideFence,
          distanceFromBase: geofenceResult.geofenceResult.distanceFromBase,
          geofenceId: geofenceResult.geofenceResult.geofenceId
        },
        speedLimit: {
          limit: speedLimitResult.speedLimit,
          isExceeded: speedLimitResult.isExceeded,
          violation: speedLimitResult.violation
        }
      };

      // Broadcast to connected clients with geofencing and speed limit info
      socketService.broadcastBikeData(broadcastData);

      // Broadcast geofence alert if generated
      if (geofenceResult.alert) {
        socketService.broadcastGeofenceAlert(geofenceResult.alert);
      }

      // Broadcast speed limit violation if detected
      if (speedLimitResult.isExceeded && speedLimitResult.violation) {
        socketService.broadcast('speedLimitViolation', {
          bikeId: rawData.bikeId,
          violation: speedLimitResult.violation,
          timestamp: getCurrentTimestamp()
        });

        logMessage('warn', 'BikeService', 'processBikeData', 'Speed limit violation detected', {
          bikeId: rawData.bikeId,
          currentSpeed: speedLimitResult.currentSpeed,
          speedLimit: speedLimitResult.speedLimit,
          excess: speedLimitResult.violation.excess
        });
      }

      logMessage('info', 'BikeService', 'processBikeData', `Data processed successfully for ${rawData.bikeId}`, {
        speed: rawData.data.avgSpeed,
        location: rawData.data.location,
        battery: rawData.data.battery,
        isOutsideFence: geofenceResult.geofenceResult.isOutsideFence,
        distanceFromBase: geofenceResult.geofenceResult.distanceFromBase,
        speedLimitExceeded: speedLimitResult.isExceeded
      });

      return { 
        success: true, 
        message: SUCCESS_MESSAGES.DATA_RECEIVED,
        geofencing: geofenceResult.geofenceResult,
        geofenceAlert: geofenceResult.alert,
        speedLimit: speedLimitResult
      };

    } catch (error) {
      logMessage('error', 'BikeService', 'processBikeData', 'Error processing bike data', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Validate bike data structure
   * @param {object} data - Bike data to validate
   * @returns {object} - { isValid: boolean, error?: string }
   */
  static validateBikeData(data) {
    logMessage('debug', 'BikeService', 'validateBikeData', 'Validating bike data structure');

    if (!data || !data.bikeId || !data.data) {
      return { 
        isValid: false, 
        error: ERROR_MESSAGES.INVALID_DATA_FORMAT 
      };
    }

    if (!data.data.avgSpeed || !data.data.location || !data.data.battery) {
      return { 
        isValid: false, 
        error: ERROR_MESSAGES.INVALID_DATA_STRUCTURE 
      };
    }

    // Validate speed is a valid number
    const speed = parseFloatSafe(data.data.avgSpeed);
    if (speed === null || speed < 0) {
      return {
        isValid: false,
        error: 'Invalid speed value'
      };
    }

    logMessage('debug', 'BikeService', 'validateBikeData', 'Data validation passed');
    return { isValid: true };
  }

  /**
   * Update bike status in bikes.json with provided geofencing result and speed limit info
   * @param {object} bikeData - Bike data
   * @param {object} geofenceResult - Pre-calculated geofencing result from geofencingService
   * @param {object} speedLimitResult - Speed limit check result
   */
  static async updateBikeStatusWithGeofencing(bikeData, geofenceResult, speedLimitResult) {
    try {
      logMessage('debug', 'BikeService', 'updateBikeStatusWithGeofencing', `Updating bike status for ${bikeData.bikeId}`);

      let bikes = [];
      if (await FileManager.exists(config.BIKES_FILE)) {
        bikes = await FileManager.readJson(config.BIKES_FILE);
      }

      const bikeIndex = bikes.findIndex(bike => bike.bikeId === bikeData.bikeId);
      const currentTimestamp = getCurrentTimestamp();

      const updatedBike = {
        bikeId: bikeData.bikeId,
        lastSeen: currentTimestamp,
        currentLocation: bikeData.data.location,
        avgSpeed: parseFloatSafe(bikeData.data.avgSpeed),
        batteryLevel: parseFloatSafe(bikeData.data.battery),
        status: "active",
        // Use the provided geofencing result - NO CALCULATION HERE
        isOutsideFence: geofenceResult.isOutsideFence,
        distanceFromBase: geofenceResult.distanceFromBase,
        geofenceId: geofenceResult.geofenceId,
        // Add speed limit information
        speedLimit: speedLimitResult.speedLimit,
        isSpeedExceeded: speedLimitResult.isExceeded,
        lastSpeedViolation: speedLimitResult.isExceeded ? currentTimestamp : null
      };

      if (bikeIndex !== -1) {
        // Update existing bike
        bikes[bikeIndex] = { ...bikes[bikeIndex], ...updatedBike };
        logMessage('debug', 'BikeService', 'updateBikeStatusWithGeofencing', `Updated existing bike ${bikeData.bikeId}`);
      } else {
        // Create new bike entry
        updatedBike.createdAt = currentTimestamp;
        bikes.push(updatedBike);
        logMessage('debug', 'BikeService', 'updateBikeStatusWithGeofencing', `Created new bike entry for ${bikeData.bikeId}`);
      }

      await FileManager.writeJson(config.BIKES_FILE, bikes);
      
      logMessage('info', 'BikeService', 'updateBikeStatusWithGeofencing', `Updated bike ${bikeData.bikeId} in bikes.json`, {
        isOutsideFence: geofenceResult.isOutsideFence,
        distanceFromBase: geofenceResult.distanceFromBase,
        speedLimit: speedLimitResult.speedLimit,
        isSpeedExceeded: speedLimitResult.isExceeded
      });

      return updatedBike;

    } catch (error) {
      logMessage('error', 'BikeService', 'updateBikeStatusWithGeofencing', 'Error updating bike status', error);
      throw error;
    }
  }

  /**
   * Save bike data to daily log file
   * @param {object} enrichedData - Enriched bike data
   */
  static async saveToDailyLog(enrichedData) {
    try {
      const today = getCurrentDate();
      const dailyFile = path.join(config.DAILY_DIR, `${today}.json`);

      logMessage('debug', 'BikeService', 'saveToDailyLog', `Saving data to daily log: ${dailyFile}`);

      let dailyData = [];
      if (await FileManager.exists(dailyFile)) {
        dailyData = await FileManager.readJson(dailyFile);
      }

      dailyData.push(enrichedData);
      await FileManager.writeJson(dailyFile, dailyData);
      
      logMessage('info', 'BikeService', 'saveToDailyLog', `Saved data to daily log: ${dailyFile}`);

    } catch (error) {
      logMessage('error', 'BikeService', 'saveToDailyLog', 'Error saving to daily log', error);
      throw error;
    }
  }

  /**
   * Get all bikes with FRESH geofencing status and speed limits from services
   * @returns {Promise<object>} - { success: boolean, bikes?: array, error?: string }
   */
  static async getAllBikes() {
    try {
      logMessage('debug', 'BikeService', 'getAllBikes', 'Getting all bikes with fresh data');

      if (await FileManager.exists(config.BIKES_FILE)) {
        const bikes = await FileManager.readJson(config.BIKES_FILE);
        
        // Refresh geofencing status and speed limits for all bikes using services ONLY
        const bikesWithFreshData = await Promise.all(bikes.map(async (bike) => {
          let updatedBike = { ...bike };

          if (bike.currentLocation) {
            // Use geofencingService to get fresh calculation
            const geofenceResult = geofencingService.checkBikeGeofence({
              location: bike.currentLocation
            });
            
            // Get fresh speed limit data
            const speedLimitResult = await speedLimitService.getSpeedLimit(bike.bikeId);
            
            logMessage('debug', 'BikeService', 'getAllBikes', `Fresh data for bike ${bike.bikeId}`, {
              location: bike.currentLocation,
              isOutsideFence: geofenceResult.isOutsideFence,
              distanceFromBase: geofenceResult.distanceFromBase,
              speedLimit: speedLimitResult.speedLimit?.speedLimit
            });
            
            updatedBike = {
              ...updatedBike,
              isOutsideFence: geofenceResult.isOutsideFence,
              distanceFromBase: geofenceResult.distanceFromBase,
              geofenceId: geofenceResult.geofenceId,
              speedLimit: speedLimitResult.speedLimit?.speedLimit || 50,
              speedLimitSetAt: speedLimitResult.speedLimit?.setAt,
              speedLimitSetBy: speedLimitResult.speedLimit?.setBy
            };
          }
          return updatedBike;
        }));

        logMessage('info', 'BikeService', 'getAllBikes', `Retrieved ${bikesWithFreshData.length} bikes with fresh data`);
        return { success: true, bikes: bikesWithFreshData };
      } else {
        logMessage('debug', 'BikeService', 'getAllBikes', 'Bikes file not found');
        return { success: false, error: ERROR_MESSAGES.BIKES_NOT_FOUND };
      }
    } catch (error) {
      logMessage('error', 'BikeService', 'getAllBikes', 'Error retrieving bikes', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get bike by ID with FRESH geofencing status and speed limit from services
   * @param {string} bikeId - Bike ID
   * @returns {Promise<object>} - { success: boolean, bike?: object, error?: string }
   */
  static async getBikeById(bikeId) {
    try {
      logMessage('debug', 'BikeService', 'getBikeById', `Getting bike ${bikeId} with fresh data`);

      if (await FileManager.exists(config.BIKES_FILE)) {
        const bikes = await FileManager.readJson(config.BIKES_FILE);
        const bike = bikes.find(b => b.bikeId === bikeId);
        
        if (bike) {
          let updatedBike = { ...bike };

          // Add FRESH geofencing status and speed limit using services ONLY
          if (bike.currentLocation) {
            const geofenceResult = geofencingService.checkBikeGeofence({
              location: bike.currentLocation
            });

            // Get fresh speed limit data
            const speedLimitResult = await speedLimitService.getSpeedLimit(bikeId);
            
            logMessage('debug', 'BikeService', 'getBikeById', `Fresh data for bike ${bikeId}`, {
              location: bike.currentLocation,
              isOutsideFence: geofenceResult.isOutsideFence,
              distanceFromBase: geofenceResult.distanceFromBase,
              speedLimit: speedLimitResult.speedLimit?.speedLimit
            });
            
            updatedBike = {
              ...updatedBike,
              isOutsideFence: geofenceResult.isOutsideFence,
              distanceFromBase: geofenceResult.distanceFromBase,
              geofenceId: geofenceResult.geofenceId,
              speedLimit: speedLimitResult.speedLimit?.speedLimit || 50,
              speedLimitSetAt: speedLimitResult.speedLimit?.setAt,
              speedLimitSetBy: speedLimitResult.speedLimit?.setBy
            };
          }
          
          return { success: true, bike: updatedBike };
        } else {
          return { success: false, error: ERROR_MESSAGES.BIKE_NOT_FOUND };
        }
      } else {
        return { success: false, error: ERROR_MESSAGES.BIKES_NOT_FOUND };
      }
    } catch (error) {
      logMessage('error', 'BikeService', 'getBikeById', 'Error retrieving bike', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get bikes outside geofence
   * @returns {Promise<object>} - { success: boolean, bikes?: array, error?: string }
   */
  static async getBikesOutsideGeofence() {
    try {
      logMessage('debug', 'BikeService', 'getBikesOutsideGeofence', 'Getting bikes outside geofence');

      const result = await this.getAllBikes();
      if (result.success) {
        const outsideBikes = result.bikes.filter(bike => bike.isOutsideFence);
        logMessage('info', 'BikeService', 'getBikesOutsideGeofence', `Found ${outsideBikes.length} bikes outside geofence`);
        return { success: true, bikes: outsideBikes };
      }
      return result;
    } catch (error) {
      logMessage('error', 'BikeService', 'getBikesOutsideGeofence', 'Error retrieving bikes outside geofence', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get bikes inside geofence
   * @returns {Promise<object>} - { success: boolean, bikes?: array, error?: string }
   */
  static async getBikesInsideGeofence() {
    try {
      logMessage('debug', 'BikeService', 'getBikesInsideGeofence', 'Getting bikes inside geofence');

      const result = await this.getAllBikes();
      if (result.success) {
        const insideBikes = result.bikes.filter(bike => !bike.isOutsideFence);
        logMessage('info', 'BikeService', 'getBikesInsideGeofence', `Found ${insideBikes.length} bikes inside geofence`);
        return { success: true, bikes: insideBikes };
      }
      return result;
    } catch (error) {
      logMessage('error', 'BikeService', 'getBikesInsideGeofence', 'Error retrieving bikes inside geofence', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get geofencing summary
   * @returns {Promise<object>} - { success: boolean, summary?: object, error?: string }
   */
  static async getGeofencingSummary() {
    try {
      logMessage('debug', 'BikeService', 'getGeofencingSummary', 'Generating geofencing summary');

      const result = await this.getAllBikes();
      if (result.success) {
        const bikes = result.bikes;
        const inside = bikes.filter(bike => !bike.isOutsideFence);
        const outside = bikes.filter(bike => bike.isOutsideFence);

        const summary = {
          total: bikes.length,
          inside: inside.length,
          outside: outside.length,
          insideBikes: inside.map(b => ({ 
            bikeId: b.bikeId, 
            distanceFromBase: b.distanceFromBase || 0,
            speedLimit: b.speedLimit || 50,
            isSpeedExceeded: b.isSpeedExceeded || false
          })),
          outsideBikes: outside.map(b => ({ 
            bikeId: b.bikeId, 
            distanceFromBase: b.distanceFromBase || 0,
            speedLimit: b.speedLimit || 50,
            isSpeedExceeded: b.isSpeedExceeded || false
          }))
        };

        logMessage('info', 'BikeService', 'getGeofencingSummary', 'Generated geofencing summary', {
          total: summary.total,
          inside: summary.inside,
          outside: summary.outside
        });

        return { success: true, summary };
      }
      return result;
    } catch (error) {
      logMessage('error', 'BikeService', 'getGeofencingSummary', 'Error generating geofencing summary', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get latest bike data for a specific bike
   * @param {string} bikeId - Bike ID
   * @returns {Promise<object>} - { success: boolean, latestData?: object, error?: string }
   */
  static async getLatestBikeData(bikeId) {
    try {
      logMessage('debug', 'BikeService', 'getLatestBikeData', `Getting latest data for bike ${bikeId}`);

      const today = getCurrentDate();
      const dailyFile = path.join(config.DAILY_DIR, `${today}.json`);

      if (await FileManager.exists(dailyFile)) {
        const dailyData = await FileManager.readJson(dailyFile);
        const bikeData = dailyData
          .filter(entry => entry.bikeId === bikeId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (bikeData.length > 0) {
          logMessage('info', 'BikeService', 'getLatestBikeData', `Found latest data for bike ${bikeId}`);
          return { success: true, latestData: bikeData[0] };
        } else {
          return { success: false, error: ERROR_MESSAGES.NO_DATA_FOR_BIKE };
        }
      } else {
        return { success: false, error: ERROR_MESSAGES.NO_DATA_TODAY };
      }
    } catch (error) {
      logMessage('error', 'BikeService', 'getLatestBikeData', 'Error retrieving latest bike data', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get historical data for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Promise<object>} - { success: boolean, date?: string, data?: array, error?: string }
   */
  static async getHistoricalData(date) {
    try {
      logMessage('debug', 'BikeService', 'getHistoricalData', `Getting historical data for date ${date}`);

      const historyFile = path.join(config.DAILY_DIR, `${date}.json`);

      if (await FileManager.exists(historyFile)) {
        const data = await FileManager.readJson(historyFile);
        logMessage('info', 'BikeService', 'getHistoricalData', `Found ${data.length} records for date ${date}`);
        return { success: true, date, data };
      } else {
        return { success: false, error: ERROR_MESSAGES.NO_DATA_FOR_DATE };
      }
    } catch (error) {
      logMessage('error', 'BikeService', 'getHistoricalData', 'Error retrieving historical data', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }

  /**
   * Get available dates for historical data
   * @returns {Promise<object>} - { success: boolean, availableDates?: array, error?: string }
   */
  static async getAvailableDates() {
    try {
      logMessage('debug', 'BikeService', 'getAvailableDates', 'Getting available historical dates');

      const files = await FileManager.readDirectory(config.DAILY_DIR);
      const dates = files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''))
        .sort();

      logMessage('info', 'BikeService', 'getAvailableDates', `Found ${dates.length} available dates`);
      return { success: true, availableDates: dates };
    } catch (error) {
      logMessage('error', 'BikeService', 'getAvailableDates', 'Error listing historical dates', error);
      return { success: false, error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR };
    }
  }
}

module.exports = BikeService;