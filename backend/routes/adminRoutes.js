// backend/routes/adminRoutes.js

const express = require('express');
const router = express.Router();

const {
  getDashboardStats,
  getClientDashboardById,
  getCourierDashboardById,
  getEmployeeHistoryForAdmin,
  getAccountantLedger,
  registerEmployee,
  getPendingUsers,
  approveUser,
} = require('../controllers/adminController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Aplica el middleware de protección y autorización para el rol 'admin' a todas las rutas a continuación
router.use(protect, authorizeRoles('admin'));

// Rutas del Dashboard Principal
router.get('/stats', getDashboardStats);

// Rutas de vista espejo para clientes y couriers
router.get('/client-dashboard/:clientId', getClientDashboardById);
router.get('/courier-dashboard/:employeeId', getCourierDashboardById);

// Ruta para el historial de un empleado específico
router.get('/employees/:employeeId/time-entries', getEmployeeHistoryForAdmin);

// Ruta del Libro Contable Unificado
router.get('/accountant-report', getAccountantLedger);

// Ruta para registrar un nuevo empleado
router.post('/register-employee', registerEmployee);

// --- NUEVAS RUTAS PARA GESTIÓN DE USUARIOS ---
// @desc    Obtener todos los usuarios con estado 'pendiente'
// @route   GET /api/admin/users/pending
router.get('/users/pending', getPendingUsers);

// @desc    Aprobar un usuario específico por su ID
// @route   PUT /api/admin/users/:id/approve
router.put('/users/:id/approve', approveUser);

module.exports = router;
