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

        const employeeData = { fullName, idCard, phone, };

        try {
            let successMessage = '¡Mensajero registrado con éxito!';
            
            // --- LÓGICA CONDICIONAL ---
            if (isAdminView) {
                // Si es un admin, llamamos a una ruta específica para administradores
                // y le pasamos el clientId para que el backend sepa a quién asociar el empleado.
                // NOTA: Debes crear esta ruta en tu backend.
                await API.post('/admin/register-employee-for-client', { ...employeeData, clientId });
                toast.success(successMessage);
                // Navegamos de vuelta al dashboard del cliente que estábamos viendo
                navigate(`/admin/view-client-dashboard/${clientId}`);
            } else {
                // Si es un cliente, usamos la ruta original
                await API.post('/employees/register-by-client', employeeData);
                toast.success(successMessage);
                // Navegamos a nuestro propio dashboard
                navigate('/dashboard-cliente');
            }
            // --------------------------

        } catch (err) {
            // Bloque 5: Manejo de errores (sin cambios)
            const errorMessage = err.response?.data?.message || 'Error al registrar el mensajero.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            // Bloque 6: Finalización de la operación (sin cambios)
            setLoading(false);
        }
    };

    // Permitimos el acceso si es un admin, un cliente, O un auxiliar.
if (!isAdminView && user?.role !== 'cliente' && user?.role !== 'auxiliar') {
    return <div className="error-message">Acceso denegado.</div>;
}

    // Bloque 7: Renderizado del componente JSX (sin cambios en la estructura)
    return (
        <div className="form-container"> 
            <h2>Registrar Nuevo Mensajero</h2>
            <p>Ingresa los datos del mensajero. El sistema creará sus credenciales de acceso automáticamente (Usuario: Cédula, Contraseña: Cédula).</p>
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