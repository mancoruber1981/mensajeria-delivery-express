const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const Loan = require('../models/Loan');

// @desc    Crear un nuevo préstamo
const createLoan = asyncHandler(async (req, res) => {
    const { employee, amount, description, installments } = req.body;
    const { user } = req;
    let employeeIdForLoan = user.role === 'admin' ? employee : user.profile._id;

    if (!employeeIdForLoan || !amount) {
        res.status(400);
        throw new Error('El empleado y el monto son obligatorios.');
    }

    const loan = await Loan.create({
        employee: employeeIdForLoan,
        amount: parseFloat(amount),
        description,
        installments: parseInt(installments, 10) || 1,
        outstandingBalance: parseFloat(amount),
        status: 'Pendiente'
    });

    res.status(201).json(loan);
});

// @desc    Obtener préstamos
const getAllLoans = asyncHandler(async (req, res) => {
    const { user } = req;
    let query = {};
    if (user.role === 'repartidor') {
        query.employee = user.profile._id;
    }
    const loans = await Loan.find(query).populate('employee', 'fullName').sort({ dateGranted: -1 });
    res.status(200).json(loans);
});

// @desc    Aprobar un préstamo
// ✅ CORRECCIÓN: Añadir 'const'
const approveLoan = asyncHandler(async (req, res) => {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
        res.status(404);
        throw new Error('Préstamo no encontrado.');
    }
    if (loan.status !== 'Pendiente') {
        res.status(400);
        throw new Error('Solo se pueden aprobar préstamos pendientes.');
    }
    loan.status = 'Aprobado';
    await loan.save();
    
    await Employee.findByIdAndUpdate(loan.employee, { $inc: { currentBalance: loan.amount } });

    res.status(200).json({ message: 'Préstamo aprobado.', loan });
});

// @desc    Rechazar un préstamo
// ✅ CORRECCIÓN: Añadir 'const'
const rejectLoan = asyncHandler(async (req, res) => {
    const loan = await Loan.findById(req.params.id);
    if (!loan) {
        res.status(404);
        throw new Error('Préstamo no encontrado.');
    }
    if (loan.status !== 'Pendiente') {
        res.status(400);
        throw new Error('Solo se pueden rechazar préstamos pendientes.');
    }
    loan.status = 'Rechazado';
    await loan.save();
    res.status(200).json({ message: 'Préstamo rechazado.', loan });
});

// @desc    Borrar un préstamo
const deleteLoan = asyncHandler(async (req, res) => {
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
        res.status(404);
        throw new Error('Préstamo no encontrado.');
    }

    // IMPORTANTE: Si el préstamo fue aprobado, debemos revertir la transacción en el saldo del empleado.
    // Usamos -loan.amount para restar el monto que se le había sumado.
    if (loan.status === 'Aprobado') {
        await Employee.findByIdAndUpdate(loan.employee, { $inc: { currentBalance: -loan.amount } });
    }

    // Ahora sí, podemos borrar el préstamo de forma segura sin afectar la contabilidad.
    await loan.deleteOne();

    res.status(200).json({ message: 'Préstamo eliminado con éxito.' });
});

// Ahora el export funcionará correctamente con todas las constantes
module.exports = { 
    createLoan, 
    getAllLoans,
    approveLoan,
    rejectLoan,
    deleteLoan
};