// backend/routes/extraIncomeRoutes.js

const express = require('express');
const router = express.Router();
const { createExtraIncome, getExtraIncomes, deleteExtraIncome } = require('../controllers/extraIncomeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Asumimos que solo el admin y el contador pueden gestionar esto
router.route('/')
    .post(protect, authorizeRoles('admin', 'contador'), createExtraIncome)
    .get(protect, authorizeRoles('admin', 'contador'), getExtraIncomes);

router.route('/:id')
    .delete(protect, authorizeRoles('admin', 'contador'), deleteExtraIncome);

module.exports = router;