import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import '../index.css';
import LoadingSpinner from '../components/LoadingSpinner'; // Añadido para el estado de carga

const RegisterEmployeePage = () => {
    const [fullName, setFullName] = useState('');
    const [idCard, setIdCard] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const navigate = useNavigate();
    const { user } = useAuth();
    const { clientId } = useParams();
    
    // Flags para saber quién está usando la página
    const isAdminView = user?.role === 'admin' && clientId;
    const isClientView = user?.role === 'cliente';
    const isAuxiliarView = user?.role === 'auxiliar';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const employeeData = { fullName, idCard, phone };

        // Si es un admin, añade el clientId de la URL a los datos a enviar
        if (isAdminView) {
            employeeData.clientId = clientId;
        }
        // Si es un auxiliar, usa el clientId asociado a su perfil
        if (isAuxiliarView) {
            employeeData.clientId = user.associatedClient;
        }

        try {
            await API.post('/api/employees/register-by-client', employeeData);
            toast.success('¡Mensajero registrado con éxito!');

            // ✅ LÓGICA DE REDIRECCIÓN CORREGIDA Y MEJORADA
            if (isAdminView) {
                // Si es admin, vuelve al dashboard del cliente que estaba viendo
                navigate(`/admin/view-client-dashboard/${clientId}`);
            } else if (isClientView) {
                // Si es cliente, vuelve a su propio dashboard
                navigate('/dashboard-cliente');
            } else if (isAuxiliarView) {
                // Si es auxiliar, vuelve a su propio dashboard
                navigate('/auxiliar-home');
            } else {
                // Por si acaso, una ruta por defecto
                navigate('/');
            }

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al registrar el mensajero.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="form-container"> 
            <h2>Registrar Nuevo Mensajero</h2>
            <p>Ingresa los datos del mensajero.</p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Nombre Completo:</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Cédula:</label>
                    <input type="text" value={idCard} onChange={(e) => setIdCard(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Teléfono:</label>
                    <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <button type="submit" className="button-success" disabled={loading}>
                        {loading ? <LoadingSpinner isButtonSpinner={true} /> : 'Registrar Mensajero'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterEmployeePage;
