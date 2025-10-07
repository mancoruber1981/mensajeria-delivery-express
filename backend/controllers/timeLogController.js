// backend/controllers/timeLogController.js

// Bloque 1: Importaciones y Módulos
const asyncHandler = require('express-async-handler');
const TimeLog = require('../models/TimeLog');
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const User = require('../models/User');
const ExcelJS = require('exceljs'); 
const { generateTimeLogExcelReport } = require('../utils/excelGenerator');
const { calculateTimeLogValues } = require('../utils/calculationUtils.js');

// Bloque 2: Crear un nuevo registro de horario (Versión Corregida)
const createTimeLog = asyncHandler(async (req, res) => {
    console.log('\n--- 1. INICIANDO createTimeLog ---');
    console.log('--- 2. DATOS RECIBIDOS (req.body):', req.body);
    const { 
        employee, date, horaInicio, horaFin, valorHora, festivo, 
        descuentoAlmuerzo, minutosAlmuerzoSinPago, empresa, 
        totalLoanDeducted, // <-- El dato del préstamo
        horasBrutas, subtotal, valorNeto 
    } = req.body;

    // El backend hace el cálculo final para asegurar que es correcto
    const valorNetoFinalCalculado = (parseFloat(valorNeto) || 0) - (parseFloat(totalLoanDeducted) || 0);

    const newTimeLog = await TimeLog.create({
        employee,
        user: req.user._id, // Usamos el usuario autenticado
        date,
        horaInicio,
        horaFin,
        valorHora,
        festivo,
        descuentoAlmuerzo,
        minutosAlmuerzoSinPago,
        empresa,
        horasBrutas,
        subtotal,
        valorNeto,
        totalLoanDeducted: parseFloat(totalLoanDeducted) || 0, // Guardamos el préstamo
        valorNetoFinal: valorNetoFinalCalculado // Guardamos el valor final correcto
    });

    res.status(201).json(newTimeLog);
});

// Bloque 3: Obtener registros de horario por empleado
const getTimeLogsByEmployeeId = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  console.log("--- DEBUG: getTimeLogsByEmployeeId (Inicio) ---");
  console.log("DEBUG: ID de empleado solicitado:", employeeId);
  console.log("DEBUG: Usuario autenticado:", req.user ? req.user.username : "N/A", "Rol:", req.user ? req.user.role : "N/A");
  console.log("DEBUG: req.user.profile:", req.user ? req.user.profile : "N/A");
  console.log("DEBUG: req.user.profile._id (para repartidor):", req.user?.profile?._id);

  const authenticatedUser = req.user;

  if (authenticatedUser.role === 'cliente' || authenticatedUser.role === 'auxiliar') {
    let clientIdToVerify;
    if (authenticatedUser.role === 'cliente') clientIdToVerify = authenticatedUser._id;
    else clientIdToVerify = authenticatedUser.associatedClient;

    const client = await Client.findOne(authenticatedUser.role === 'cliente' ? { user: clientIdToVerify } : { _id: clientIdToVerify });
    if (!client) {
      console.log("DEBUG: Cliente asociado no encontrado o no autorizado para esta acción.");
      res.status(404);
      throw new Error('Cliente asociado no encontrado o no autorizado para esta acción.');
    }

    if (!client.employees.some(emp => emp.toString() === employeeId)) {
      res.status(403);
      throw new Error('No tienes permiso para ver los registros de este empleado o el empleado no pertenece a este cliente.');
    }
  }
  else if (authenticatedUser.role === 'repartidor') {
    console.log("DEBUG: Rol es Repartidor. Verificando ID del propio repartidor.");
    if (!authenticatedUser.profile || authenticatedUser.profile._id.toString() !== employeeId) {
      console.log("DEBUG: Repartidor no tiene permiso para ver este ID de empleado (ID no coincide).");
      res.status(403);
      throw new Error('Un repartidor solo puede ver sus propios registros.');
    }
    console.log("DEBUG: Repartidor autorizado para ver sus propios registros.");
  }

  const timeLogs = await TimeLog.find({ employee: employeeId }).sort({ date: -1 });
  console.log(`DEBUG: Se encontraron ${timeLogs.length} TimeLogs para el empleado ${employeeId}.`);
  res.json(timeLogs);
  console.log("--- DEBUG: getTimeLogsByEmployeeId (Fin) ---");
});

// Bloque 4: Actualizar un registro de horario (Versión Corregida)
const updateTimeLog = asyncHandler(async (req, res) => {
    const timeLog = await TimeLog.findById(req.params.id);

    if (!timeLog) {
        res.status(404);
        throw new Error('Registro no encontrado');
    }

    // Actualizamos el log con todos los datos que lleguen del formulario
    const { 
        date, horaInicio, horaFin, valorHora, festivo, 
        descuentoAlmuerzo, minutosAlmuerzoSinPago, empresa, 
        totalLoanDeducted, // <-- El dato del préstamo
        horasBrutas, subtotal, valorNeto 
    } = req.body;

    // El backend recalcula el valor final para asegurar consistencia
    const valorNetoFinalCalculado = (parseFloat(valorNeto) || 0) - (parseFloat(totalLoanDeducted) || 0);

    timeLog.date = date || timeLog.date;
    timeLog.horaInicio = horaInicio || timeLog.horaInicio;
    timeLog.horaFin = horaFin || timeLog.horaFin;
    timeLog.valorHora = valorHora || timeLog.valorHora;
    timeLog.festivo = festivo ?? timeLog.festivo;
    timeLog.descuentoAlmuerzo = descuentoAlmuerzo || timeLog.descuentoAlmuerzo;
    timeLog.minutosAlmuerzoSinPago = minutosAlmuerzoSinPago || timeLog.minutosAlmuerzoSinPago;
    timeLog.empresa = empresa || timeLog.empresa;
    timeLog.horasBrutas = horasBrutas || timeLog.horasBrutas;
    timeLog.subtotal = subtotal || timeLog.subtotal;
    timeLog.valorNeto = valorNeto || timeLog.valorNeto;
    timeLog.totalLoanDeducted = totalLoanDeducted || timeLog.totalLoanDeducted;
    timeLog.valorNetoFinal = valorNetoFinalCalculado; // Guardamos el valor final correcto

    const updatedTimeLog = await timeLog.save();
    res.json(updatedTimeLog);
});

// Bloque 5: Resetear registros de horario (para clientes)
const resetTimeLogs = asyncHandler(async (req, res) => {
  if (req.user.role !== 'cliente') {
    res.status(403);
    throw new Error('Solo los clientes pueden resetear quincenas.');
  }

  const client = await Client.findOne({ user: req.user.id });
  if (!client) {
    res.status(404);
    throw new Error('Cliente no encontrado.');
  }

  const empleadosIds = client.employees;
  const logs = await TimeLog.find({ employee: { $in: empleadosIds } });
  if (!logs.length) return res.json({ message: 'Sin registros que exportar o eliminar.' });

  await TimeLog.deleteMany({ employee: { $in: empleadosIds } });
  res.json({ message: 'Registros eliminados y preparados para exportación' /* , excel: buffer */ });
});

// Bloque 6: Eliminar un registro de horario
const deleteTimeLog = asyncHandler(async (req, res) => {
  const timeLog = await TimeLog.findById(req.params.id);
  if (!timeLog) {
    res.status(404);
    throw new Error('Registro no encontrado');
  }

  const authenticatedUser = req.user;
  const userRole = authenticatedUser.role;

  if (userRole === 'admin') {
    // Admin siempre puede eliminar
  } else if (userRole === 'repartidor') {
    if (!authenticatedUser.profile || timeLog.employee.toString() !== authenticatedUser.profile._id.toString()) {
      res.status(403);
      throw new Error('Un repartidor solo puede eliminar sus propios registros.');
    }
  } else if (userRole === 'cliente') {
    if (timeLog.isFixed) {
      res.status(403);
      throw new Error('El registro está fijado y no puede ser eliminado por un cliente.');
    }
    const clientProfile = await Client.findOne({ user: authenticatedUser._id });
    if (!clientProfile || !clientProfile.employees.some(empId => empId.toString() === timeLog.employee.toString())) {
      res.status(403);
      throw new Error('Un cliente solo puede eliminar registros de sus propios empleados.');
    }
  } else if (userRole === 'auxiliar') {
    if (timeLog.isFixed) {
      res.status(403);
      throw new Error('El registro está fijado y no puede ser eliminado por un auxiliar.');
    }
    const clientProfile = await Client.findById(authenticatedUser.associatedClient);
    if (!clientProfile || !clientProfile.employees.some(empId => empId.toString() === timeLog.employee.toString())) {
      res.status(403);
      throw new Error('Un auxiliar solo puede eliminar registros de los empleados de su cliente asociado.');
    }
  } else {
    res.status(403);
    throw new Error('No tienes permiso para eliminar este registro.');
  }

  await timeLog.deleteOne();
  res.json({ message: 'Registro eliminado' });
});

// Bloque 7: Obtener registros de horario por cliente
const getTimeLogsByClient = asyncHandler(async (req, res) => {
  if (req.user.role !== 'cliente') {
    res.status(403);
    throw new Error('Solo los clientes pueden ver todos sus registros.');
  }

  const client = await Client.findOne({ user: req.user.id }).populate('employees');
  if (!client) {
    res.status(404);
    throw new Error('Cliente no encontrado');
  }

  const employeeIds = client.employees.map(emp => emp._id);
  const logs = await TimeLog.find({ employee: { $in: employeeIds } })
    .populate('employee')
    .sort({ date: -1 });
  res.json(logs);
});

// Bloque 8: Exportar registros de tiempo de un empleado a Excel
const exportTimeLogsToExcelForEmployee = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;

    if (req.user.role === 'repartidor') {
        if (!req.user.profile || req.user.profile._id.toString() !== employeeId) {
            return res.status(403).json({ message: 'Sin permiso para exportar estos registros.' });
        }
    } else if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado' });
    }

    // Asegurarse de que el populate traiga el nombre de la empresa/cliente
    const allTimeLogs = await TimeLog.find({ employee: employeeId })
        .populate('empresa', 'name') // 'empresa' es el campo en TimeLog que referencia al Cliente
        .sort({ date: 1 })
        .lean();

    if (!allTimeLogs || allTimeLogs.length === 0) {
        return res.status(404).json({ message: 'No tienes ningún registro en tu historial para exportar.' });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Delivery Express SAS';
    const detailsSheet = workbook.addWorksheet('Historial Completo de Registros');

    // --- Definir columnas (headers) ACTUALIZADAS ---
    detailsSheet.columns = [
        { header: 'Fecha', key: 'date', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
        { header: 'Empresa', key: 'empresa', width: 25 },
        { header: 'Hora Inicio', key: 'horaInicio', width: 15 },    // NUEVA COLUMNA
        { header: 'Hora Fin', key: 'horaFin', width: 15 },          // NUEVA COLUMNA
        { header: 'Total Horas', key: 'totalHoras', width: 15 },    // NUEVA COLUMNA Y SUMATORIO AL FINAL
        { header: 'Valor por Hora', key: 'valorHora', width: 18, style: { numFmt: '$ #,##0.00' } }, // Añadido
        { header: 'Subtotal', key: 'subtotal', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Desc. Almuerzo', key: 'descuentoAlmuerzo', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Valor Neto Inicial', key: 'valorNetoInicial', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Deducción Préstamo', key: 'totalLoanDeducted', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Valor Neto Final', key: 'valorNetoFinal', width: 18, style: { numFmt: '$ #,##0.00' } },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Fecha de Pago', key: 'paidDate', width: 15, style: { numFmt: 'dd/mm/yyyy' } }, // Añadido
        { header: 'Notas', key: 'notes', width: 30 } // Añadido
    ];

    let totalMinutesForAllLogs = 0; // Para la autosuma de horas

    const detailsData = allTimeLogs.map(log => {
        const horaInicio = log.horaInicio || 'N/A';
        const horaFin = log.horaFin || 'N/A';
        let totalHorasFormato = 'N/A';
        let logDurationMinutes = 0; // Duración de este log en minutos

        if (log.horaInicio && log.horaFin) {
            const [startH, startM] = log.horaInicio.split(':').map(Number);
            const [endH, endM] = log.horaFin.split(':').map(Number);

            let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
            if (diffMinutes < 0) diffMinutes += 24 * 60; // Manejo de turnos nocturnos

            logDurationMinutes = diffMinutes;
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            totalHorasFormato = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        totalMinutesForAllLogs += logDurationMinutes; // Suma al total global

        return {
            date: new Date(log.date),
            empresa: log.empresa ? log.empresa.name : 'N/A', // Asegúrate de que 'empresa' esté populado para obtener el nombre
            horaInicio: horaInicio,
            horaFin: horaFin,
            totalHoras: totalHorasFormato, // Aquí va el HH:MM de este log
            valorHora: log.valorHora || 0, // Asegúrate que este campo existe en tu modelo
            subtotal: log.subtotal || 0,
            descuentoAlmuerzo: log.descuentoAlmuerzo || 0,
            valorNetoInicial: log.valorNeto || 0,
            totalLoanDeducted: log.totalLoanDeducted || 0,
            valorNetoFinal: log.valorNetoFinal || 0,
            estado: log.isPaid ? 'Pagado' : 'Pendiente',
            paidDate: log.paidDate ? new Date(log.paidDate) : '',
            notes: log.notes || '' // Asegúrate que este campo existe en tu modelo
        };
    });
    detailsSheet.addRows(detailsData);

    // --- Fila de SUMA TOTAL DE HORAS (Autosuma) y SUMA TOTAL MONETARIA ---
    const dataRowCount = detailsData.length;
    if (dataRowCount > 0) {
        const totalRow = detailsSheet.addRow([]); // Fila vacía para espacio

        // Suma TOTAL DE HORAS
        const totalHours = Math.floor(totalMinutesForAllLogs / 60);
        const remainingMinutes = totalMinutesForAllLogs % 60;
        const totalHoursFormatted = `${String(totalHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;

        const totalHoursLabelCell = totalRow.getCell('D'); // Columna 'D' para "Hora Fin" (visual, ajusta si es necesario)
        totalHoursLabelCell.value = 'TOTAL HORAS TRABAJADAS:';
        totalHoursLabelCell.font = { bold: true };
        totalHoursLabelCell.alignment = { horizontal: 'right' };

        const totalHoursValueCell = totalRow.getCell('E'); // Columna 'E' para "Total Horas"
        totalHoursValueCell.value = totalHoursFormatted;
        totalHoursValueCell.font = { bold: true };
        totalHoursValueCell.alignment = { horizontal: 'left' }; // O 'right' según prefieras

        // SUMA TOTAL MONETARIA (Valor Neto Final) - Columna K
        const totalsMonetaryLabelCell = totalRow.getCell('J'); // Columna 'J' para "Deducción Préstamo" (visual, ajusta si es necesario)
        totalsMonetaryLabelCell.value = 'TOTAL VALOR NETO FINAL:';
        totalsMonetaryLabelCell.font = { bold: true };
        totalsMonetaryLabelCell.alignment = { horizontal: 'right' };

        const totalsMonetaryValueCell = totalRow.getCell('K'); // Columna 'K' para "Valor Neto Final"
        totalsMonetaryValueCell.value = { formula: `SUM(K2:K${1 + dataRowCount})` }; // Suma de la columna K
        totalsMonetaryValueCell.font = { bold: true };
        totalsMonetaryValueCell.numFmt = '$ #,##0.00';
    }

    const employee = await Employee.findById(employeeId).lean();
    const employeeName = employee?.fullName || 'repartidor';
    const fileName = `Reporte_Historial_${employeeName.replace(/\s/g, '_')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
});

// Bloque X (Nuevo): Obtener el total global a pagar a todos los mensajeros
const getTotalPaymentsToEmployees = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'contador') {
    res.status(403);
    throw new Error('No tienes permiso para ver este resumen de pagos.');
  }
  const result = await TimeLog.aggregate([{ $match: {} }, { $group: { _id: null, totalToPay: { $sum: '$valorNetoFinal' } } }]);
  const totalPayments = result.length > 0 ? result[0].totalToPay : 0;
  res.json({ totalPaymentsToEmployees: totalPayments });
});

// Bloque Y (Nuevo): Obtener el total global a cobrar de todos los clientes
const getTotalReceivablesFromClients = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'contador') {
    res.status(403);
    throw new Error('No tienes permiso para ver este resumen de cobros.');
  }
  const result = await TimeLog.aggregate([{ $match: {} }, { $group: { _id: null, totalReceivables: { $sum: '$subtotal' } } }]);
  const totalReceivables = result.length > 0 ? result[0].totalReceivables : 0;
  res.json({ totalReceivablesFromClients: totalReceivables });
});

const markTimeLogAsPaid = asyncHandler(async (req, res) => {
    try {
        const timeLog = await TimeLog.findById(req.params.id);
        if (!timeLog) {
            return res.status(404).json({ message: 'Registro no encontrado.' });
        }

        // Evitar que se pague dos veces
        if (timeLog.isPaid) {
            return res.status(400).json({ message: 'Este registro ya ha sido marcado como pagado.' });
        }

        const employee = await Employee.findById(timeLog.employee);
        if (!employee) {
            return res.status(404).json({ message: 'Repartidor asociado no encontrado.' });
        }

        const paidAmount = parseFloat(timeLog.valorNetoFinal);
        const employeeBalance = parseFloat(employee.currentBalance);

        if (isNaN(paidAmount) || isNaN(employeeBalance)) {
            return res.status(400).json({ message: 'Error de datos: El saldo o el monto a pagar no son números válidos.' });
        }

        // 1. Se actualiza el balance del empleado
        employee.currentBalance = employeeBalance - paidAmount;
        await employee.save();

        // 2. Se actualiza el registro de trabajo (TimeLog)
        timeLog.isPaid = true;
        timeLog.isFixed = true;
        
        // ✅ --- LÍNEAS FALTANTES AÑADIDAS ---
        timeLog.estado = 'PAGADO';      // Actualiza el estado a 'PAGADO'
        timeLog.paymentDate = new Date(); // Guarda la fecha del pago
        // --- FIN DE LA CORRECCIÓN ---

        await timeLog.save();

        res.status(200).json({
            message: 'Registro marcado como pagado y saldo del empleado actualizado.',
            timeLog
        });

    } catch (error) {
        console.error("Error al marcar registro como pagado:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Bloque 11: Exportación de Controladores
module.exports = {
    createTimeLog,
    getTimeLogsByEmployeeId,
    updateTimeLog,
    deleteTimeLog,
    resetTimeLogs,
    getTimeLogsByClient,
    exportTimeLogsToExcelForEmployee, // <-- Función actualizada
    getTotalPaymentsToEmployees,
    getTotalReceivablesFromClients,
    markTimeLogAsPaid,
};