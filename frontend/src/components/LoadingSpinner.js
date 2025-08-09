// frontend/src/components/LoadingSpinner.js
import React from 'react';
import '../index.css'; // Para los estilos .spinner-container y .loading-spinner

const LoadingSpinner = () => {
    return (
        <div className="spinner-container">
            <div className="loading-spinner"></div>
            <p>Cargando...</p>
        </div>
    );
};

export default LoadingSpinner;