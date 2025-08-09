// backend/routes/employees.js

const express = require('express');
const router = express.Router();
const {
  createEmployeeByClient,
  getAllEmployees,
  getEmployeeById,
  deleteEmployee // <-- ¡IMPORTAR LA NUEVA FUNCIÓN!
} = require('../controllers/employeeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Ruta para que un CLIENTE registre un nuevo mensajero
router.route('/register-by-client').post(protect, authorizeRoles('cliente', 'auxiliar'), createEmployeeByClient);

// Ruta para que un ADMIN vea la lista de todos los empleados
router.route('/').get(protect, authorizeRoles('admin'), getAllEmployees);

// Permitimos que el CLIENTE también pueda ver los datos de un empleado específico
router.route('/:id')
  .get(protect, authorizeRoles('admin', 'cliente', 'auxiliar'), getEmployeeById)
  .delete(protect, authorizeRoles('cliente', 'admin'), deleteEmployee); // Eliminar un empleado (por cliente o admin)

module.exports = router;
