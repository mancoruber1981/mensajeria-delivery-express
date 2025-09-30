// backend/controllers/clientController.js

const asyncHandler = require('express-async-handler');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');
const User = require('../models/User');
const ExcelJS = require('exceljs');
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
    // --- 1. OBTENER PARÁMETROS Y FECHAS ---
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Por favor, proporciona una fecha de inicio y de fin para el reporte.');
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // --- 2. RECOPILAR Y AGRUPAR LOS DATOS ---
    const client = await Client.findById(clientId).populate('employees', 'fullName');
    if (!client) {
        throw new Error('Perfil de cliente no encontrado.');
    }
    
    const assignedEmployees = client.employees;

    // --- CAMBIO CLAVE: Buscamos todos los registros en el rango de fechas, SIN importar si están pagos o no ---
    const timeLogs = await TimeLog.find({
        employee: { $in: assignedEmployees.map(e => e._id) },
        date: { $gte: start, $lte: end } // Solo filtramos por fecha
    }).populate('employee', 'fullName').sort({ 'employee.fullName': 1, date: 1 }).lean();

    // El resto de la lógica para agrupar y generar el excel no cambia...
    const logsByEmployee = {};
    for (const log of timeLogs) {
        const employeeId = log.employee._id.toString();
        if (!logsByEmployee[employeeId]) {
            logsByEmployee[employeeId] = {
                name: log.employee.fullName,
                logs: []
            };
        }
        logsByEmployee[employeeId].logs.push(log);
    }
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Delivery Express SAS';

    const summarySheet = workbook.addWorksheet('Resumen Facturación');
    summarySheet.mergeCells('A1:D1');
    summarySheet.getCell('A1').value = `FACTURA DE SERVICIOS - ${client.companyName}`;
    summarySheet.getCell('A1').font = { bold: true, size: 16 };
    summarySheet.getCell('A1').alignment = { horizontal: 'center' };
    summarySheet.getCell('A3').value = 'Periodo:';
    summarySheet.getCell('B3').value = `${start.toISOString().slice(0,10)} al ${end.toISOString().slice(0,10)}`;
    summarySheet.getCell('A5').value = 'Mensajero';
    summarySheet.getCell('B5').value = 'Total a Facturar';
    summarySheet.getRow(5).font = { bold: true };

    let currentRow = 6;
    for (const employee of assignedEmployees) {
        const employeeData = logsByEmployee[employee._id.toString()];
        const totalForEmployee = employeeData ? employeeData.logs.reduce((sum, log) => sum + log.valorNetoFinal, 0) : 0;
        
        summarySheet.getCell(`A${currentRow}`).value = employee.fullName;
        summarySheet.getCell(`B${currentRow}`).value = totalForEmployee;
        summarySheet.getCell(`B${currentRow}`).numFmt = '$ #,##0.00';
        
        currentRow++;
    }

    summarySheet.getCell(`A${currentRow}`).value = 'GRAN TOTAL';
    summarySheet.getCell(`A${currentRow}`).font = { bold: true };
    const grandTotalCell = summarySheet.getCell(`B${currentRow}`);
    grandTotalCell.value = { formula: `SUM(B6:B${currentRow - 1})` };
    grandTotalCell.font = { bold: true };
    grandTotalCell.numFmt = '$ #,##0.00';
    summarySheet.getColumn('A').width = 30;
    summarySheet.getColumn('B').width = 20;

    for (const employeeId in logsByEmployee) {
        const employeeData = logsByEmployee[employeeId];
        const sheetName = `Detalle - ${employeeData.name.substring(0, 20)}`;
        const detailsSheet = workbook.addWorksheet(sheetName);

        detailsSheet.columns = [
            { header: 'Fecha', key: 'date', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
            { header: 'Empresa', key: 'empresa', width: 25 },
            { header: 'Subtotal', key: 'subtotal', width: 18, style: { numFmt: '$ #,##0.00' } },
            { header: 'Desc. Almuerzo', key: 'descuentoAlmuerzo', width: 18, style: { numFmt: '$ #,##0.00' } },
            { header: 'Valor Neto Final', key: 'valorNetoFinal', width: 18, style: { numFmt: '$ #,##0.00' } },
            { header: 'Estado', key: 'estado', width: 15 }, // <-- Columna de Estado
        ];
        
        const detailsData = employeeData.logs.map(log => ({
            date: new Date(log.date), empresa: log.empresa,
            subtotal: log.subtotal, descuentoAlmuerzo: log.descuentoAlmuerzo,
            valorNetoFinal: log.valorNetoFinal,
            estado: log.isPaid ? 'Pagado' : 'Pendiente' // <-- Lógica del Estado
        }));
        detailsSheet.addRows(detailsData);
        
        const dataRowCount = detailsData.length;
        if (dataRowCount > 0) {
            const totalRow = detailsSheet.addRow([]);
            const totalsLabelCell = totalRow.getCell('D');
            totalsLabelCell.value = 'TOTAL:';
            totalsLabelCell.font = { bold: true };
            totalsLabelCell.alignment = { horizontal: 'right' };
            const totalsValueCell = totalRow.getCell('E');
            totalsValueCell.value = { formula: `SUM(E2:E${1 + dataRowCount})` };
            totalsValueCell.font = { bold: true };
            totalsValueCell.numFmt = '$ #,##0.00';
        }
    }

    const fileName = `Factura_${client.companyName.replace(/\s/g, '_')}_${start.toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.end();
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