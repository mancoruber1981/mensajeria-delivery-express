// frontend/src/contexts/AuthContext.js 

 // Bloque 1 
 import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'; // <-- CAMBIO #1 APLICADO 
 import { useNavigate } from 'react-router-dom'; 
 import API from '../api/api'; 

 // Bloque 2 
 const AuthContext = createContext(null); 

 // Bloque 3 
 export const useAuth = () => { 
     return useContext(AuthContext); 
 }; 

 // Bloque 4 
 export const AuthProvider = ({ children }) => { 
     const [user, setUser] = useState(null); 
     const [token, setToken] = useState(localStorage.getItem('token')); 
     const [isLoading, setIsLoading] = useState(true); 
     const navigate = useNavigate(); 

     // Bloque 5 
     const login = useCallback(async (username, password) => { // <-- CAMBIO #2 APLICADO 
     try { 
         const res = await API.post('/auth/login', { username, password }); 
         const { token: receivedToken } = res.data; 

         localStorage.setItem('token', receivedToken); 
         setToken(receivedToken); 
         API.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`; 

         const profileRes = await API.get('/auth/me/profile'); 

         const fullUserData = { 
             _id: profileRes.data._id, 
             username: profileRes.data.username, 
             role: profileRes.data.role, 
             profile: profileRes.data.profile, 
             associatedClient: profileRes.data.associatedClient, 
         }; 

         // 👇 Corrección aquí: si el usuario es 'cliente', usamos su propio perfil _id como clientId 
         if (fullUserData.role === 'cliente') { 
             try { 
                 const clientRes = await API.get(`/clients/${fullUserData.profile._id}`); 
                 fullUserData.clientProfile = clientRes.data; 
             } catch (clientErr) { 
                 console.warn("No se pudo cargar el perfil del cliente:", clientErr.message); 
                 fullUserData.clientProfile = null; 
             } 
         } 

         // 👇 Para auxiliar con cliente asociado (esto ya estaba bien) 
         if (fullUserData.role === 'auxiliar' && fullUserData.associatedClient) { 
             try { 
                 const clientRes = await API.get(`/clients/${fullUserData.associatedClient}`); 
                 fullUserData.associatedClientProfile = clientRes.data; 
             } catch (clientErr) { 
                 console.warn("No se pudo cargar el perfil del cliente asociado para el auxiliar:", clientErr.message); 
                 fullUserData.associatedClientProfile = null; 
             } 
         } 

         setUser(fullUserData); 
         console.log("DEBUG AuthContext: Datos finales del usuario a establecer:", fullUserData); 

         // 🚀 LÓGICA DE REDIRECCIÓN AÑADIDA 🚀 
         switch (fullUserData.role) { 
             case 'admin': 
                 navigate('/dashboard-admin'); 
                 break; 
             case 'cliente': 
                 navigate('/dashboard-cliente'); 
                 break; 
             case 'repartidor': 
                 navigate('/dashboard-repartidor'); // <-- ¡La ruta corregida! 
                 break; 
             case 'auxiliar': 
                 navigate('/auxiliar-home'); 
                 break; 
             case 'contador': 
                 navigate('/dashboard-contador'); 
                 break; 
             default: 
                 navigate('/'); 
                 break; 
         } 

         return fullUserData; 

     } catch (error) { 
         console.error("ERROR en login:", error.message); 
         console.error("Detalles del error (si existen):", error.response?.data); 
         localStorage.removeItem('token'); 
         setToken(null); 
         setUser(null); 
         throw error; 
     } 
     }, [navigate]); // <-- CAMBIO #2 APLICADO 

     // Bloque 6 
     const register = useCallback(async (userData) => { // <-- CAMBIO #2 APLICADO 
         try { 
             const res = await API.post('/auth/register', userData); 
             const { token: receivedToken } = res.data; 

             localStorage.setItem('token', receivedToken); 
             setToken(receivedToken); 
             API.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`; 

             const profileRes = await API.get('/auth/me/profile'); 

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
                     console.warn("No se pudo cargar el perfil del cliente asociado para el auxiliar durante el registro:", clientErr.message); 
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
     }, []); // <-- CAMBIO #2 APLICADO 

     // Bloque 7 
     const logout = useCallback(() => { // <-- CAMBIO #2 APLICADO 
         console.log("DEBUG: Realizando logout."); 
         localStorage.removeItem('token'); 
         setToken(null); 
         setUser(null); 
         delete API.defaults.headers.common['Authorization']; 
         navigate('/login'); 
     }, [navigate]); // <-- CAMBIO #2 APLICADO 

     // Bloque 8: Cargar usuario desde token en localStorage
useEffect(() => {
    const loadUserFromToken = async () => {
        setIsLoading(true);
        const storedToken = localStorage.getItem('token');

        if (storedToken) {
            setToken(storedToken);
            API.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            try {
                const res = await API.get('/auth/me/profile');
                const finalUserData = {
                    _id: res.data._id,
                    username: res.data.username,
                    role: res.data.role,
                    profile: res.data.profile,
                    associatedClient: res.data.associatedClient,
                };

                if (finalUserData.profile && finalUserData.role === 'cliente') {
                    const clientRes = await API.get(`/clients/${finalUserData.profile._id}`);
                    finalUserData.clientProfile = clientRes.data;
                }

                if (finalUserData.role === 'auxiliar' && finalUserData.associatedClient) {
                    const clientRes = await API.get(`/clients/${finalUserData.associatedClient}`);
                    finalUserData.associatedClientProfile = clientRes.data;
                }

                setUser(finalUserData);
            } catch (error) {
                // ✅ CAMBIO CLAVE: Si la llamada falla, borramos el token y cerramos la sesión
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

     // Bloque 9 
     return ( 
         <AuthContext.Provider value={{ user, token, login, logout, register, loadingAuth: isLoading }}> 
             {children} 
         </AuthContext.Provider> 
     ); 
 };