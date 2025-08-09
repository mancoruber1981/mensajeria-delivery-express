// backend/routes/export.js

const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const TimeLog = require('../models/TimeLog');
const generateTimeLogExcelReport = require('../utils/excelGenerator'); // Asegúrate que sea esta función
const Employee = require('../models/Employee'); // Necesario para obtener el nombre del empleado
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @desc    Exportar registros de horarios a Excel
// @route   GET /api/export/timeentries
// @route   GET /api/export/timeentries/employee/:employeeId
// @access  Private/Admin, Repartidor, Cliente
router.get('/timeentries/:employeeId?', protect, authorizeRoles('admin', 'repartidor', 'cliente'), asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const loggedInUser = req.user;
  let timeLogs;
  let employeeNameForReport = 'General';

  // Admin puede exportar todos o de un empleado específico
  if (loggedInUser.role === 'admin') {
    if (employeeId) { // Si el admin pide de un empleado específico
      timeLogs = await TimeLog.find({ employee: employeeId })
        .populate('employee', 'fullName idCard')
        .populate('user', 'username')
        .sort({ date: 1, 'horaInicio': 1 });

      const emp = await Employee.findById(employeeId);
      employeeNameForReport = emp ? emp.fullName : 'Desconocido';
    } else { // Admin pide todos los logs consolidados (para el contador)
      timeLogs = await TimeLog.find({})
        .populate('employee', 'fullName idCard')
        .populate('user', 'username')
        .sort({ date: 1, 'horaInicio': 1 });

      employeeNameForReport = 'Todos los Empleados';
    }
  } else if (loggedInUser.role === 'repartidor' || loggedInUser.role === 'cliente') {
    // Repartidor/Cliente solo puede exportar sus propios logs
    const employeeProfile = await Employee.findOne({ user: loggedInUser._id });

    if (!employeeProfile) {
      res.status(404);
      throw new Error('Perfil no encontrado para el usuario logueado.');
    }

    timeLogs = await TimeLog.find({ employee: employeeProfile._id })
      .populate('employee', 'fullName idCard')
      .populate('user', 'username')
      .sort({ date: 1, 'horaInicio': 1 });

    employeeNameForReport = employeeProfile.fullName;
  } else {
    return res.status(403).json({ message: 'No tienes permiso para generar este reporte.' });
  }

  const buffer = generateTimeLogExcelReport(timeLogs, employeeNameForReport); // Usa la función correcta

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=reporte_horarios_${employeeNameForReport.replace(/\s/g, '_')}.xlsx`);
  res.send(buffer);
}));

module.exports = router;
