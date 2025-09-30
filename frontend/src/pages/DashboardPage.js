// frontend/src/pages/DashboardPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-toastify';

const DashboardPage = () => {
    // --- Bloque de Estados ---
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
    const isAdminView = user?.role === 'admin' && clientId;
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const pageTitle = isAdminView
        ? `Gestionando Dashboard de: ${clientProfile?.companyName || 'Cliente'}`
        : `Dashboard de ${user?.profile?.companyName || user?.username || 'Cliente'}`;

    // --- Lógica de Datos (Corregida y Organizada) ---
    const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
        const targetClientId = isAdminView ? clientId : user.profile._id;
        if (!targetClientId) {
            setLoading(false);
            return;
        }

        if (isAdminView) {
            const { data } = await API.get(`/api/admin/client-dashboard/${targetClientId}`);
            setClientProfile(data.clientProfile);
            setDashboardData(data.dashboardData);
            setAuxiliaries(data.auxiliaries);
            setDefaultHourlyRate(data.clientProfile.defaultHourlyRate?.toString() || '0');
            setHolidayHourlyRate(data.clientProfile.holidayHourlyRate?.toString() || '0');
        } else if (user?.role === 'cliente') {
            const { data: clientProfileResData } = await API.get(`/api/clients/${targetClientId}`);
            setClientProfile(clientProfileResData);
            setDefaultHourlyRate(clientProfileResData.defaultHourlyRate?.toString() || '0');
            setHolidayHourlyRate(clientProfileResData.holidayHourlyRate?.toString() || '0');
            
            const { data: dashboardResData } = await API.get('/api/clients/dashboard');
            setDashboardData(dashboardResData);

            const { data: auxiliariesResData } = await API.get('/api/clients/me/auxiliaries');
            setAuxiliaries(auxiliariesResData);
        }
    } catch (err) {
        const errorMessage = err.response?.data?.message || 'Error al cargar los datos.';
        setError(errorMessage);
        toast.error(errorMessage);
    } finally {
        setLoading(false);
    }
}, [user, clientId, isAdminView]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, fetchDashboardData]);

    // --- Manejadores de Eventos ---
    const handleUpdateRates = async () => {
    // ✅ Esta es la lógica clave para que el botón de actualizar tarifa funcione
    const targetClientId = isAdminView ? clientId : user.profile._id;
    if (window.confirm(`¿Estás seguro de que quieres actualizar las tarifas?`)) {
        try {
            await API.put(`/api/clients/${targetClientId}/hourly-rates`, {
                defaultHourlyRate: parseFloat(defaultHourlyRate),
                holidayHourlyRate: parseFloat(holidayHourlyRate)
            });
            toast.success('Tarifas horarias actualizadas con éxito.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al actualizar las tarifas.');
        }
    }
};

  const handleRegisterAuxiliary = async (e) => {
    e.preventDefault();
    if (!auxiliaryUsername || !auxiliaryPassword) {
        toast.error('Por favor, ingresa un usuario y contraseña para el auxiliar.');
        return;
    }
    try {
        // ✅ CAMBIO: Ahora enviamos el clientId que el admin está viendo
        await API.post('/api/auth/register-auxiliary-by-client', {
            username: auxiliaryUsername,
            password: auxiliaryPassword,
            clientId: isAdminView ? clientId : null // Envía el ID del cliente si es admin
        });
        toast.success('¡Auxiliar registrado y asociado con éxito!');
        
        setShowRegisterAuxiliaryModal(false);
        setAuxiliaryUsername('');
        setAuxiliaryPassword('');
        fetchDashboardData();

    } catch (err) {
        toast.error(err.response?.data?.message || 'Error al registrar el auxiliar.');
    }
};

const handleDeleteAuxiliary = async (auxiliaryId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este auxiliar?')) {
            try {
                let apiUrl = '';
                // Construye la ruta de la API correcta, con /api/
                if (isAdminView) {
                    apiUrl = `/api/admin/auxiliaries/${auxiliaryId}`;
                } else {
                    apiUrl = `/api/auth/auxiliaries/${auxiliaryId}`;
                }
                await API.delete(apiUrl);
                toast.success('Auxiliar eliminado con éxito.');
                fetchDashboardData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al eliminar el auxiliar.');
            }
        }
    };


    const handleRegisterEmployeeClick = () => {
    // Esta lógica ahora apunta a las rutas separadas y correctas
    const path = isAdminView 
        ? `/admin/register-employee-for/${clientId}` // Ruta del Admin
        : '/register-employee';                     // Ruta del Cliente
        
    navigate(path);
};

    const handleDeleteEmployee = async (employeeId, employeeName) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar a ${employeeName}?`)) {
            try {
                await API.delete(`/api/employees/${employeeId}`);
                toast.success(`Mensajero ${employeeName} eliminado.`);
                fetchDashboardData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al eliminar mensajero.');
            }
        }
    };

    const handleExportToExcel = async () => {
    // --- PASO DE DEPURACIÓN ---
    console.log('Botón presionado. Fecha de inicio actual:', reportStartDate);
    console.log('Botón presionado. Fecha de fin actual:', reportEndDate);

    if (!reportStartDate || !reportEndDate) {
        console.log('¡La validación ha fallado! Una o ambas fechas están vacías.');
        toast.error("Por favor, selecciona una fecha de inicio y de fin para el reporte.");
        return; // Detiene la ejecución aquí
    }

    console.log('Validación exitosa. Realizando llamada a la API con las fechas...');
    setIsGeneratingReport(true);
    try {
        const targetClientId = isAdminView ? clientId : user.profile._id;
        
        const response = await API.get(`/api/clients/${targetClientId}/export`, {
            params: {
                startDate: reportStartDate,
                endDate: reportEndDate
            },
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers['content-disposition'];
        let fileName = 'reporte_cliente.xlsx';
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            if (fileNameMatch && fileNameMatch.length > 1) fileName = fileNameMatch[1];
        }
        
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Reporte generado con éxito.");

    } catch (err) {
        if (err.response && err.response.data && err.response.data.toString() === '[object Blob]') {
            const errorBlob = err.response.data;
            const errorText = await errorBlob.text();
            try {
                const errorJson = JSON.parse(errorText);
                toast.error(errorJson.message || 'Error al generar el reporte.');
            } catch (jsonError) {
                toast.error('Ocurrió un error inesperado.');
            }
        } else {
             toast.error(err.response?.data?.message || 'Error al generar el reporte.');
        }
    } finally {
        setIsGeneratingReport(false);
    }
};

    const handleSettleClientTotal = async () => {
        const targetClientId = isAdminView ? clientId : user.profile._id;
        if (window.confirm(`¿Estás seguro de que quieres liquidar el total para ${clientProfile?.companyName}?`)) {
            try {
                toast.info('Procesando liquidación...');
                await API.post(`/api/admin/settle-client/${targetClientId}`);
                toast.success('Liquidación completada.');
                fetchDashboardData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al procesar la liquidación.');
            }
        }
    };

    // --- Renderizado ---
    if (loading) return <LoadingSpinner />;
    if (error) return <div className="error-message">Error: {error}</div>;
    if (!isAdminView && user?.role !== 'cliente') {
        return <div className="error-message">Acceso denegado.</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>{pageTitle}</h1>
            {isAdminView && <p className="alert alert-info">Estás gestionando este cliente como administrador.</p>}

            <div className="dashboard-card">
                <h2>Configuración de Tarifa Horaria</h2>
                <div className="form-group">
                    <label>Tarifa Horaria por Defecto ($):</label>
                    <input type="number" value={defaultHourlyRate} onChange={(e) => setDefaultHourlyRate(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Tarifa Horaria Festiva ($):</label>
                    <input type="number" value={holidayHourlyRate} onChange={(e) => setHolidayHourlyRate(e.target.value)} required />
                </div>
                <button onClick={handleUpdateRates} className="button-primary">Actualizar Tarifas</button>
            </div>

            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h2>Gestión de Auxiliares</h2>
                <button onClick={() => setShowRegisterAuxiliaryModal(true)} className="button-secondary">+ Registrar Nuevo Auxiliar</button>
                {showRegisterAuxiliaryModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Registrar Nuevo Auxiliar</h3>
                            <form onSubmit={handleRegisterAuxiliary}>
                                <div className="form-group">
                                    <label>Usuario:</label>
                                    <input type="text" value={auxiliaryUsername} onChange={(e) => setAuxiliaryUsername(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Contraseña:</label>
                                    <input type="password" value={auxiliaryPassword} onChange={(e) => setAuxiliaryPassword(e.target.value)} required />
                                </div>
                                <div className="modal-actions">
                                    <button type="submit" className="button-success">Registrar</button>
                                    <button type="button" onClick={() => setShowRegisterAuxiliaryModal(false)} className="button-cancel">Cancelar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {auxiliaries.length > 0 && (
                     <div className="table-responsive-container">
                        <table className="responsive-table">
                            <thead><tr><th>Usuario</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {auxiliaries.map(aux => (
                                    <tr key={aux._id}>
                                        <td>{aux.username}</td>
                                        <td><button className="button-small button-delete" onClick={() => handleDeleteAuxiliary(aux._id)}>Eliminar</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="dashboard-card">
                <h2>Mis Mensajeros Registrados</h2>
                <button onClick={handleRegisterEmployeeClick} className="button-primary">+ Registrar Nuevo Mensajero</button>
                {dashboardData?.employeesList?.length > 0 ? (
                    <div className="table-responsive-container">
                        <table className="responsive-table">
                            <thead><tr><th>Nombre Completo</th><th>Cédula</th><th>Teléfono</th><th>Total por Pagar</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {dashboardData.employeesList.map(employee => (
                                    <tr key={employee._id}>
                                        <td>{employee.fullName}</td>
                                        <td>{employee.idCard}</td>
                                        <td>{employee.phone}</td>
                                        <td><strong>{`$ ${(employee.totalAPagar || 0).toLocaleString('es-CO')}`}</strong></td>
                                        <td>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Usamos 'isAdminView' para decidir la ruta del enlace */}
        {isAdminView ? (
            <Link to={`/admin/view-employee-history/${employee._id}`} className="button-small">Ver Historial</Link>
        ) : (
            <Link to={`/time-entries/employee/${employee._id}`} className="button-small">Ver Historial</Link>
        )}
        <button className="button-small button-delete" onClick={() => handleDeleteEmployee(employee._id, employee.fullName)}>Eliminar Mensajero</button>
    </div>
</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : ( <p style={{ marginTop: '1.5rem' }}>Aún no tienes mensajeros registrados.</p> )}
            </div>

            <div className="dashboard-card">
                <h2>Resumen General</h2>
                <h3>Total a Pagar:
                    <span style={{ color: '#007bff', marginLeft: '10px' }}>
                        {`$ ${(dashboardData?.grandTotal || 0).toLocaleString('es-CO')}`}
                    </span>
                </h3>
                {isAdminView && dashboardData?.grandTotal > 0 && (
                    <button type="button" onClick={handleSettleClientTotal} className="btn btn-success" style={{ marginTop: '10px' }}>
                        Liquidar Total del Cliente
                    </button>
                )}
            </div>

            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h2>Reportes</h2>
                <div className="report-generator-box">
                    <h4 style={{marginTop: 0, marginBottom: '15px'}}>Generar Reporte de Facturación</h4>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <div className="form-group">
                            <label>Fecha de Inicio:</label>
                            <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Fecha de Fin:</label>
                            <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
                        </div>
                        <button onClick={handleExportToExcel} className="button-primary" disabled={isGeneratingReport}>
                            {isGeneratingReport ? 'Generando...' : 'Exportar a Excel'}
                        </button>
                    </div>
                </div>
            </div>
            
        </div> // <-- Cierre del dashboard-container
    );
};

export default DashboardPage;