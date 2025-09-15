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

        // ✅ LÓGICA CORREGIDA: Se añade el filtro isPaid: false
        const logs = await TimeLog.aggregate([
            { $match: { 
                employee: { $in: employeeIds }, 
                isPaid: false // <-- Suma solo los registros pendientes de liquidación
            }},
            { $group: { 
                _id: null, 
                totalReceivables: { $sum: '$valorNetoFinal' } // Se usa valorNetoFinal para consistencia
            }}
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

const updateClientHourlyRate = asyncHandler(async (req, res) => {
    const { defaultHourlyRate, holidayHourlyRate } = req.body;
    // La ruta debe ser /:id/hourly-rates
    const client = await Client.findById(req.params.id);
    if (!client) { throw new Error('Cliente no encontrado'); }
    client.defaultHourlyRate = defaultHourlyRate;
    client.holidayHourlyRate = holidayHourlyRate;
    const updatedClient = await client.save();
    res.json(updatedClient);
});

// Bloque 4: Dashboard del cliente (CORREGIDO)
const getClientDashboardData = asyncHandler(async (req, res) => {
    const client = await Client.findById(req.user.profile._id).populate('employees', 'fullName idCard phone');
    if (!client) { throw new Error('Perfil de cliente no encontrado.'); }
    const employeeIds = client.employees.map(e => e._id);
    if (employeeIds.length === 0) return res.json({ employeesList: [], grandTotal: 0 });
    const paymentTotals = await TimeLog.aggregate([
        { $match: { employee: { $in: employeeIds }, isPaid: false } },
        { $group: { _id: '$employee', totalAPagar: { $sum: '$valorNetoFinal' } } }
    ]);
    const totalsMap = paymentTotals.reduce((acc, { _id, totalAPagar }) => { acc[_id.toString()] = totalAPagar; return acc; }, {});
    const grandTotal = Object.values(totalsMap).reduce((s, t) => s + t, 0);
    const employeesList = client.employees.map(e => ({ ...e.toObject(), totalAPagar: totalsMap[e._id.toString()] || 0 }));
    res.json({ employeesList, grandTotal });
});


// Bloque 5: Exportar registros de cliente
const exportClientTimeLogsToExcel = asyncHandler(async (req, res) => {
    let clientToExport;

    if (req.user.role === 'admin') {
        const { clientId } = req.params;
        clientToExport = await Client.findById(clientId);
    } else if (req.user.role === 'cliente') {
        clientToExport = await Client.findOne({ user: req.user.id });
    }

    if (!clientToExport) {
        throw new Error('Perfil de cliente no encontrado.');
    }

    const timeLogs = await TimeLog.find({ employee: { $in: clientToExport.employees } }).populate('employee', 'fullName');

    if (timeLogs.length === 0) {
        throw new Error('No hay datos para exportar para este cliente.');
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
    // ✅ CORRECCIÓN: Usamos la variable correcta 'clientToExport'
    const fileNamePrefix = clientToExport.companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const buffer = await generateTimeLogExcelReport(dataForExcel, `Reporte_${fileNamePrefix}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_${fileNamePrefix}.xlsx`);
    res.send(buffer);
});

// Bloque 6: Obtener auxiliares de un cliente
const getClientAuxiliaries = asyncHandler(async (req, res) => {
    const client = await Client.findOne({ user: req.user.id });
    if (!client) {
        res.status(404);
        throw new Error('Cliente no encontrado.');
    }
    const auxiliaries = await User.find({ 
        role: 'auxiliar', 
        associatedClient: client._id 
    }).select('-password');
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