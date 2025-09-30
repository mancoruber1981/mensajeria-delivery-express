// frontend/src/components/AuthInitializer.js (VERSIÓN FINAL Y DEFINITIVA)
import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

const AuthInitializer = ({ children }) => {
    const { user, loadingAuth } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // No hagas nada hasta que la carga inicial del usuario haya terminado
        if (loadingAuth) {
            return;
        }

        // Lista de rutas que son SIEMPRE públicas y no requieren acción
        const unrestrictedPaths = ['/forgot-password', '/register'];
        
        // Comprobamos si la ruta actual es la de reseteo de contraseña
        const isResetPasswordPath = location.pathname.startsWith('/resetpassword');

        // Si el usuario NO está logueado...
        if (!user) {
            // ...y NO estamos en una ruta pública o de reseteo, no hacemos nada aquí.
            // Dejamos que los guardianes de ruta se encarguen.
            return;
        }

        // Si el usuario SÍ está logueado...
        if (user) {
            // ...y está intentando acceder a una ruta pública o de reseteo...
            if (unrestrictedPaths.includes(location.pathname) || isResetPasswordPath) {
                // ...lo redirigimos a su dashboard correspondiente.
                switch (user.role) {
                    case 'admin': navigate('/dashboard-admin'); break;
                    case 'cliente': navigate('/dashboard-cliente'); break;
                    case 'repartidor': navigate('/dashboard-repartidor'); break;
                    case 'auxiliar': navigate('/auxiliar-home'); break;
                    default: navigate('/'); break;
                }
            }
        }

    }, [user, loadingAuth, navigate, location.pathname]);

    // Siempre muestra el spinner mientras carga, para evitar "flashes" de contenido
    if (loadingAuth) {
        return <LoadingSpinner />;
    }

    // Una vez cargado, muestra el contenido de la ruta actual
    return children;
};

export default AuthInitializer;