// backend/controllers/adminController.js

const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');
const User = require('../models/User');
const Settlement = require('../models/Settlement');
const Loan = require('../models/Loan');
const Expense = require('../models/Expense'); 
const ExtraIncome = require('../models/ExtraIncome');


const getDashboardStats = asyncHandler(async (req, res) => {
    try {
        const totalEmployees = await Employee.countDocuments();
        const totalClients = await Client.countDocuments();
        const totalUsers = await User.countDocuments();
        const clients = await Client.find({}).select('employees');
        const employeeIdsOfClients = clients.flatMap(client => client.employees);
        const cobrarRes = await TimeLog.aggregate([
            { $match: { isPaid: false, employee: { $in: employeeIdsOfClients } } },
            { $group: { _id: null, total: { $sum: '$valorNetoFinal' } } }
        ]);

        const pagarRes = await TimeLog.aggregate([
            { $match: { isPaid: false } },
            { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
            { $unwind: '$employeeInfo' },
            { $match: { 'employeeInfo.employeeType': { $ne: 'cliente' } } },
            { $group: { _id: null, total: { $sum: '$valorNetoFinal' } } }
        ]);

        const totalACobrar = cobrarRes[0]?.total || 0;
        const totalAPagar = pagarRes[0]?.total || 0;
        const gananciaEstimada = totalACobrar - totalAPagar;

        res.json({ stats: { totalEmployees, totalClients, totalUsers, totalACobrar, totalAPagar, gananciaEstimada } });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener las estadísticas', error: error.message });
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
    const unpaidLogs = await TimeLog.find({ employee: employeeId, isPaid: false });
    if (unpaidLogs.length === 0) {
        return res.status(200).json({ message: 'Este empleado no tiene registros pendientes para liquidar.' });
    }
    const grossSettlementAmount = unpaidLogs.reduce((acc, log) => acc + log.valorNetoFinal, 0);
    const logIds = unpaidLogs.map(log => log._id);
    let loanRepaymentAmount = 0;
    let socialSecurityAmount = 0;
    const activeLoan = await Loan.findOne({ employee: employeeId, status: 'Aprobado' });
    if (activeLoan && activeLoan.outstandingBalance > 0) {
        loanRepaymentAmount = Math.min(activeLoan.amount / activeLoan.installments, activeLoan.outstandingBalance);
    }
    if (deductSocialSecurity) {
        socialSecurityAmount = 95000;
    }
    const finalNetAmount = grossSettlementAmount - loanRepaymentAmount - socialSecurityAmount;
    const newSettlement = await Settlement.create({
        entity: employeeId,
        entityModel: 'Employee',
        startDate: startDate,
        endDate: new Date(endDate.getTime() - 1),
        grossAmount: grossSettlementAmount,
        loanDeduction: loanRepaymentAmount,
        socialSecurityDeduction: socialSecurityAmount,
        totalAmount: finalNetAmount,
        timeLogs: logIds
    });
    if (activeLoan) {
        activeLoan.outstandingBalance -= loanRepaymentAmount;
        activeLoan.repayments.push({ amount: loanRepaymentAmount, settlementId: newSettlement._id });
        if (activeLoan.outstandingBalance <= 0) {
            activeLoan.outstandingBalance = 0;
            activeLoan.status = 'Pagado';
        }
        await activeLoan.save();
    }
    await TimeLog.updateMany({ _id: { $in: logIds } }, { $set: { isPaid: true, estado: 'PAGADO', paymentDate: new Date() } });
    res.status(200).json({ message: `Liquidación individual completada.` });
});

const getSettlementPreview = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    // 1. Encontrar todos los registros pendientes de pago (sin filtro de fecha)
    const unpaidLogs = await TimeLog.find({
        employee: employeeId,
        isPaid: false
    });

    if (unpaidLogs.length === 0) {
        return res.status(404).json({ message: 'No hay registros pendientes para previsualizar.' });
    }

    // 2. Calcular el total bruto sumando el valor neto final de cada registro
    const grossTotal = unpaidLogs.reduce((acc, log) => acc + (log.valorNetoFinal || 0), 0);

    // 3. Buscar si hay un préstamo activo para calcular el descuento
    const activeLoan = await Loan.findOne({ employee: employeeId, status: 'Aprobado' });
    let loanRepayment = 0;
    if (activeLoan && activeLoan.outstandingBalance > 0) {
        // Calcula la cuota del préstamo
        loanRepayment = Math.min(activeLoan.amount / activeLoan.installments, activeLoan.outstandingBalance);
    }
    
    // 4. Definir el valor de la seguridad social (puedes ajustarlo si es dinámico)
    const socialSecurityDeduction = 95000;

    // 5. Enviar el objeto con todos los cálculos al frontend
    res.status(200).json({
        grossTotal,
        loanRepayment,
        socialSecurityDeduction
    });
});


const settleClientTotal = asyncHandler(async (req, res) => {
    const { clientId } = req.params;
    const client = await Client.findById(clientId);
    if (!client) { 
        res.status(404);
        throw new Error('Cliente no encontrado.'); 
    }
    const employeeIds = client.employees;

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

    // --- BLOQUE DE CREACIÓN CORREGIDO Y COMPLETO ---
    await Settlement.create({
        entity: clientId,
        entityModel: 'Client',
        startDate: startDate,
        endDate: endDate, // Usamos la fecha final real del último registro
        grossAmount: totalAmount,             // CAMBIO: Añadido el monto bruto
        loanDeduction: 0,                   // CAMBIO: Añadido explícitamente como 0
        socialSecurityDeduction: 0,         // CAMBIO: Añadido explícitamente como 0
        totalAmount: totalAmount,             // El neto y el bruto son iguales para el cliente
        timeLogs: logIds
    });
    
    // Marcamos los registros como pagados
    await TimeLog.updateMany(
        { _id: { $in: logIds } },
        { $set: { isPaid: true, estado: 'PAGADO', paymentDate: new Date() } }
    );

    res.status(200).json({
        message: `Liquidación para ${client.companyName} completada por un total de ${totalAmount.toLocaleString('es-CO')}.`
    });
});

const getAccountantLedger = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Por favor, proporciona una fecha de inicio y una fecha de fin.');
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0); 
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // --- PASO 1: BUSCAR EN TODAS LAS FUENTES DE DATOS ---
    const incomePromise = TimeLog.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
        { $unwind: '$employeeInfo' },
        { $match: { 'employeeInfo.employeeType': 'cliente' } },
        { $group: { _id: '$empresa', totalAmount: { $sum: '$valorNetoFinal' } } },
        { $project: { _id: 0, date: end, description: { $concat: ["Ingresos por servicios a: ", "$_id"] }, amount: '$totalAmount', type: 'income' } }
    ]);

    const expensePromise = TimeLog.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $lookup: { from: 'employees', localField: 'employee', foreignField: '_id', as: 'employeeInfo' } },
        { $unwind: '$employeeInfo' },
        { $match: { 'employeeInfo.employeeType': { $ne: 'cliente' } } },
        { $group: { _id: '$employeeInfo.fullName', totalAmount: { $sum: '$valorNetoFinal' } } },
        { $project: { _id: 0, date: end, description: { $concat: ["Pago por servicios a: ", "$_id"] }, amount: '$totalAmount', type: 'expense' } }
    ]);
    
    const loansPromise = Loan.find({
        dateGranted: { $gte: start, $lte: end },
        status: 'Aprobado'
    }).populate('employee', 'fullName').lean();

    const otherExpensesPromise = Expense.find({ date: { $gte: start, $lte: end } }).lean();

      const extraIncomesPromise = ExtraIncome.find({ date: { $gte: start, $lte: end } }).lean();

     const [incomeEntries, expenseEntries, loanEntries, otherExpenses, extraIncomes] = await Promise.all([
        incomePromise, 
        expensePromise,
        loansPromise,
        otherExpensesPromise,
        extraIncomesPromise 
    ]);

    // --- PASO 2: UNIFICAR TODOS LOS MOVIMIENTOS ---
    let allTransactions = [...incomeEntries, ...expenseEntries]; // <-- La variable se llama allTransactions

     extraIncomes.forEach(inc => {
        allTransactions.push({ date: inc.date, description: `Ingreso Extra: ${inc.description}`, amount: inc.amount, type: 'income' });
    });

    loanEntries.forEach(loan => {
        allTransactions.push({ // <-- Usamos allTransactions
            date: loan.dateGranted,
            description: `Préstamo otorgado a: ${loan.employee.fullName}`,
            amount: loan.amount,
            type: 'expense'
        });
    });

    otherExpenses.forEach(expense => {
        allTransactions.push({ // <-- Usamos allTransactions
            date: expense.date,
            description: expense.description,
            amount: expense.amount,
            type: 'expense'
        });
    });
    
    extraIncomes.forEach(inc => {
        allTransactions.push({
            date: inc.date,
            description: `Ingreso Extra: ${inc.description}`,
            amount: inc.amount,
            type: 'income'
        });
    });

    // --- PASO 3: CALCULAR TOTALES Y ENVIAR RESPUESTA ---
    allTransactions = allTransactions.filter(t => t.amount > 0);
    const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const finalBalance = totalIncome - totalExpense;
    allTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ 
        transactions: allTransactions, 
        totalIncome, 
        totalExpense, 
        finalBalance 
    });
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

// en backend/controllers/adminController.js

// Al principio del archivo, junto a tus otras importaciones, asegúrate de tener esta:
const ExcelJS = require('exceljs');

const getEmployeeSettlementReport = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { startDate, endDate, includeSS } = req.query;

    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Por favor, proporciona una fecha de inicio y de fin para el reporte.');
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const employee = await Employee.findById(employeeId).lean();
    if (!employee) {
        res.status(404);
        throw new Error('Mensajero no encontrado.');
    }

    const timeLogs = await TimeLog.find({
        employee: employeeId,
        date: { $gte: start, $lte: end }
    }).sort({ date: 1 }).lean();

    if (timeLogs.length === 0) {
        return res.status(404).json({ message: 'No se encontraron registros para este mensajero en el período seleccionado.' });
    }

    // --- Toda tu lógica para la hoja de Resumen está perfecta, no la cambiamos ---
    const activeLoan = await Loan.findOne({ employee: employeeId, status: 'Aprobado' }).lean();
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Delivery Express SAS';
    const summarySheet = workbook.addWorksheet('Resumen');
    const totalBrutoServicios = timeLogs.reduce((acc, log) => acc + log.valorNetoFinal, 0);
    let descuentoPrestamo = 0;
    if (activeLoan) {
        descuentoPrestamo = Math.min(activeLoan.amount / activeLoan.installments, activeLoan.outstandingBalance);
    }
    let descuentoSeguridadSocial = 0;
    if (includeSS === 'true') {
        descuentoSeguridadSocial = 95000;
    }
    const totalNetoAPagar = totalBrutoServicios - descuentoPrestamo - descuentoSeguridadSocial;
    summarySheet.mergeCells('A1:D1');
    summarySheet.getCell('A1').value = `REPORTE DE SERVICIOS - ${employee.fullName}`;
    summarySheet.getCell('A1').font = { bold: true, size: 16 };
    summarySheet.getCell('A3').value = 'Periodo:';
    summarySheet.getCell('B3').value = `${start.toISOString().slice(0,10)} al ${end.toISOString().slice(0,10)}`;
    summarySheet.getCell('A5').value = 'Subtotal Servicios (Neto):';
    summarySheet.getCell('B5').value = totalBrutoServicios;
    summarySheet.getCell('B5').numFmt = '$ #,##0.00';
    summarySheet.getCell('A6').value = '(-) Descuento Préstamo:';
    summarySheet.getCell('B6').value = descuentoPrestamo;
    summarySheet.getCell('B6').numFmt = '$ #,##0.00';
    summarySheet.getCell('A7').value = '(-) Seg. Social (Estimado):';
    summarySheet.getCell('B7').value = descuentoSeguridadSocial;
    summarySheet.getCell('B7').numFmt = '$ #,##0.00';
    summarySheet.getCell('A8').value = 'TOTAL NETO DEL PERIODO:';
    summarySheet.getCell('A8').font = { bold: true };
    summarySheet.getCell('B8').value = totalNetoAPagar;
    summarySheet.getCell('B8').font = { bold: true };
    summarySheet.getCell('B8').numFmt = '$ #,##0.00';
    summarySheet.getColumn('A').width = 35;
    summarySheet.getColumn('B').width = 20;

    // --- HOJA DE DETALLE (Aquí aplicamos los cambios) ---
    const detailsSheet = workbook.addWorksheet('Detalle de Registros');

    // --- CAMBIO 1: AÑADIR LAS NUEVAS COLUMNAS DE HORAS ---
    detailsSheet.columns = [
        { header: 'Fecha', key: 'date', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
        { header: 'Empresa', key: 'empresa', width: 25 },
        { header: 'Hora Inicio', key: 'horaInicio', width: 15 },
        { header: 'Hora Fin', key: 'horaFin', width: 15 },
        { header: 'Total Horas (HH:MM)', key: 'totalHorasCalculadas', width: 20 },
        { header: 'Subtotal', key: 'subtotal', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Desc. Almuerzo', key: 'descuentoAlmuerzo', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Deducción Préstamo (Ind.)', key: 'totalLoanDeducted', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Valor Neto Final', key: 'valorNetoFinal', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Estado', key: 'estado', width: 15 },
    ];
    
    // --- CAMBIO 2: CALCULAR LAS HORAS PARA CADA FILA ---
    let totalMinutesForEmployee = 0;
    const detailsData = timeLogs.map(log => {
        let logDurationMinutes = 0;
        if (log.horaInicio && log.horaFin) {
            const [startH, startM] = log.horaInicio.split(':').map(Number);
            const [endH, endM] = log.horaFin.split(':').map(Number);
            let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
            if (diffMinutes < 0) diffMinutes += 24 * 60;
            logDurationMinutes = diffMinutes;
        }
        totalMinutesForEmployee += logDurationMinutes; // Acumulamos

        const hours = Math.floor(logDurationMinutes / 60);
        const minutes = logDurationMinutes % 60;
        const totalHorasFormato = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        return {
            date: new Date(log.date),
            empresa: log.empresa,
            horaInicio: log.horaInicio || 'N/A',
            horaFin: log.horaFin || 'N/A',
            totalHorasCalculadas: totalHorasFormato,
            subtotal: log.subtotal,
            descuentoAlmuerzo: log.descuentoAlmuerzo,
            totalLoanDeducted: log.totalLoanDeducted,
            valorNetoFinal: log.valorNetoFinal,
            estado: log.isPaid ? 'Pagado' : 'Pendiente'
        };
    });
    detailsSheet.addRows(detailsData);
    
    // --- CAMBIO 3: AÑADIR EL TOTAL DE HORAS A LA FILA DE SUMA (Y CORREGIR COLUMNAS) ---
    const dataRowCount = detailsData.length;
    if (dataRowCount > 0) {
        const totalHours = Math.floor(totalMinutesForEmployee / 60);
        const totalMinutes = totalMinutesForEmployee % 60;
        const formattedTotalHours = `${String(totalHours).padStart(2, '0')}:${String(totalMinutes).padStart(2, '0')}`;

        const totalRow = detailsSheet.addRow([]); // Fila vacía
        const totalRowData = {
            'totalHorasCalculadas': formattedTotalHours,
            'valorNetoFinal': { formula: `SUM(I2:I${1 + dataRowCount})` } // OJO: La columna ahora es la I
        };
        const addedTotalRow = detailsSheet.addRow(totalRowData);

        // Ponemos la etiqueta "TOTAL:" en la columna correcta antes de los valores
        detailsSheet.getCell(`H${addedTotalRow.number}`).value = 'TOTAL:'; // OJO: Columna H
        detailsSheet.getCell(`H${addedTotalRow.number}`).font = { bold: true };
        detailsSheet.getCell(`H${addedTotalRow.number}`).alignment = { horizontal: 'right' };
        addedTotalRow.font = { bold: true };
    }

    const fileName = `Reporte_${employee.fullName.replace(/\s/g, '_')}_${start.toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    await workbook.xlsx.write(res);
    res.end();
});
const getOwnSettlementReport = asyncHandler(async (req, res) => {

        console.log("--- EJECUTANDO VERSIÓN FINAL DEL REPORTE MAESTRO (CON DETALLES DE CONTACTO) ---");

    const employeeId = req.user.profile; // Obtenemos el ID del propio usuario logueado
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Por favor, proporciona una fecha de inicio y de fin.');
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    const settlements = await Settlement.find({
        entity: employeeId,
        createdAt: { $gte: start, $lte: end }
    }).lean();

    if (settlements.length === 0) {
        return res.status(404).json({ message: 'No se encontraron liquidaciones para ti en el período seleccionado.' });
    }

    const timeLogIds = settlements.flatMap(s => s.timeLogs);
    const timeLogsDetails = await TimeLog.find({ _id: { $in: timeLogIds } }).sort({ date: 1 }).lean();

    const workbook = new ExcelJS.Workbook();
    const detailsSheet = workbook.addWorksheet('Detalle de Registros');

    detailsSheet.columns = [
        { header: 'Fecha', key: 'date', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
        { header: 'Empresa', key: 'empresa', width: 25 },
        { header: 'Día Festivo', key: 'diaFestivo', width: 12 },
        { header: 'Hora Inicio', key: 'horaInicio', width: 12 },
        { header: 'Hora Fin', key: 'horaFin', width: 12 },
        { header: 'Subtotal', key: 'subtotal', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Desc. Almuerzo', key: 'descuentoAlmuerzo', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Valor Neto Inicial', key: 'valorNetoInicial', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Valor Neto Final', key: 'valorNetoFinal', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Estado', key: 'estado', width: 15 },
    ];

    const detailsData = timeLogsDetails.map(log => ({
        date: new Date(log.date), empresa: log.empresa, diaFestivo: log.festivo ? 'Sí' : 'No',
        horaInicio: log.horaInicio, horaFin: log.horaFin, subtotal: log.subtotal,
        descuentoAlmuerzo: log.descuentoAlmuerzo, valorNetoInicial: log.valorNetoInicial,
        valorNetoFinal: log.valorNetoFinal, estado: log.estado
    }));
    detailsSheet.addRows(detailsData);

    const totalRow = detailsSheet.addRow([]);
    const lastDataRow = detailsSheet.lastRow.number - 1;
    const totalsLabelCell = totalRow.getCell('H');
    totalsLabelCell.value = 'TOTAL:';
    totalsLabelCell.font = { bold: true };
    totalsLabelCell.alignment = { horizontal: 'right' };

    const totalsValueCell = totalRow.getCell('I');
    totalsValueCell.value = { formula: `SUM(I2:I${lastDataRow})` }; 
    totalsValueCell.font = { bold: true };
    totalsValueCell.numFmt = '$ #,##0.00';

    const fileName = `MiReporte_${start.toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    await workbook.xlsx.write(res);
    res.end();
});


const generateMasterReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        throw new Error('Las fechas de inicio y fin son requeridas.');
    }

    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0); 
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // --- 1. PREPARAMOS TODAS LAS BÚSQUEDAS ---
    const timeLogsPromise = TimeLog.find({ date: { $gte: start, $lte: end } })
        .populate({ path: 'employee', select: 'fullName employeeType idCard phone address' })
        .lean();
    
    const loansPromise = Loan.find({ dateGranted: { $gte: start, $lte: end }, status: 'Aprobado' })
        .populate('employee', 'fullName idCard phone address')
        .lean();

    const otherExpensesPromise = Expense.find({ date: { $gte: start, $lte: end } }).lean();
    const extraIncomesPromise = ExtraIncome.find({ date: { $gte: start, $lte: end } }).lean();

    // --- 2. EJECUTAMOS TODAS LAS BÚSQUEDAS A LA VEZ ---
    const [timeLogs, loans, otherExpenses, extraIncomes] = await Promise.all([
        timeLogsPromise,
        loansPromise,
        otherExpensesPromise,
        extraIncomesPromise
    ]);

    // --- 3. PROCESAMOS Y UNIFICAMOS LOS DATOS ---
    const clientNames = [...new Set(timeLogs.filter(log => log.employee?.employeeType === 'cliente').map(log => log.empresa))];
    const clients = await Client.find({ companyName: { $in: clientNames } }).lean();
    const clientDetailsMap = clients.reduce((map, client) => { map[(client.companyName || '').trim()] = client; return map; }, {});
    const transactions = [];
    const incomeByClient = timeLogs.filter(l => l.employee?.employeeType === 'cliente' && l.valorNetoFinal > 0).reduce((acc, log) => { const name = (log.empresa || 'CG').trim(); if (!acc[name]) { acc[name] = { amount: 0, details: clientDetailsMap[name] }; } acc[name].amount += log.valorNetoFinal; return acc; }, {});
    for (const name in incomeByClient) { const data = incomeByClient[name]; transactions.push({ date: end, description: `Ingresos por servicios a: ${name}`, type: 'income', amount: data.amount, contact: data.details }); }
    const expensesByEmployee = timeLogs.filter(l => l.employee?.employeeType !== 'cliente' && l.valorNetoFinal > 0).reduce((acc, log) => { const empId = log.employee._id.toString(); if (!acc[empId]) { acc[empId] = { amount: 0, employee: log.employee }; } acc[empId].amount += log.valorNetoFinal; return acc; }, {});
    for (const empId in expensesByEmployee) { const data = expensesByEmployee[empId]; transactions.push({ date: end, description: `Pago por servicios a: ${data.employee.fullName}`, type: 'expense', amount: data.amount, contact: data.employee }); }
    loans.forEach(loan => { transactions.push({ date: loan.dateGranted, description: `Préstamo otorgado a: ${loan.employee.fullName}`, amount: loan.amount, type: 'expense', contact: loan.employee }); });
    otherExpenses.forEach(expense => { transactions.push({ date: expense.date, description: expense.description, amount: expense.amount, type: 'expense', contact: { idCard: expense.payeeId, phone: expense.payeePhone, address: expense.payeeAddress } }); });
    extraIncomes.forEach(inc => { transactions.push({ date: inc.date, description: `Ingreso Extra: ${inc.description}`, type: 'income', amount: inc.amount, contact: { idCard: inc.contributorId, phone: inc.contributorPhone, address: inc.contributorAddress } }); });

    const workbook = new ExcelJS.Workbook();
    const ledgerSheet = workbook.addWorksheet('Libro Contable');
    ledgerSheet.columns = [
        { header: 'Fecha', key: 'date', width: 15, style: { numFmt: 'dd/mm/yyyy' } }, { header: 'Descripción', key: 'description', width: 40 },
        { header: 'Cédula/NIT', key: 'contactId', width: 18 }, { header: 'Teléfono', key: 'contactPhone', width: 18 },
        { header: 'Dirección', key: 'contactAddress', width: 40 }, { header: 'Ingreso', key: 'income', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Egreso', key: 'expense', width: 18, style: { numFmt: '$ #,##0.00' } },
    ];
    transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    transactions.forEach(t => {
        ledgerSheet.addRow({
            date: new Date(t.date), description: t.description,
            contactId: t.contact ? (t.contact.nit || t.contact.idCard || '') : '',
            contactPhone: t.contact ? (t.contact.phone || '') : '',
            contactAddress: t.contact ? (t.contact.address || '') : '',
            income: t.type === 'income' ? t.amount : null, expense: t.type === 'expense' ? t.amount : null,
        });
    });

    
    const lastDataRow = ledgerSheet.lastRow.number;
    const totalsRow = ledgerSheet.addRow([]);
    ledgerSheet.getCell(`E${totalsRow.number}`).value = 'TOTALES:';
    ledgerSheet.getCell(`F${totalsRow.number}`).value = { formula: `SUM(F2:F${lastDataRow})` };
    ledgerSheet.getCell(`G${totalsRow.number}`).value = { formula: `SUM(G2:G${lastDataRow})` };
    totalsRow.font = { bold: true };
    const balanceRow = ledgerSheet.addRow([]);
    ledgerSheet.getCell(`E${balanceRow.number}`).value = 'SALDO FINAL:';
    ledgerSheet.getCell(`F${balanceRow.number}`).value = { formula: `F${totalsRow.number}-G${totalsRow.number}` };
    balanceRow.font = { bold: true };
       res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_Maestro_Contable_${startDate}_a_${endDate}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
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
    deleteAuxiliaryByAdmin,
    getEmployeeSettlementReport,
     getOwnSettlementReport,
     generateMasterReport
};