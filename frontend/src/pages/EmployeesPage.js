// Bloque 1: Importaciones
import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './EmployeesPage.css'; // ¡Importa el archivo CSS!

// Bloque 2: Componente principal del Dashboard
const EmployeesPage = () => {
    // Bloque 3: Estados, Hooks y Variables del Componente
    const [employees, setEmployees] = useState([]);
    const [employeeDocuments, setEmployeeDocuments] = useState([]);
    const [showDocumentsModal, setShowDocumentsModal] = useState(false);
    const [employeeToView, setEmployeeToView] = useState(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    // Bloque 4: Efecto para cargar datos del dashboard (Versión Inteligente)
    useEffect(() => {
        fetchEmployees();
    }, []);

    // Bloque 5: Manejadores de eventos - Funciones
    const fetchEmployees = async () => {
        try {
            const res = await API.get('/employees');
            setEmployees(res.data);
        } catch (err) {
            toast.error('Error al cargar la lista de empleados.');
            console.error('Error al cargar empleados:', err.response?.data || err.message);
        }
    };

    const handleViewDocuments = (employee) => {
        setEmployeeToView(employee);
        setEmployeeDocuments(employee.documents || []);
        setShowDocumentsModal(true);
    };

    const downloadDocument = (filePath, fileName) => {
        const fullUrl = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000'}${filePath}`;
        window.open(fullUrl, '_blank');
    };

    const handleViewTimeLogHistory = (employeeId) => {
        navigate(`/time-entries/employee/${employeeId}`);
    };

    const handleExportEmployeesForAccountant = async () => {
        try {
            const res = await API.get('/export/timeentries', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'reporte_horarios_consolidado_para_contador.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Reporte de horarios consolidado para contador exportado con éxito.');
            console.log('Generando reporte consolidado de horarios para el contador.');
        } catch (err) {
            toast.error('Error al generar el reporte consolidado para el contador.');
            console.error('Error al exportar reporte para contador:', err.response?.data || err.message);
        }
    };

    const handleGenerateTotalReport = () => {
        toast.info('Funcionalidad "Generar Reporte (Total)" en desarrollo. Mostrará un resumen de la quincena.');
    };

    // Bloque 6: Renderizado condicional y estructura JSX
    return (
        <div className="employees-page-container">
            <h2 className="employees-page-header">Gestión de Empleados</h2>
            <p className="employees-page-info">
                Como administrador, solo tienes acceso a la visualización de los datos de los empleados. La creación, edición y eliminación son gestionadas directamente por cada empleado.
            </p>

            <h3 className="employees-list-header">Lista de Empleados Registrados</h3>
            {employees.length === 0 ? (
                <p className="no-data-message">No hay empleados registrados en el sistema.</p>
            ) : (
                <div className="table-responsive-wrapper">
                    <table className="employees-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Nombre Completo</th>
                                <th>Cédula</th>
                                <th>Teléfono</th>
                                <th>Correo Electrónico</th>
                                <th>Dirección</th>
                                <th>Horario Asignado</th>
                                <th>Notas (Perfil)</th>
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
                                    <td>{employee.email}</td>
                                    <td>{employee.address}</td>
                                    <td>{employee.assignedSchedule}</td>
                                    <td>
                                        {employee.profileNotes && employee.profileNotes.length > 0 ? (
                                            <button className="view-button" onClick={() => handleViewDocuments(employee)}>
                                                Ver Notas ({employee.profileNotes.length})
                                            </button>
                                        ) : (
                                            'Ninguno'
                                        )}
                                    </td>
                                    <td>
                                        <strong>
                                            {(employee.totalAPagar || 0).toLocaleString('es-CO')}
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

            {showDocumentsModal && employeeToView && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <button className="modal-close-button" onClick={() => { setShowDocumentsModal(false); setEmployeeToView(null); }}>X</button>
                        <h3>Detalles y Documentos de {employeeToView.fullName}</h3>
                        <p><strong>Usuario:</strong> {employeeToView.user?.username}</p>
                        <p><strong>Cédula:</strong> {employeeToView.idCard}</p>
                        <p><strong>Teléfono:</strong> {employeeToView.phone}</p>
                        <p><strong>Correo:</strong> {employeeToView.email}</p>
                        <p><strong>Dirección:</strong> {employeeToView.address}</p>
                        <p><strong>Horario Asignado:</strong> {employeeToView.assignedSchedule}</p>
                        <p><strong>Estado del Perfil:</strong> {employeeToView.isFixed ? 'Fijado' : 'Abierto'}</p>

                        <h4>Documentos Cargados:</h4>
                        {employeeDocuments.length > 0 ? (
                            <ul>
                                {employeeDocuments.map((doc, index) => (
                                    <li key={index}>
                                        <button
                                            onClick={() => downloadDocument(doc.filePath, doc.fileName)}
                                            className="modal-document-link"
                                        >
                                            {doc.fileName} (Subido el: {(new Date(doc.uploadedAt)).toLocaleDateString('es-CO')})
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No hay documentos para este empleado.</p>
                        )}
                        <h4>Notas del Perfil:</h4>
                        {employeeToView.profileNotes && employeeToView.profileNotes.length > 0 ? (
                            <ul>
                                {employeeToView.profileNotes.map((note, index) => (
                                    <li key={index}>
                                        "{note.text}" - por {note.author} ({new Date(note.createdAt).toLocaleDateString('es-CO')})
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No hay notas en el perfil de este empleado.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Bloque 7: Exportación del Componente
export default EmployeesPage;