// frontend/src/components/Navbar.js (VERSIÓN FINAL RESPONSIVA)

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../index.css'; // Asegúrate de que los estilos globales estén importados

// Un pequeño componente para el icono de la hamburguesa
const HamburgerIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6H20M4 12H20M4 18H20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const Navbar = () => {
    const { user, logout } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    // Función para cerrar el menú (útil al hacer clic en un enlace)
    const handleLinkClick = () => {
        setMenuOpen(false);
    };

    return (
        // La clase 'open' se añade dinámicamente para activar las animaciones de CSS
        <nav className={`navbar ${menuOpen ? 'open' : ''}`}>
            <div className="navbar-brand">
                <Link to="/" onClick={handleLinkClick}>Mensajería Delivery Express S.A.S.</Link>
            </div>

            {/* --- MENÚ DE ESCRITORIO (El que ya tenías) --- */}
            <ul className="navbar-nav desktop-nav">
                {user ? (
                    <>
                        {user.role === 'admin' && (
                            <>
                                <li><Link to="/dashboard-admin">Dashboard</Link></li>
                                <li><Link to="/admin/employees">Mensajeros</Link></li>
                                <li><Link to="/admin/clients">Clientes</Link></li>
                                <li><Link to="/admin/approve-users">Aprobar</Link></li>
                                <li><Link to="/loans">Préstamos</Link></li>
                            </>
                        )}
                        {user.role === 'repartidor' && (
                            <>
                                <li><Link to="/dashboard-repartidor">Mi Historial</Link></li>
                                <li><Link to="/loans">Préstamos</Link></li>
                            </>
                        )}
                        {/* Agrega aquí más enlaces para otros roles si es necesario */}
                        <li><span className="welcome-message">Bienvenido, {user.username}</span></li>
                        <li><button onClick={logout}>Cerrar Sesión</button></li>
                    </>
                ) : (
                    <>
                        <li><Link to="/login">Iniciar Sesión</Link></li>
                        <li><Link to="/register">Registrarse</Link></li>
                    </>
                )}
            </ul>

            {/* --- BOTÓN DE HAMBURGUESA (LA PIEZA QUE FALTABA) --- */}
            <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menú">
                <HamburgerIcon />
            </button>

            {/* --- MENÚ MÓVIL DESLIZABLE (LA OTRA PIEZA QUE FALTABA) --- */}
            <ul className="mobile-nav">
                {user ? (
                    <>
                        {user.role === 'admin' && (
                            <>
                                <li><Link to="/dashboard-admin" onClick={handleLinkClick}>Dashboard</Link></li>
                                <li><Link to="/admin/employees" onClick={handleLinkClick}>Mensajeros</Link></li>
                                <li><Link to="/admin/clients" onClick={handleLinkClick}>Clientes</Link></li>
                                <li><Link to="/admin/approve-users" onClick={handleLinkClick}>Aprobar</Link></li>
                                <li><Link to="/loans" onClick={handleLinkClick}>Préstamos</Link></li>
                            </>
                        )}
                         {user.role === 'repartidor' && (
                            <>
                                <li><Link to="/dashboard-repartidor" onClick={handleLinkClick}>Mi Historial</Link></li>
                                <li><Link to="/loans" onClick={handleLinkClick}>Préstamos</Link></li>
                            </>
                        )}
                        {/* Agrega aquí más enlaces para otros roles si es necesario */}
                        <li><button onClick={() => { logout(); handleLinkClick(); }}>Cerrar Sesión</button></li>
                    </>
                ) : (
                    <>
                        <li><Link to="/login" onClick={handleLinkClick}>Iniciar Sesión</Link></li>
                        <li><Link to="/register" onClick={handleLinkClick}>Registrarse</Link></li>
                    </>
                )}
            </ul>
            
            {/* Overlay para cerrar el menú al hacer clic fuera */}
            {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)}></div>}
        </nav>
    );
};

export default Navbar;