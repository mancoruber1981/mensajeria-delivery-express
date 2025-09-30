// backend/utils/sendEmail.js
const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Crear un "transporter" - el servicio que enviará el correo (gmail, sendgrid, etc.)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // 2. Definir las opciones del correo (destinatario, asunto, etc.)
    const mailOptions = {
        from: `Delivery Express <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: `<h1>Opción para enviar con HTML</h1>`
    };

    // 3. Enviar el correo con nodemailer
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;