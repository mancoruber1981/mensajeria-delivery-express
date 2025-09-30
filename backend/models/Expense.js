const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'La descripción es obligatoria.'],
        trim: true,
    },
    amount: {
        type: Number,
        required: [true, 'El monto es obligatorio.'],
    },
    date: {
        type: Date,
        default: Date.now,
    },
    category: {
        type: String,
        required: [true, 'La categoría es obligatoria.'],
        enum: ['Salario', 'Operativo', 'Impuestos', 'Otro'], // Categorías predefinidas
        default: 'Otro',
    },
    // Este campo flexible resuelve tus dudas sobre facturas, cédulas o códigos.
    reference: {
        type: String, 
        trim: true,
    },
    // Guardamos qué administrador registró el gasto.
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, {
    timestamps: true, // Guarda la fecha de creación y actualización automáticamente
});

module.exports = mongoose.model('Expense', expenseSchema);