// frontend/src/pages/EmployeesPage.js

import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import './EmployeesPage.css';

const EmployeesPage = () => {
    const [employees, setEmployees] = useState([]);
    const [showDocumentsModal, setShowDocumentsModal] = useState(false);
    const [employeeToView, setEmployeeToView] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
    const fetchEmployees = async () => {
        // Mensaje 1: Para saber que la función se está ejecutando
        console.log('%c1. Buscando empleados...', 'color: blue; font-size: 16px;');

        try {
            const res = await API.get('/api/employees');

            // Mensaje 2: Los datos específicos que nos interesan
            console.log('%c2. Datos de los empleados recibidos:', 'color: green; font-size: 16px;', res.data);

            setEmployees(res.data);
        } catch (err) {
            // Mensaje 3: Si hay un error, lo veremos en rojo
            console.error('%c¡ERROR! La llamada a la API falló:', 'color: red; font-size: 16px;', err);
            toast.error('Error al cargar la lista de empleados.');
        }
    };

    fetchEmployees();
}, []);

    const handleViewDocuments = (employee) => {
        setEmployeeToView(employee);
        setShowDocumentsModal(true);
    };

    return (
        <div className="employees-page-container">
            <h2 className="employees-page-header">Gestión de Empleados</h2>
            <p className="employees-page-info">
                Como administrador, tienes acceso a la visualización y gestión de los empleados.
            </p>
            <h3 className="employees-list-header">Lista de Empleados Registrados</h3>
            {employees.length === 0 ? (
                <p>No hay empleados registrados.</p>
            ) : (
                <div className="table-responsive-wrapper">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Nombre Completo</th>
                                <th>Cédula</th>
                                <th>Teléfono</th>
                                <th>Total por Pagar</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((employee) => (
                                <tr key={employee._id}>
                                    <td>{employee.user?.username || 'N/A'}</td>
                                    <td>{employee.fullName}</td>
                                    <td>{employee.idCard}</td>
                                    <td>{employee.phone}</td>
                                    <td>
                                        <strong>
                    {/* Este es el cambio: Usamos 'currentBalance' que ya viene calculado */}
                    {(employee.currentBalance || 0).toLocaleString('es-CO', {
                        style: 'currency',
                        currency: 'COP',
                        minimumFractionDigits: 0
                    })}
                </strong>
                                    </td>
                                    <td>
                                        <button
                                            className="view-dashboard-button"
                                            onClick={() => navigate(`/admin/view-courier-dashboard/${employee._id}`)}
                                        >
                                            Ver Dashboard
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EmployeesPage;