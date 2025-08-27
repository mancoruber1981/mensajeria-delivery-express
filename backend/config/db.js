// ./config/db.js
const mongoose = require('mongoose');

const connectDB = async (uri) => { // Acepta la URI como un parámetro
    try {
        const conn = await mongoose.connect(uri); // Utiliza el parámetro uri
        console.log(`MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;