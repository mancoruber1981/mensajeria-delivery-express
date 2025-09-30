// frontend/src/components/PublicRoute.js (VERSIÓN FINAL Y SIMPLIFICADA)
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute = ({ children }) => {
    const { user } = useAuth();

    // Si hay un usuario logueado, no debería ver esta página,
    // así que lo mandamos a la página de inicio.
    if (user) {
        return <Navigate to="/" replace />;
    }

    // Si no hay usuario, muestra la página pública (login, register, etc.)
    return children;
};

export default PublicRoute;