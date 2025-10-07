// backend/controllers/authController.js

const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');
// Función auxiliar para generar JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Puedes ajustar el tiempo de expiración
    });
};


// REEMPLAZA DE NUEVO TU FUNCIÓN registerUser CON ESTA VERSIÓN MEJORADA
const registerUser = asyncHandler(async (req, res) => {
    const { username, password, role, profile } = req.body;

    if (!username || !password || !role) {
        res.status(400);
        throw new Error('Por favor, ingresa todos los campos requeridos.');
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
        res.status(400);
        throw new Error('El nombre de usuario ya está registrado.');
    }

    // Validaciones de perfil
    if (role === 'repartidor' && profile?.idCard) {
        if (await Employee.findOne({ idCard: profile.idCard })) {
            res.status(400);
            throw new Error('Ya existe un repartidor con esta cédula.');
        }
    } else if (role === 'cliente' && profile?.nit) {
        if (await Client.findOne({ nit: profile.nit })) {
            res.status(400);
            throw new Error('Ya existe un cliente/socio con este NIT.');
        }
    }

    // Creamos el usuario SIN el email primero
    const user = new User({
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
                throw new Error('Faltan datos del perfil del Repartidor.');
            }
            // --- CORRECCIÓN CLAVE AQUÍ ---
            // Le asignamos el email al usuario ANTES de guardar
            user.email = profile.email;
            
            createdProfile = await Employee.create({ ...profile, user: user._-id, role: 'repartidor', employeeType: 'empresa' });
            user.profile = createdProfile._id;
            userRoleDiscriminator = 'Employee';

        } else if (role === 'cliente') {
    // 1. MODIFICAR ESTA VALIDACIÓN para incluir el email
    if (!profile || !profile.fullNameHolder || !profile.idCard || !profile.nit || !profile.companyName || !profile.email) {
        res.status(400);
        throw new Error('Faltan datos del perfil del Cliente.');
    }
    
    // --- CORRECCIÓN CLAVE AQUÍ (Ya la tenías, solo hay que asegurarse que se use) ---
    // 2. ESTA LÍNEA AHORA ES FUNDAMENTAL
    // Copiamos el email del perfil del cliente al modelo principal de Usuario
    user.email = profile.email;
    
    createdProfile = await Client.create({ ...profile, user: user._id });
    user.profile = createdProfile._id;
    userRoleDiscriminator = 'Client';
} else {
            user.profile = null;
            userRoleDiscriminator = role;
        }

        user.roleDiscriminator = userRoleDiscriminator;
        
        // Ahora sí, guardamos el usuario con el email ya copiado
        await user.save();

        res.status(201).json({
            success: true,
            message: 'Registro exitoso. Tu cuenta está pendiente de aprobación.'
        });

    } else {
        res.status(400);
        throw new Error('Datos de usuario inválidos.');
    }
});
// Función para loguear un usuario (VERSIÓN FINAL CORREGIDA)
const loginUser = asyncHandler(async (req, res) => {
    // ✅ CAMBIO: Ahora esperamos 'email' en lugar de 'username'
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400);
        throw new Error('Por favor, ingresa el email y la contraseña.');
    }

    // Buscamos al usuario por su 'username' O 'email', ignorando mayúsculas/minúsculas
    const user = await User.findOne({
    $or: [
        { email: username }, // <-- Usa 'username' aquí
        { username: username } // <-- Y aquí también
    ]
});

    // Si encontramos un usuario Y la contraseña coincide...
    if (user && (await user.matchPassword(password))) {
        
       /* if (user.status !== 'activo') {
            res.status(401);
            throw new Error(`Tu cuenta está en estado '${user.status}'. No puedes iniciar sesión.`);
        } */

        // El resto de tu lógica para poblar el perfil está bien
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
const registerAuxiliaryByClient = asyncHandler(async (req, res) => {
    const { username, password, clientId } = req.body;
    const clientUser = req.user; // <-- Definiste la variable como 'clientUser'

    if (!username || !password) {
        res.status(400);
        throw new Error('Por favor, proporciona usuario y contraseña.');
    }

    const userExists = await User.findOne({ username });
    if (userExists) {
        res.status(400);
        throw new Error('El nombre de usuario ya existe.');
    }

    let clientProfileId;
    // ✅ CORRECCIÓN: Usa 'clientUser' aquí
    if (clientUser.role === 'admin' && clientId) {
        clientProfileId = clientId;
    // ✅ Y TAMBIÉN AQUÍ
    } else if (clientUser.role === 'cliente') {
        clientProfileId = clientUser.profile;
    }

    if (!clientProfileId) {
        res.status(400);
        throw new Error('No se pudo determinar el cliente para la asociación.');
    }

    const user = await User.create({
        username,
        password,
        role: 'auxiliar',
        status: 'activo',
        associatedClient: clientProfileId
    });

    if (user) {
        res.status(201).json({
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

// @desc    Gestionar solicitud de olvido de contraseña
// @route   POST /api/auth/forgotpassword
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
    // 1. Buscar al usuario por el email que mandó en el body
    const user = await User.findOne({ email: req.body.email });

    // Por seguridad, incluso si el usuario no existe, enviamos una respuesta positiva.
    // Esto evita que alguien pueda usar este formulario para adivinar qué correos están registrados.
    if (!user) {
        return res.status(200).json({ success: true, data: 'Email enviado si el usuario existe en nuestra base deatos.' });
    }

    // 2. Si el usuario existe, generar un token de reseteo
    // Usamos el módulo 'crypto' de Node.js para generar un string aleatorio y seguro
    const resetToken = crypto.randomBytes(20).toString('hex');

    // 3. Hashear el token y guardarlo en la base de datos
    // Guardamos una versión encriptada del token. Nunca guardamos tokens en texto plano.
    user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // 4. Establecer una fecha de expiración para el token (ej: 10 minutos)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutos
    
    await user.save({ validateBeforeSave: false }); // Guardamos los cambios en el usuario

    // 5. Crear la URL de reseteo que irá en el correo
    // Esta URL debe apuntar a la página de tu frontend que crearemos después
    // La línea corregida para desarrollo local
// La línea corregida y definitiva
const resetUrl = `http://localhost:3000/#/resetpassword/${resetToken}`;

    // 6. Crear el mensaje del correo
    const message = `
        Has solicitado un reseteo de contraseña. 
        Por favor, haz clic en el siguiente enlace para restablecer tu contraseña:
        \n\n
        ${resetUrl}
        \n\n
        Si no has solicitado este cambio, por favor ignora este correo.
    `;

    // 7. Enviar el correo usando la utilidad que creamos
    try {
        await sendEmail({
            email: user.email,
            subject: 'Solicitud de Reseteo de Contraseña',
            message,
        });

        res.status(200).json({ success: true, data: 'Email enviado.' });

    } catch (err) {
        console.error(err);
        // Si el envío falla, limpiamos el token y la fecha de la DB para que pueda intentarlo de nuevo
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false });

        return res.status(500).json({ message: 'No se pudo enviar el correo.' });
    }
});

// @desc    Restablecer la contraseña
// @route   PUT /api/auth/resetpassword/:resetToken
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
    // 1. Tomar el token de la URL y volver a hashearlo para compararlo con el de la BD
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resetToken)
        .digest('hex');

    // 2. Buscar al usuario que tenga ese token y que no haya expirado
    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }, // $gt significa "greater than" (mayor que)
    });

    if (!user) {
        res.status(400);
        throw new Error('El enlace de reseteo no es válido o ha expirado.');
    }

    // 3. Si el token es válido, establecer la nueva contraseña
    user.password = req.body.password;
    // Limpiar los campos del token para que no se pueda volver a usar
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    res.status(200).json({
        success: true,
        data: 'Contraseña actualizada con éxito.',
    });
});

const updatePasswordAdminTool = asyncHandler(async (req, res) => {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
        return res.status(400).json({ message: 'Se requiere usuario y nueva contraseña.' });
    }
    const user = await User.findOne({ username: username });
    if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({ message: `Contraseña para ${username} actualizada con éxito.` });
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
    forgotPassword,
    resetPassword,
    updatePasswordAdminTool
};
