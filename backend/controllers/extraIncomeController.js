// backend/controllers/extraIncomeController.js

const asyncHandler = require('express-async-handler');
const ExtraIncome = require('../models/ExtraIncome');

// @desc    Crear un nuevo ingreso extra
// @route   POST /api/extra-incomes
// @access  Private (Admin)
const createExtraIncome = asyncHandler(async (req, res) => {
    const { description, amount, date, contributorName, contributorId, contributorPhone, contributorAddress } = req.body;

    if (!description || !amount) {
        res.status(400);
        throw new Error('La descripción y el monto son obligatorios.');
    }

    const extraIncome = await ExtraIncome.create({
        description,
        amount,
        date: date || new Date(),
        contributorName,
        contributorId,
        contributorPhone,
        contributorAddress,
        createdBy: req.user._id
    });

    res.status(201).json(extraIncome);
});

// @desc    Obtener todos los ingresos extras
// @route   GET /api/extra-incomes
// @access  Private (Admin)
const getExtraIncomes = asyncHandler(async (req, res) => {
    // Ordenamos por fecha, del más reciente al más antiguo
    const extraIncomes = await ExtraIncome.find({}).populate('createdBy', 'username').sort({ date: -1 });
    res.json(extraIncomes);
});

// @desc    Eliminar un ingreso extra
// @route   DELETE /api/extra-incomes/:id
// @access  Private (Admin)
const deleteExtraIncome = asyncHandler(async (req, res) => {
    const extraIncome = await ExtraIncome.findById(req.params.id);

    if (extraIncome) {
        await extraIncome.deleteOne();
        res.json({ message: 'Ingreso extra eliminado.' });
    } else {
        res.status(404);
        throw new Error('Ingreso extra no encontrado.');
    }
});


module.exports = {
    createExtraIncome,
    getExtraIncomes,
    deleteExtraIncome,
};