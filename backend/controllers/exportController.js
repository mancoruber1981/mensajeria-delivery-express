// backend/controllers/exportController.js

import asyncHandler from 'express-async-handler';
import TimeLog from '../models/TimeLog.js';
import Employee from '../models/Employee.js';
import { generateTimeLogExcelReport } from '../utils/excelGenerator.js';

/**
 * @desc    Exportar registros de horarios a un archivo Excel.
 * La lógica varía según el rol del usuario.
 * @route   GET /api/export/timeentries/:employeeId?
 * @access  Private (Admin, Repartidor, Cliente)
 */
export const exportTimeEntries = asyncHandler(async (req, res) => {
    const { employeeId } = req.params;
    const { user } = req;
    let timeLogsQuery;
    let reportTitle = 'General';

    // Construimos la consulta a la base de datos según el rol del usuario
    if (user.role === 'admin') {
        const queryFilter = employeeId ? { employee: employeeId } : {};
        timeLogsQuery = TimeLog.find(queryFilter);

        if (employeeId) {
            const employee = await Employee.findById(employeeId);
            reportTitle = employee ? employee.fullName : 'Desconocido';
        } else {
            reportTitle = 'Todos_los_Empleados';
        }
    } else if (user.role === 'repartidor' || user.role === 'cliente') {
        const employeeProfile = await Employee.findOne({ user: user._id });
        if (!employeeProfile) {
            res.status(404);
            throw new Error('Perfil de empleado no encontrado para este usuario.');
        }
        timeLogsQuery = TimeLog.find({ employee: employeeProfile._id });
        reportTitle = employeeProfile.fullName;
    } else {
        res.status(403);
        throw new Error('No tienes permiso para generar este reporte.');
    }

    // Ejecutamos la consulta final, populando los datos y ordenando
    const timeLogs = await timeLogsQuery
        .populate('employee', 'fullName idCard')
        .populate('user', 'username')
        .sort({ date: 1, 'horaInicio': 1 })
        .lean(); // .lean() para un mejor rendimiento en reportes grandes

    if (timeLogs.length === 0) {
        res.status(404);
        throw new Error('No se encontraron registros de tiempo para exportar.');
    }

    // Generamos el buffer del archivo Excel
    const buffer = generateTimeLogExcelReport(timeLogs, reportTitle);

    // Enviamos el archivo al cliente
    const fileName = `reporte_horarios_${reportTitle.replace(/\s/g, '_')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.send(buffer);
});