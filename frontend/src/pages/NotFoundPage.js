// frontend/src/pages/NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../index.css';

const NotFoundPage = () => {
    return (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <h1 style={{ fontSize: '5em', color: '#dc3545' }}>404</h1>
            <h2 style={{ color: '#343a40' }}>Página No Encontrada</h2>
            <p style={{ fontSize: '1.1em', color: '#6c757d' }}>
                Lo sentimos, la página que estás buscando no existe.
            </p>
            <Link to="/" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold' }}>
                Volver a la página de inicio
            </Link>
        </div>
    );
};

export default NotFoundPage;