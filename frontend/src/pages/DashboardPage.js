// Bloque 1: Importaciones este es el  dashboard del cliente/ClientJage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';

// Bloque 2: Componente principal del Dashboard
const DashboardPage = () => {
    // Bloque 3: Estados, Hooks y Variables del Componente
    const [dashboardData, setDashboardData] = useState({ employeesList: [], grandTotal: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();
    const { clientId } = useParams();
    const [clientProfile, setClientProfile] = useState(null);
    const [showRegisterAuxiliaryModal, setShowRegisterAuxiliaryModal] = useState(false);
    const [auxiliaryUsername, setAuxiliaryUsername] = useState('');
    const [auxiliaryPassword, setAuxiliaryPassword] = useState('');
    const [auxiliaries, setAuxiliaries] = useState([]);
    const [defaultHourlyRate, setDefaultHourlyRate] = useState('');
    const [holidayHourlyRate, setHolidayHourlyRate] = useState('');

    // Variable booleana para saber si es vista de admin
    const isAdminView = user?.role === 'admin' && clientId;

    const pageTitle = isAdminView
        ? `Vista del Dashboard de ${clientProfile?.companyName || 'Cliente'}`
        : `Dashboard de ${user?.profile?.companyName || user?.username || 'Cliente'}`;

    // Bloque 4: Efecto para cargar datos del dashboard (Versión Corregida)
useEffect(() => {
    const fetchDashboardData = async () => {
        setLoading(true);
        setError('');
        try {
            // Si es un Admin viendo el perfil de un cliente...
            if (isAdminView) {
                const { data } = await API.get(`/admin/client-dashboard/${clientId}`);
                setClientProfile(data.clientProfile);
                setDashboardData(data.dashboardData); // ✅ Asignación correcta
                setAuxiliaries(data.auxiliaries);
                setDefaultHourlyRate(data.clientProfile.defaultHourlyRate?.toString() || '0');
                setHolidayHourlyRate(data.clientProfile.holidayHourlyRate?.toString() || '0');
            }
            // Si es un Cliente viendo su propio perfil...
            else if (user?.role === 'cliente') {
                const { data: clientProfileResData } = await API.get(`/clients/${user.profile._id}`);
                setClientProfile(clientProfileResData);
                setDefaultHourlyRate(clientProfileResData.defaultHourlyRate?.toString() || '0');
                setHolidayHourlyRate(clientProfileResData.holidayHourlyRate?.toString() || '0');

                const { data: dashboardResData } = await API.get('/clients/dashboard');
                setDashboardData(dashboardResData); // ✅ CORRECCIÓN CLAVE: Asignamos el objeto completo
                
                const { data: auxiliariesResData } = await API.get('/clients/me/auxiliaries');
                setAuxiliaries(auxiliariesResData);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al cargar los datos del dashboard.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    if (user) {
        fetchDashboardData();
    } else {
        setLoading(false);
    }
}, [user, clientId, isAdminView]);

    // Bloque 5: Manejadores de eventos - Actualizar Tarifas Horarias
    const handleUpdateRates = async () => {
        if (typeof parseFloat(defaultHourlyRate) !== 'number' || parseFloat(defaultHourlyRate) < 0 ||
            typeof parseFloat(holidayHourlyRate) !== 'number' || parseFloat(holidayHourlyRate) < 0) {
            toast.error("Por favor, ingresa tarifas horarias válidas (números positivos o cero).");
            return;
        }

        if (window.confirm(`¿Estás seguro de que quieres actualizar las tarifas?`)) {
            try {
                await API.put(`/clients/${user.profile._id}/hourly-rates`, {
                    defaultHourlyRate: parseFloat(defaultHourlyRate),
                    holidayHourlyRate: parseFloat(holidayHourlyRate)
                });
                toast.success('Tarifas horarias actualizadas con éxito.');
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al actualizar las tarifas horarias.');
            }
        }
    };

    // Bloque 6: Manejadores de eventos - Registrar y Eliminar Auxiliar
    const handleRegisterAuxiliary = async (e) => {
        e.preventDefault();
        if (!auxiliaryUsername || !auxiliaryPassword) {
            toast.error('Por favor, ingresa un usuario y contraseña para el auxiliar.');
            return;
        }
        try {
            await API.post('/auth/register-auxiliary-by-client', {
                username: auxiliaryUsername,
                password: auxiliaryPassword,
            });
            toast.success('Auxiliar registrado y asociado con éxito!');
            setShowRegisterAuxiliaryModal(false);
            setAuxiliaryUsername('');
            setAuxiliaryPassword('');
            const { data: updatedAuxiliaries } = await API.get('/clients/me/auxiliaries');
            setAuxiliaries(updatedAuxiliaries);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al registrar el auxiliar.');
        }
    };

    const handleDeleteAuxiliary = async (auxiliaryId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este auxiliar? Esta acción es irreversible.')) {
            try {
                await API.delete(`/auth/auxiliaries/${auxiliaryId}`);
                toast.success('Auxiliar eliminado con éxito.');
                setAuxiliaries(prev => prev.filter(aux => aux._id !== auxiliaryId));
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al eliminar el auxiliar.');
            }
        }
    };

    // Bloque 7: Manejadores de eventos - Acciones de Empleado
    const handleRegisterEmployeeClick = () => {
        const path = isAdminView ? `/admin/register-employee-for/${clientId}` : '/register-employee';
        navigate(path);
    };

    const handleDeleteEmployee = async (employeeId, employeeName) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar al mensajero ${employeeName}? Esta acción es irreversible y eliminará todos sus registros de horario.`)) {
            try {
                await API.delete(`/employees/${employeeId}`);
                toast.success(`Mensajero ${employeeName} y sus registros eliminados con éxito.`);
                setDashboardData(prevData => {
                    const updatedList = prevData.employeesList.filter(emp => emp._id !== employeeId);
                    const newGrandTotal = updatedList.reduce((total, emp) => total + (emp.totalAPagar || 0), 0);
                    return {
                        employeesList: updatedList,
                        grandTotal: newGrandTotal
                    };
                });
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al eliminar el mensajero.');
                console.error('Error al eliminar mensajero:', err);
            }
        }
    };

    // Bloque 8: Manejadores de eventos - Exportar a Excel
    const handleExportToExcel = async () => {
        try {
            const response = await API.get('/clients/me/export-timelogs', {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'registros_horarios.xlsx';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch[1]) {
                    fileName = fileNameMatch[1];
                }
            }
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Registros exportados a Excel con éxito!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al exportar a Excel.');
        }
    };

    // ... (código anterior) ...

// Bloque 9: Renderizado condicional y estructura JSX
if (loading) return <LoadingSpinner />;
if (error) return <div className="error-message">Error: {error}</div>;
if (!isAdminView && user?.role !== 'cliente') {
    return <div className="error-message">Acceso denegado.</div>;
}

return (
    <div className="dashboard-container">
        <h1>{pageTitle}</h1>

        {isAdminView && <p className="alert alert-info" style={{ textAlign: 'center', fontWeight: 'bold' }}>Estás en modo de visualización como administrador. Las acciones de edición están deshabilitadas.</p>}

        {/* Tarjeta de Configuración de Tarifa Horaria */}
        <div className="dashboard-card">
            <h2>Configuración de Tarifa Horaria</h2>
            <div className="form-group">
                <label>Tarifa Horaria por Defecto ($):</label>
                <input
                    type="number"
                    value={defaultHourlyRate}
                    onChange={(e) => setDefaultHourlyRate(e.target.value)}
                    className="input-field"
                    required
                    disabled={isAdminView}
                />
            </div>
            <div className="form-group">
                <label>Tarifa Horaria Festiva ($):</label>
                <input
                    type="number"
                    value={holidayHourlyRate}
                    onChange={(e) => setHolidayHourlyRate(e.target.value)}
                    className="input-field"
                    required
                    disabled={isAdminView}
                />
            </div>
            <button
                onClick={handleUpdateRates}
                className="button-primary"
                disabled={isAdminView}
            >
                Actualizar Tarifas
            </button>
        </div>

        {/* Tarjeta de Gestión de Auxiliares */}
        <div className="dashboard-card" style={{ marginTop: '2rem' }}>
            <h2>Gestión de Auxiliares</h2>
            <button
                onClick={() => setShowRegisterAuxiliaryModal(true)}
                className="button-secondary"
                disabled={isAdminView}
            >
                + Registrar Nuevo Auxiliar
            </button>

            {/* Modal para registrar auxiliar */}
            {showRegisterAuxiliaryModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Registrar Nuevo Auxiliar</h3>
                        <form onSubmit={handleRegisterAuxiliary}>
                            <div className="form-group">
                                <label>Usuario:</label>
                                <input
                                    type="text"
                                    value={auxiliaryUsername}
                                    onChange={(e) => setAuxiliaryUsername(e.target.value)}
                                    required
                                    disabled={isAdminView}
                                />
                            </div>
                            <div className="form-group">
                                <label>Contraseña:</label>
                                <input
                                    type="password"
                                    value={auxiliaryPassword}
                                    onChange={(e) => setAuxiliaryPassword(e.target.value)}
                                    required
                                    disabled={isAdminView}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="button-success" disabled={isAdminView}>Registrar</button>
                                <button type="button" onClick={() => setShowRegisterAuxiliaryModal(false)} className="button-cancel">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>

        {/* Tarjeta de Auxiliares Registrados */}
        <div className="dashboard-card" style={{ marginTop: '2rem' }}>
            <h2>Auxiliares Registrados</h2>
            {auxiliaries.length > 0 ? (
                <div className="table-responsive-container"> {/* AÑADE ESTE DIV */}
                    <table className="responsive-table"> {/* AÑADE ESTA CLASE */}
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {auxiliaries.map(aux => (
                                <tr key={aux._id}>
                                    <td>{aux.username}</td>
                                    <td>
                                        <button
                                            className="button-small button-delete"
                                            onClick={() => handleDeleteAuxiliary(aux._id)}
                                            disabled={isAdminView}
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p style={{ marginTop: '1.5rem' }}>Aún no tienes auxiliares registrados.</p>
            )}
        </div>

        {/* Tarjeta de Mensajeros Registrados */}
        <div className="dashboard-card">
            <h2>Mis Mensajeros Registrados</h2>
            <button
                onClick={handleRegisterEmployeeClick}
                className="button-primary"
                disabled={isAdminView}
            >
                + Registrar Nuevo Mensajero
            </button>

            {/* ✅ CORRECCIÓN AQUÍ: Agregamos una comprobación para dashboardData */}
            {dashboardData?.employeesList?.length > 0 ? (
                <div className="table-responsive-container">
                    <table className="responsive-table">
                        <thead>
                            <tr>
                                <th>Nombre Completo</th>
                                <th>Cédula</th>
                                <th>Teléfono</th>
                                <th>Total por Pagar</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dashboardData.employeesList.map(employee => (
                                <tr key={employee._id}>
                                    <td>{employee.fullName}</td>
                                    <td>{employee.idCard}</td>
                                    <td>{employee.phone}</td>
                                    <td>
                                        <strong>
                                            {(employee.totalAPagar || 0).toLocaleString('es-CO')}
                                        </strong>
                                    </td>
                                    <td>
                                        <Link
                                            to={isAdminView ? `/admin/view-employee-history/${employee._id}` : `/time-entries/employee/${employee._id}`}
                                            className="button-small"
                                        >
                                            {isAdminView ? 'Ver Historial' : 'Registrar Horario'}
                                        </Link>
                                        <button
                                            className="button-small button-delete"
                                            onClick={() => handleDeleteEmployee(employee._id, employee.fullName)}
                                            style={{ marginTop: '5px' }}
                                            disabled={isAdminView}
                                        >
                                            Eliminar Mensajero
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p style={{ marginTop: '1.5rem' }}>Aún no tienes mensajeros registrados.</p>
            )}
        </div>

        {/* Tarjeta de Resumen General */}
        <div className="dashboard-card">
            <h2>Resumen General</h2>
            <h3>Total a Pagar:
                <span style={{ color: '#007bff', marginLeft: '10px' }}>
                    {`$ ${(dashboardData?.grandTotal || 0).toLocaleString('es-CO')}`}
                </span>
            </h3>
        </div>

        {/* Tarjeta de Reportes */}
        <div className="dashboard-card" style={{ marginTop: '2rem' }}>
            <h2>Reportes</h2>
            <button
                onClick={handleExportToExcel}
                className="button-primary"
                disabled={isAdminView}
            >
                Exportar Registros a Excel
            </button>
        </div>
    </div>
);
};

export default DashboardPage;