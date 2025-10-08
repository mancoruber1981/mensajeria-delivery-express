import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboardPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        totalACobrar: 0,
        totalAPagar: 0,
        gananciaEstimada: 0,
    });

    const [endDateToDelete, setEndDateToDelete] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');

    // We'll use useCallback to keep the function reference stable for the interval
    const fetchData = React.useCallback(async () => {
        if (!user || user.role !== 'admin') {
            setError('Acceso denegado.');
            setLoading(false);
            return;
        }

        // We don't set loading to true here to make the refresh seamless
        setError(null);

        try {
            // ✅ CORRECTION: Added /api/ prefix
            const { data } = await API.get('/api/admin/stats');

            if (data && data.stats) {
                setStats({
                    totalACobrar: data.stats.totalACobrar,
                    totalAPagar: data.stats.totalAPagar,
                    gananciaEstimada: data.stats.gananciaEstimada,
                });
            } else {
                console.error("La estructura de datos del dashboard no es la esperada.");
                setError("Error al procesar los datos del dashboard.");
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al cargar datos del administrador.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            // Make sure initial loading is set to false
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData(); // Fetch data on initial component mount

        // ✅ NEW: Auto-refresh logic (polling every 30 seconds)
        const intervalId = setInterval(() => {
            console.log("Refrescando estadísticas del admin...");
            fetchData();
        }, 30000); // 30 seconds

        // Cleanup function to clear the interval when the component unmounts
        return () => clearInterval(intervalId);
    }, [fetchData]);

    const handleSettleFortnight = async () => {
        if (window.confirm('¡ADVERTENCIA!\n\nEsta acción marcará como pagados TODOS los registros pendientes de la última quincena. Este proceso no se puede deshacer.\n\n¿Estás seguro de que deseas continuar?')) {
            try {
                toast.info('Procesando liquidación, por favor espera...');
                // ✅ CORRECTION: Added /api/ prefix
                const { data } = await API.post('/api/admin/settle-fortnight');
                toast.success(data.message);
                fetchData(); // Refresh data after settling
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al procesar la liquidación.');
            }
        }
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="error-message">Error: {error}</div>;

     const handleClearTimeLogs = async () => {
        // Doble validación de seguridad
        if (confirmationText !== 'BORRAR') {
            toast.error("Debes escribir la palabra BORRAR en mayúsculas para confirmar.");
            return;
        }
        if (!endDateToDelete) {
            toast.error("Por favor, selecciona una fecha límite.");
            return;
        }

        try {
            toast.info("Procesando eliminación masiva, por favor espera...");
            // Llamada a la nueva ruta de la API que crearemos en el backend
            const response = await API.delete(`/api/admin/timelogs`, {
                data: { 
                    endDate: endDateToDelete,
                    onlyPaid: true // Le decimos que solo borre los pagados
                }
            });
            toast.success(response.data.message);
            
            // Limpiar y cerrar el modal
            setShowDeleteModal(false);
            setConfirmationText('');
            setEndDateToDelete('');

        } catch (err) {
            toast.error(err.response?.data?.message || "Error al eliminar los registros.");
        }
    };
    // -----------------------------------------------------------------

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="error-message">Error: {error}</div>;


    return (
        <div className="dashboard-container">
            <h1>Panel de Administración</h1>
            <div className="dashboard-card">
                <h2>Bienvenido, {user?.username}</h2>
                <p>Desde aquí puedes gestionar todos los aspectos de la plataforma.</p>
            </div>
            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h2>Estadísticas Rápidas</h2>
                <p>
                    Total a Cobrar a Clientes:
                    <strong>
                        $ {(stats.totalACobrar || 0).toLocaleString('es-CO')}
                    </strong>
                </p>
                <p>
                    Total a Pagar a Repartidores:
                    <strong>
                        $ {(stats.totalAPagar || 0).toLocaleString('es-CO')}
                    </strong>
                </p>
                <p>
                    Ganancia Estimada:
                    <strong>
                        $ {(stats.gananciaEstimada || 0).toLocaleString('es-CO')}
                    </strong>
                </p>
            </div>
            <h2>Navegación Rápida</h2>
            <div className="navigation-buttons" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link to="/admin/employees" className="btn btn-primary">
                    Gestionar Mensajeros
                </Link>
                <Link to="/admin/clients" className="btn btn-secondary">
                    Gestionar Clientes
                </Link>
                <Link to="/accountant-report" className="btn btn-info">
                    Reporte Financiero
                </Link>
                 <Link to="/loans" className="btn btn-warning">
                    Gestionar Préstamos
                </Link>
            </div>
            <h2 style={{ marginTop: '2rem' }}>Acciones Administrativas</h2>
            <div className="navigation-buttons">
                <button onClick={handleSettleFortnight} className="btn btn-danger">
                    Liquidar Última Quincena (Global)
                </button>
            </div>

            {/* --- NUEVA SECCIÓN: ZONA DE PELIGRO --- */}
            <div className="dashboard-card danger-zone" style={{ marginTop: '2rem' }}>
                <h2>Zona de Peligro</h2>
                <div className="form-group">
                    <label>Limpiar historial de registros <strong>pagados</strong> anteriores al:</label>
                    <input 
                        type="date" 
                        value={endDateToDelete}
                        onChange={(e) => setEndDateToDelete(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => setShowDeleteModal(true)} 
                    className="btn btn-danger"
                    disabled={!endDateToDelete} // El botón se activa solo si se elige una fecha
                >
                    Limpiar Historial
                </button>
            </div>
            {/* --- FIN DE LA NUEVA SECCIÓN --- */}

            {/* --- MODAL DE CONFIRMACIÓN (aparece cuando showDeleteModal es true) --- */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>⚠️ Acción Irreversible ⚠️</h3>
                        <p>Estás a punto de eliminar <strong>permanentemente</strong> todos los registros de trabajo (TimeLogs) <strong>PAGADOS</strong> anteriores a la fecha <strong>{endDateToDelete}</strong>.</p>
                        <p>Esta acción no se puede deshacer.</p>
                        <div className="form-group">
                            <label>Para confirmar, escribe la palabra <strong>BORRAR</strong> en mayúsculas:</label>
                            <input
                                type="text"
                                value={confirmationText}
                                onChange={(e) => setConfirmationText(e.target.value)}
                                placeholder="BORRAR"
                            />
                        </div>
                        <div className="modal-actions">
                            <button onClick={() => setShowDeleteModal(false)} className="button-cancel">
                                Cancelar
                            </button>
                            <button onClick={handleClearTimeLogs} className="button-delete">
                                Sí, entiendo, eliminar historial
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- FIN DEL MODAL --- */}
        </div>
    );
};

export default AdminDashboardPage;