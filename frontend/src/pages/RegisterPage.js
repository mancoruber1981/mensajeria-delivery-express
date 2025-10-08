// Bloque 1: Importaciones
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/api';
import './RegisterPage.css'; // <-- Importamos el archivo CSS de la página

const RegisterPage = () => {
    // Estados para los campos del formulario
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState(''); // <-- AÑADIDO
    const [role, setRole] = useState('repartidor');
    const [employeeDetails, setEmployeeDetails] = useState({
        fullName: '', address: '', idCard: '', phone: '', email: ''
    });
    const [clientDetails, setClientDetails] = useState({
        fullNameHolder: '', idCard: '', nit: '', companyName: '', email: '', phone: '', address: ''
    });
    const [formErrors, setFormErrors] = useState({}); // <-- AÑADIDO para manejar errores de validación
    const navigate = useNavigate();

    // Bloque 2: Manejadores de cambios
    const handleEmployeeChange = (e) => {
        setEmployeeDetails({ ...employeeDetails, [e.target.name]: e.target.value });
    };

    const handleClientChange = (e) => {
        setClientDetails({ ...clientDetails, [e.target.name]: e.target.value });
    };

    // Bloque 3: Función de validación del formulario (AÑADIDO)
    const validateForm = () => {
        const errors = {};
        if (!username) errors.username = "El usuario es obligatorio.";
        if (!password) {
            errors.password = "La contraseña es obligatoria.";
        } else if (password.length < 6) {
            errors.password = "La contraseña debe tener al menos 6 caracteres.";
        }
        if (password !== confirmPassword) {
            errors.confirmPassword = "Las contraseñas no coinciden.";
        }

        if (role === 'repartidor') {
            for (const key in employeeDetails) {
                if (!employeeDetails[key]) {
                    errors[key] = `El campo de Repartidor es obligatorio.`;
                }
            }
        } else if (role === 'cliente') {
            for (const key in clientDetails) {
                if (!clientDetails[key]) {
                    errors[key] = `El campo de Cliente/Socio es obligatorio.`;
                }
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Bloque 4: Manejador de envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error("Por favor, corrige los errores del formulario.");
            return;
        }

        let profileData = {};
        if (role === 'repartidor') {
            profileData = employeeDetails;
        } else if (role === 'cliente') {
            profileData = clientDetails;
        }

        const registrationData = {
            username,
            password,
            role,
            profile: profileData
        };

        try {
            const response = await api.post('/api/auth/register', registrationData);
            toast.success(response.data.message);
            navigate('/login');
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Error al registrar usuario.';
            toast.error(errorMessage);
        }
    };

    // Bloque 5: Renderizado del componente
    return (
        <div className="register-container">
            <div className="register-card">
                <h2 className="register-header">Registrar Usuario</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="role">Rol:</label>
                        <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="repartidor">Repartidor</option>
                            <option value="cliente">Cliente/Socio</option>
                            {/*<option value="contador">Contador</option>*/}
                            {/*<option value="admin">Admin</option>*/}
                        </select>
                    </div>

                    {/* Formulario para Repartidor */}
                    {role === 'repartidor' && (
                        <div className="role-details-container">
                            <h3>Detalles del Repartidor</h3>
                            <div className="form-group">
                                <label htmlFor="fullName">Nombre Completo:</label>
                                <input type="text" id="fullName" name="fullName" value={employeeDetails.fullName} onChange={handleEmployeeChange} className={formErrors.fullName ? 'input-error' : ''} />
                                {formErrors.fullName && <p className="error-text">{formErrors.fullName}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="address">Dirección:</label>
                                <input type="text" id="address" name="address" value={employeeDetails.address} onChange={handleEmployeeChange} className={formErrors.address ? 'input-error' : ''} />
                                {formErrors.address && <p className="error-text">{formErrors.address}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="idCard">Cédula:</label>
                                <input type="text" id="idCard" name="idCard" value={employeeDetails.idCard} onChange={handleEmployeeChange} className={formErrors.idCard ? 'input-error' : ''} />
                                {formErrors.idCard && <p className="error-text">{formErrors.idCard}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Teléfono:</label>
                                <input type="text" id="phone" name="phone" value={employeeDetails.phone} onChange={handleEmployeeChange} className={formErrors.phone ? 'input-error' : ''} />
                                {formErrors.phone && <p className="error-text">{formErrors.phone}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Correo Electrónico:</label>
                                <input type="email" id="email" name="email" value={employeeDetails.email} onChange={handleEmployeeChange} className={formErrors.email ? 'input-error' : ''} />
                                {formErrors.email && <p className="error-text">{formErrors.email}</p>}
                            </div>
                        </div>
                    )}
                    {/* Formulario para Cliente/Socio */}
                    {role === 'cliente' && (
                        <div className="role-details-container">
                            <h3>Detalles del Cliente/Socio</h3>
                            <div className="form-group">
                                <label htmlFor="fullNameHolder">Nombre Completo del Titular:</label>
                                <input type="text" id="fullNameHolder" name="fullNameHolder" value={clientDetails.fullNameHolder} onChange={handleClientChange} className={formErrors.fullNameHolder ? 'input-error' : ''} />
                                {formErrors.fullNameHolder && <p className="error-text">{formErrors.fullNameHolder}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="idCard">Cédula del Titular:</label>
                                <input type="text" id="idCard" name="idCard" value={clientDetails.idCard} onChange={handleClientChange} className={formErrors.idCard ? 'input-error' : ''} />
                                {formErrors.idCard && <p className="error-text">{formErrors.idCard}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="nit">NIT:</label>
                                <input type="text" id="nit" name="nit" value={clientDetails.nit} onChange={handleClientChange} className={formErrors.nit ? 'input-error' : ''} />
                                {formErrors.nit && <p className="error-text">{formErrors.nit}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="companyName">Razón Social:</label>
                                <input type="text" id="companyName" name="companyName" value={clientDetails.companyName} onChange={handleClientChange} className={formErrors.companyName ? 'input-error' : ''} />
                                {formErrors.companyName && <p className="error-text">{formErrors.companyName}</p>}
                            </div>
                            <div className="form-group">
    <label htmlFor="clientEmail">Correo Electrónico:</label>
    <input 
        type="email" 
        id="clientEmail" 
        name="email" 
        value={clientDetails.email} 
        onChange={handleClientChange} 
        className={formErrors.email ? 'input-error' : ''} 
    />
    {formErrors.email && <p className="error-text">{formErrors.email}</p>}
</div>
                         <div className="form-group">
                                <label htmlFor="clientPhone">Teléfono:</label>
                                <input 
                                    type="text" 
                                    id="clientPhone" 
                                    name="phone" 
                                    value={clientDetails.phone} 
                                    onChange={handleClientChange} 
                                    className={formErrors.phone ? 'input-error' : ''} 
                                />
                                {formErrors.phone && <p className="error-text">{formErrors.phone}</p>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="clientAddress">Dirección:</label>
                                <input 
                                    type="text" 
                                    id="clientAddress" 
                                    name="address" 
                                    value={clientDetails.address} 
                                    onChange={handleClientChange} 
                                    className={formErrors.address ? 'input-error' : ''} 
                                />
                                {formErrors.address && <p className="error-text">{formErrors.address}</p>}
                            </div>
                            {/* --- FIN DE LA ADICIÓN --- */}
                        </div>
                    )}
                    
                    <div className="credentials-container">
                        <h3>Credenciales de Acceso</h3>
                        <div className="form-group">
                            <label htmlFor="username">Usuario:</label>
                            <input type="text" id="username" name="username" value={username} onChange={(e) => setUsername(e.target.value)} className={formErrors.username ? 'input-error' : ''} />
                            {formErrors.username && <p className="error-text">{formErrors.username}</p>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Contraseña:</label>
                            <input type="password" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} className={formErrors.password ? 'input-error' : ''} />
                            {formErrors.password && <p className="error-text">{formErrors.password}</p>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirmar Contraseña:</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={formErrors.confirmPassword ? 'input-error' : ''} />
                            {formErrors.confirmPassword && <p className="error-text">{formErrors.confirmPassword}</p>}
                        </div>
                    </div>
                    
                    <button type="submit" className="submit-button">Registrar</button>
                </form>
            </div>
        </div>
    );
};

export default RegisterPage;