// frontend/src/pages/HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import '../index.css'; // Importa los estilos para esta página

const HomePage = () => {
    return (
        <div className="homepage-container">
            <h1 className="company-title">
                Mensajería <span className="highlight">Delivery Express S.A.S.</span>
            </h1>
            <p className="tagline">
                Tu confianza, nuestra prioridad. Entregamos más que paquetes.
            </p>
            <div className="button-group">
                <Link to="/login" className="action-button primary-button">
                    Iniciar Sesión
                </Link>
                <Link to="/register" className="action-button secondary-button">
                    Registrarse
                </Link>
            </div>
            {/* Opcional: una imagen o ilustración que transmita confianza y dinamismo */}
            <img
                src="https://via.placeholder.com/600x300?text=Logo+Delivery+Express" // Reemplaza con una imagen real más adelante
                alt="Servicio de Mensajería"
                className="hero-image"
            />
        </div>
    );
};

export default HomePage;