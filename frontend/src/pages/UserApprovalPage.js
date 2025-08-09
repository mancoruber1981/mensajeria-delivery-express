// frontend/src/pages/Admin/UserApprovalPage.js
import React, { useState, useEffect } from 'react';
import api from '../api/api'; 
import './UserApprovalPage.css'; // Importa el archivo CSS

const UserApprovalPage = () => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPendingUsers = async () => {
            try {
                setLoading(true);
                const { data } = await api.get('/admin/users/pending');
                setPendingUsers(data);
            } catch (err) {
                setError('Error al cargar los usuarios pendientes.');
            } finally {
                setLoading(false);
            }
        };

        fetchPendingUsers();
    }, []);

    const handleApprove = async (userId) => {
        if (!window.confirm('¿Estás seguro de que quieres aprobar a este usuario?')) {
            return;
        }

        try {
            await api.put(`/admin/users/${userId}/approve`);
            setPendingUsers(currentUsers => currentUsers.filter(user => user._id !== userId));
            alert('¡Usuario aprobado con éxito!');
        } catch (err) {
            alert('Error al aprobar el usuario.');
        }
    };

    if (loading) return <p className="loading-message">Cargando usuarios pendientes...</p>;
    if (error) return <p className="error-message">{error}</p>;

    return (
        <div className="user-approval-container">
            <h2>Aprobación de Usuarios</h2>
            {pendingUsers.length === 0 ? (
                <p className="no-users-message">No hay usuarios pendientes de aprobación.</p>
            ) : (
                <table className="user-approval-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th>Fecha de Registro</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingUsers.map(user => (
                            <tr key={user._id}>
                                <td>{user.username}</td>
                                <td>{user.role}</td>
                                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                <td className="actions-cell">
                                    <button onClick={() => handleApprove(user._id)}>
                                        Aprobar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default UserApprovalPage;