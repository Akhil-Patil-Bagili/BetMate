// src/routes/matchRoutes.js
const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');

router.get('/',matchController.matches);


module.exports = router;
