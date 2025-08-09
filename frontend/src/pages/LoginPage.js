// frontend/src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
            const loggedInUser = await login(username, password);
            
            toast.success('¡Inicio de sesión exitoso!');

            // --- LÓGICA DE REDIRECCIÓN POR ROL (CORREGIDA) ---
            switch (loggedInUser.role) {
                case 'admin':
                    navigate('/dashboard-admin'); // Redirige al admin a su dashboard
                    break;
                case 'cliente':
                    navigate('/dashboard-cliente'); // Redirige al cliente a su dashboard
                    break;
                case 'repartidor':
                    // Redirige al repartidor a su dashboard principal, no a una ruta genérica de time-entries.
                    // Si necesita el ID para /time-entries/employee/:employeeId, se necesitaría otra lógica.
                    // Por ahora, lo más seguro es ir a su dashboard general.
                    navigate('/dashboard-repartidor');
                    break;
                case 'auxiliar': // Añadir caso para auxiliar si no está
                    navigate('/auxiliar-home'); // Redirige al auxiliar a su página de inicio
                    break;
                case 'contador': // Añadir caso para contador si no está
                    navigate('/dashboard-contador'); // Asumiendo que tendrás un dashboard para contador
                    break;
                default:
                    navigate('/'); // A la página de inicio si el rol no coincide
            }
            // ------------------------------------

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
        </div>
    );
};

export default LoginPage;