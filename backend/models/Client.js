// backend/models/Client.js

// Bloque 1: Importaciones
const mongoose = require('mongoose');

// Bloque 2: Definición del Esquema de Notas
const noteSchema = mongoose.Schema({
    text: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Bloque 3: Definición del Esquema de Cliente
const clientSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        unique: true
    },

    employees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    }],

    fullNameHolder: {
        type: String,
        required: true
    },

    idCard: {
        type: String,
        required: true,
        unique: true
    },

    nit: {
        type: String,
        required: true,
        unique: true
    },

    companyName: {
        type: String,
        required: true
    },

email: {
        type: String,
        required: [true, 'Por favor, añade un correo electrónico.'],
        unique: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Por favor, añade un correo electrónico válido.'
        ]
    },

    defaultHourlyRate: { // Tarifa horaria normal por defecto
        type: Number,
        required: false,
        default: 0
    },

    holidayHourlyRate: { // Tarifa horaria para días festivos
        type: Number,
        required: false,
        default: 0
    },

    isFixed: {
        type: Boolean,
        default: false
    },

    profileNotes: [noteSchema]
}, {
    timestamps: true
});

// Bloque 4: Creación y Exportación del Modelo de Cliente
const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
