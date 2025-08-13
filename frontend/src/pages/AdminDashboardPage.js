// frontend/src/pages/AdminDashboardPage.js

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Agrupado Link con useNavigate
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';

const AdminDashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Estados para la UI y manejo de datos
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Estados para las estadísticas del dashboard
    const [totalChargedToClients, setTotalChargedToClients] = useState(0);
    const [totalToPayCouriers, setTotalToPayCouriers] = useState(0);
    const [profit, setProfit] = useState(0);

    // Efecto para cargar los datos del dashboard
    useEffect(() => {
        const fetchData = async () => {
            // Validación de acceso antes de intentar cargar datos
            if (!user || user.role !== 'admin') {
                setError('Acceso denegado. Esta página es solo para administradores.');
                setLoading(false);
                return;
            }

            setLoading(true); // Inicia el loading antes de la llamada a la API
            setError(null);   // Limpia errores previos

            try {
    // Llamada a la API para obtener las estadística
      useEffect(() => {
    const fetchData = async () => {
        // Validación de acceso
        if (!user || user.role !== 'admin') {
            setError('Acceso denegado. Esta página es solo para administradores.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // 1️⃣ Llamada original a /admin/stats
            const { data } = await API.get('/admin/stats');

            if (data && data.stats) {
                setTotalChargedToClients(data.stats.totalACobrar);
                setTotalToPayCouriers(data.stats.totalAPagar);
                setProfit(data.stats.gananciaEstimada);
            } else {
                console.error("La estructura de datos del dashboard no es la esperada.");
                setError("Error al procesar los datos del dashboard.");
            }

            // 2️⃣ Llamada a /employees para calcular y comparar
            const { data: empData } = await API.get('/employees');
            if (Array.isArray(empData.employees)) {
                const sumaEmployees = empData.employees.reduce(
                    (acc, emp) => acc + (parseFloat(emp.totalPorPagar) || 0),
                    0
                );
                // Mostramos en consola y como toast para ver la diferencia
                console.log(`💡 Comparativa: Stats = ${data.stats.totalAPagar}, Employees = ${sumaEmployees}`);
                toast.info(`Comparativa → Stats: ${data.stats.totalAPagar} | Employees: ${sumaEmployees}`);
            }

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al cargar datos del administrador.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
}, [user, navigate]);
          
    // Renderizado condicional basado en el estado de carga y error
    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <div className="error-message">Error: {error}</div>;
    }

    // Renderizado principal del componente
    return (
        <div className="dashboard-container">
            <h1>Panel de Administración</h1>

            {/* Tarjeta de bienvenida */}
            <div className="dashboard-card">
                <h2>Bienvenido, {user?.username}</h2>
                <p>Desde aquí puedes gestionar todos los aspectos de la plataforma.</p>
            </div>

            {/* Tarjeta de estadísticas rápidas */}
            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h2>Estadísticas Rápidas</h2>
                <p>
                    Total a Cobrar a Clientes:
                    <strong>
                        $ {(totalChargedToClients || 0).toLocaleString('es-CO')}
                    </strong>
                </p>
                <p>
                    Total a Pagar a Repartidores:
                    <strong>
                        $ {(totalToPayCouriers || 0).toLocaleString('es-CO')}
                    </strong>
                </p>
                <p>
                    Ganancia Estimada:
                    <strong>
                        $ {(profit || 0).toLocaleString('es-CO')}
                    </strong>
                </p>
            </div>

            {/* Sección de navegación rápida */}
            <h2>Navegación Rápida</h2>
            <div className="navigation-buttons" style={{ display: 'flex', gap: '10px' }}>
                <Link to="/admin/employees" className="btn btn-primary">
                    Gestionar Mensajeros
                </Link>
                <Link to="/admin/clients" className="btn btn-secondary">
                    Gestionar Clientes
                </Link>
                {/* Botón nuevo, añadido previamente */}
                <Link to="/accountant-report" className="btn btn-success">
                    Reporte Financiero
                </Link>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
