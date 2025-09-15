// backend/routes/auth.js

const express = require('express');
const router = express.Router();

const {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    fixUserProfile,
    addNoteToUserProfile,
    registerAuxiliaryByClient,
    deleteAuxiliary
} = require('../controllers/authController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Rutas públicas de autenticación
router.post('/register', registerUser);
router.post('/login', loginUser);

// Rutas protegidas para el perfil de usuario
router.route('/me/profile')
    .get(protect, authorizeRoles('admin', 'repartidor', 'cliente', 'contador', 'auxiliar'), getUserProfile)
    .put(protect, authorizeRoles('repartidor', 'cliente'), updateUserProfile);

// Rutas para fijar y añadir notas al perfil
router.put('/me/fix-profile', protect, authorizeRoles('repartidor', 'cliente'), fixUserProfile);
router.post('/me/note', protect, authorizeRoles('repartidor', 'cliente'), addNoteToUserProfile);

// Rutas para la gestión de auxiliares por cliente
router.route('/register-auxiliary-by-client').post(protect, authorizeRoles('cliente', ), registerAuxiliaryByClient);
// ✅ AGREGA ESTA NUEVA RUTA PARA ELIMINAR
router.delete('/auxiliaries/:auxiliaryId', protect, authorizeRoles('cliente'), deleteAuxiliary);
module.exports = router;
