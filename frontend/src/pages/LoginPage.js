// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
// 1. Importa 'Link' para poder crear enlaces de navegación
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import '../index.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await login(username, password);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al iniciar sesión.';
            setError(errorMessage);
            toast.error(errorMessage);
        }
    };

    return (
        <div className="form-container login-style">
            <h2>Iniciar Sesión</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="username">Usuario:</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    {/* CORRECCIÓN: La etiqueta ahora dice "Contraseña" */}
                    <label htmlFor="password">Contraseña:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <button type="submit" className="button-success">Iniciar Sesión</button>
                </div>
            </form>

            {/* --- INICIO DEL CÓDIGO AÑADIDO --- */}
            <div className="form-footer-link">
                <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
            </div>
            {/* --- FIN DEL CÓDIGO AÑADIDO --- */}

        </div>
    );
};

export default LoginPage;