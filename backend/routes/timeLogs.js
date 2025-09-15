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
    markTimeLogAsPaid,
} = require('../controllers/timeLogController');

const { protect: authProtect, authorizeRoles: authAuthorizeRoles } = require('../middleware/authMiddleware');

// Crear un nuevo TimeLog
router.post('/', authProtect, authAuthorizeRoles('admin', 'repartidor', 'cliente', 'auxiliar'), createTimeLog);

// Obtener TimeLogs por empleado
router.get('/employee/:employeeId', authProtect, authAuthorizeRoles('admin', 'repartidor', 'cliente', 'auxiliar'), getTimeLogsByEmployeeId);

// Actualizar TimeLog
router.put('/:id', authProtect, authAuthorizeRoles('admin', 'repartidor', 'cliente', 'auxiliar'), updateTimeLog);

// Eliminar TimeLog
router.delete('/:id', authProtect, authAuthorizeRoles('admin', 'repartidor', 'cliente', 'auxiliar'), deleteTimeLog);

// Resetear TimeLogs de un cliente
router.delete('/reset', authProtect, authAuthorizeRoles('cliente'), resetTimeLogs);

// Obtener todos los registros de un cliente (cliente logueado)
router.get('/client/me', authProtect, authAuthorizeRoles('cliente'), getTimeLogsByClient);

// Exportar TimeLogs a Excel
router.get('/export/:employeeId', authProtect, authAuthorizeRoles('admin', 'repartidor'), exportTimeLogsToExcelForEmployee);

// Obtener resumen global: total a pagar a empleados
router.get('/summary/total-to-pay', authProtect, authAuthorizeRoles('admin', 'contador'), getTotalPaymentsToEmployees);

// Obtener resumen global: total a cobrar a clientes
router.get('/summary/total-receivables', authProtect, authAuthorizeRoles('admin', 'contador'), getTotalReceivablesFromClients);

// Marcar un TimeLog como pagado y actualizar el saldo del empleado
router.put('/mark-paid/:id', authProtect, authAuthorizeRoles('admin'), markTimeLogAsPaid);

module.exports = router;