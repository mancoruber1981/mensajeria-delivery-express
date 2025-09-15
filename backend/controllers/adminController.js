// backend/controllers/adminController.js

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');
const User = require('../models/User');
const Settlement = require('../models/Settlement');
const Loan = require('../models/Loan');

// --- Función para obtener las estadísticas del Dashboard del Administrador (CORREGIDA) ---
const getDashboardStats = asyncHandler(async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();
        const totalClients = await Client.countDocuments();
        const totalUsers = await User.countDocuments();

        // --- CÁLCULO PARA "TOTAL A COBRAR A CLIENTES" ---
        // Suma todos los registros NO LIQUIDADOS de empleados tipo 'cliente'
        const totalACobrarPromise = TimeLog.aggregate([
            { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
            { $unwind: '$employeeInfo' },
            { $match: { 'employeeInfo.employeeType': 'cliente', isPaid: false } },
            { $group: { _id: null, total: { $sum: '$valorNetoFinal' } } }
        ]);

        // --- CÁLCULO PARA "TOTAL A PAGAR A REPARTIDORES" ---
        // Suma todos los registros NO PAGADOS de empleados tipo 'repartidor'
        const totalAPagarPromise = TimeLog.aggregate([
            { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
            { $unwind: '$employeeInfo' },
            // ✅ CORRECCIÓN CLAVE: Filtra para quedarse SOLO con los registros de REPARTIDORES y que NO estén pagados
            { $match: { 'employeeInfo.role': 'repartidor', isPaid: false } },
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
const settleFortnight = asyncHandler(async (req, res) => {
    // ✅ --- INICIO DE LA CORRECCIÓN DE FECHAS ---
    const today = new Date();
    let startDate, endDate;

    if (today.getDate() <= 15) {
        // Primera quincena del mes actual (días 1-15)
        startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
        endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 16));
    } else {
        // Segunda quincena del mes actual (días 16-fin de mes)
        startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 16));
        endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1));
    }
    // --- FIN DE LA CORRECCIÓN DE FECHAS ---

    // El resto de la función no cambia...
    const unpaidLogs = await TimeLog.find({
        date: { $gte: startDate, $lt: endDate },
        isPaid: false
    });

    if (unpaidLogs.length === 0) {
        return res.status(200).json({ message: 'No hay registros pendientes para liquidar en la quincena.' });
    }
    
    // ... (resto de la lógica para agrupar, crear liquidaciones y marcar como pagado)
    const totalsByEmployee = unpaidLogs.reduce((acc, log) => {
        const employeeId = log.employee.toString();
        if (!acc[employeeId]) {
            acc[employeeId] = { total: 0, logIds: [] };
        }
        acc[employeeId].total += log.valorNetoFinal;
        acc[employeeId].logIds.push(log._id);
        return acc;
    }, {});

    for (const employeeId in totalsByEmployee) {
        await Settlement.create({
            entity: employeeId,
            entityModel: 'Employee',
            startDate: startDate,
            endDate: new Date(endDate.getTime() - 1),
            totalAmount: totalsByEmployee[employeeId].total,
            timeLogs: totalsByEmployee[employeeId].logIds
        });
        await Employee.findByIdAndUpdate(employeeId, { $inc: { currentBalance: -totalsByEmployee[employeeId].total } });
    }
    
    const processedLogIds = unpaidLogs.map(log => log._id);
    await TimeLog.updateMany(
        { _id: { $in: processedLogIds } },
        { $set: { isPaid: true, estado: 'PAGADO', paymentDate: new Date() } }
    );

    res.status(200).json({
        message: `Liquidación completada exitosamente para ${Object.keys(totalsByEmployee).length} empleado(s).`
    });
});

const settleFortnightForEmployee = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { deductSocialSecurity } = req.body;

    const today = new Date();
    let startDate, endDate;
    if (today.getDate() <= 15) {
        startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
        endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 16));
    } else {
        startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 16));
        endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1));
    }

    const unpaidLogs = await TimeLog.find({
        employee: employeeId,
        date: { $gte: startDate, $lt: endDate },
        isPaid: false
    });

    if (unpaidLogs.length === 0) {
        return res.status(200).json({ message: 'Este empleado no tiene registros pendientes para liquidar.' });
    }

    let grossSettlementAmount = unpaidLogs.reduce((acc, log) => acc + log.valorNetoFinal, 0);
    const logIds = unpaidLogs.map(log => log._id);
    let finalNetAmount = grossSettlementAmount;
    
    const activeLoan = await Loan.findOne({ employee: employeeId, status: 'Aprobado' });
    let loanRepaymentAmount = 0;
    if (activeLoan) {
        loanRepaymentAmount = Math.min(activeLoan.amount / activeLoan.installments, activeLoan.outstandingBalance);
        finalNetAmount -= loanRepaymentAmount;
    }

    if (deductSocialSecurity) {
        finalNetAmount -= 95000; // Asumiendo valor fijo
    }

    await Settlement.create({
        entity: employeeId,
        entityModel: 'Employee',
        startDate: startDate,
        endDate: new Date(endDate.getTime() - 1),
        totalAmount: finalNetAmount,
        timeLogs: logIds
    });

    if (activeLoan) {
        activeLoan.outstandingBalance -= loanRepaymentAmount;
        activeLoan.repayments.push({ amount: loanRepaymentAmount, settlementId: settlement._id }); // Guardar referencia
        if (activeLoan.outstandingBalance <= 0) {
            activeLoan.status = 'Pagado';
        }
        await activeLoan.save();
    }
    
    await TimeLog.updateMany({ _id: { $in: logIds } }, { $set: { isPaid: true, estado: 'PAGADO', paymentDate: new Date() } });
    await Employee.findByIdAndUpdate(employeeId, { $inc: { currentBalance: -grossSettlementAmount } });

    res.status(200).json({ message: `Liquidación individual completada.` });
});

const getSettlementPreview = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    const today = new Date();
    let startDate, endDate;
    if (today.getDate() <= 15) {
        startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
        endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 16));
    } else {
        startDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 16));
        endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 1));
    }

    const unpaidLogs = await TimeLog.find({
        employee: employeeId,
        date: { $gte: startDate, $lt: endDate },
        isPaid: false
    });

    const grossTotal = unpaidLogs.reduce((acc, log) => acc + log.valorNetoFinal, 0);
    
    const activeLoan = await Loan.findOne({ employee: employeeId, status: 'Aprobado' });
    let loanRepayment = 0;
    if (activeLoan) {
        loanRepayment = Math.min(activeLoan.amount / activeLoan.installments, activeLoan.outstandingBalance);
    }
    
    const socialSecurityDeduction = 95000;
    const finalTotal = grossTotal - loanRepayment - socialSecurityDeduction;

    res.json({
        grossTotal,
        loanRepayment,
        socialSecurityDeduction,
        finalTotal
    });
});

// En backend/controllers/adminController.js

const settleClientTotal = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const client = await Client.findById(clientId);
    if (!client) { throw new Error('Cliente no encontrado.'); }
    const employeeIds = client.employees;

    // Busca TODOS los registros no pagados de los empleados de este cliente
    const unpaidLogs = await TimeLog.find({
        employee: { $in: employeeIds },
        isPaid: false
    });

    if (unpaidLogs.length === 0) {
        return res.status(200).json({ message: 'Este cliente no tiene registros pendientes para liquidar.' });
    }

    const totalAmount = unpaidLogs.reduce((acc, log) => acc + log.valorNetoFinal, 0);
    const logIds = unpaidLogs.map(log => log._id);
    const startDate = unpaidLogs.reduce((min, log) => log.date < min ? log.date : min, unpaidLogs[0].date);
    const endDate = unpaidLogs.reduce((max, log) => log.date > max ? log.date : max, unpaidLogs[0].date);


    await Settlement.create({
        entity: clientId,
        entityModel: 'Client',
        startDate: startDate,
        endDate: new Date(endDate.getTime() - 1),
        totalAmount: totalAmount,
        timeLogs: logIds
    });
    // Marca TODOS los registros liquidados como pagados para que no se vuelvan a sumar
    await TimeLog.updateMany(
        { _id: { $in: logIds } },
        { $set: { isPaid: true, estado: 'PAGADO', paymentDate: new Date() } }
    );

    res.status(200).json({
        message: `Liquidación para ${client.companyName} completada por un total de ${totalAmount.toLocaleString('es-CO')}.`
    });
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
    // ... (tus validaciones no cambian) ...
    const client = await Client.findById(clientId).populate('employees', 'fullName idCard phone');
    if (!client) { throw new Error('Cliente no encontrado.'); }
    const employeeIds = client.employees.map(e => e._id);
    const auxiliaries = await User.find({ role: 'auxiliar', associatedClient: client._id }).select('username').lean();
    if (!employeeIds.length) {
        return res.json({
            clientProfile: { companyName: client.companyName },
            dashboardData: { employeesList: [], grandTotal: 0 },
            auxiliaries
        });
    }

    // ✅ LÓGICA CORREGIDA: Suma TODOS los registros pendientes de este cliente
    const paymentTotals = await TimeLog.aggregate([
        { $match: { employee: { $in: employeeIds }, isPaid: false } }, // Solo registros pendientes
        { $group: { _id: '$employee', totalAPagar: { $sum: '$valorNetoFinal' } } }
    ]);

    const totalsMap = paymentTotals.reduce((acc, { _id, totalAPagar }) => {
        acc[_id.toString()] = totalAPagar; return acc;
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

// ESTA ES LA FUNCIÓN PARA LA PÁGINA DE HISTORIAL
const getEmployeeHistory = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
        res.status(404);
        throw new Error('Empleado no encontrado');
    }

    const timeLogs = await TimeLog.find({ employee: employeeId }).sort({ date: -1 });

    res.json({
        employeeName: employee.fullName,
        timeLogs: timeLogs
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

const handleExportToExcel = async () => {
    try {
        let response;
        // Si es el admin, llama a la nueva ruta con el ID del cliente
        if (isAdminView) {
            response = await API.get(`/admin/export/client/${clientId}`, {
                responseType: 'blob',
            });
        } 
        // Si es el cliente, usa su ruta "me" original
        else {
            response = await API.get('/clients/me/export-timelogs', {
                responseType: 'blob',
            });
        }
        
        // ... (el resto de la lógica para descargar el archivo no cambia) ...
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const contentDisposition = response.headers['content-disposition'];
        let fileName = 'reporte.xlsx';
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            if (fileNameMatch && fileNameMatch[1]) fileName = fileNameMatch[1];
        }
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
    } catch (err) {
        toast.error(err.response?.data?.message || 'Error al exportar a Excel.');
    }
};

const exportClientDataForAdmin = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const client = await Client.findById(clientId);
    if (!client) {
        throw new Error('Perfil de cliente no encontrado.');
    }
    
    const timeLogs = await TimeLog.find({ employee: { $in: client.employees } })
        .populate('employee', 'fullName')
        .sort({ date: 1 });

    if (timeLogs.length === 0) {
        throw new Error('No hay datos para exportar para este cliente.');
    }

    const dataForExcel = timeLogs.map(log => ({
        fecha: new Date(log.date).toLocaleDateString('es-CO'),
        empleado: log.employee.fullName,
        valorNetoFinal: log.valorNetoFinal,
        estado: log.isPaid ? 'Liquidado' : 'Pendiente'
    }));

    const fileNamePrefix = client.companyName.replace(/[^a-zA-Z0-9]/g, '_');
    const buffer = await generateTimeLogExcelReport(dataForExcel, `Reporte_${fileNamePrefix}`);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Admin_${fileNamePrefix}.xlsx`);
    res.send(buffer);
});

const createAuxiliaryForClient = asyncHandler(async (req, res) => {

    console.log("Paso 3: La petición llegó al controlador createAuxiliaryForClient en el backend.");

    const { clientId } = req.params; // Obtiene el ID del cliente de la URL
    const { username, password } = req.body;

    const client = await Client.findById(clientId);
    if (!client) {
        throw new Error('Cliente no encontrado.');
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
        throw new Error('El nombre de usuario ya existe.');
    }

    await User.create({
        username,
        password,
        role: 'auxiliar',
        status: 'activo',
        associatedClient: client._id // Asocia al auxiliar con el ID del cliente correcto
    });

    res.status(201).json({ message: 'Auxiliar registrado para el cliente con éxito.' });
});

const deleteAuxiliaryByAdmin = asyncHandler(async (req, res) => {
    const { auxiliaryId } = req.params;
    const auxiliary = await User.findById(auxiliaryId);

    if (!auxiliary || auxiliary.role !== 'auxiliar') {
        res.status(404);
        throw new Error('Usuario auxiliar no encontrado.');
    }

    // Como es el admin, tiene permiso para eliminarlo directamente
    await auxiliary.deleteOne();
    res.status(200).json({ message: 'Auxiliar eliminado con éxito por el administrador.' });
});


module.exports = {
    getDashboardStats,
    settleFortnight,
    settleFortnightForEmployee,
    getSettlementPreview,
    settleClientTotal,
    getClientDashboardById,
    getEmployeeHistoryForAdmin,
    getAccountantLedger,
    registerEmployee,
    getPendingUsers,
    approveUser,
    exportClientDataForAdmin,
    createAuxiliaryForClient,
    deleteAuxiliaryByAdmin
};