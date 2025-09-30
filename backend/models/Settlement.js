// backend/models/Settlement.js

const mongoose = require('mongoose');

const settlementSchema = mongoose.Schema({
    // A quién se le hizo la liquidación (puede ser un empleado o un cliente)
    entity: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'entityModel' // Campo dinámico para referenciar a Employee o Client
    },
    entityModel: {
        type: String,
        required: true,
        enum: ['Employee', 'Client'] // Especifica a qué modelo se refiere 'entity'
    },
    // Rango de fechas de la liquidación
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },

    // --- INICIO DE CAMPOS AÑADIDOS (Siguiendo tu estilo) ---

    // Monto bruto ANTES de descuentos
    grossAmount: {
        type: Number,
        required: true
    },
    // Monto deducido por concepto de préstamo
    loanDeduction: {
        type: Number,
        default: 0
    },
    // Monto deducido por concepto de Seguridad Social
    socialSecurityDeduction: {
        type: Number,
        default: 0
    },

    // --- FIN DE CAMPOS AÑADIDOS ---
    
    // Monto NETO final pagado (Bruto - Descuentos)
    totalAmount: {
        type: Number,
        required: true
    },
    // Fecha en que se procesó el pago/liquidación
    paymentDate: {
        type: Date,
        default: Date.now
    },
    // Array con los IDs de todos los TimeLogs que se incluyeron en esta liquidación
    timeLogs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TimeLog'
    }]
}, {
    timestamps: true
});

const Settlement = mongoose.model('Settlement', settlementSchema);

module.exports = Settlement;