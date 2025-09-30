// frontend/src/api/api.js (VERSIÓN FINAL PARA PRODUCCIÓN)

import axios from 'axios';

// La aplicación leerá la URL del backend desde una variable de entorno
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

// Interceptor para añadir el token JWT a cada solicitud saliente.
API.interceptors.request.use((config) => { 
    const token = localStorage.getItem('token'); 
    if (token) { 
        config.headers.Authorization = `Bearer ${token}`; 
    } 
    return config; 
}, (error) => { 
    return Promise.reject(error); 
}); 

export default API;