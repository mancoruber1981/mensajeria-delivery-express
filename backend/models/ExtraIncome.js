// backend/models/ExtraIncome.js

const mongoose = require('mongoose');

const extraIncomeSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria.']
    },
    amount: {
        type: Number,
        required: [true, 'El monto es obligatorio.']
    },
    date: {
        type: Date,
        default: Date.now
    },
    // Datos de la persona o entidad que realiza el aporte
    contributorName: { type: String },
    contributorId: { type: String }, // Cédula o NIT
    contributorPhone: { type: String },
    contributorAddress: { type: String },
    // Quién registró este ingreso en el sistema
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, { timestamps: true });

const ExtraIncome = mongoose.model('ExtraIncome', extraIncomeSchema);

module.exports = ExtraIncome;