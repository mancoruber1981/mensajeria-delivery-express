// frontend/src/api/api.js

import axios from 'axios';

// Creamos la instancia de axios SIN baseURL para que el proxy de package.json funcione
const API = axios.create({
  baseURL: 'http://localhost:5000' // <-- O el puerto donde esté corriendo TU backend (5000, 5001, etc.)
});
 


 // Interceptor para añadir el token JWT a cada solicitud saliente. 
 // Esto asegura que todas las peticiones a la API estén autenticadas 
 // si hay un token almacenado en localStorage. 
 API.interceptors.request.use((config) => { 
     const token = localStorage.getItem('token'); 
     if (token) { 
         // Añade el token en el formato "Bearer <token>" al header de Autorización. 
         config.headers.Authorization = `Bearer ${token}`; 
     } 
     return config; 
 }, (error) => { 
     // Si hay un error en la configuración de la solicitud, se rechaza la promesa. 
     return Promise.reject(error); 
 }); 

 export default API;