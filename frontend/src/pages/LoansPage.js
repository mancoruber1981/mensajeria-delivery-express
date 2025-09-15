import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const LoansPage = () => {
    const { user } = useAuth();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]); // Solo para el admin
    
    // Estados del formulario
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState(1);
    const [description, setDescription] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const loansRes = await API.get('/api/loans');
            setLoans(loansRes.data);
            if (user.role === 'admin') {
                const employeesRes = await API.get('/employees');
                setEmployees(employeesRes.data);
            }
        } catch (error) { toast.error('Error al cargar datos.'); } 
        finally { setLoading(false); }
    }, [user.role]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateLoan = async (e) => {
        e.preventDefault();
        try {
            await API.post('/loans', {
                employee: selectedEmployee,
                amount: parseFloat(amount),
                description,
                installments: parseInt(installments, 10)
            });
            toast.success(user.role === 'admin' ? 'Préstamo creado.' : 'Solicitud de préstamo enviada.');
            setAmount(''); setDescription(''); setInstallments(1); setSelectedEmployee('');
            fetchData();
        } catch (error) { toast.error(error.response?.data?.message || 'Error al procesar.'); }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard-container">
            <h1>{user.role === 'admin' ? 'Gestión de Préstamos' : 'Mis Préstamos'}</h1>
            <div className="dashboard-card">
                <h2>{user.role === 'admin' ? 'Registrar Nuevo Préstamo' : 'Solicitar Nuevo Préstamo'}</h2>
                <form onSubmit={handleCreateLoan}>
                    {user.role === 'admin' && (
                        <div className="form-group">
                            <label>Selecciona un Repartidor:</label>
                            <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} required>
                                <option value="">-- Elige un repartidor --</option>
                                {employees.map(emp => (<option key={emp._id} value={emp._id}>{emp.fullName}</option>))}
                            </select>
                        </div>
                    )}
                    <div className="form-group">
                        <label>Monto a Solicitar ($):</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Número de Cuotas (Máximo 3):</label>
                        <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} min="1" max="3" required />
                    </div>
                    <div className="form-group">
                        <label>Descripción (Opcional):</label>
                        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-success">{user.role === 'admin' ? 'Crear Préstamo' : 'Enviar Solicitud'}</button>
                </form>
            </div>
            
            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h2>{user.role === 'admin' ? 'Historial de Préstamos' : 'Mis Solicitudes'}</h2>
                <div className="table-responsive-container">
                    <table className="responsive-table">
                        <thead>
                            <tr>
                                {user.role === 'admin' && <th>Repartidor</th>}
                                <th>Monto Total</th>
                                <th>Saldo Pendiente</th>
                                <th>Fecha</th>
                                <th>Cuotas</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.length > 0 ? loans.map(loan => (
                                <tr key={loan._id}>
                                    {user.role === 'admin' && <td>{loan.employee?.fullName || 'N/A'}</td>}
                                    <td>${(loan.amount || 0).toLocaleString('es-CO')}</td>
                                    <td>${(loan.outstandingBalance || 0).toLocaleString('es-CO')}</td>
                                    <td>{new Date(loan.dateGranted).toLocaleDateString('es-CO')}</td>
                                    <td>{loan.installments}</td>
                                    <td><span style={{ fontWeight: 'bold' }}>{loan.status}</span></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={user.role === 'admin' ? "6" : "5"} style={{ textAlign: 'center' }}>No hay préstamos.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LoansPage;