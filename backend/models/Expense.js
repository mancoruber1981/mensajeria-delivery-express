// backend/models/Expense.js

const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    category: { type: String, required: true },
    reference: { type: String },
    payeeName: { type: String },
    payeeId: { type: String },

    // --- AÑADE ESTOS DOS CAMPOS AQUÍ ---
    payeePhone: { type: String },
    payeeAddress: { type: String },
    // ---------------------------------

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Expense = mongoose.model('Expense', expenseSchema);
module.exports = Expense;