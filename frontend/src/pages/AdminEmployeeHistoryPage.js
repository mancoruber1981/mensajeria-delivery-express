// frontend/src/pages/AdminEmployeeHistoryPage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../api/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner'; // <-- ¡AÑADE ESTA LÍNEA!
import './AdminEmployeeHistoryPage.css'

const AdminEmployeeHistoryPage = () => {
    const { employeeId } = useParams();
    const [timeEntries, setTimeEntries] = useState([]);
    const [employeeName, setEmployeeName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEmployeeHistory = async () => {
            setLoading(true);
            setError('');
            try {
                const { data } = await API.get(`/admin/employees/${employeeId}/time-entries`);
                setEmployeeName(data.employeeName);
                setTimeEntries(data.timeEntries);
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Error al cargar el historial del mensajero.';
                setError(errorMessage);
                toast.error(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        if (employeeId) {
            fetchEmployeeHistory();
        }
    }, [employeeId]);

    if (loading) return <LoadingSpinner />; // <-- Aquí es donde se usa
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <h1>Historial de Registros de {employeeName}</h1>
            <p>Aquí se muestra el historial del mensajero con ID: {employeeId}</p>

            {timeEntries.length > 0 ? (
                
                // CAMBIO 2: Se corrigió el className y se eliminó el estilo en línea
                <div className="table-responsive-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Horas Brutas</th>
                                <th>Festivo</th>
                                <th>Subtotal a Pagar</th>
                                <th>Descuento Almuerzo</th>
                                <th>Deducción Préstamo</th>
                                <th>Total a Pagar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timeEntries.map(entry => (
                                <tr key={entry._id}>
                                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                                    <td>{entry.horasBrutas?.toFixed(2) || '0.00'}</td>
                                    <td>{entry.festivo ? 'Sí' : 'No'}</td>
                                    <td>{entry.subtotal?.toLocaleString('es-CO') || '0'}</td>
                                    <td>{entry.descuentoAlmuerzo?.toLocaleString('es-CO') || '0'}</td>
                                    <td>{entry.totalLoanDeducted?.toLocaleString('es-CO') || '0'}</td>
                                    <td>{entry.valorNetoFinal?.toLocaleString('es-CO') || '0'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            ) : (
                <p>No se encontraron registros de horario para este mensajero.</p>
            )}
        </div>
    );
};

export default AdminEmployeeHistoryPage;