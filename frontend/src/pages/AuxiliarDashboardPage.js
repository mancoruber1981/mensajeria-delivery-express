import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Se añade Link aquí
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import API from '../api/api';
import { toast } from 'react-toastify';
import '../index.css';

const AuxiliarDashboardPage = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchEmployees = useCallback(async () => {
        if (authLoading || !user || user.role !== 'auxiliar' || !user.associatedClient || !user.associatedClientProfile?._id) {
            if (!authLoading) {
                setError("Perfil de cliente asociado no cargado o acceso denegado.");
                setPageLoading(false);
            }
            return;
        }

        try {
            const res = await API.get(`/clients/${user.associatedClientProfile._id}`);
            setEmployees(res.data.employees || []);
            setError(null);
        } catch (err) {
            console.error("Error al cargar los mensajeros asociados para el auxiliar:", err.response?.data?.message || err.message);
            setError(err.response?.data?.message || "Error al cargar los mensajeros asociados.");
            toast.error(err.response?.data?.message || "Error al cargar los mensajeros.");
        } finally {
            setPageLoading(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (!authLoading && user && user.associatedClientProfile) {
            fetchEmployees();
        } else if (!authLoading && (!user || !user.associatedClientProfile)) {
            setError("Acceso denegado o perfil de cliente asociado no disponible.");
            setPageLoading(false);
        }
    }, [authLoading, user, fetchEmployees]);

    const handleManageTimeEntries = (employeeId) => {
        navigate(`/time-entries/employee/${employeeId}`);
    };

    if (authLoading || pageLoading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    if (!user || user.role !== 'auxiliar') {
        return <div className="error-message">Acceso denegado. Esta página es solo para auxiliares.</div>;
    }

    return (
    <div className="dashboard-container">
        <h1>Bienvenido, Auxiliar {user?.username}!</h1>
        {user.associatedClientProfile?.companyName && (
            <p>Gestionando mensajeros de la empresa: <strong>{user.associatedClientProfile.companyName}</strong></p>
        )}
        <p>Selecciona un mensajero para gestionar sus registros de horario.</p>
        
        <div style={{ margin: '20px 0' }}>
            <Link to="/register-employee" className="button-primary">
                + Registrar Nuevo Mensajero
            </Link>
        </div>

        <div className="dashboard-card">
            <h2>Mensajeros de {user.associatedClientProfile?.companyName || 'tu Cliente'}</h2>
            {employees.length > 0 ? (
                // --- INICIA LA MODIFICACIÓN ---
                <div className="table-responsive-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre Completo</th>
                                <th>Cédula</th>
                                <th>Teléfono</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(employee => (
                                <tr key={employee._id}>
                                    <td>{employee.fullName}</td>
                                    <td>{employee.idCard}</td>
                                    <td>{employee.phone}</td>
                                    <td>
                                        <button
                                            className="button-small button-primary"
                                            onClick={() => handleManageTimeEntries(employee._id)}
                                        >
                                            Gestionar Horario
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                // --- TERMINA LA MODIFICACIÓN ---
            ) : (
                <p style={{ marginTop: '1.5rem' }}>Tu cliente aún no tiene mensajeros registrados.</p>
            )}
        </div>
    </div>
);
};

export default AuxiliarDashboardPage;