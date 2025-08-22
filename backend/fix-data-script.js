// backend/fix-data-script.js

const mongoose = require('mongoose');
const TimeLog = require('./models/TimeLog');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = process.env.MONGODB_URI;

// Esta es la lógica de cálculo precisa que usamos en el frontend
const calculatePreciseValues = (log) => {
    // Aseguramos que los valores sean números
    const valorHoraNum = parseFloat(log.valorHora) || 0;
    const minutosAlmuerzoSinPagoNum = parseInt(log.minutosAlmuerzoSinPago, 10) || 0;
    const totalLoanDeductedNum = parseFloat(log.totalLoanDeducted) || 0;
    const descuentoAlmuerzoNum = parseFloat(log.descuentoAlmuerzo) || 0;

    // Convertimos las horas de inicio y fin a minutos para mayor precisión
    const [startHours, startMinutes] = log.horaInicio.split(':').map(Number);
    const [endHours, endMinutes] = log.horaFin.split(':').map(Number);

    let totalMinutesBrutos = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    if (totalMinutesBrutos < 0) {
        totalMinutesBrutos += 24 * 60; // Manejar turnos que pasan de medianoche
    }
    
    const totalMinutesNetos = totalMinutesBrutos - minutosAlmuerzoSinPagoNum;

    // Recalculamos los valores usando la lógica precisa
    const horasBrutasDecimal = totalMinutesBrutos / 60;
    const subtotal = horasBrutasDecimal * valorHoraNum;
    const valorNeto = (totalMinutesNetos / 60) * valorHoraNum - descuentoAlmuerzoNum;
    const valorNetoFinal = valorNeto - totalLoanDeductedNum;

    return {
        horasBrutas: horasBrutasDecimal,
        subtotal: subtotal,
        valorNeto: valorNeto,
        valorNetoFinal: valorNetoFinal,
    };
};

const fixTimeLogs = async () => {
    if (!DATABASE_URL) {
        console.error("Error: No se encontró la URL de la base de datos en el archivo .env.");
        return;
    }

    try {
        console.log("Conectando a la base de datos...");
        await mongoose.connect(DATABASE_URL);
        console.log("Conexión exitosa a la base de datos.");

        const timeLogsToUpdate = await TimeLog.find({});
        console.log(`Se encontraron ${timeLogsToUpdate.length} registros para actualizar.`);

        for (const log of timeLogsToUpdate) {
            const correctedValues = calculatePreciseValues(log);
            
            // Actualizamos solo los campos necesarios para evitar errores
            log.horasBrutas = correctedValues.horasBrutas;
            log.subtotal = correctedValues.subtotal;
            log.valorNeto = correctedValues.valorNeto;
            log.valorNetoFinal = correctedValues.valorNetoFinal;
            
            await log.save();
        }

        console.log("Todos los registros han sido actualizados con éxito.");
    } catch (error) {
        console.error("Ocurrió un error al actualizar los registros:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Conexión a la base de datos cerrada.");
    }
};

fixTimeLogs();