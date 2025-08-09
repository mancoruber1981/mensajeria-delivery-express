// backend/models/TimeLog.js

const mongoose = require('mongoose');

const noteSchema = mongoose.Schema({
    text: { type: String, required: true },
    author: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const loanDeductionSchema = mongoose.Schema({
    loan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Loan',
        required: false
    },
    amount: {
        type: Number,
        required: true,
        default: 0
    },
    notes: String
});

const timeLogSchema = mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Employee'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    date: {
        type: Date,
        required: true
    },
    festivo: {
        type: Boolean,
        default: false
    },
    // --- ESTA ES LA LÍNEA CRÍTICA AGREGADA ---
    client: {
        type: mongoose.Schema.Types.ObjectId,
        required: false, // Ahora es opcional
        ref: 'Client'
    },
    // Y el campo 'empresa' lo mantenemos, pero ahora será opcional
    empresa: {
        type: String,
        required: false // Ahora es opcional
    },
    // --- FIN DE LÍNEA CRÍTICA AGREGADA ---
    horaInicio: {
        type: String,
        required: true
    },
    horaFin: {
        type: String,
        required: true
    },
    horasBrutas: {
        type: Number,
        required: true
    },
    valorHora: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    descuentoAlmuerzo: {
        type: Number,
        default: 0
    },
    minutosAlmuerzoSinPago: {
        type: Number,
        default: 0
    },
    valorNeto: {
        type: Number,
        required: true
    },
    estado: {
        type: String,
        enum: ['ABIERTO', 'FIJADO', 'PAGADO'],
        default: 'ABIERTO'
    },
    isFixed: {
        type: Boolean,
        default: false
    },
    notes: [noteSchema],
    loanDeductions: [loanDeductionSchema],
    totalLoanDeducted: {
        type: Number,
        default: 0
    },
    valorNetoFinal: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

timeLogSchema.index({ employee: 1, date: 1, empresa: 1, horaInicio: 1 }, { unique: true });

const TimeLog = mongoose.model('TimeLog', timeLogSchema);

module.exports = TimeLog;
