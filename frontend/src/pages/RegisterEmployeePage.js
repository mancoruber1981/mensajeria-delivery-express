// frontend/src/pages/RegisterEmployeePage.js

// Bloque 1: Importaciones necesarias
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // useParams añadido
import { useAuth } from '../contexts/AuthContext'; // useAuth añadido
import { toast } from 'react-toastify';
import API from '../api/api';
import '../index.css';

// Bloque 2: Definición del componente funcional
const RegisterEmployeePage = () => {
    // Bloque 3: Declaración de estados y hooks
    const [fullName, setFullName] = useState('');
    const [idCard, setIdCard] = useState('');
    const [phone, setPhone] = useState('');
    //const [address, setAddress] = useState('');
    //const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // --- LÍNEAS AÑADIDAS ---
    const navigate = useNavigate();
    const { user } = useAuth(); // Hook para obtener el usuario actual
    const { clientId } = useParams(); // Hook para obtener el ID del cliente de la URL
    const isAdminView = user?.role === 'admin' && clientId; // Flag para saber si es vista de admin
    // ----------------------

    // Bloque 4: Función para manejar el envío del formulario (VERSIÓN INTELIGENTE)
    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const employeeData = { fullName, idCard, phone };

    // ✅ LÍNEA CLAVE AÑADIDA: Si es un admin, añade el clientId a los datos a enviar
    if (isAdminView) {
        employeeData.clientId = clientId;
    }

    try {
        await API.post('/employees/register-by-client', employeeData);
        
        toast.success('¡Mensajero registrado con éxito!');

        if (isAdminView) {
            navigate(`/admin/view-client-dashboard/${clientId}`);
        } else {
            navigate('/dashboard-cliente');
        }
    } catch (err) {
        const errorMessage = err.response?.data?.message || 'Error al registrar el mensajero.';
        setError(errorMessage);
        toast.error(errorMessage);
    } finally {
        setLoading(false);
    }
};
    // Bloque 7: Renderizado del componente JSX (sin cambios en la estructura)
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
                        {loading ? 'Registrando...' : 'Registrar Mensajero'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegisterEmployeePage;