// backend/controllers/clientController.js

const asyncHandler = require('express-async-handler');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');
const User = require('../models/User');
const { generateTimeLogExcelReport } = require('../utils/excelGenerator');
const mongoose = require('mongoose');

// Bloque 1: Obtener la lista de todos los clientes
const getClients = asyncHandler(async (req, res) => {
    const clients = await Client.find({}).populate('user', 'username').populate('employees');
    const clientsWithTotals = await Promise.all(clients.map(async (client) => {
        if (!client.employees || client.employees.length === 0) {
            return { ...client.toObject(), totalACobrar: 0 };
        }
        const employeeIds = client.employees.map(emp => emp._id);
        const logs = await TimeLog.aggregate([
            { $match: { employee: { $in: employeeIds } } },
            { $group: { _id: null, totalReceivables: { $sum: '$valorNeto' } } }
        ]);
        const totalACobrar = logs.length > 0 ? logs[0].totalReceivables : 0;
        return { ...client.toObject(), totalACobrar };
    }));
    res.json(clientsWithTotals);
});

// @desc Obtener cliente por ID
const getClientById = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id)
        .populate('user', 'username')
        .populate('employees', 'fullName idCard phone email');
    if (!client) {
        res.status(404);
        throw new Error('Cliente no encontrado.');
    }
    if (req.user.role === 'cliente' && client.user._id.toString() !== req.user._id.toString()) {
        res.status(403);
        throw new Error('No tienes permiso para ver este cliente.');
    }
    res.status(200).json(client);
});

// Bloque 3: Actualizar tarifas horarias
const updateClientHourlyRate = asyncHandler(async (req, res) => {
    const { defaultHourlyRate, holidayHourlyRate } = req.body;
    const client = await Client.findOne({ user: req.user.id });
    if (!client) {
        res.status(404);
        throw new Error('Cliente no encontrado');
    }
    client.defaultHourlyRate = defaultHourlyRate || client.defaultHourlyRate;
    client.holidayHourlyRate = holidayHourlyRate || client.holidayHourlyRate;
    const updatedClient = await client.save();
    res.json(updatedClient);
});

// Bloque 4: Dashboard del cliente (CORREGIDO)
const getClientDashboardData = asyncHandler(async (req, res) => {
    const client = await Client.findOne({ user: req.user.id }).populate('employees', 'fullName idCard phone');
    
    if (!client) {
        res.status(404);
        throw new Error('Cliente no encontrado.');
    }

    const employeeIds = client.employees.map(emp => emp._id);
    
    if (employeeIds.length === 0) {
        return res.json({ employeesList: [], grandTotal: 0 });
    }

    // --- INICIO DE LA CORRECCIÓN ---
    const paymentTotals = await TimeLog.aggregate([
        { $match: { employee: { $in: employeeIds } } },
        { 
            $group: { 
                _id: '$employee', 
                totalAPagar: { 
                    $sum: { $toDouble: '$valorNeto' } // Se añade $toDouble para convertir a número antes de sumar
                } 
            } 
        }
    ]);

    const totalsMap = paymentTotals.reduce((acc, item) => {
        acc[item._id.toString()] = item.totalAPagar;
        return acc;
    }, {});

    const employeesList = client.employees.map(employee => {
        const employeeJSON = employee.toObject();
        employeeJSON.totalAPagar = totalsMap[employee._id.toString()] || 0;
        return employeeJSON;
    });

    const grandTotal = employeesList.reduce((sum, emp) => sum + emp.totalAPagar, 0);

    res.json({ employeesList, grandTotal });
});


// Bloque 5: Exportar registros de cliente
const exportClientTimeLogsToExcel = asyncHandler(async (req, res) => {
    if (req.user.role !== 'cliente') {
        res.status(403);
        throw new Error('Solo los clientes pueden exportar registros.');
    }
    const client = await Client.findOne({ user: req.user.id });
    if (!client) {
        res.status(404);
        throw new Error('Perfil de cliente no encontrado.');
    }
    const timeLogs = await TimeLog.find({ employee: { $in: client.employees } })
        .populate('employee', 'fullName')
        .populate('user', 'username')
        .sort({ date: 1, horaInicio: 1 });
    if (timeLogs.length === 0) {
        res.status(404);
        throw new Error('No hay registros de tiempo para exportar.');
    }
    const dataForExcel = timeLogs.map(log => ({
        employeeName: log.employee?.fullName || 'N/A',
        date: new Date(log.date).toLocaleDateString('es-CO', { timeZone: 'UTC' }),
        empresa: log.empresa,
        festivo: log.festivo ? 'Sí' : 'No',
        horaInicio: log.horaInicio,
        horaFin: log.horaFin,
        horasBrutas: log.horasBrutas,
        minutosAlmuerzoSinPago: log.minutosAlmuerzoSinPago,
        valorHora: log.valorHora,
        subtotal: log.subtotal,
        descuentoAlmuerzo: log.descuentoAlmuerzo,
        valorNetoInicial: log.valorNeto,
        deduccionPrestamo: log.totalLoanDeducted,
        valorNetoFinal: (log.valorNeto - log.totalLoanDeducted),
        estado: log.estado,
        fijado: log.isFixed ? 'Sí' : 'No',
        registeredBy: log.user?.username || 'N/A',
        createdAt: log.createdAt,
    }));
    const fileNamePrefix = client.companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const buffer = await generateTimeLogExcelReport(dataForExcel, `Reporte_Horarios_${fileNamePrefix}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileNamePrefix}_registros.xlsx`);
    res.send(buffer);
});

// Bloque 6: Obtener auxiliares de un cliente
const getClientAuxiliaries = asyncHandler(async (req, res) => {
    const clientUser = req.user;
    if (clientUser.role !== 'cliente') {
        res.status(403);
        throw new Error('Acceso denegado. Solo los clientes pueden ver sus auxiliares.');
    }
    const client = await Client.findOne({ user: clientUser._id });
    if (!client) {
        res.status(404);
        throw new Error('Cliente no encontrado.');
    }
    const auxiliaries = await User.find({ role: 'auxiliar', associatedClient: client._id }).select('-password');
    res.json(auxiliaries);
});

// Bloque 7: Eliminar auxiliar
const deleteAuxiliar = asyncHandler(async (req, res) => {
    const { auxiliarId } = req.params;
    const clientUser = req.user;
    if (clientUser.role !== 'cliente') {
        res.status(403);
        throw new Error('Acceso denegado. Solo los clientes pueden eliminar auxiliares.');
    }
    const auxiliar = await User.findById(auxiliarId);
    if (!auxiliar) {
        res.status(404);
        throw new Error('Auxiliar no encontrado.');
    }
    if (!auxiliar.associatedClient || auxiliar.associatedClient.toString() !== clientUser.profile.toString()) {
        res.status(403);
        throw new Error('No tienes permiso para eliminar a este auxiliar.');
    }
    await auxiliar.deleteOne();
    res.status(200).json({ message: 'Auxiliar eliminado con éxito.' });
});

// Bloque 8: Exportación
module.exports = {
    getClients,
    getClientById,
    updateClientHourlyRate,
    getClientDashboardData,
    exportClientTimeLogsToExcel,
    getClientAuxiliaries,
    deleteAuxiliar,
};