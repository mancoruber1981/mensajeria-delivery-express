// server.js (Versión Final y Limpia)

require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const path = require('path');
const cors = require('cors');

// Importar rutas
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const timeLogRoutes = require('./routes/timeLogs');
const uploadRoutes = require('./routes/upload');
const exportRoutes = require('./routes/export');
const clientRoutes = require('./routes/clients');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Capturar errores globales no manejados
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 SERVER CRASH - UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('🔥 SERVER CRASH - UNCAUGHT EXCEPTION:', err);
});

// 1. CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Parseo de cuerpo de solicitudes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 3. Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. Conectar a MongoDB
connectDB(process.env.MONGO_URI); // <-- Lógica correcta de conexión

// 5. Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/timelogs', timeLogRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/admin', adminRoutes);

// 6. Middleware de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || 'Error interno del servidor',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
});

const PORT = process.env.PORT || 5000;

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});