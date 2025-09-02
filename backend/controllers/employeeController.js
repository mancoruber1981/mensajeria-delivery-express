// backend/controllers/employeeController.js

const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Client = require('../models/Client');
const mongoose = require('mongoose');
const TimeLog = require('../models/TimeLog');

// Obtener todos los empleados con su total a pagar
const getAllEmployees = asyncHandler(async (req, res) => {
    const employeesWithTotals = await Employee.aggregate([
        { $match: { role: 'repartidor' } },
        { $lookup: { from: 'timelogs', localField: '_id', foreignField: 'employee', as: 'timelogs' } },
        { $addFields: { totalAPagar: { $sum: '$timelogs.valorNetoFinal' } } },
        { $project: { timelogs: 0 } }
    ]);
    res.json(employeesWithTotals);
});

// Obtener un empleado por su ID
const getEmployeeById = asyncHandler(async (req, res) => {
    const employeeId = req.params.id;
    const employee = await Employee.findById(employeeId).populate('user', 'username');
    if (!employee) {
        res.status(404);
        throw new Error('Empleado no encontrado');
    }
    if (req.user.role === 'cliente' || req.user.role === 'auxiliar') {
        let clientProfile = null;
        if (req.user.role === 'cliente') {
            clientProfile = await Client.findOne({ user: req.user.id });
        } else if (req.user.role === 'auxiliar') {
            clientProfile = await Client.findById(req.user.associatedClient);
        }
        if (!clientProfile) {
            res.status(404);
            throw new Error('Perfil de cliente no encontrado o no autorizado.');
        }
        const employeeBelongsToClient = clientProfile.employees.some(empId => empId.toString() === employee._id.toString());
        if (!employeeBelongsToClient) {
            res.status(403);
            throw new Error('No tienes permiso para ver este empleado.');
        }
    }
    res.json(employee);
});

// =================================================================
// ===== INICIO DE LA FUNCIÓN CORREGIDA ============================
// =================================================================

// Crear un empleado por un cliente o auxiliar (VERSIÓN FINAL CORREGIDA)
const createEmployeeByClient = asyncHandler(async (req, res) => {
    const { fullName, idCard, phone } = req.body;

    if (!fullName || !idCard || !phone) {
        res.status(400);
        throw new Error('Por favor, proporciona nombre completo, cédula y teléfono.');
    }
    
    try {
        let clientProfile;
        if (req.user.role === 'cliente') {
            clientProfile = await Client.findOne({ user: req.user.id }).populate('employees');
        } else if (req.user.role === 'auxiliar') {
            clientProfile = await Client.findById(req.user.associatedClient).populate('employees');
        }

        if (!clientProfile) {
            res.status(404);
            throw new Error('No se encontró un perfil de cliente asociado para realizar esta acción.');
        }
        
        const employeeExists = clientProfile.employees.some(emp => emp.idCard === idCard);
        if (employeeExists) {
            res.status(400);
            throw new Error('Ya has registrado un empleado con esa cédula.');
        }

        // === INICIO DE LA CORRECCIÓN ===
        // Aquí debes incluir el 'user' ID del cliente en el nuevo perfil de empleado
        const employee = await Employee.create({
            fullName,
            idCard,
            phone,
            role: 'empleado',
            employeeType: 'cliente',
            user: req.user.id, // <-- Esta es la línea que falta
        });
        // === FIN DE LA CORRECCIÓN ===

        clientProfile.employees.push(employee._id);
        await clientProfile.save();
        res.status(201).json({ message: 'Empleado registrado y asociado con éxito.', employee });

    } catch (err) {
        console.error("Error en createEmployeeByClient:", err);
        res.status(500);
        throw new Error('Error interno al crear el perfil del empleado.');
    }
});

// =================================================================
// ===== FIN DE LA FUNCIÓN CORREGIDA ===============================
// =================================================================


// Eliminar un empleado (cliente o admin)
const deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const authenticatedUser = req.user;
    const employee = await Employee.findById(id);
    if (!employee) {
        res.status(404);
        throw new Error('Mensajero no encontrado.');
    }
    if (authenticatedUser.role === 'cliente') {
        const client = await Client.findOne({ user: authenticatedUser._id });
        if (!client || !client.employees.some(empId => empId.toString() === employee._id.toString())) {
            res.status(403);
            throw new Error('No tienes permiso para eliminar este mensajero o no pertenece a tu empresa.');
        }
        client.employees = client.employees.filter(empId => empId.toString() !== employee._id.toString());
        await client.save();
        await TimeLog.deleteMany({ employee: employee._id });
    } else if (authenticatedUser.role === 'admin') {
        await TimeLog.deleteMany({ employee: employee._id });
    } else {
        res.status(403);
        throw new Error('No tienes permiso para eliminar mensajeros.');
    }
    await employee.deleteOne();
    res.status(200).json({ message: 'Mensajero eliminado con éxito.' });
});

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployeeByClient,
    deleteEmployee,
};