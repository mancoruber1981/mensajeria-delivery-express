import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const LoansPage = () => {
    const { user } = useAuth();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    
    // Estados del formulario
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [amount, setAmount] = useState('');
    const [installments, setInstallments] = useState(2);
    const [description, setDescription] = useState('');

    const isAdmin = user?.role === 'admin';
    const isRepartidor = user?.role === 'repartidor';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const loansRes = await API.get('/api/loans');
            setLoans(loansRes.data);
            
            if (isAdmin) {
                const employeesRes = await API.get('/api/employees');
                setEmployees(employeesRes.data);
            }
        } catch (error) { 
            toast.error('Error al cargar datos de préstamos.'); 
        } finally { 
            setLoading(false); 
        }
    }, [isAdmin]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);

    const handleCreateLoan = async (e) => {
        e.preventDefault();
        const employeeIdForLoan = isAdmin ? selectedEmployee : user.profile._id;
        if (isAdmin && !employeeIdForLoan) {
            toast.error('Debes seleccionar un repartidor.');
            return;
        }

        try {
            await API.post('/api/loans', {
                employee: employeeIdForLoan,
                amount: parseFloat(amount),
                description,
                installments: parseInt(installments, 10)
            });
            toast.success(isAdmin ? 'Préstamo creado con éxito.' : 'Solicitud de préstamo enviada.');
            setAmount(''); 
            setDescription(''); 
            setInstallments(2); 
            setSelectedEmployee('');
            fetchData();
        } catch (error) { 
            toast.error(error.response?.data?.message || 'Error al procesar la solicitud.'); 
        }
    };

    // Pega estas dos funciones en LoansPage.js

const handleApproveLoan = async (loanId) => {
    if (!window.confirm('¿Estás seguro de que quieres APROBAR este préstamo?')) return;
    try {
        await API.put(`/api/loans/${loanId}/approve`);
        toast.success('Préstamo aprobado con éxito.');
        fetchData(); // Recarga la lista para mostrar el nuevo estado
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error al aprobar el préstamo.');
    }
};

const handleRejectLoan = async (loanId) => {
    if (!window.confirm('¿Estás seguro de que quieres RECHAZAR este préstamo?')) return;
    try {
        await API.put(`/api/loans/${loanId}/reject`);
        toast.success('Préstamo rechazado con éxito.');
        fetchData(); // Recarga la lista para mostrar el nuevo estado
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error al rechazar el préstamo.');
    }
};

// Pega esta función en LoansPage.js, debajo de handleRejectLoan

const handleDeleteLoan = async (loanId) => {
    // Confirmación para evitar borrados accidentales
    if (!window.confirm('¿Estás seguro de que quieres BORRAR este préstamo? Esta acción es irreversible.')) return;

    try {
        await API.delete(`/api/loans/${loanId}`);
        toast.success('Préstamo eliminado con éxito.');
        fetchData(); // Recargamos la lista para que el préstamo borrado desaparezca
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error al eliminar el préstamo.');
    }
};

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard-container">
            <h1>{isAdmin ? 'Gestión de Préstamos' : 'Mis Préstamos'}</h1>
            
            {(isAdmin || isRepartidor) && (
                <div className="dashboard-card">
                    <h2>{isAdmin ? 'Registrar Nuevo Préstamo' : 'Solicitar Nuevo Préstamo'}</h2>
                    <form onSubmit={handleCreateLoan}>
                        {isAdmin && (
                            <div className="form-group">
                                <label>Selecciona un Repartidor:</label>
                                <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)} required>
                                    <option value="">-- Elige un repartidor --</option>
                                    {employees.map(emp => (<option key={emp._id} value={emp._id}>{emp.fullName}</option>))}
                                </select>
                            </div>
                        )}
                        {isRepartidor && (
                             <div className="form-group">
                                <label>Solicitante:</label>
                                <input type="text" value={user.profile.fullName} readOnly className="read-only-input" />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Monto a Solicitar ($):</label>
                            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 50000" required />
                        </div>
                        <div className="form-group">
                            <label>Número de Cuotas Quincenales (Máximo 4):</label>
                            <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} min="1" max="4" required />
                        </div>
                        <div className="form-group">
                            <label>Descripción (Opcional):</label>
                            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Adelanto de nómina" />
                        </div>
                        <button type="submit" className="button-success">{isAdmin ? 'Crear Préstamo' : 'Enviar Solicitud'}</button>
                    </form>
                </div>
            )}
            
            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h2>{isAdmin ? 'Historial de Préstamos' : 'Mi Historial'}</h2>
                <div className="table-responsive-container">
                    <table>
                        <thead>
                            <tr>
                                {isAdmin && <th>Repartidor</th>}
                                <th>Fecha</th>
                                <th>Monto Total</th>
                                <th>Saldo Pendiente</th>
                                <th>Cuotas</th>
                                <th>Estado</th>
                                {isAdmin && <th>Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loans.length > 0 ? loans.map(loan => (
                                <tr key={loan._id}>
                                    {isAdmin && <td>{loan.employee?.fullName || 'N/A'}</td>}
                                    <td>{new Date(loan.dateGranted).toLocaleDateString('es-CO')}</td>
                                    <td>${(loan.amount || 0).toLocaleString('es-CO')}</td>
                                    <td>${(loan.outstandingBalance || 0).toLocaleString('es-CO')}</td>
                                    <td>{loan.installments}</td>
                                    <td><span className={`status-${loan.status?.toLowerCase()}`}>{loan.status}</span></td>
                                    {isAdmin && (
                                        <td>
    {/* Muestra los botones de Aprobar/Rechazar si el estado es Pendiente */}
    {loan.status === 'Pendiente' && (
        <div style={{ display: 'flex', gap: '5px' }}>
            <button 
                onClick={() => handleApproveLoan(loan._id)} 
                className="button-small button-success">
                Aprobar
            </button>
            <button 
                onClick={() => handleRejectLoan(loan._id)} 
                className="button-small button-delete">
                Rechazar
            </button>
        </div>
    )}

    {/* Muestra el botón de Borrar si el estado NO es Pendiente (Aprobado o Rechazado) */}
    {loan.status !== 'Pendiente' && (
        <button 
            onClick={() => handleDeleteLoan(loan._id)} 
            className="button-small button-delete">
            Borrar
        </button>
    )}
</td>
                                    )}
                                </tr>
                            )) : (
                                <tr><td colSpan={isAdmin ? "7" : "6"} style={{ textAlign: 'center' }}>No hay préstamos para mostrar.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
export default LoansPage;