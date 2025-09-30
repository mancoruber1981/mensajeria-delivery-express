// frontend/src/pages/ForgotPasswordPage.js (VERSIÓN FINAL CORREGIDA)

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/api';
import '../index.css';
import { useAuth } from '../contexts/AuthContext'; // <-- 1. IMPORTAMOS useAuth

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { logout } = useAuth(); // <-- 2. OBTENEMOS LA FUNCIÓN logout

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const { data } = await API.post('/api/auth/forgotpassword', { email });
            setMessage(data.data);
            toast.success(data.data);

            // --- ¡LA SOLUCIÓN! ---
            // Limpiamos cualquier sesión activa en el frontend SIN redirigir.
            logout({ redirect: false }); // <-- 3. LLAMAMOS A logout AQUÍ

        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Ocurrió un error.';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="form-container">
            <h2>Recuperar Contraseña</h2>
            <p>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="email">Correo Electrónico:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="ejemplo@correo.com"
                    />
                </div>
                
                {error && <p className="error-message">{error}</p>}
                {message && <p className="success-message">{message}</p>}

                <div className="form-group">
                    <button type="submit" className="button-primary" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                    </button>
                </div>
            </form>
            <div className="form-footer-link">
                <Link to="/login">Volver a Iniciar Sesión</Link>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;