// frontend/src/api/api.js 
 import axios from 'axios'; 
 const API = axios.create({ 
     baseURL: 'http://127.0.0.1:5000/api', 
     headers: { 
         'Content-Type': 'application/json', 
     }, 
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