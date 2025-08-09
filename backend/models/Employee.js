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
        required: true,
        ref: 'User',
        unique: true
    },

    fullName: {
        type: String,
        required: true
    },

    address: {
        type: String,
        required: false // <-- CORREGIDO
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
        required: false // <-- CORREGIDO
    },

    role: { // <-- AÑADIDO
        type: String,
        required: true,
        enum: ['repartidor', 'auxiliar'] // Define los roles posibles para empleados
    },

    employeeType: { // <-- AÑADIDO
        type: String,
        required: true,
        enum: ['empresa', 'cliente'] // Define los tipos de empleado
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
