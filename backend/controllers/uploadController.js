// backend/controllers/uploadController.js

const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const path = require('path');

// @desc    Subir un documento para un empleado
// @route   POST /api/upload/:employeeId
// @access  Private/Admin

const uploadDocument = asyncHandler(async (req, res) => {
    if (!req.file) {
        res.status(400);
        throw new Error('No se ha subido ningún archivo.');
    }

    const employeeId = req.params.employeeId;
    const employee = await Employee.findById(employeeId);

    if (!employee) {
        res.status(404);
        throw new Error('Empleado no encontrado.');
    }

    // Guardar la información del archivo en el empleado
    const newDocument = {
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.filename}` // Ruta donde se guardará el archivo
    };

    employee.documents.push(newDocument);
    await employee.save();

    res.status(200).json({
        message: 'Archivo subido y vinculado con éxito.',
        document: newDocument
    });
});

module.exports = { uploadDocument };
