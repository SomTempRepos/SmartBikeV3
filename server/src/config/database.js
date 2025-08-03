const fs = require('fs-extra');
const config = require('./environment');

// Ensure directories exist
const initializeDirectories = async () => {
  try {
    await fs.ensureDir(config.DATA_DIR);
    await fs.ensureDir(config.DAILY_DIR);
    console.log('✅ Data directories initialized');
  } catch (error) {
    console.error('❌ Error initializing directories:', error);
    throw error;
  }
};

// Initialize default data files if they don't exist
const initializeDataFiles = async () => {
  const defaultFiles = [
    { path: config.USERS_FILE, data: [] },
    { path: config.BIKES_FILE, data: [] },
    { path: config.GUARDIANS_FILE, data: [] },
    { path: config.RANKS_FILE, data: [] }
  ];

  for (const file of defaultFiles) {
    try {
      if (!(await fs.pathExists(file.path))) {
        await fs.writeJson(file.path, file.data, { spaces: 2 });
        console.log(`✅ Created default file: ${file.path}`);
      }
    } catch (error) {
      console.error(`❌ Error creating ${file.path}:`, error);
    }
  }
};

const initializeDatabase = async () => {
  await initializeDirectories();
  await initializeDataFiles();
};

module.exports = {
  initializeDatabase,
  initializeDirectories,
  initializeDataFiles
};