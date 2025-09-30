const express = require('express');
const router = express.Router();
const {
    createExpense,
    getAllExpenses,
    deleteExpense
} = require('../controllers/expenseController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Solo los administradores pueden gestionar los gastos
router.use(protect, authorizeRoles('admin'));

router.route('/')
    .post(createExpense)
    .get(getAllExpenses);

router.route('/:id')
    .delete(deleteExpense);

module.exports = router;