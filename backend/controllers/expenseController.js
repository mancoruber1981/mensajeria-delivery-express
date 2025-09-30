const asyncHandler = require('express-async-handler');
const Expense = require('../models/Expense');

// @desc    Crear un nuevo gasto
// @route   POST /api/expenses
exports.createExpense = asyncHandler(async (req, res) => {
    const { description, amount, category, reference, date } = req.body;

    if (!description || !amount || !category) {
        res.status(400);
        throw new Error('La descripción, el monto y la categoría son obligatorios.');
    }

    const expense = await Expense.create({
        description,
        amount,
        category,
        reference,
        date,
        createdBy: req.user.id // Asocia el gasto con el admin que lo creó
    });

    res.status(201).json(expense);
});

// @desc    Obtener todos los gastos
// @route   GET /api/expenses
exports.getAllExpenses = asyncHandler(async (req, res) => {
    // Busca todos los gastos y los ordena por fecha, del más reciente al más antiguo
    const expenses = await Expense.find({}).populate('createdBy', 'username').sort({ date: -1 });
    res.status(200).json(expenses);
});

// @desc    Eliminar un gasto
// @route   DELETE /api/expenses/:id
exports.deleteExpense = asyncHandler(async (req, res) => {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
        res.status(404);
        throw new Error('Gasto no encontrado.');
    }

    await expense.deleteOne();
    res.status(200).json({ message: 'Gasto eliminado con éxito.' });
});