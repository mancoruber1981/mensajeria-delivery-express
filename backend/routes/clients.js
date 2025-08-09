// backend/routes/clients.js

// Bloque 1: Importaciones
const express = require('express');
const router = express.Router();

const {
  getClients,
  getClientDashboardData,
  getClientById,
  updateClientHourlyRate,
  exportClientTimeLogsToExcel,
  getClientAuxiliaries // <-- ¡AÑADIDO!
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
router.route('/:id/hourly-rates').put(protect, authorizeRoles('cliente', 'admin'), updateClientHourlyRate); // <-- ¡AÑADIR ESTA NUEVA RUTA!

// @route   GET /api/clients/me/export-timelogs
// @desc    Exportar registros de tiempo del cliente a Excel
// @access  Private (Cliente)
router.route('/me/export-timelogs').get(protect, authorizeRoles('cliente'), exportClientTimeLogsToExcel);

// Bloque 4: Nueva Ruta: Obtener auxiliares de un cliente
// @route   GET /api/clients/me/auxiliaries
// @desc    Obtener todos los auxiliares asociados a un cliente
// @access  Private (Cliente)
router.route('/me/auxiliaries').get(protect, authorizeRoles('cliente'), getClientAuxiliaries); // <-- ¡AÑADIDA!

// Bloque 5: Exportación del Router
module.exports = router;
