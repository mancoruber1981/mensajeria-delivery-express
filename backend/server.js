const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const cors = require('cors');

dotenv.config();

// Importar rutas
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const timeLogRoutes = require('./routes/timeLogs');
const uploadRoutes = require('./routes/upload');
const exportRoutes = require('./routes/export');
const clientRoutes = require('./routes/clients'); // Importar rutas de clientes
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// 🚀 CAPTURAR ERRORES CRÍTICOS NO MANEJADOS AL PRINCIPIO 🚀
// Esto ayuda a depurar crashes que no son atrapados por el middleware de errores de Express
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥🔥🔥 SERVER CRASH - UNHANDLED REJECTION:', reason);
    console.error('La promesa fue:', promise);
    // process.exit(1); // Opcional: Descomentar en producción para que el servidor se reinicie automáticamente (ej. con PM2)
});

process.on('uncaughtException', (err) => {
    console.error('🔥🔥🔥 SERVER CRASH - UNCAUGHT EXCEPTION:', err);
    // process.exit(1); // Opcional
});
// 🚀 FIN DE MANEJADORES DE ERRORES GLOBALES 🚀

// 1. MIDDLEWARE DE CORS (DEBE IR MUY PRONTO para permitir la comunicación)
app.use(cors({
    origin: process.env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. MIDDLEWARES PARA PROCESAR EL CUERPO DE LAS SOLICITUDES (JSON, URL-encoded)
app.use(express.json()); // Para parsear JSON en el cuerpo de la solicitud (ej. para POST, PUT)
app.use(express.urlencoded({ extended: false })); // Para parsear datos de formularios URL-encoded

// 3. SERVIR ARCHIVOS ESTÁTICOS (Si tienes la carpeta 'uploads' para archivos subidos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 4. CONECTAR A LA BASE DE DATOS (una sola vez al iniciar el servidor)
connectDB(); // Esta función asíncrona se ejecuta y espera la conexión a MongoDB

// 5. RUTAS DE LA API (Deben ir después de los middlewares de parseo de cuerpo y CORS)
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/timelogs', timeLogRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/clients', clientRoutes); // Usar rutas de clientes
app.use('/api/admin', adminRoutes);

// 6. MIDDLEWARE DE MANEJO DE ERRORES (DEBE SER EL ÚLTIMO MIDDLEWARE en la cadena)
app.use((err, req, res, next) => {
    console.error(err.stack); // Esto imprime el stack trace en la consola del servidor
    res.status(err.statusCode || 500).json({
        message: err.message || 'Error interno del servidor',
        stack: process.env.NODE_ENV === 'production' ? null : err.stack // No mostrar stack en producción por seguridad
    });
});

const PORT = process.env.PORT || 5000;

// Función para iniciar el servidor de manera asíncrona
const startServer = async () => {
    try {
        // La conexión a la DB se inicia con connectDB()
        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en el puerto ${PORT}`);
        });
    } catch (error) {
        console.error(`Error al iniciar el servidor: ${error.message}`);
        process.exit(1); // Sale del proceso si hay un error crítico al iniciar
    }
};

startServer(); // Llama a la función para iniciar el servidor
