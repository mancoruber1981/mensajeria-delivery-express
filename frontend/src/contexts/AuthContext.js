// frontend/src/contexts/AuthContext.js (VERSIÓN FINAL, COMPLETA Y SIN ERRORES)

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';

// Creamos el contexto
const AuthContext = createContext(null);

// Creamos el Hook personalizado para usar el contexto fácilmente
export const useAuth = () => {
    return useContext(AuthContext);
};

// Creamos el Proveedor que envolverá nuestra aplicación
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    // Función de Login con redirección inteligente
    const login = useCallback(async (username, password) => {
        try {
            const res = await API.post('/api/auth/login', { username, password });
            const { token: receivedToken } = res.data;

            localStorage.setItem('token', receivedToken);
            setToken(receivedToken);
            API.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

            const profileRes = await API.get('/api/auth/me/profile');
            const fullUserData = {
                _id: profileRes.data._id,
                username: profileRes.data.username,
                role: profileRes.data.role,
                profile: profileRes.data.profile,
                associatedClient: profileRes.data.associatedClient,
            };

            if (fullUserData.role === 'cliente' && fullUserData.profile) {
                try {
                    const clientRes = await API.get(`/api/clients/${fullUserData.profile._id}`);
                    fullUserData.clientProfile = clientRes.data;
                } catch (clientErr) {
                    console.warn("No se pudo cargar el perfil del cliente:", clientErr.message);
                }
            }

            if (fullUserData.role === 'auxiliar' && fullUserData.associatedClient) {
                try {
                    const clientRes = await API.get(`/api/clients/${fullUserData.associatedClient}`);
                    fullUserData.associatedClientProfile = clientRes.data;
                } catch (clientErr) {
                    console.warn("No se pudo cargar el perfil del cliente asociado:", clientErr.message);
                }
            }

            setUser(fullUserData);

            switch (fullUserData.role) {
                case 'admin': navigate('/dashboard-admin'); break;
                case 'repartidor': navigate('/dashboard-repartidor'); break;
                case 'cliente': navigate('/dashboard-cliente'); break;
                case 'auxiliar': navigate('/auxiliar-home'); break;
                default: navigate('/'); break;
            }

            return fullUserData;

        } catch (error) {
            console.error("ERROR en login:", error.message);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            throw error;
        }
    }, [navigate]);

    // Tu función de Register (intacta)
    const register = useCallback(async (userData) => {
        try {
            const res = await API.post('/api/auth/register', userData);
            const { token: receivedToken } = res.data;

            localStorage.setItem('token', receivedToken);
            setToken(receivedToken);
            API.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;

            const profileRes = await API.get('/api/auth/me/profile');

            const fullUserData = {
                _id: profileRes.data._id,
                username: profileRes.data.username,
                role: profileRes.data.role,
                profile: profileRes.data.profile,
                associatedClient: profileRes.data.associatedClient,
            };

            if (fullUserData.associatedClient) {
                try {
                    const clientRes = await API.get(`/clients/${fullUserData.associatedClient}`);
                    fullUserData.associatedClientProfile = clientRes.data;
                } catch (clientErr) {
                    console.warn("No se pudo cargar el perfil del cliente asociado:", clientErr.message);
                    fullUserData.associatedClientProfile = null;
                }
            }
            setUser(fullUserData);
            return fullUserData;
        } catch (error) {
            console.error('Error de registro:', error.response?.data?.message || error.message);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            throw error;
        }
    }, []);

    // Tu función de Logout (intacta)
    const logout = useCallback((options = {}) => {
    // Por defecto, la opción de redirigir será 'true'
    const { redirect = true } = options;

    console.log("DEBUG: Realizando logout.");
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete API.defaults.headers.common['Authorization'];
    
    // Solo redirigimos si la opción 'redirect' es true
    if (redirect) {
        navigate('/login');
    }
}, [navigate]);

    // Tu useEffect para cargar usuario desde el token (intacto)
    useEffect(() => {
        const loadUserFromToken = async () => {
            setIsLoading(true);
            const storedToken = localStorage.getItem('token');

            if (storedToken) {
                setToken(storedToken);
                API.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                try {
                    const res = await API.get('/api/auth/me/profile');
                    const finalUserData = {
                        _id: res.data._id,
                        username: res.data.username,
                        role: res.data.role,
                        profile: res.data.profile,
                        associatedClient: res.data.associatedClient,
                    };

                    if (finalUserData.profile && finalUserData.role === 'cliente') {
                        const clientRes = await API.get(`/api/clients/${finalUserData.profile._id}`);
                        finalUserData.clientProfile = clientRes.data;
                    }

                    if (finalUserData.role === 'auxiliar' && finalUserData.associatedClient) {
                        const clientRes = await API.get(`/api/clients/${finalUserData.associatedClient}`);
                        finalUserData.associatedClientProfile = clientRes.data;
                    }

                    setUser(finalUserData);
                } catch (error) {
                    console.error("DEBUG: Error al cargar usuario desde token. Token inválido o expirado.");
                    logout();
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        };
        loadUserFromToken();
    }, [logout]);

    // El valor que provee el contexto
    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, loadingAuth: isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};