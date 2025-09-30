import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../index.css';

const Navbar = () => {
    const { user, logout } = useAuth();
    const [menuAbierto, setMenuAbierto] = useState(false);
    const cerrarMenu = () => setMenuAbierto(false);

     return (
        <nav className={`navbar ${menuAbierto ? 'open' : ''}`}>
            <div className="navbar-brand">
                <Link to="/" onClick={cerrarMenu}>Mensajería Delivery Express S.A.S.</Link>
            </div>

            {/* Menú para Escritorio */}
            <ul className="navbar-nav desktop-nav">
                {user ? (
                    <>
                        {user.role === 'admin' && (
                            <>
                                <li><Link to="/dashboard-admin" onClick={cerrarMenu}>Dashboard Admin</Link></li>
                                <li><Link to="/admin/employees" onClick={cerrarMenu}>Empleados</Link></li>
                                <li><Link to="/admin/clients" onClick={cerrarMenu}>Clientes</Link></li>
                                <li><Link to="/loans" onClick={cerrarMenu}>Préstamos</Link></li>
                                <li><Link to="/admin/expenses" onClick={cerrarMenu}>Gastos</Link></li>
                                <li><Link to="/admin/approve-users" onClick={cerrarMenu}>Aprobar Usuarios</Link></li>
                            </>
                        )}
                        {user.role === 'repartidor' && (
                            <>
                                <li><Link to="/loans" onClick={cerrarMenu}>Préstamos</Link></li>
                            </>
                        )}
                        <li><span className="welcome-message">Bienvenido, {user.username} ({user.role})</span></li>
                        <li><button onClick={logout} className="logout-button">Cerrar Sesión</button></li>
                    </>
                ) : (
                    <>
                        <li><Link to="/login" onClick={cerrarMenu}>Iniciar Sesión</Link></li>
                        <li><Link to="/register" onClick={cerrarMenu}>Registrarse</Link></li>
                    </>
                )}
            </ul>

            {menuAbierto && <div className="overlay" onClick={cerrarMenu}></div>}
        </nav>
    );
};

export default Navbar;