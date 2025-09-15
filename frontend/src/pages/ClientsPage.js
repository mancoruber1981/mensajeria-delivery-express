// Bloque 1: Importaciones/ClientPage,js/pagina espejo desde el admin 

import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import './ClientsPage.css'; // Importa el archivo CSS

// Bloque 2: Definición del Componente y Hooks
const ClientsPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Bloque 3: Efecto para Cargar Clientes al Montar el Componente
    useEffect(() => {
        const fetchClients = async () => {
            if (!user || user.role !== 'admin') {
                setLoading(false);
                setError('Acceso denegado. Esta página es solo para administradores.');
                return;
            }
            try {
                const res = await API.get('/clients');
                setClients(res.data);
                setLoading(false);
            } catch (err) {
                setLoading(false);
                setError(err.response?.data?.message || 'Error al cargar la lista de clientes.');
                toast.error(err.response?.data?.message || 'Error al cargar la lista de clientes.');
            }
        };
        fetchClients();
    }, [user, navigate]);

    // Bloque 4: Renderizado Condicional de Carga y Error
    if (loading) return <LoadingSpinner />;
    if (error) return <div className="error-message">{error}</div>;

    // Bloque 5: Renderizado del Componente (JSX)
return (
    <div className="clients-page-container">
        <h2 className="clients-page-header">Gestión de Clientes/Socios</h2>
        <p className="clients-page-info">
            Como administrador, solo tienes acceso a la visualización de los datos de los clientes/socios. La creación, edición y eliminación son gestionadas directamente por cada cliente/socio.
        </p>

        <h3 className="clients-list-header">Lista de Clientes/Socios Registrados</h3>
        {clients.length === 0 ? (
            <p className="no-data-message">No hay clientes/socios registrados en el sistema.</p>
        ) : (
            <div className="table-responsive-container"> {/* ¡CAMBIO CLAVE! Nueva clase de contenedor */}
                <table className="responsive-table"> {/* ¡CAMBIO CLAVE! Nueva clase de la tabla */}
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Nombre Completo Titular</th>
                            <th>Cédula Titular</th>
                            <th>NIT</th>
                            <th>Razón Social</th>
                            <th>Total a Cobrar ($)</th>
                            <th>Notas (Perfil)</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map((client) => (
                            <tr key={client._id}>
                                <td>{client.username || 'N/A'}</td>
                                <td>{client.fullNameHolder}</td>
                                <td>{client.idCard}</td>
                                <td>{client.nit}</td>
                                <td>{client.companyName}</td>
                                <td>
                                    <strong>
                                        {client.totalACobrar ? client.totalACobrar.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : '$0'}
                                    </strong>
                                </td>
                                <td>
                                    {client.profileNotes && client.profileNotes.length > 0 ? (
                                        <button className="view-notes-button">
                                            Ver Notas ({client.profileNotes.length})
                                        </button>
                                    ) : (
                                        'Ninguno'
                                    )}
                                </td>
                                <td>
                                    <Link
                                        to={`/admin/view-client-dashboard/${client._id}`}
                                        className="view-dashboard-button"
                                    >
                                        Ver Dashboard
                                    </Link>
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

// Bloque 6: Exportación del Componente
export default ClientsPage;