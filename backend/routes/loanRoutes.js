const express = require('express');
const router = express.Router();
const { 
    createLoan, 
    getAllLoans, 
    approveLoan,     // <-- Nuevo
    rejectLoan,      // <-- Nuevo
    deleteLoan       // <-- Nuevo
} = require('../controllers/loanController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Rutas para crear y obtener listas de préstamos
router.route('/')
    .get(protect, authorizeRoles('admin', 'repartidor'), getAllLoans)
    .post(protect, authorizeRoles('admin', 'repartidor'), createLoan);

// Nuevas rutas para las acciones del admin
router.put('/:id/approve', protect, authorizeRoles('admin'), approveLoan);
router.put('/:id/reject', protect, authorizeRoles('admin'), rejectLoan);
router.delete('/:id', protect, authorizeRoles('admin'), deleteLoan);

module.exports = router;