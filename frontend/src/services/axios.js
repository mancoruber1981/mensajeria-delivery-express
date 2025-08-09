import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getAxiosInstance = () => {
    const token = localStorage.getItem('token');
    const instance = axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
        },
    });

    instance.interceptors.response.use(
        response => response,
        error => {
            if (error.response && error.response.status === 401) {
                // Opcional: Redirigir al login si el token expira
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }
    );

    return instance;
};

export { getAxiosInstance };