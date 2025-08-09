// frontend/src/pages/RepartidorSummaryDashboardPage.js

// Bloque 1
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import '../index.css';

// Bloque 2
const RepartidorSummaryDashboardPage = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [totalPagar, setTotalPagar] = useState(0);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    // Bloque 3
    const fetchRepartidorSummary = useCallback(async () => {
        if (!user || !user.profile || !user.profile._id) {
            setError('Perfil de repartidor no encontrado. Acceso denegado.');
            setPageLoading(false);
            return;
        }

        try {
            const res = await API.get(`/timelogs/employee/${user.profile._id}`);
            const timeLogs = res.data;

            let sumTotal = 0;
            timeLogs.forEach(log => {
                const valorNeto = log.valorNeto || 0;
                const totalLoanDeducted = log.totalLoanDeducted || 0;
                sumTotal += (valorNeto - totalLoanDeducted);
            });
            setTotalPagar(sumTotal);
            setPageLoading(false);
        } catch (err) {
            console.error("ERROR RepartidorSummaryDashboard: Fallo al cargar el resumen:", err.response?.data?.message || err.message);
            setError(err.response?.data?.message || "Error al cargar el resumen del repartidor.");
            toast.error(err.response?.data?.message || "Error al cargar el resumen.");
            setPageLoading(false);
        }
    }, [user]);

    // Bloque 4
    useEffect(() => {
        if (!authLoading) {
            fetchRepartidorSummary();
        }
    }, [authLoading, fetchRepartidorSummary]);

    // Bloque 5
    const handleExportExcel = async () => {
        if (!user || !user.profile || !user.profile._id) {
            toast.error('No se pudo identificar el repartidor para exportar.');
            return;
        }
        try {
            toast.info('Generando reporte Excel...');
            
            // --- INICIO DE LA CORRECCIÓN ---
           const response = await API.get(`/timelogs/export/${user.profile._id}`, { 
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `reporte_horarios_${user.profile.fullName || user.username}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Reporte Excel descargado con éxito.');
        } catch (err) {
            console.error("ERROR RepartidorSummaryDashboard: Fallo al exportar Excel:", err.response?.data?.message || err.message);
            toast.error(err.response?.data?.message || "Error al exportar a Excel.");
        }
    };

    // Bloque 6
    const handleGoToRegisterPage = () => {
        if (user && user.profile && user.profile._id) {
            navigate(`/repartidor-summary`);
        } else {
            toast.error('No se pudo identificar el repartidor para ir a la página de registro.');
        }
    };

    // Bloque 7
    if (pageLoading) return <LoadingSpinner />;
    if (error) return <div className="error-message">Error: {error}</div>;
    if (!user || (user.role !== 'repartidor' && user.role !== 'admin')) {
        return <div className="error-message">Acceso denegado. Esta página es solo para repartidores o administradores.</div>;
    }

    // Bloque 8
    return (
        <div className="dashboard-page-wrapper">
            <div className="dashboard-card">
                <h3>Resumen de Pagos - {user.profile?.fullName || user.username}</h3>
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
                    <button onClick={handleGoToRegisterPage} className="button-success">Registrar Horario</button>
                </div>
            </div>
        </div>
    );
};

// Bloque 9
export default RepartidorSummaryDashboardPage;