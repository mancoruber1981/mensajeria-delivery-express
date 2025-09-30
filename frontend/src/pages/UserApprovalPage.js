import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const UserApprovalPage = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPendingUsers = useCallback(async () => {
        try {
            setLoading(true);
            // ✅ CORREGIDO: Se añadió /api/ a la ruta
            const { data } = await API.get('/api/admin/users/pending');
            setPendingUsers(data);
        } catch (error) {
            toast.error('Error al cargar usuarios pendientes.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingUsers();
    }, [fetchPendingUsers]);

    const handleApproveUser = async (userId) => {
        if (window.confirm('¿Estás seguro de que quieres APROBAR a este usuario?')) {
            try {
                // ✅ CORREGIDO: Se añadió /api/ a la ruta
                await API.put(`/api/admin/users/${userId}/approve`);
                toast.success('Usuario aprobado con éxito.');
                fetchPendingUsers(); // Recarga la lista
            } catch (error) {
                toast.error('Error al aprobar el usuario.');
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard-container">
            <h1>Aprobar Nuevos Usuarios</h1>
            <div className="dashboard-card">
                <h2>Usuarios Pendientes de Aprobación</h2>
                {pendingUsers.length > 0 ? (
                    <div className="table-responsive-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre de Usuario</th>
                                    <th>Rol Solicitado</th>
                                    <th>Fecha de Registro</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingUsers.map(user => (
                                    <tr key={user._id}>
                                        <td>{user.username}</td>
                                        <td>{user.role}</td>
                                        <td>{new Date(user.createdAt).toLocaleDateString('es-CO')}</td>
                                        <td>
                                            <button 
                                                onClick={() => handleApproveUser(user._id)} 
                                                className="button-success button-small">
                                                Aprobar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p>No hay usuarios pendientes de aprobación en este momento.</p>
                )}
            </div>
        </div>
    );
};

export default UserApprovalPage;
