// routes/rankRoutes.js
const express = require('express');
const router = express.Router();
const rankController = require('../controllers/rankController');

router.get('/', rankController.getRanks);

module.exports = router;
