// backend/controllers/employeeController.js

const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Client = require('../models/Client');
const mongoose = require('mongoose');
const TimeLog = require('../models/TimeLog');

// --- FUNCIÓN 1: Obtener todos los empleados con su total ---
const getAllEmployees = asyncHandler(async (req, res) => {
    // --- INICIO DE LA CORRECCIÓN LÓGICA ---
    // 1. Buscamos primero en la colección de 'Users' a todos los que tengan el rol 'repartidor'.
    // Esta es la fuente de verdad para saber quién es un repartidor.
    const repartidorUsers = await User.find({ role: 'repartidor' }).select('_id');

    // 2. Creamos una lista solo con los IDs de esos usuarios.
    const repartidorUserIds = repartidorUsers.map(user => user._id);

    // 3. Ahora sí, buscamos en la colección de 'Employees' los perfiles que están
    // asociados a esa lista de IDs de usuarios repartidores.
    const employees = await Employee.find({ user: { $in: repartidorUserIds } })
                                    .populate('user', 'username')
                                    .lean();
    // --- FIN DE LA CORRECCIÓN LÓGICA ---

    // Si no se encontraron empleados repartidores, devolvemos un array vacío para no continuar.
    if (!employees.length) {
        return res.json([]);
    }

    // --- MANTENEMOS TU LÓGICA PARA CALCULAR TOTALES ---
    // (Esta parte de tu código es correcta y muy eficiente)
    const employeeIds = employees.map(emp => emp._id);

    // Calculamos los totales a pagar sumando solo los registros NO pagados
    const totals = await TimeLog.aggregate([
        { $match: { isPaid: false, employee: { $in: employeeIds } } },
        { $group: { _id: '$employee', total: { $sum: '$valorNetoFinal' } } }
    ]);

    // Convertimos el resultado en un mapa para buscar totales fácilmente
    const totalsMap = totals.reduce((acc, item) => {
        acc[item._id.toString()] = item.total;
        return acc;
    }, {});

    // Asignamos el total calculado a cada empleado
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

// --- FUNCIÓN 3: Crear un empleado (registro informativo) - VERSIÓN FINAL CORREGIDA ---
const createEmployeeByClient = asyncHandler(async (req, res) => {
    // 1. Obtener los datos visibles que vienen del frontend.
    const { fullName, idCard, phone, clientId } = req.body;

    // 2. Validación de los datos que SÍ deben venir del formulario.
    if (!fullName || !idCard || !phone) {
        res.status(400);
        throw new Error('Nombre completo, cédula y teléfono son requeridos.');
    }

    try {
        // 3. Lógica para encontrar el perfil del cliente (Tu lógica es perfecta y se mantiene).
        let clientProfile;
        if (req.user.role === 'admin' && clientId) {
            clientProfile = await Client.findById(clientId);
        } else if (req.user.role === 'cliente') {
            clientProfile = await Client.findOne({ user: req.user._id });
        } else if (req.user.role === 'auxiliar') {
            clientProfile = await Client.findById(req.user.associatedClient);
        }

        if (!clientProfile) {
            res.status(404);
            throw new Error('No se encontró un perfil de cliente asociado.');
        }

        // 4. ✨ LA CORRECCIÓN DEFINITIVA: Construir el objeto COMPLETO del empleado ✨
        // Creamos el perfil del empleado combinando los datos del frontend
        // con los datos predeterminados ("autollenados") que el modelo requiere.
        const newEmployee = await Employee.create({
            fullName: fullName,       // Dato del frontend
            idCard: idCard,           // Dato del frontend
            phone: phone,             // Dato del frontend
            idClient: clientProfile._id, // Dato obtenido de la lógica
            role: 'empleado',         // DATO PREDETERMINADO/AUTOLLENADO
            employeeType: 'cliente'   // DATO PREDETERMINADO/AUTOLLENADO
        });

        // 5. Actualizar la lista de empleados del cliente de forma segura.
        await Client.updateOne(
            { _id: clientProfile._id },
            { $push: { employees: newEmployee._id } }
        );

        res.status(201).json({
            message: 'Empleado registrado y asociado con éxito.',
            employee: newEmployee
        });

    } catch (err) {
        console.error("Error en createEmployeeByClient:", err.message);
        
        if (err.code === 11000) {
             res.status(400);
             throw new Error(`Error de duplicado: Ya existe un empleado con la cédula ${idCard}.`);
        }
        res.status(500);
        throw new Error(err.message || 'Error interno al crear el perfil del empleado.');
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

// --- FUNCIÓN 5: Eliminar un empleado (VERSIÓN FINAL CON PERMISO PARA AUXILIAR) ---
const deleteEmployee = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const authenticatedUser = req.user;

    const employee = await Employee.findById(id);
    if (!employee) {
        res.status(404);
        throw new Error('Mensajero no encontrado.');
    }

    // Lógica de eliminación para el rol 'cliente'
    if (authenticatedUser.role === 'cliente') {
        const client = await Client.findOne({ user: authenticatedUser._id });

        if (!client || !client.employees.some(empId => empId.toString() === employee._id.toString())) {
            res.status(403);
            throw new Error('No tienes permiso para eliminar este mensajero o no pertenece a tu empresa.');
        }

        client.employees = client.employees.filter(empId => empId.toString() !== employee._id.toString());
        await client.save();
        await TimeLog.deleteMany({ employee: employee._id });

    // --- LÓGICA AÑADIDA PARA EL AUXILIAR ---
    } else if (authenticatedUser.role === 'auxiliar') {
        const client = await Client.findById(authenticatedUser.associatedClient);

        if (!client || !client.employees.some(empId => empId.toString() === employee._id.toString())) {
            res.status(403);
            throw new Error('No tienes permiso para eliminar este mensajero o no pertenece a la empresa de tu cliente.');
        }

        client.employees = client.employees.filter(empId => empId.toString() !== employee._id.toString());
        await client.save();
        await TimeLog.deleteMany({ employee: employee._id });

    // Lógica de eliminación para el rol 'admin'
    } else if (authenticatedUser.role === 'admin') {
        await Client.updateMany(
            { employees: employee._id },
            { $pull: { employees: employee._id } }
        );
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