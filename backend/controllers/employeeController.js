// backend/controllers/employeeController.js

const asyncHandler = require('express-async-handler');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Client = require('../models/Client');
const mongoose = require('mongoose');
const TimeLog = require('../models/TimeLog');

// Obtener todos los empleados con su total a pagar
const getAllEmployees = asyncHandler(async (req, res) => {
  const employeesWithTotals = await Employee.aggregate([
    { $match: { role: 'repartidor' } },
    { $lookup: { from: 'timelogs', localField: '_id', foreignField: 'employee', as: 'timelogs' } },
    { $addFields: { totalAPagar: { $sum: '$timelogs.valorNetoFinal' } } },
    { $project: { timelogs: 0 } }
  ]);
  res.json(employeesWithTotals);
});

// Obtener un empleado por su ID
const getEmployeeById = asyncHandler(async (req, res) => {
  const employeeId = req.params.id;
  const employee = await Employee.findById(employeeId).populate('user', 'username');
  if (!employee) {
    res.status(404);
    throw new Error('Empleado no encontrado');
  }
  if (req.user.role === 'cliente' || req.user.role === 'auxiliar') {
    let clientProfile = null;
    if (req.user.role === 'cliente') {
      clientProfile = await Client.findOne({ user: req.user.id });
    } else if (req.user.role === 'auxiliar') {
      clientProfile = await Client.findById(req.user.associatedClient);
    }
    if (!clientProfile) {
      res.status(404);
      throw new Error('Perfil de cliente no encontrado o no autorizado.');
    }
    const employeeBelongsToClient = clientProfile.employees.some(empId => empId.toString() === employee._id.toString());
    if (!employeeBelongsToClient) {
      res.status(403);
      throw new Error('No tienes permiso para ver este empleado.');
    }
  }
  res.json(employee);
});

// Crear un empleado por un cliente
const createEmployeeByClient = asyncHandler(async (req, res) => {
  const { fullName, idCard, phone } = req.body;
  if (!fullName || !idCard || !phone) {
    res.status(400);
    throw new Error('Por favor, proporciona nombre completo, cédula, teléfono, dirección y correo electrónico.');
  }
  const employeeExists = await Employee.findOne({ idCard });
  if (employeeExists) {
    res.status(400);
    throw new Error('Ya existe un empleado con esa cédula.');
  }
  const username = `M${idCard}`;
  const password = idCard;
  const userExists = await User.findOne({ username });
  if (userExists) {
    res.status(400);
    throw new Error(`El nombre de usuario '${username}' ya existe. Intenta con otra cédula.`);
  }
  let newUser;
  try {
    newUser = await User.create({ username, password, role: 'repartidor' });
  } catch (err) {
    res.status(500);
    throw new Error('Error interno al crear las credenciales del mensajero.');
  }
  let employee;
  try {
    employee = await Employee.create({
      user: newUser._id,
      fullName,
      idCard,
      phone,
      role: 'repartidor',
      employeeType: 'cliente'
    });
  } catch (err) {
    await User.deleteOne({ _id: newUser._id });
    res.status(500);
    throw new Error('Error interno al crear el perfil del mensajero.');
  }
  let client;
  if (req.user.role === 'cliente') {
    client = await Client.findOne({ user: req.user.id });
  } else if (req.user.role === 'auxiliar') {
    client = await Client.findById(req.user.associatedClient);
  }
  if (client) {
    client.employees.push(employee._id);
    await client.save();
    res.status(201).json({ message: 'Mensajero registrado y asociado con éxito.', employee });
  } else {
    await Employee.deleteOne({ _id: employee._id });
    await User.deleteOne({ _id: newUser._id });
    res.status(404);
    throw new Error('No se encontró el perfil del cliente para asociar el empleado.');
  }
});

// Eliminar un empleado (cliente o admin)
const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const authenticatedUser = req.user;
  const employee = await Employee.findById(id);
  if (!employee) {
    res.status(404);
    throw new Error('Mensajero no encontrado.');
  }
  if (authenticatedUser.role === 'cliente') {
    const client = await Client.findOne({ user: authenticatedUser._id });
    if (!client || !client.employees.some(empId => empId.toString() === employee._id.toString())) {
      res.status(403);
      throw new Error('No tienes permiso para eliminar este mensajero o no pertenece a tu empresa.');
    }
    client.employees = client.employees.filter(empId => empId.toString() !== employee._id.toString());
    await client.save();
    await TimeLog.deleteMany({ employee: employee._id });
  } else if (authenticatedUser.role === 'admin') {
    await TimeLog.deleteMany({ employee: employee._id });
  } else {
    res.status(403);
    throw new Error('No tienes permiso para eliminar mensajeros.');
  }
  await employee.deleteOne();
  res.status(200).json({ message: 'Mensajero eliminado con éxito.' });
});

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployeeByClient,
  deleteEmployee,
};
