// backend/controllers/timeLogController.js

// Bloque 1: Importaciones y Módulos
const asyncHandler = require('express-async-handler');
const TimeLog = require('../models/TimeLog');
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const User = require('../models/User');
const { generateTimeLogExcelReport } = require('../utils/excelGenerator');

// Bloque 2: Crear un nuevo registro de horario (Versión Corregida)
const createTimeLog = asyncHandler(async (req, res) => {
  try {
    // Aceptamos los valores calculados desde el frontend
    const { 
      employee: employeeId, date, horaInicio, horaFin, festivo, minutosAlmuerzoSinPago, empresa, totalLoanDeducted,
      horasBrutas, subtotal, valorNeto, valorFinalConDeducciones // <-- Nuevas variables
    } = req.body;

    let { valorHora, descuentoAlmuerzo } = req.body;
    let clientCompany;
    let clientUserForTimeLog;
    let clientProfileObj;
    const authenticatedUser = req.user;

    if (authenticatedUser.role === 'cliente') {
      clientProfileObj = await Client.findOne({ user: authenticatedUser._id });
      if (!clientProfileObj) {
        res.status(404);
        throw new Error('Perfil de cliente no encontrado.');
      }
      clientCompany = clientProfileObj.companyName;
      clientUserForTimeLog = authenticatedUser._id;
    } else if (authenticatedUser.role === 'auxiliar') {
      clientProfileObj = await Client.findById(authenticatedUser.associatedClient);
      if (!clientProfileObj) {
        res.status(404);
        throw new Error('Cliente asociado al auxiliar no encontrado.');
      }
      clientCompany = clientProfileObj.companyName;
      clientUserForTimeLog = clientProfileObj.user;
    } else if (authenticatedUser.role === 'repartidor') {
      clientCompany = empresa;
      clientUserForTimeLog = authenticatedUser._id;
      if (!authenticatedUser.profile || employeeId !== authenticatedUser.profile._id.toString()) {
        res.status(403);
        throw new Error('Un repartidor solo puede registrar horarios para sí mismo.');
      }
    } else if (authenticatedUser.role === 'admin') {
      clientCompany = empresa;
      clientUserForTimeLog = authenticatedUser._id;
    } else {
      res.status(403);
      throw new Error('Rol no autorizado para crear registros de horario.');
    }

    if (authenticatedUser.role === 'cliente' || authenticatedUser.role === 'auxiliar') {
      if (festivo && clientProfileObj.holidayHourlyRate > 0) valorHora = clientProfileObj.holidayHourlyRate;
      else if (clientProfileObj.defaultHourlyRate > 0) valorHora = clientProfileObj.defaultHourlyRate;
      else {
        res.status(400);
        throw new Error('No se ha configurado una tarifa horaria por defecto para este cliente.');
      }
    } else {
      valorHora = parseFloat(valorHora);
    }
    
    const targetEmployee = await Employee.findById(employeeId);
    if (!targetEmployee) {
      res.status(404);
      throw new Error('Empleado no encontrado.');
    }
    
    // ❌ Eliminamos la lógica de cálculo aquí, ya no es necesaria
    // const start = new Date(`${date}T${horaInicio}`);
    // ...
    // const horasBrutas = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    // const subtotal = parseFloat((horasBrutas * valorHora).toFixed(2));
    // descuentoAlmuerzo = parseFloat(descuentoAlmuerzo) || 0;
    // const valorNetoInicial = subtotal - descuentoAlmuerzo;
    // const valorNetoFinal = valorNetoInicial - (parseFloat(totalLoanDeducted) || 0);

    const newTimeLog = await TimeLog.create({
      employee: targetEmployee._id,
      user: clientUserForTimeLog,
      empresa: clientCompany,
      date,
      horaInicio,
      horaFin,
      valorHora,
      festivo,
      descuentoAlmuerzo,
      minutosAlmuerzoSinPago: parseInt(minutosAlmuerzoSinPago, 10),
      // ✅ Usamos los valores exactos enviados desde el frontend
      horasBrutas,
      subtotal,
      valorNeto, // Este es el valor Neto Inicial
      totalLoanDeducted: parseFloat(totalLoanDeducted) || 0,
      valorNetoFinal: valorFinalConDeducciones
    });

    res.status(201).json(newTimeLog);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Error: Ya existe un registro para este empleado en la misma fecha y hora de inicio.' });
    }
    throw error;
  }
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
  console.log("Datos recibidos para actualizar:", req.body); // <-- Agrega esta línea
  console.log("--- DEBUG: updateTimeLog (Inicio) ---");
  const authenticatedUser = req.user;
  const userRole = authenticatedUser.role;
  console.log("DEBUG: Rol del usuario autenticado (dentro updateTimeLog):", userRole);

  const allowedRoles = ['admin', 'repartidor', 'cliente', 'auxiliar'];
  if (!allowedRoles.includes(userRole)) {
    console.log("¡ADVERTENCIA DEBUG! Usuario no autorizado por rol (dentro updateTimeLog).");
    res.status(403);
    throw new Error(`El rol '${userRole}' no tiene permiso para editar registros.`);
  }

  console.log("🔧 PUT/PATCH recibido para ID:", req.params.id);
  const timeLog = await TimeLog.findById(req.params.id);
  if (!timeLog) {
    res.status(404);
    throw new Error('Registro no encontrado');
  }

  if (userRole === 'repartidor') {
    if (!authenticatedUser.profile || timeLog.employee.toString() !== authenticatedUser.profile._id.toString()) {
      res.status(403);
      throw new Error('Un repartidor solo puede editar sus propios registros.');
    }
  } else if (userRole === 'cliente') {
    const clientProfile = await Client.findOne({ user: authenticatedUser._id });
    if (!clientProfile || !clientProfile.employees.some(empId => empId.toString() === timeLog.employee.toString())) {
      res.status(403);
      throw new Error('Un cliente solo puede editar registros de sus propios empleados.');
    }
  } else if (userRole === 'auxiliar') {
    const clientProfile = await Client.findById(authenticatedUser.associatedClient);
    if (!clientProfile || !clientProfile.employees.some(empId => empId.toString() === timeLog.employee.toString())) {
      res.status(403);
      throw new Error('Un auxiliar solo puede editar registros de los empleados de su cliente asociado.');
    }
  } else if (userRole !== 'admin') {
    res.status(403);
    throw new Error('No tienes permiso para editar este registro.');
  }

    // Aceptamos los valores calculados desde el frontend
    const { 
      date, horaInicio, horaFin, festivo, minutosAlmuerzoSinPago, empresa, totalLoanDeducted,
      horasBrutas, subtotal, valorNeto, valorFinalConDeducciones // <-- Nuevas variables
    } = req.body;

    let { valorHora, descuentoAlmuerzo } = req.body;

    if (userRole === 'cliente' || userRole === 'auxiliar') {
      const clientProfile = userRole === 'cliente'
        ? await Client.findOne({ user: authenticatedUser._id })
        : await Client.findById(authenticatedUser.associatedClient);

      if (festivo && clientProfile.holidayHourlyRate > 0) {
        valorHora = clientProfile.holidayHourlyRate;
      } else if (clientProfile.defaultHourlyRate > 0) {
        valorHora = clientProfile.defaultHourlyRate;
      } else {
        res.status(400);
        throw new Error('No se ha configurado una tarifa horaria por defecto para este cliente.');
      }
    } else {
      valorHora = parseFloat(valorHora);
    }

    // Actualizamos los campos recibidos
    if (date !== undefined) timeLog.date = date;
    if (horaInicio !== undefined) timeLog.horaInicio = horaInicio;
    if (horaFin !== undefined) timeLog.horaFin = horaFin;
    if (valorHora !== undefined) timeLog.valorHora = parseFloat(valorHora);
    if (festivo !== undefined) timeLog.festivo = festivo;
    if (minutosAlmuerzoSinPago !== undefined) timeLog.minutosAlmuerzoSinPago = parseInt(minutosAlmuerzoSinPago, 10);
    if (empresa !== undefined) timeLog.empresa = empresa;
    if (totalLoanDeducted !== undefined) timeLog.totalLoanDeducted = parseFloat(totalLoanDeducted);

    // ✅ Usamos los valores exactos enviados desde el frontend para actualizar
    if (horasBrutas !== undefined) timeLog.horasBrutas = horasBrutas;
    if (subtotal !== undefined) timeLog.subtotal = subtotal;
    if (valorNeto !== undefined) timeLog.valorNeto = valorNeto;
    if (valorFinalConDeducciones !== undefined) timeLog.valorNetoFinal = valorFinalConDeducciones;

    // ❌ Eliminamos la lógica de recalcular aquí
    // const dateStringForCalculation = timeLog.date instanceof Date ...
    // ... y toda la lógica de cálculo
    // Esto es lo que causaba el problema de redondeo al editar

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
  try {
    const { employeeId } = req.params;
    console.log(`[EXPORT] Iniciando exportación para employeeId: ${employeeId}`);
    console.log(`[EXPORT] Usuario autenticado:`, req.user?.role);

    if (req.user.role === 'repartidor') {
      if (!req.user.profile || req.user.profile._id.toString() !== employeeId) {
        console.log("[EXPORT] ❌ Repartidor sin permiso para este ID");
        return res.status(403).json({ message: 'Sin permiso para exportar estos registros.' });
      }
    } else if (req.user.role !== 'admin') {
      console.log("[EXPORT] ❌ Usuario sin rol permitido");
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    const timeLogs = await TimeLog.find({ employee: employeeId })
      .populate({ path: 'employee', select: 'fullName' })
      .populate({ path: 'user', select: 'username' })
      .sort({ date: -1 });

    if (!timeLogs || timeLogs.length === 0) {
      console.log("[EXPORT] ⚠️ No se encontraron registros.");
      return res.status(404).json({ message: 'No hay registros para exportar.' });
    }

    const employeeName = timeLogs[0].employee?.fullName || `Empleado_${employeeId}`;
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
      createdAt: log.createdAt
    }));

    console.log(`[EXPORT] Generando Excel para: ${employeeName} con ${dataForExcel.length} registros`);
    const buffer = await generateTimeLogExcelReport(dataForExcel, `Reporte de Horarios - ${employeeName}`);
    console.log(`[EXPORT] Buffer generado con tamaño: ${buffer.length}`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=reporte_horarios_${employeeName}.xlsx`);
    res.send(buffer);
    console.log("[EXPORT] ✅ Excel enviado correctamente");
  } catch (error) {
    console.error("[EXPORT] ❌ Error interno en exportación:", error);
    if (error.name === 'CastError' && error.path === 'employee') {
      res.status(500).json({ message: 'Error de datos: Algunos registros de tiempo tienen un ID de empleado inválido.' });
    } else {
      res.status(500).json({ message: 'Error al generar el archivo Excel' });
    }
  }
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

// Bloque 9: Exportación de Controladores
module.exports = {
  createTimeLog,
  getTimeLogsByEmployeeId,
  updateTimeLog,
  deleteTimeLog,
  resetTimeLogs,
  getTimeLogsByClient,
  exportTimeLogsToExcelForEmployee,
  getTotalPaymentsToEmployees,
  getTotalReceivablesFromClients
};
