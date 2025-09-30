// frontend/src/utils/calculationUtils.js

/**
 * Calcula el total pendiente por pagar para un empleado sumando
 * el campo 'valorNetoFinal' que ya viene calculado desde el backend.
 * @param {Array<object>} timeLogs - La lista de registros de tiempo de un empleado.
 * @returns {number} - El total pendiente por pagar.
 */
export const calculatePendingTotalForEmployee = (timeLogs) => {
    // Verificamos que timeLogs sea un array antes de usarlo
    if (!timeLogs || !Array.isArray(timeLogs)) {
        return 0;
    }

    return timeLogs
        .filter(log => !log.isPaid) // 1. Filtramos solo los registros pendientes
        .reduce((acc, log) => acc + (log.valorNetoFinal || 0), 0); // 2. Sumamos el valor final que ya viene listo
};
