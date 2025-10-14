// backend/utils/sendEmail.js

const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    console.log("--- 📧 Iniciando la función sendEmail ---");
    console.log("   - Destinatario:", options.email);
    console.log("   - Asunto:", options.subject);

    // 1. Crear un "transporter"
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === '465', // true para el puerto 465, false para otros como 587
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    // 2. Definir las opciones del correo
    const mailOptions = {
        from: `Delivery Express S.A.S. <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    // 3. Enviar el correo y capturar cualquier error
    try {
        console.log("   - Intentando enviar correo a través de Nodemailer...");
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ ¡Correo enviado con éxito! Respuesta del servidor: ${info.response}`);
    } catch (error) {
        console.error("🔥 ERROR DENTRO DE sendEmail:", error);
        // Volvemos a lanzar el error para que la función que llamó a sendEmail (createLoan) se entere del fallo.
        throw new Error('Fallo al enviar el correo desde la utilidad sendEmail.');
    }
};

module.exports = sendEmail;