import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const ExpensesPage = () => {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para el formulario
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Operativo');
    const [payeeId, setPayeeId] = useState('');
    const [payeePhone, setPayeePhone] = useState('');
    const [payeeAddress, setPayeeAddress] = useState('');
    const [payeeName, setPayeeName] = useState('');
    const [reference, setReference] = useState('');

    const fetchExpenses = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await API.get('/api/expenses');
            setExpenses(data);
        } catch (error) {
            toast.error('Error al cargar los gastos.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await API.post('/api/expenses', {
                description,
                amount: parseFloat(amount),
                category,
                payeeName,
                payeePhone,
                payeeAddress,
                payeeId,
                reference
            });
            toast.success('Gasto registrado con éxito.');
            // Limpiar formulario
            setDescription('');
            setAmount('');
            setCategory('Operativo');
            setReference('');
            fetchExpenses(); // Recargar la lista de gastos
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al registrar el gasto.');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
            try {
                await API.delete(`/api/expenses/${id}`);
                toast.success('Gasto eliminado con éxito.');
                fetchExpenses();
            } catch (error) {
                toast.error('Error al eliminar el gasto.');
            }
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="dashboard-container">
            <h1>Gestión de Gastos Extras</h1>
            <div className="dashboard-card">
                <h2>Registrar Nuevo Gasto</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Descripción:</label>
                        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Salario Contadora Septiembre" required />
                    </div>
                    <div className="form-group">
                        <label>Monto ($):</label>
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Ej: 500000" required />
                    </div>
                    <div className="form-group">
                        <label>Nombre del Beneficiario (Opcional):</label>
                        <input type="text" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Ej: Pepito Pérez (Contador)" />
                    </div>
                    <div className="form-group">
                        <label>Cédula o NIT del Beneficiario (Opcional):</label>
                        <input type="text" value={payeeId} onChange={(e) => setPayeeId(e.target.value)} placeholder="Ej: 123456789" />
                    </div>
                    <div className="form-group">
                        <label>Teléfono del Beneficiario (Opcional):</label>
                        <input type="text" value={payeePhone} onChange={(e) => setPayeePhone(e.target.value)} placeholder="Ej: 3001234567" />
                    </div>
                    <div className="form-group">
                        <label>Dirección del Beneficiario (Opcional):</label>
                        <input type="text" value={payeeAddress} onChange={(e) => setPayeeAddress(e.target.value)} placeholder="Ej: Calle 10 # 20-30" />
                    </div>
                    <div className="form-group">
                        <label>Categoría:</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)}>
                            <option value="Operativo">Operativo (Gasolina, repuestos, etc.)</option>
                            <option value="Salario">Salario</option>
                            <option value="Impuestos">Impuestos</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Referencia (Opcional):</label>
                        <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="N° de factura, cédula, etc." />
                    </div>
                    <button type="submit" className="button-success">Guardar Gasto</button>
                </form>
            </div>

            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h2>Historial de Gastos</h2>
                <div className="table-responsive-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Descripción</th>
                                <th>Categoría</th>
                                <th>Monto</th>
                                <th>Referencia</th>
                                <th>Registrado por</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.length > 0 ? expenses.map(exp => (
                                <tr key={exp._id}>
                                    <td>{new Date(exp.date).toLocaleDateString('es-CO')}</td>
                                    <td>{exp.description}</td>
                                    <td>{exp.category}</td>
                                    <td>${(exp.amount || 0).toLocaleString('es-CO')}</td>
                                    <td>{exp.reference}</td>
                                    <td>{exp.createdBy?.username || 'N/A'}</td>
                                    <td>
                                        <button onClick={() => handleDelete(exp._id)} className="button-small button-delete">Eliminar</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center' }}>No hay gastos registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExpensesPage;