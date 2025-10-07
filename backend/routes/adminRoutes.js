// backend/routes/adminRoutes.js (VERSIÓN FINAL CORREGIDA)

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
    deleteAuxiliaryByAdmin,
    getEmployeeSettlementReport,
    generateMasterReport,
} = require('../controllers/adminController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');


// --- RUTAS DEL DASHBOARD Y VISTAS ESPEJO ---
router.get('/stats', protect, authorizeRoles('admin'), getDashboardStats);
router.get('/client-dashboard/:clientId', protect, authorizeRoles('admin'), getClientDashboardById);
router.get('/employees/:employeeId/time-entries', protect, authorizeRoles('admin'), getEmployeeHistoryForAdmin);

// --- RUTAS DE REPORTES Y EXPORTACIONES ---
//router.get('/accountant-report', protect, authorizeRoles('admin'), getAccountantLedger);
router.get('/accountant-report', protect, getAccountantLedger);
router.get('/export/client/:clientId', protect, authorizeRoles('admin'), exportClientDataForAdmin);
router.get('/export-master-report', protect, authorizeRoles('admin', 'contador'), generateMasterReport);

// --- 2. AQUÍ ESTÁ LA NUEVA RUTA QUE FALTABA ---
router.get('/employee/:employeeId/settlement-report', protect, authorizeRoles('admin'), getEmployeeSettlementReport);


// --- RUTAS DE GESTIÓN DE USUARIOS Y EMPLEADOS ---
router.post('/register-employee', protect, authorizeRoles('admin'), registerEmployee);
router.get('/users/pending', protect, authorizeRoles('admin'), getPendingUsers);
router.put('/users/:id/approve', protect, authorizeRoles('admin'), approveUser);
router.post('/clients/:clientId/auxiliaries', protect, authorizeRoles('admin', 'cliente'), createAuxiliaryForClient);
router.delete('/auxiliaries/:auxiliaryId', protect, authorizeRoles('admin'), deleteAuxiliaryByAdmin);


// --- RUTAS PARA LIQUIDACIONES ---
router.post('/settle-fortnight', protect, authorizeRoles('admin'), settleFortnight);
router.post('/settle-fortnight/:employeeId', protect, authorizeRoles('admin'), settleFortnightForEmployee);
router.post('/settle-client/:clientId', protect, authorizeRoles('admin'), settleClientTotal);
router.get('/preview-settlement/:employeeId', protect, authorizeRoles('admin'), getSettlementPreview);


module.exports = router;