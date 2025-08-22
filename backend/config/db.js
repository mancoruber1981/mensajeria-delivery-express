const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config(); // Carga las variables de entorno desde .env


const connectDB = async () => {
    try {
        // mongoose.connect() es la función que conecta a MongoDB
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        // Si hay un error de conexión, el proceso Node.js debe salir
        process.exit(1);
    }
};

module.exports = connectDB;
