const express = require('express');
const router = express.Router();
const {
    createEmployeeByClient,
    getAllEmployees,
    getEmployeeById,
    deleteEmployee,
    searchEmployees
} = require('../controllers/employeeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para que un ADMIN vea la lista de todos los empleados
router.route('/').get(protect, authorizeRoles('admin', 'repartidor'), getAllEmployees);

// La ruta específica '/search' debe ir ANTES de la ruta general '/:id'
router.get('/search', protect, authorizeRoles('admin'), searchEmployees);

// Ruta para registrar un empleado por un cliente
router.route('/register-by-client').post(protect, authorizeRoles('cliente', 'auxiliar', 'admin'), createEmployeeByClient);

// La ruta general '/:id' para obtener o eliminar un empleado
router.route('/:id')
    .get(protect, authorizeRoles('admin', 'cliente', 'auxiliar'), getEmployeeById)
    .delete(protect, authorizeRoles('cliente', 'admin'), deleteEmployee);

module.exports = router;