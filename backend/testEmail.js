// backend/testEmail.js

// 1. Cargar las variables de entorno
require('dotenv').config(); 

const nodemailer = require('nodemailer');

// Función principal autoejecutable
const testSend = async () => {
    console.log('--- Iniciando prueba de envío de correo ---');
    console.log('Usando el correo:', process.env.EMAIL_USER);
    console.log('Host:', process.env.EMAIL_HOST, 'Puerto:', process.env.EMAIL_PORT);

    // Recreamos el transporter, igual que en la aplicación
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        // secure: false, // para el puerto 587
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        // Añadimos esto para ver más detalles del error si falla
        debug: true 
    });

    const mailOptions = {
        from: `Prueba Delivery Express <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER, // ¡Importante! Envía el correo a tu propia dirección para probar
        subject: 'Correo de prueba de Nodemailer',
        text: '¡Hola! Si recibes esto, la configuración de Nodemailer y tus credenciales son correctas.',
    };

    try {
        console.log('\nIntentando enviar el correo...');
        let info = await transporter.sendMail(mailOptions);
        console.log('--- ¡ÉXITO! ---');
        console.log('Correo enviado con éxito. ID del mensaje:', info.messageId);
        console.log('Respuesta del servidor:', info.response);
    } catch (error) {
        console.log('--- ¡ERROR! ---');
        console.log('Ocurrió un error al intentar enviar el correo:');
        console.error(error); // Imprimimos el error completo
    }
};

// Ejecutamos la función
testSend();