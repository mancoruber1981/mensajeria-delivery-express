// backend/utils/calculationUtils.js

/**
 * @description Calcula los valores financieros de un registro de tiempo.
 * @param {object} logData - Objeto con los datos del registro (date, horaInicio, horaFin, etc.).
 * @returns {object} Un objeto con los valores calculados (horasBrutas, subtotal, etc.).
 */
export const calculateTimeLogValues = (logData) => {
    const { date, horaInicio, horaFin, valorHora, minutosAlmuerzoSinPago, descuentoAlmuerzo, totalLoanDeducted } = logData;

    if (!horaInicio || !horaFin) {
        return { horasBrutas: 0, subtotal: 0, valorNeto: 0, valorNetoFinal: 0 };
    }

    const start = new Date(`${date}T${horaInicio}`);
    let end = new Date(`${date}T${horaFin}`);
    if (end < start) {
        end.setDate(end.getDate() + 1);
    }

    let diffMs = end - start;
    diffMs -= (minutosAlmuerzoSinPago || 0) * 60 * 1000;

    const horasBrutas = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    const subtotal = parseFloat((horasBrutas * (valorHora || 0)).toFixed(2));
    const valorNeto = subtotal - (descuentoAlmuerzo || 0);
    const valorNetoFinal = valorNeto - (totalLoanDeducted || 0);

    return {
        horasBrutas,
        subtotal,
        valorNeto,
        valorNetoFinal,
    };
};