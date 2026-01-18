
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const cors = require('cors');

// ==================== 1. IMPORTACIÓN DE RUTAS ====================
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const timeLogRoutes = require('./routes/timeLogs');
const uploadRoutes = require('./routes/upload');
const exportRoutes = require('./routes/export');
const clientRoutes = require('./routes/clients');
const adminRoutes = require('./routes/adminRoutes');
const loanRoutes = require('./routes/loanRoutes'); 
console.log('--- ✅ 2. Objeto importado como loanRoutes:', typeof loanRoutes);
const expenseRoutes = require('./routes/expenseRoutes');
const extraIncomeRoutes = require('./routes/extraIncomeRoutes');

const app = express();

// ==================== MANEJO DE ERRORES GLOBALES ====================
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 SERVER CRASH - UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('🔥 SERVER CRASH - UNCAUGHT EXCEPTION:', err);
});

// ==================== 2. MIDDLEWARES ====================
// Configuración de CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parseo de JSON y cuerpos de solicitudes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Servir archivos estáticos de la carpeta 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==================== 3. CONEXIÓN A LA BASE DE DATOS ====================
connectDB(process.env.MONGO_URI);

// ==================== 4. RUTAS DE LA API ====================
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/timelogs', timeLogRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/loans', loanRoutes); 
app.use('/api/expenses', expenseRoutes);
app.use('/api/extra-incomes', extraIncomeRoutes);


// ==================== 5. MIDDLEWARE DE MANEJO DE ERRORES ====================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Error interno del servidor',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

// ==================== 6. INICIO DEL SERVIDOR ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

// ==================== 🛠️ RESETEO SEGURO (Reemplaza el anterior) ====================
const User = require('./models/User');
const bcrypt = require('bcryptjs'); // o 'bcrypt' según cual instalaste

const resetAdminPass = async () => {
    try {
        // Generamos el hash directamente para evitar el error de argumentos
        const hashed = await bcrypt.hash('admin123', 10); 
        
        const userUpdated = await User.findOneAndUpdate(
            { username: 'ruman' }, 
            { password: hashed },
            { new: true }
        );

        if (userUpdated) {
            console.log('--------------------------------------------------');
            console.log('✅ CONTRASEÑA DE "ruman" ACTUALIZADA A: admin123');
            console.log('--------------------------------------------------');
        } else {
            console.log('⚠️ No se encontró al usuario "ruman" en la base de datos.');
        }
    } catch (err) {
        console.log('❌ Error al resetear contraseña:', err.message);
    }
};
resetAdminPass();