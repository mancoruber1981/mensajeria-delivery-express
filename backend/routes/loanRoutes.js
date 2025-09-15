// backend/routes/loanRoutes.js

const express = require('express');
const router = express.Router();
const { createLoan, getAllLoans } = require('../controllers/loanController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, authorizeRoles('admin', 'repartidor'), createLoan)
    .get(protect, authorizeRoles('admin', 'repartidor'), getAllLoans);

module.exports = router;