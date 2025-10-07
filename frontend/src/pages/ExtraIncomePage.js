// frontend/src/pages/ExtraIncomePage.js

import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const ExtraIncomePage = () => {
    const [incomes, setIncomes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para el formulario de creación
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [contributorName, setContributorName] = useState('');
    const [contributorId, setContributorId] = useState('');
    const [contributorPhone, setContributorPhone] = useState('');
    const [contributorAddress, setContributorAddress] = useState('');

    const fetchIncomes = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/api/extra-incomes');
            setIncomes(data);
        } catch (error) {
            toast.error('Error al cargar los ingresos extras.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIncomes();
    }, [fetchIncomes]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/extra-incomes', {
                description,
                amount: parseFloat(amount),
                date,
                contributorName,
                contributorId,
                contributorPhone,
                contributorAddress
            });
            toast.success('Ingreso extra registrado con éxito.');
            // Limpiar formulario
            setDescription(''); setAmount(''); setDate(new Date().toISOString().slice(0, 10));
            setContributorName(''); setContributorId(''); setContributorPhone(''); setContributorAddress('');
            fetchIncomes(); // Recargar la lista
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al registrar el ingreso.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este ingreso?')) {
            try {
                await API.delete(`/api/extra-incomes/${id}`);
                toast.success('Ingreso eliminado con éxito.');
                fetchIncomes();
            } catch (error) {
                toast.error('Error al eliminar el ingreso.');
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard-container">
            <h1>Gestión de Ingresos Extras</h1>
            <div className="dashboard-card">
                <h2>Registrar Nuevo Ingreso</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Fecha:</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
                    <div className="form-group"><label>Descripción:</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Aporte de socio" required /></div>
                    <div className="form-group"><label>Monto ($):</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 1000000" required /></div>
                    <hr />
                    <h4>Información del Aportante (Opcional)</h4>
                    <div className="form-group"><label>Nombre:</label><input type="text" value={contributorName} onChange={(e) => setContributorName(e.target.value)} /></div>
                    <div className="form-group"><label>Cédula/NIT:</label><input type="text" value={contributorId} onChange={(e) => setContributorId(e.target.value)} /></div>
                    <div className="form-group"><label>Teléfono:</label><input type="text" value={contributorPhone} onChange={(e) => setContributorPhone(e.target.value)} /></div>
                    <div className="form-group"><label>Dirección:</label><input type="text" value={contributorAddress} onChange={(e) => setContributorAddress(e.target.value)} /></div>
                    <button type="submit" className="button-success">Guardar Ingreso</button>
                </form>
            </div>

            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h2>Historial de Ingresos Extras</h2>
                <div className="table-responsive-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Descripción</th>
                                <th>Monto</th>
                                <th>Aportante</th>
                                <th>Registrado por</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomes.length > 0 ? incomes.map(inc => (
                                <tr key={inc._id}>
                                    <td>{new Date(inc.date).toLocaleDateString('es-CO', { timeZone: 'UTC' })}</td>
                                    <td>{inc.description}</td>
                                    <td>${(inc.amount || 0).toLocaleString('es-CO')}</td>
                                    <td>{inc.contributorName || 'N/A'}</td>
                                    <td>{inc.createdBy?.username || 'N/A'}</td>
                                    <td><button onClick={() => handleDelete(inc._id)} className="button-small button-delete">Eliminar</button></td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" style={{ textAlign: 'center' }}>No hay ingresos extras registrados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExtraIncomePage;