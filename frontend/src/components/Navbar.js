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

      <ul className="navbar-nav desktop-nav">
        {user ? (
          <>
            {user.role === 'admin' && (
              <>
                <li><Link to="/admin-dashboard" onClick={cerrarMenu}>Dashboard Admin</Link></li>
                <li><Link to="/admin/employees" onClick={cerrarMenu}>Empleados</Link></li>
                <li><Link to="/admin/clients" onClick={cerrarMenu}>Clientes</Link></li>
                <li><Link to="/admin/approve-users" onClick={cerrarMenu}>Aprobar Usuarios</Link></li>
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

      <button className="hamburger" onClick={() => setMenuAbierto(!menuAbierto)}>☰</button>

      <ul className="mobile-nav">
        {user ? (
          <>
            {user.role === 'admin' && (
              <>
                <li><Link to="/admin-dashboard" onClick={cerrarMenu}>Dashboard Admin</Link></li>
                <li><Link to="/admin/employees" onClick={cerrarMenu}>Empleados</Link></li>
                <li><Link to="/admin/clients" onClick={cerrarMenu}>Clientes</Link></li>
                <li><Link to="/admin/approve-users" onClick={cerrarMenu}>Aprobar Usuarios</Link></li>
              </>
            )}
            <li><button onClick={() => { logout(); cerrarMenu(); }} className="logout-button">Cerrar Sesión</button></li>
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