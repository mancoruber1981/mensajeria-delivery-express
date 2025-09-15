// backend/controllers/authController.js

const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
// Función auxiliar para generar JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Puedes ajustar el tiempo de expiración
    });
};
// Función para registrar un nuevo usuario y su perfil asociado
const registerUser = asyncHandler(async (req, res) => {
    const { username, password, role, profile } = req.body;
    if (!username || !password || !role) {
        res.status(400);
        throw new Error('Por favor, ingresa todos los campos requeridos (usuario, contraseña, rol).');
    }
    // --- PASO 1: AÑADIR BLOQUEO PARA ROL DE ADMIN ---
    if (role === 'admin') {
        res.status(403); // Forbidden
        throw new Error('El registro de administradores no está permitido a través de este formulario.');
    }
    // --
    const userExists = await User.findOne({ username });
    if (userExists) {
        res.status(400);
        throw new Error('El nombre de usuario ya está registrado.');
    }
    // Validaciones de unicidad para perfiles antes de crear el User
    if (role === 'repartidor' && profile && profile.idCard) {
        const employeeExists = await Employee.findOne({ idCard: profile.idCard });
        if (employeeExists) {
            res.status(400);
            throw new Error('Ya existe un repartidor con esta cédula.');
        }
    } else if (role === 'cliente' && profile && profile.nit) {
        const clientExists = await Client.findOne({ nit: profile.nit });
        if (clientExists) {
            res.status(400);
            throw new Error('Ya existe un cliente/socio con este NIT.');
        }
    }
    const user = await User.create({
        username,
        password,
        role,
    });
    if (user) {
        let createdProfile = null;
        let userRoleDiscriminator = role;
        if (role === 'repartidor') {
            if (!profile || !profile.fullName || !profile.address || !profile.idCard || !profile.phone || !profile.email) {
                res.status(400);
                throw new Error('Por favor, completa Nombre Completo, Dirección, Cédula, Teléfono y Email del Repartidor.');
            }
            createdProfile = await Employee.create({
                ...profile,
                user: user._id,
                role: 'repartidor',       // <-- AÑADIDO
                employeeType: 'empresa'
            });
            user.profile = createdProfile._id;
            userRoleDiscriminator = 'Employee';
        } else if (role === 'cliente') {
            if (!profile || !profile.fullNameHolder || !profile.idCard || !profile.nit || !profile.companyName) {
                res.status(400);
                throw new Error('Por favor, completa todos los detalles del Cliente/Socio.');
            }
            createdProfile = await Client.create({
                ...profile,
                user: user._id
            });
            user.profile = createdProfile._id;
            userRoleDiscriminator = 'Client';
        } else { // Para roles 'auxiliar', 'contador', 'admin'
            user.profile = null;
            userRoleDiscriminator = role;
        }
        user.roleDiscriminator = userRoleDiscriminator;
        await user.save();
        // --- PASO 2: CAMBIAR LA RESPUESTA FINAL (¡MUY IMPORTANTE!) ---
        // Ya NO enviamos un token ni los datos del usuario.
        // Solo enviamos un mensaje de éxito indicando que la cuenta está pendiente.
        res.status(201).json({
            success: true,
            message: 'Registro exitoso. Tu cuenta está pendiente de aprobación por un administrador.'
        });
        // -------------------------------------------------------------
        /* // CÓDIGO ANTIGUO COMENTADO PARA REFERENCIA
        const token = generateToken(user._id);
        res.status(201).json({
            success: true,
            token,
            user: { ... }
        });
        */
    } else {
        res.status(400);
        throw new Error('Datos de usuario inválidos.');
    }
});
// Función para loguear un usuario (VERSIÓN FINAL CORREGIDA)
const loginUser = asyncHandler(async (req, res) => {
    // Recibimos los datos del formulario (el campo puede llamarse 'username' pero contener un email)
    const { username, password } = req.body;

    // Buscamos en la base de datos un usuario donde el EMAIL o el USERNAME coincidan
    const user = await User.findOne({ 
        $or: [{ email: username }, { username: username }] 
    });

    // Si encontramos un usuario Y la contraseña coincide...
    if (user && (await user.matchPassword(password))) {
        
        // Verificamos que su cuenta esté activa
        if (user.status !== 'activo') {
            res.status(401);
            throw new Error(`Tu cuenta está en estado '${user.status}'. No puedes iniciar sesión.`);
        }

        // Si todo es correcto, generamos el token y enviamos los datos
        let profileData = null;
        if (user.profile) {
            if (user.role === 'repartidor') {
                profileData = await Employee.findById(user.profile);
            } else if (user.role === 'cliente') {
                profileData = await Client.findById(user.profile);
            }
        }
        res.json({
            _id: user._id,
            username: user.username,
            role: user.role,
            status: user.status,
            profile: profileData,
            associatedClient: user.associatedClient,
            token: generateToken(user._id),
        });

    } else {
        // Si no se encuentra el usuario o la contraseña no coincide, enviamos el error
        res.status(401).json({ message: 'Usuario o contraseña inválidos' });
    }
});
// Obtener detalles del usuario autenticado y su perfil
const getUserProfile = asyncHandler(async (req, res) => {
    const user = req.user; // Este user ya tiene su role
    if (!user) {
        res.status(404);
        throw new Error('Usuario no encontrado');
    }
    let profileData = null;
    let associatedClientProfile = null;
    // Popula el perfil asociado (Employee o Client) si user.profile existe y es un ID válido
    if (user.profile && mongoose.Types.ObjectId.isValid(user.profile)) {
        if (user.role === 'repartidor') {
            profileData = await Employee.findById(user.profile);
        } else if (user.role === 'cliente') {
            profileData = await Client.findById(user.profile);
        }
    }
    // Popula el perfil del cliente asociado para los auxiliares si user.associatedClient existe y es un ID válido
    if (user.role === 'auxiliar' && user.associatedClient && mongoose.Types.ObjectId.isValid(user.associatedClient)) {
        associatedClientProfile = await Client.findById(user.associatedClient);
    }
    res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        profile: profileData,
        associatedClient: user.associatedClient,
        associatedClientProfile: associatedClientProfile,
    });
});
// Actualizar perfil de usuario (para Repartidor y Cliente)
const updateUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const updateFields = req.body;
    let profile;
    if (userRole === 'repartidor') {
        profile = await Employee.findOne({ user: userId });
        if (!profile) {
            res.status(404);
            throw new Error('Perfil de repartidor no encontrado.');
        }
        if (profile.isFixed) {
            return res.status(400).json({ message: 'El perfil ha sido fijado y no puede ser modificado directamente.' });
        }
        ['fullName', 'address', 'idCard', 'phone', 'email', 'assignedSchedule'].forEach(field => {
            if (updateFields[field] !== undefined) {
                profile[field] = updateFields[field];
            }
        });
    } else if (userRole === 'cliente') {
        profile = await Client.findOne({ user: userId });
        if (!profile) {
            res.status(404);
            throw new Error('Perfil de cliente no encontrado.');
        }
        if (profile.isFixed) {
            return res.status(400).json({ message: 'El perfil ha sido fijado y no puede ser modificado directamente.' });
        }
        ['fullNameHolder', 'idCard', 'nit', 'companyName', 'defaultHourlyRate', 'holidayHourlyRate'].forEach(field => {
            if (updateFields[field] !== undefined) {
                profile[field] = updateFields[field];
            }
        });
    } else {
        return res.status(403).json({ message: 'Este rol no tiene un perfil gestionable directamente.' });
    }
    const updatedProfile = await profile.save();
    res.json({ message: 'Perfil actualizado con éxito.', profile: updatedProfile });
});
// Fijar el perfil de usuario (para Repartidor y Cliente)
const fixUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    let profile;
    if (userRole === 'repartidor') {
        profile = await Employee.findOne({ user: userId });
        if (!profile) {
            res.status(404);
            throw new Error('Perfil de repartidor no encontrado.');
        }
    } else if (userRole === 'cliente') {
        profile = await Client.findOne({ user: userId });
        if (!profile) {
            res.status(404);
            throw new Error('Perfil de cliente no encontrado.');
        }
    } else {
        return res.status(403).json({ message: 'Este rol no tiene un perfil que pueda ser fijado.' });
    }
    if (profile.isFixed) {
        return res.status(400).json({ message: 'El perfil ya ha sido fijado.' });
    }
    profile.isFixed = true;
    const updatedProfile = await profile.save();
    res.json({ message: 'Perfil fijado con éxito.', profile: updatedProfile });
});
// Añadir nota al perfil de usuario (para Repartidor y Cliente)
const addNoteToUserProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const userRole = req.user.role;
    const { text } = req.body;
    let profile;
    if (userRole === 'repartidor') {
        profile = await Employee.findOne({ user: userId });
        if (!profile) {
            res.status(404);
            throw new Error('Perfil de repartidor no encontrado.');
        }
    } else if (userRole === 'cliente') {
        profile = await Client.findOne({ user: userId });
        if (!profile) {
            res.status(404);
            throw new Error('Perfil de cliente no encontrado.');
        }
    } else {
        return res.status(403).json({ message: 'Este rol no tiene un perfil al que se le puedan añadir notas.' });
    }
    const newNote = {
        text,
        author: req.user.username
    };
    profile.profileNotes.push(newNote);
    const updatedProfile = await profile.save();
    res.json({ message: 'Nota añadida al perfil con éxito.', profile: updatedProfile });
});
// Un cliente registra a uno de sus auxiliares (VERSIÓN FINAL SIN EMAIL)
const registerAuxiliaryByClient = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const clientUser = req.user; // El cliente que está logueado

    if (!username || !password) {
        res.status(400);
        throw new Error('Por favor, proporciona usuario y contraseña.');
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
        res.status(400);
        throw new Error('El nombre de usuario ya existe.');
    }

    const user = await User.create({
        username,
        password, // El modelo se encargará del hashing
        role: 'auxiliar',
        status: 'activo', // Se crea como activo directamente
        associatedClient: clientUser.profile // Asocia al auxiliar con el perfil del cliente
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            username: user.username,
            role: user.role,
            message: 'Auxiliar registrado con éxito.'
        });
    } else {
        res.status(400);
        throw new Error('Datos de usuario inválidos.');
    }
});
// Un cliente elimina a uno de sus auxiliares asociados
const deleteAuxiliary = asyncHandler(async (req, res) => {
    const { auxiliaryId } = req.params; // El ID del auxiliar a borrar
    const clientUser = req.user; // El cliente que está haciendo la petición

    const auxiliary = await User.findById(auxiliaryId);

    if (!auxiliary || auxiliary.role !== 'auxiliar') {
        res.status(404);
        throw new Error('Auxiliar no encontrado.');
    }

    // Medida de seguridad: Asegura que un cliente solo pueda borrar SUS PROPIOS auxiliares
    if (!auxiliary.associatedClient || auxiliary.associatedClient.toString() !== clientUser.profile.toString()) {
        res.status(403);
        throw new Error('No tienes permiso para eliminar a este auxiliar.');
    }

    await auxiliary.deleteOne();
    res.status(200).json({ message: 'Auxiliar eliminado con éxito.' });
});
module.exports = {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    fixUserProfile,
    addNoteToUserProfile,
    registerAuxiliaryByClient,
    deleteAuxiliary,
};
