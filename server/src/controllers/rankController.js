// controllers/rankController.js
const FileManager = require('../utils/fileManager');
const { RANKS_FILE } = require('../config/database');
const Helpers = require('../utils/helper');

const getRanks = async (req, res) => {
  try {
    const data = await FileManager.readJson(RANKS_FILE);
    const sorted = data.sort((a, b) => b.points - a.points);
    const ranked = sorted.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
    res.json({ ranks: ranked });
  } catch (err) {
    res.status(500).json(Helpers.createErrorResponse(err));
  }
};

module.exports = { getRanks };
