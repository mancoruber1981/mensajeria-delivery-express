// frontend/src/components/AuthInitializer.js 

 // Bloque 1 
 import React, { useEffect } from 'react'; 
 import { useAuth } from '../contexts/AuthContext'; 
 import { useNavigate, useLocation } from 'react-router-dom'; 
 import LoadingSpinner from './LoadingSpinner'; 

 // Bloque 2 (código corregido) 
 const AuthInitializer = ({ children }) => { 
     const { user, loadingAuth } = useAuth(); 
     const navigate = useNavigate(); 
     const location = useLocation(); 

     useEffect(() => { 
         // La redirección ahora se maneja en AuthContext.js y ProtectedRoute.js 
         // Eliminamos toda la lógica de redirección de este archivo. 
     }, [user, loadingAuth, navigate, location.pathname]); 

     // Bloque 4 
     if (loadingAuth) { 
         return <LoadingSpinner />; 
     } 

     // Bloque 5 
     return children; 
 }; 

 // Bloque 6 
 export default AuthInitializer;