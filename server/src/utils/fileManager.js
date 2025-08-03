const fs = require('fs-extra');

class FileManager {
  /**
   * Read JSON file with error handling
   * @param {string} filePath - Path to the JSON file
   * @returns {Promise<any>} - Parsed JSON data
   */
  static async readJson(filePath) {
    try {
      if (!(await fs.pathExists(filePath))) {
        throw new Error(`File not found: ${filePath}`);
      }
      return await fs.readJson(filePath);
    } catch (error) {
      console.error(`Error reading JSON file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write JSON file with error handling
   * @param {string} filePath - Path to the JSON file
   * @param {any} data - Data to write
   * @param {object} options - Write options (e.g., { spaces: 2 })
   */
  static async writeJson(filePath, data, options = { spaces: 2 }) {
    try {
      await fs.writeJson(filePath, data, options);
    } catch (error) {
      console.error(`Error writing JSON file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - True if file exists
   */
  static async exists(filePath) {
    try {
      return await fs.pathExists(filePath);
    } catch (error) {
      console.error(`Error checking file existence ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Read directory contents
   * @param {string} dirPath - Directory path
   * @returns {Promise<string[]>} - Array of file names
   */
  static async readDirectory(dirPath) {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path to create
   */
  static async ensureDirectory(dirPath) {
    try {
      await fs.ensureDir(dirPath);
    } catch (error) {
      console.error(`Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }
}

module.exports = FileManager;