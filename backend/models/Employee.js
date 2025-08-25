// backend/models/Employee.js

const mongoose = require('mongoose');

const noteSchema = mongoose.Schema({
    text: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const employeeSchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: 'User',
        unique: true,
        sparse: true // <-- AÑADE ESTA LÍNEA
    },

    fullName: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: false
    },

    idCard: {
        type: String,
        required: true,
        unique: true
    },

    phone: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: false
    },

    role: {
        type: String,
        required: true,
        enum: ['repartidor', 'auxiliar', 'empleado'] // <-- CORRECCIÓN 2: Se añadió 'empleado' a los roles permitidos.
    },

    employeeType: {
        type: String,
        required: true,
        enum: ['empresa', 'cliente']
    },

    assignedSchedule: {
        type: String,
        default: 'No Asignado'
    },

    isFixed: {
        type: Boolean,
        default: false
    },

    profileNotes: [noteSchema]
}, {
    timestamps: true
});

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;