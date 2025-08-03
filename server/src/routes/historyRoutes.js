const express = require('express');
const HistoryController = require('../controllers/historyController');

const router = express.Router();

// GET /api/history - Get available dates
router.get('/history', HistoryController.getAvailableDates);

// GET /api/history/:date - Get historical data for specific date
router.get('/history/:date', HistoryController.getHistoryByDate);

module.exports = router;