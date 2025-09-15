// backend/controllers/employeeController.js

const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Client = require('../models/Client');
const mongoose = require('mongoose');
const TimeLog = require('../models/TimeLog');

// --- FUNCIÓN 1: Obtener todos los empleados con su total ---
const getAllEmployees = asyncHandler(async (req, res) => {
    // 1. Obtenemos todos los empleados que son repartidores
    const employees = await Employee.find({ role: 'repartidor' }).populate('user', 'username').lean();

    // 2. Calculamos los totales a pagar sumando solo los registros NO pagados
    const totals = await TimeLog.aggregate([
        { $match: { isPaid: false } },
        { $group: { _id: '$employee', total: { $sum: '$valorNetoFinal' } } }
    ]);

    // 3. Convertimos el resultado en un mapa para buscar totales fácilmente
    const totalsMap = totals.reduce((acc, item) => {
        acc[item._id.toString()] = item.total;
        return acc;
    }, {});

    // 4. Asignamos el total calculado a cada empleado
    const employeesWithTotals = employees.map(emp => {
        emp.currentBalance = totalsMap[emp._id.toString()] || 0;
        return emp;
    });

    res.json(employeesWithTotals);
});

// --- FUNCIÓN 2: Obtener un empleado por su ID ---
const getEmployeeById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const employee = await Employee.findById(id).populate('user', 'username');

    if (!employee) {
        res.status(404);
        throw new Error('Empleado no encontrado');
    }

    // Lógica de permisos
    if (req.user.role === 'cliente' || req.user.role === 'auxiliar') {
        const clientProfile = req.user.role === 'cliente'
            ? await Client.findOne({ user: req.user.id })
            : await Client.findById(req.user.associatedClient);

        if (!clientProfile || !clientProfile.employees.some(empId => empId.equals(employee._id))) {
            res.status(403);
            throw new Error('No tienes permiso para ver los registros de este empleado.');
        }
    }
    // Si es 'admin', tiene acceso por defecto y pasa.

    res.json(employee);
});

// --- FUNCIÓN 3: Crear un empleado por un cliente ---
const createEmployeeByClient = asyncHandler(async (req, res) => {
    const { fullName, idCard, phone, clientId } = req.body;
    if (!fullName || !idCard || !phone) {
        res.status(400).json({ message: 'Nombre, cédula y teléfono son requeridos.' });
        return;
    }
    
    try {
        let clientProfile;
        if (req.user.role === 'admin' && clientId) {
            clientProfile = await Client.findById(clientId).populate('employees');
        } else if (req.user.role === 'cliente') {
            clientProfile = await Client.findOne({ user: req.user.id }).populate('employees');
        } else if (req.user.role === 'auxiliar') {
            clientProfile = await Client.findById(req.user.associatedClient).populate('employees');
        }

        if (!clientProfile) {
            res.status(404);
            throw new Error('No se encontró un perfil de cliente asociado.');
        }
        
        const employeeExists = clientProfile.employees.some(emp => emp.idCard === idCard);
        if (employeeExists) {
            res.status(400);
            throw new Error('Ya has registrado un empleado con esa cédula.');
        }

        const employee = await Employee.create({
            fullName,
            idCard,
            phone,
            role: 'empleado',
            employeeType: 'cliente',
            // ✅ CORRECCIÓN: Asigna el ID del CLIENTE, no del auxiliar
            user: clientProfile.user 
        });

        clientProfile.employees.push(employee._id);
        await clientProfile.save();
        res.status(201).json({ message: 'Empleado registrado y asociado con éxito.', employee });

    } catch (err) {
        console.error("Error en createEmployeeByClient:", err);
        // Si el error sigue siendo de duplicado, es por el índice en la DB
        if (err.code === 11000) {
            throw new Error('Error de duplicado. Asegúrate de haber eliminado el índice "user_1" de la colección "employees" en la base de datos.');
        }
        throw new Error('Error interno al crear el perfil del empleado.');
    }
});

// --- FUNCIÓN 4: Búsqueda de empleados ---
const searchEmployees = asyncHandler(async (req, res) => {
    try {
        const searchQuery = req.query.q || '';
        const employees = await Employee.find({
            fullName: { $regex: searchQuery, $options: 'i' },
            role: 'repartidor'
        }).limit(10);
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: 'Error en la búsqueda de empleados' });
    }
});

// --- FUNCIÓN 5: Eliminar un empleado ---
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

// --- EXPORTACIÓN FINAL ---
module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployeeByClient,
    deleteEmployee,
    searchEmployees,
};