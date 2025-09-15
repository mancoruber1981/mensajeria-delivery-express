// backend/config/db.js

const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Le pasamos las opciones de conexión directamente aquí
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // ✅ ESTA ES LA LÍNEA MÁS IMPORTANTE
            // Le prohíbe a Mongoose crear índices automáticamente.
            autoIndex: false 
        });

        console.log(`MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error de conexión a la DB: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;