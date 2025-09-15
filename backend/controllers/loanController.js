const asyncHandler = require('express-async-handler');
const Loan = require('../models/Loan');
const Employee = require('../models/Employee'); // Necesario para la búsqueda

const createLoan = asyncHandler(async (req, res) => {
    const { employee, amount, description, installments } = req.body;
    const { user } = req;

    let employeeIdForLoan;
    if (user.role === 'admin') {
        if (!employee) {
            throw new Error('El empleado es obligatorio.');
        }
        employeeIdForLoan = employee;
    } else if (user.role === 'repartidor') {
        employeeIdForLoan = user.profile._id;
    }

    if (!employeeIdForLoan || !amount) {
        throw new Error('El empleado y el monto son obligatorios.');
    }

    const loan = await Loan.create({
        employee: employeeIdForLoan,
        amount,
        description,
        installments: installments || 1,
        outstandingBalance: amount // ✅ LÍNEA CLAVE AÑADIDA
    });

    res.status(201).json(loan);
})

const getAllLoans = asyncHandler(async (req, res) => {
    const { user } = req;
    let query = {};
    if (user.role === 'repartidor') {
        query.employee = user.profile._id;
    }
    const loans = await Loan.find(query).populate('employee', 'fullName').sort({ createdAt: -1 });
    res.json(loans);
});

module.exports = { createLoan, getAllLoans };