// backend/utils/excelGenerator.js
// Bloque 1: Importación de la librería ExcelJS
const ExcelJS = require('exceljs');

/**
 * Bloque 2: Función principal para generar el reporte de Excel de registros de tiempo
 *
 * Esta es una función asincrónica que se encarga de crear un archivo Excel.
 * Su propósito es generar un reporte detallado de los registros de tiempo de los mensajeros,
 * con cada mensajero en su propia hoja.
 *
 * @param {Array<Object>} data - Es un array de objetos. Cada objeto en este array representa
 * una fila de datos en el reporte de Excel. Se espera que las
 * propiedades de cada objeto (`key`) coincidan con las claves
 * definidas en el array `columns`.
 * @param {string} [reportTitle='Reporte de Horarios'] - Un parámetro opcional que define
 * el título principal del reporte y el nombre de la hoja en el libro de Excel.
 * Por defecto, si no se especifica, será 'Reporte de Horarios'.
 * @returns {Promise<Buffer>} Retorna una Promesa. Cuando la promesa se resuelve, devuelve un `Buffer`.
 */
const generateTimeLogExcelReport = async (data, reportTitle = 'Reporte de Horarios') => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Mensajería Delivery Express S.A.S.';
    workbook.lastModifiedBy = 'Mensajería Delivery Express S.A.S.';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Bloque 3: Agrupar datos por mensajero
    // 'data' aquí se espera que ya contenga el 'employeeName' de la populación en el controlador
    const dataByEmployee = data.reduce((acc, log) => {
        const employeeName = log.employeeName || 'Sin Nombre'; // Fallback por si falta el nombre
        if (!acc[employeeName]) {
            acc[employeeName] = [];
        }
        acc[employeeName].push(log);
        return acc;
    }, {});

    // Bloque 4: Definición de las columnas del reporte (mismas para todas las hojas)
    const columns = [
        { header: 'Fecha', key: 'date', width: 15, style: { numFmt: 'yyyy-mm-dd' } },
        { header: 'Empresa', key: 'empresa', width: 25 },
        { header: 'Día Festivo', key: 'festivo', width: 15 },
        { header: 'Hora Inicio', key: 'horaInicio', width: 15 },
        { header: 'Hora Fin', key: 'horaFin', width: 15 },
        { header: 'Horas Brutas', key: 'horasBrutas', width: 15 },
        { header: 'Minutos Almuerzo sin Pago', key: 'minutosAlmuerzoSinPago', width: 25 },
        { header: 'Valor por Hora', key: 'valorHora', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Subtotal ($)', key: 'subtotal', width: 18, style: { numFmt: '#,##0.00' } },
        { header: 'Descuento Almuerzo ($)', key: 'descuentoAlmuerzo', width: 20, style: { numFmt: '#,##0.00' } },
        { header: 'Valor Neto Inicial ($)', key: 'valorNetoInicial', width: 20, style: { numFmt: '#,##0.00' } },
        { header: 'Deducción Préstamo ($)', key: 'deduccionPrestamo', width: 20, style: { numFmt: '#,##0.00' } },
        { header: 'Valor Neto Final ($)', key: 'valorNetoFinal', width: 20, style: { numFmt: '#,##0.00' } },
        { header: 'Estado', key: 'estado', width: 15 },
        { header: 'Fijado', key: 'fijado', width: 15 },
        { header: 'Registrado Por', key: 'registeredBy', width: 20 },
        { header: 'Fecha Registro', key: 'createdAt', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm:ss' } },
    ];

    // Bloque 5: Iterar sobre cada mensajero y crear una hoja separada
    for (const employeeName in dataByEmployee) {
        const employeeLogs = dataByEmployee[employeeName];
        const sheetName = employeeName.substring(0, 31).replace(/[\\/?*\[\]:]/g, '') || 'Mensajero';
        const worksheet = workbook.addWorksheet(sheetName);
        worksheet.addRow([`Reporte de Horarios para: ${employeeName}`]);
        worksheet.getCell('A1').font = { size: 16, bold: true };
        worksheet.mergeCells(`A1:${String.fromCharCode(65 + columns.length - 1)}1`);
        worksheet.addRow([]);
        worksheet.columns = columns;
        worksheet.addRow(columns.map(col => col.header));

        // Bloque 6: Inicialización de variables para la suma de totales (por hoja)
        let totalHorasBrutas = 0;
        let totalSubtotal = 0;
        let totalDescAlmuerzo = 0;
        let totalMinutosAlmuerzoSinPago = 0;
        let totalValorNetoInicial = 0;
        let totalDeduccionPrestamo = 0;
        let totalValorNetoFinal = 0;

        // Bloque 7: Procesamiento de los datos y adición de filas al Excel para esta hoja
        employeeLogs.forEach(row => {
            const horasBrutas = parseFloat(row.horasBrutas) || 0;
            const subtotal = parseFloat(row.subtotal) || 0;
            const descuentoAlmuerzo = parseFloat(row.descuentoAlmuerzo) || 0;
            const minutosAlmuerzoSinPago = parseInt(row.minutosAlmuerzoSinPago, 10) || 0;
            const valorNetoInicial = parseFloat(row.valorNetoInicial) || 0;
            const deduccionPrestamo = parseFloat(row.deduccionPrestamo) || 0;
            const valorNetoFinal = parseFloat(row.valorNetoFinal) || 0;

            totalHorasBrutas += horasBrutas;
            totalSubtotal += subtotal;
            totalDescAlmuerzo += descuentoAlmuerzo;
            totalMinutosAlmuerzoSinPago += minutosAlmuerzoSinPago;
            totalValorNetoInicial += valorNetoInicial;
            totalDeduccionPrestamo += deduccionPrestamo;
            totalValorNetoFinal += valorNetoFinal;

            worksheet.addRow(row);
        });

        worksheet.addRow({});
        const totalsRow = worksheet.addRow({
            fecha: 'TOTALES:',
            horasBrutas: totalHorasBrutas,
            subtotal: totalSubtotal,
            descuentoAlmuerzo: totalDescAlmuerzo,
            minutosAlmuerzoSinPago: totalMinutosAlmuerzoSinPago,
            valorNetoInicial: totalValorNetoInicial,
            deduccionPrestamo: totalDeduccionPrestamo,
            valorNetoFinal: totalValorNetoFinal
        });
        totalsRow.font = { bold: true };

        // Bloque 9: Ajuste automático del ancho de las columnas para esta hoja
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 0;
                if (columnLength > maxLength) {
                    maxLength = columnLength;
                }
            });
            column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
    }

    // Bloque 10: Generación y retorno del buffer del archivo Excel
    let buffer;
    try {
        buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    } catch (writeError) {
        console.error(`[ERROR - ExcelGenerator] Error al escribir el buffer de Excel: ${writeError.message}`, writeError.stack);
        throw new Error(`Fallo al crear el buffer del archivo Excel: ${writeError.message}`);
    }
};

// Bloque 11: Exportación de la función
module.exports = { generateTimeLogExcelReport };
