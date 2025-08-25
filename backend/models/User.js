// backend/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = mongoose.Schema({
     // DENTRO DE userSchema en User.js

    email: {
        type: String,
        required: false, // <-- CAMBIO 1: Ya no es obligatorio
        unique: true,
        sparse: true,    // <-- CAMBIO 2: Permite que haya muchos usuarios sin email sin causar un error de duplicado
        match: [/.+@.+\..+/, 'Por favor, ingresa un email válido']
    },
    // ▲▲▲ FIN DEL BLOQUE A AÑADIR ▲▲▲

    password: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true,
        enum: ['admin', 'repartidor', 'cliente', 'contador', 'auxiliar'],
        default: 'repartidor'
    },
    // --- CAMPO NUEVO Y CRUCIAL ---
    status: {
        type: String,
        enum: ['pendiente', 'activo', 'rechazado'],
        default: 'pendiente'
    },
    // ----------------------------
    profile: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'roleDiscriminator',
    },
    roleDiscriminator: {
        type: String,
        enum: ['Employee', 'Client', 'admin', 'contador', 'auxiliar']
    },
    associatedClient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: function() { return this.role === 'auxiliar'; }
    }
}, {
    timestamps: true
});

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Método para comparar contraseñas
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Método para generar JWT
userSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE, // Asegúrate de definir JWT_EXPIRE en tu .env (ej. '1h', '30d')
    });
};

const User = mongoose.model('User', userSchema);

module.exports = User;
