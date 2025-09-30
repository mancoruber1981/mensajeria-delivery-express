// frontend/src/pages/ResetPasswordPage.js (VERSIÓN FINAL Y FUNCIONAL)
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api/api';
import '../index.css';

const ResetPasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { resetToken } = useParams();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        if (password !== confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            setError('Las contraseñas no coinciden.');
            setLoading(false);
            return;
        }

        try {
            const { data } = await API.put(`/api/auth/resetpassword/${resetToken}`, { password });
            setMessage(data.data);
            toast.success(data.data);
            
            setTimeout(() => {
                navigate('/login');
            }, 3000);

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
            <h2>Restablecer Contraseña</h2>
            {message ? (
                <div className="success-message">
                    <p>{message}</p>
                    <Link to="/login">Ir a Iniciar Sesión</Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="password">Nueva Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Introduce tu nueva contraseña"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirmar Nueva Contraseña:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Confirma tu nueva contraseña"
                        />
                    </div>
                    
                    {error && <p className="error-message">{error}</p>}

                    <div className="form-group">
                        <button type="submit" className="button-primary" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ResetPasswordPage;