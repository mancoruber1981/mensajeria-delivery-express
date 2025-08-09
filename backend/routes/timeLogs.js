// backend/routes/timelogs.js

const express = require('express');
const router = express.Router();
const {
  createTimeLog,
  getTimeLogsByEmployeeId,
  updateTimeLog,
  deleteTimeLog,
  resetTimeLogs,
  getTimeLogsByClient,
  exportTimeLogsToExcelForEmployee,
  getTotalPaymentsToEmployees,
  getTotalReceivablesFromClients,
} = require('../controllers/timeLogController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Crear un nuevo TimeLog
router.post('/', protect, authorizeRoles('admin', 'repartidor', 'cliente', 'auxiliar'), createTimeLog);

// Obtener TimeLogs por empleado
router.get('/employee/:employeeId', protect, authorizeRoles('admin', 'repartidor', 'cliente', 'auxiliar'), getTimeLogsByEmployeeId);

// Actualizar TimeLog
router.put('/:id', protect, authorizeRoles('admin', 'repartidor', 'cliente', 'auxiliar'), updateTimeLog);

// Eliminar TimeLog
router.delete('/:id', protect, authorizeRoles('admin', 'repartidor', 'cliente', 'auxiliar'), deleteTimeLog);

// Resetear TimeLogs de un cliente
router.delete('/reset', protect, authorizeRoles('cliente'), resetTimeLogs);

// Obtener todos los registros de un cliente (cliente logueado)
router.get('/client/me', protect, authorizeRoles('cliente'), getTimeLogsByClient);

// Exportar TimeLogs a Excel
router.get('/export/:employeeId', protect, authorizeRoles('admin', 'repartidor'), exportTimeLogsToExcelForEmployee);

// Obtener resumen global: total a pagar a empleados
router.get('/summary/total-to-pay', protect, authorizeRoles('admin', 'contador'), getTotalPaymentsToEmployees);

// Obtener resumen global: total a cobrar a clientes
router.get('/summary/total-receivables', protect, authorizeRoles('admin', 'contador'), getTotalReceivablesFromClients);

module.exports = router;
