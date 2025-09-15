// backend/models/Loan.js

const mongoose = require('mongoose');

const repaymentSchema = mongoose.Schema({
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    settlementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Settlement' }
});

const loanSchema = mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Employee'
    },
    amount: {
        type: Number,
        required: true
    },
    outstandingBalance: {
        type: Number,
        required: true
    },
    dateGranted: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String,
        default: 'Préstamo general'
    },
    installments: {
        type: Number,
        default: 1
    },
    // ✅ --- CAMBIO CLAVE: Sistema de Estados ---
    status: {
        type: String,
        required: true,
        enum: ['Pendiente', 'Aprobado', 'Rechazado', 'Pagado'],
        default: 'Pendiente'
    },
    // Quién aprobó o rechazó el préstamo
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // --- FIN DEL CAMBIO ---
    repayments: [repaymentSchema]
}, {
    timestamps: true
});

loanSchema.pre('save', function(next) {
    if (this.isNew) {
        this.outstandingBalance = this.amount;
    }
    next();
});

const Loan = mongoose.model('Loan', loanSchema);

module.exports = Loan;