// backend/controllers/adminController.js

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');
const User = require('../models/User');

// --- Función para obtener las estadísticas del Dashboard del Administrador (CORREGIDA) ---
const getDashboardStats = asyncHandler(async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();
        const totalClients = await Client.countDocuments();
        const totalUsers = await User.countDocuments();

        const totalACobrarPromise = TimeLog.aggregate([
            { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
            { $unwind: '$employeeInfo' },
            { $match: { 'employeeInfo.employeeType': 'cliente' } },
            { $group: { _id: null, total: { $sum: '$valorNetoFinal' } } }
        ]);

        const totalAPagarPromise = TimeLog.aggregate([
            { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
            { $unwind: '$employeeInfo' },
            { $match: { 'employeeInfo.role': 'repartidor' } },
            { $group: { _id: null, total: { $sum: '$valorNetoFinal' } } }
        ]);

        const [cobrarRes, pagarRes] = await Promise.all([totalACobrarPromise, totalAPagarPromise]);
        const totalACobrar = cobrarRes[0]?.total || 0;
        const totalAPagar = pagarRes[0]?.total || 0;
        const gananciaEstimada = totalACobrar - totalAPagar;

        const stats = { totalEmployees, totalClients, totalUsers, totalACobrar, totalAPagar, gananciaEstimada };
        res.status(200).json({ success: true, message: "Estadísticas del dashboard cargadas exitosamente", stats });
    } catch (error) {
        console.error('Error en getDashboardStats:', error);
        res.status(500).json({ message: 'Error al obtener las estadísticas del dashboard', error: error.message });
    }
});

// --- Función para tu Contador Unificado (RESUMEN CONSOLIDADO) ---
const getAccountantLedger = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Por favor, proporciona una fecha de inicio y una fecha de fin para el libro contable.');
    }
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

   const incomePromise = TimeLog.aggregate([
    { $match: { date: { $gte: start, $lte: end }, valorNetoFinal: { $gt: 0 } } },
    { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
    { $unwind: '$employeeInfo' },
    { $match: { 'employeeInfo.employeeType': 'cliente' } },
    { $lookup: { from: 'clients', localField: 'employee', foreignField: 'employees', as: 'clientInfo' } }, // <-- ¡CAMBIO IMPORTANTE!
    { $unwind: '$clientInfo' },
    { $group: {
        _id: '$clientInfo.companyName',
        totalAmount: { $sum: '$valorNetoFinal' },
        firstDate: { $first: '$date' },
        cedula: { $first: '$clientInfo.nit' },
        telefono: { $first: '$clientInfo.phone' },
        direccion: { $first: '$clientInfo.address' },
        email: { $first: '$clientInfo.email' }
      }
    },
    { $project: {
        _id: 0,
        type: 'income',
        date: '$firstDate',
        description: { $concat: ["Servicio a ", "$_id"] },
        amount: '$totalAmount',
        cedula: '$cedula',
        telefono: '$telefono',
        direccion: '$direccion',
        email: '$email'
      }
    }
]);

    const expensePromise = TimeLog.aggregate([
    { $match: { date: { $gte: start, $lte: end }, valorNetoFinal: { $gt: 0 } } },
    { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
    { $unwind: '$employeeInfo' },
    { $match: { 'employeeInfo.role': 'repartidor' } }, // <-- ¡ESTE ES EL CAMBIO!
    { $group: {
        _id: '$employeeInfo._id',
        totalAmount: { $sum: '$valorNetoFinal' },
        firstDate: { $first: '$date' },
        fullName: { $first: '$employeeInfo.fullName' },
        cedula: { $first: '$employeeInfo.idCard' },
        telefono: { $first: '$employeeInfo.phone' },
        direccion: { $first: '$employeeInfo.address' },
        email: { $first: '$employeeInfo.email' }
      }
    },
    { $project: {
        _id: 0,
        type: 'expense',
        date: '$firstDate',
        description: { $concat: ["Pago a repartidor ", "$fullName"] },
        amount: '$totalAmount',
        cedula: '$cedula',
        telefono: '$telefono',
        direccion: '$direccion',
        email: '$email'
      }
    }
]);

    const [incomeEntries, expenseEntries] = await Promise.all([incomePromise, expensePromise]);
    const totalIncome = incomeEntries.reduce((s, e) => s + (e.amount || 0), 0);
    const totalExpense = expenseEntries.reduce((s, e) => s + (e.amount || 0), 0);
    const finalBalance = totalIncome - totalExpense;
    const allTransactions = [...incomeEntries, ...expenseEntries].sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ totalIncome, totalExpense, finalBalance, transactions: allTransactions });
});

// --- Función para registrar un nuevo empleado (cliente o repartidor) ---
const registerEmployee = asyncHandler(async (req, res) => {
    try {
        const { fullName, cedula, telefono, direccion, email, employeeType } = req.body;
        if (!fullName || !employeeType) {
            return res.status(400).json({ message: 'Nombre completo y tipo de empleado son campos obligatorios.' });
        }
        const newEmployee = new Employee({ fullName, idCard: cedula, phone: telefono, address: direccion, email, employeeType });
        await newEmployee.save();
        res.status(201)
            .json({ message: 'Empleado registrado con éxito', employee: newEmployee });
    } catch (error) {
        console.error('Error al registrar el empleado:', error);
        res.status(500).json({ message: 'Error al registrar el empleado', error: error.message });
    }
});

const getClientDashboardById = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
        res.status(400);
        throw new Error('El ID del cliente no es válido.');
    }
    const client = await Client.findById(clientId).populate('employees', 'fullName idCard phone');
    if (!client) {
        res.status(404);
        throw new Error('Cliente no encontrado.');
    }
    const employeeIds = client.employees.map(e => e._id);
    const auxiliaries = await User.find({ role: 'auxiliar', associatedClient: client._id }).select('username').lean();
    if (!employeeIds.length) {
        return res.json({
            clientProfile: { companyName: client.companyName, defaultHourlyRate: client.defaultHourlyRate, holidayHourlyRate: client.holidayHourlyRate },
            dashboardData: { employeesList: [], grandTotal: 0 },
            auxiliaries: auxiliaries
        });
    }
    const paymentTotals = await TimeLog.aggregate([
        { $match: { employee: { $in: employeeIds } } },
        { $group: { _id: '$employee', totalAPagar: { $sum: '$valorNetoFinal' } } }
    ]);
    const totalsMap = paymentTotals.reduce((acc, { _id, totalAPagar }) => {
        acc[_id.toString()] = totalAPagar;
        return acc;
    }, {});
    const grandTotal = Object.values(totalsMap).reduce((s, t) => s + t, 0);
    const employeesList = client.employees.map(e => ({
        _id: e._id,
        fullName: e.fullName,
        idCard: e.idCard,
        phone: e.phone,
        totalAPagar: totalsMap[e._id.toString()] || 0
    }));
    res.json({
        clientProfile: { companyName: client.companyName, defaultHourlyRate: client.defaultHourlyRate, holidayHourlyRate: client.holidayHourlyRate },
        dashboardData: { employeesList, grandTotal },
        auxiliaries
    });
});

const getCourierDashboardById = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const timeLogs = await TimeLog.find({ employee: employeeId }).sort({ date: -1 });
    res.json(timeLogs);
});

const getEmployeeHistoryForAdmin = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const employee = await Employee.findById(employeeId);
    if (!employee) {
        return res.status(404).json({ message: 'Mensajero no encontrado.' });
    }
    const timeEntries = await TimeLog.find({ employee: employeeId }).sort({ date: -1 });
    res.status(200).json({ employeeName: employee.fullName, timeEntries });
});

// --- NUEVA FUNCIÓN: OBTENER USUARIOS PENDIENTES ---
const getPendingUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ status: 'pendiente' }).select('-password');
    res.status(200).json(users);
});

// --- NUEVA FUNCIÓN: APROBAR UN USUARIO ---
const approveUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
        user.status = 'activo';
        const updatedUser = await user.save();
        res.json({ message: 'Usuario aprobado exitosamente.', user: { _id: updatedUser._id, username: updatedUser.username, role: updatedUser.role, status: updatedUser.status } });
    } else {
        res.status(404);
        throw new Error('Usuario no encontrado.');
    }
});

module.exports = {
    getClientDashboardById,
    getDashboardStats,
    getCourierDashboardById,
    getEmployeeHistoryForAdmin,
    getAccountantLedger,
    registerEmployee,
    getPendingUsers,
    approveUser,
};