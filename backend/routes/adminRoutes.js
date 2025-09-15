// backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();

const {
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
    createAuxiliaryForClient,
    exportClientDataForAdmin,
    deleteAuxiliaryByAdmin
} = require('../controllers/adminController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ✅ LÍNEA PROBLEMÁTICA ELIMINADA
// router.use(protect, authorizeRoles('admin'));

// --- AHORA CADA RUTA TIENE SU PROPIA PROTECCIÓN EXPLÍCITA ---

// Rutas del Dashboard Principal
router.get('/stats', protect, authorizeRoles('admin'), getDashboardStats);

// Rutas de vista espejo para clientes y couriers
router.get('/client-dashboard/:clientId', protect, authorizeRoles('admin'), getClientDashboardById);

// Ruta para el historial de un empleado específico
router.get('/employees/:employeeId/time-entries', protect, authorizeRoles('admin'), getEmployeeHistoryForAdmin);

// Ruta del Libro Contable Unificado
router.get('/accountant-report', protect, authorizeRoles('admin'), getAccountantLedger);

// Ruta para registrar un nuevo empleado
router.post('/register-employee', protect, authorizeRoles('admin'), registerEmployee);

// Rutas para Gestión de Usuarios
router.get('/users/pending', protect, authorizeRoles('admin'), getPendingUsers);
router.put('/users/:id/approve', protect, authorizeRoles('admin'), approveUser);

// Rutas para Liquidaciones
router.post('/settle-fortnight', protect, authorizeRoles('admin'), settleFortnight);
router.post('/settle-fortnight/:employeeId', protect, authorizeRoles('admin'), settleFortnightForEmployee);
router.post('/settle-client/:clientId', protect, authorizeRoles('admin'), settleClientTotal);
router.get('/preview-settlement/:employeeId', protect, authorizeRoles('admin'), getSettlementPreview);

// Ruta para que el Admin registre un Auxiliar
router.post('/clients/:clientId/auxiliaries', protect, authorizeRoles('admin', 'cliente'), createAuxiliaryForClient);

// Ruta para que el Admin exporte datos de un cliente
router.get('/export/client/:clientId', protect, authorizeRoles('admin'), exportClientDataForAdmin);

// ✅ NUEVA RUTA PARA QUE EL ADMIN ELIMINE UN AUXILIAR
router.delete('/auxiliaries/:auxiliaryId', protect, authorizeRoles('admin'), deleteAuxiliaryByAdmin);

module.exports = router;