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
        ref: 'User', // <-- Se asegura que la referencia a User esté
        required: false,
        sparse: true 
    },
    fullName: { type: String, required: true },
    address: { type: String, required: false },
    idCard: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: false },
    role: {
        type: String,
        required: true,
        enum: ['repartidor', 'auxiliar', 'empleado']
    },
    currentBalance: { type: Number, default: 0 },
    employeeType: {
        type: String,
        required: true,
        enum: ['empresa', 'cliente']
    },
    assignedSchedule: { type: String, default: 'No Asignado' },
    isFixed: { type: Boolean, default: false },
    profileNotes: [noteSchema]
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;