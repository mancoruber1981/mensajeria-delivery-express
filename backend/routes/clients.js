// backend/routes/clients.js

// Bloque 1: Importaciones
const express = require('express');
const router = express.Router();

const {
  getClients,
  getClientDashboardData,
  getClientById,
  updateHourlyRates,
  exportClientTimeLogsToExcel,
  getClientAuxiliaries,
  deleteAuxiliar
} = require('../controllers/clientController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Bloque 2: Rutas para la Gestión de Clientes
// @route   GET /api/clients
// @desc    Obtener todos los clientes (para admin)
// @access  Private (Admin)
router.route('/').get(protect, authorizeRoles('admin'), getClients);

// Bloque 3
router.route('/dashboard').get(
  protect,
  authorizeRoles('cliente'),
  // --- INICIO DEL CAMBIO DE PRUEBA ---
  (req, res, next) => {
    console.log('--- ¡ALERTA! LA RUTA /api/clients/dashboard FUE ALCANZADA ---');
    next(); // Le da paso a la siguiente función (getClientDashboardData)
  },
  // --- FIN DEL CAMBIO DE PRUEBA ---
  getClientDashboardData
);

// @route   GET /api/clients/:id
// @desc    Obtener un cliente por ID (para admin o para auxiliar obtener su cliente asociado)
// @access  Private (Admin, Auxiliar, Cliente)
router.route('/:id').get(protect, authorizeRoles('admin', 'auxiliar', 'cliente'), getClientById);

// @route   PUT /api/clients/:id/hourly-rates
// @desc    Actualizar las tarifas horarias (por defecto y festiva) de un cliente
// @access  Private (Cliente, Admin)
// En backend/routes/clients.js
router.route('/:id/hourly-rates').put(protect, authorizeRoles('cliente', 'admin'), updateHourlyRates);
// @route   GET /api/clients/me/export-timelogs
// @desc    Exportar registros de tiempo del cliente a Excel
// @access  Private (Cliente)
// @desc    Exportar registros de tiempo del cliente a Excel
router.route('/me/export-timelogs').get(protect, authorizeRoles('cliente', 'admin'), exportClientTimeLogsToExcel);

// @desc    Obtener todos los auxiliares asociados a un cliente
router.get('/:clientId/export', protect, authorizeRoles('admin', 'cliente'), exportClientTimeLogsToExcel);

// ✅ AGREGA ESTA NUEVA RUTA
router.route('/me/auxiliaries').get(protect, authorizeRoles('cliente'), getClientAuxiliaries);

// Bloque 5: Exportación del Router
module.exports = router;
