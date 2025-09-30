// frontend/src/pages/AdminViewCourierSummaryPage.js / para el admin ver el dashboard el repartidor 

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate, useParams } from 'react-router-dom'; // ✅ Cambio: Importamos useParams
import '../index.css';

const AdminViewCourierSummaryPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { employeeId } = useParams(); // ✅ Cambio clave: Obtenemos el ID del repartidor desde la URL

    const [employeeName, setEmployeeName] = useState(''); // ✅ Nuevo: Para guardar el nombre del repartidor
    const [totalPagar, setTotalPagar] = useState(0);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ Cambio clave: La lógica para buscar datos ahora es para el admin
    const fetchCourierSummaryForAdmin = useCallback(async () => {
        if (!employeeId) {
            setError('ID de empleado no encontrado en la URL.');
            setPageLoading(false);
            return;
        }

        try {
            // 1. Obtenemos los detalles del empleado para saber su nombre
            const employeeRes = await API.get(`/api/employees/${employeeId}`);
            setEmployeeName(employeeRes.data.fullName);

            // 2. Obtenemos sus registros de tiempo
            const timeLogsRes = await API.get(`/api/timelogs/employee/${employeeId}`);
            const timeLogs = timeLogsRes.data;

            // 3. Calculamos el total a pagar (solo de registros no pagados)
            let sumTotal = 0;
            const unpaidLogs = timeLogs.filter(log => !log.isPaid);
            unpaidLogs.forEach(log => {
                const valorNeto = log.valorNeto || 0;
                const totalLoanDeducted = log.totalLoanDeducted || 0;
                sumTotal += (valorNeto - totalLoanDeducted);
            });

            setTotalPagar(sumTotal);
            
        } catch (err) {
            toast.error(err.response?.data?.message || "Error al cargar el resumen del repartidor.");
            setError(err.response?.data?.message || "Error al cargar el resumen.");
        } finally {
            setPageLoading(false);
        }
    }, [employeeId]); // La dependencia ahora es el employeeId de la URL

    useEffect(() => {
        fetchCourierSummaryForAdmin();
    }, [fetchCourierSummaryForAdmin]);

    const handleExportExcel = async () => {
        // ✅ Cambio: Usamos el employeeId de la URL
        try {
            toast.info('Generando reporte Excel...');
            const response = await API.get(`/api/timelogs/export/${employeeId}`, { 
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_horarios_${employeeName}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Reporte Excel descargado con éxito.');
        } catch (err) {
            toast.error(err.response?.data?.message || "Error al exportar a Excel.");
        }
    };
    
    // ✅ Cambio clave: Este botón ahora lleva a la OTRA página espejo (la de registros detallados)
    const handleGoToRecordsPage = () => {
        // La ruta debe ser la de la página de registros del repartidor,
        // y le pasamos el ID para que sepa de quién mostrar los registros.
        navigate(`/admin/view-employee-history/${employeeId}`);
    };

    if (pageLoading) return <LoadingSpinner />;
    if (error) return <div className="error-message">Error: {error}</div>;

    if (user?.role !== 'admin') {
        return <div className="error-message">Acceso denegado.</div>;
    }

    return (
        <div className="dashboard-page-wrapper">
            <div className="dashboard-card">
                {/* ✅ Cambio: El título ahora usa el nombre del empleado que obtuvimos */}
                <h3>Resumen de Pagos - {employeeName}</h3>
                <div style={{
                    backgroundColor: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '8px',
                    padding: '15px 20px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                    <p style={{ margin: 0, fontSize: '1.2em', fontWeight: 'bold', color: '#0050b3' }}>
                        Total a Pagar: <span style={{ fontSize: '1.5em', color: '#1890ff' }}>${totalPagar.toLocaleString('es-CO')}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'center' }}>
                    <button onClick={handleExportExcel} className="button-primary">Exportar a Excel</button>
                    {/* ✅ Cambio: El botón ahora se llama "Ver Registros" y usa la nueva función */}
                    <button onClick={handleGoToRecordsPage} className="button-success">Ver Registros</button>
                </div>
            </div>
        </div>
    );
};

export default AdminViewCourierSummaryPage; // ✅ Cambio: No olvides cambiar el nombre de la exportación