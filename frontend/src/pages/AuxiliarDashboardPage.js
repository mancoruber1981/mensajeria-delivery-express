import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // 1. Importar useNavigate
import { useAuth } from '../contexts/AuthContext';
import API from '../api/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner'
import '../index.css';



const AuxiliarDashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate(); // 2. Inicializar useNavigate
    const [clientData, setClientData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchClientDataForAuxiliary = useCallback(async () => {
        if (!user || !user.associatedClient) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data } = await API.get(`/api/clients/${user.associatedClient}`);
            setClientData(data);
        } catch (error) {
            toast.error('No se pudo cargar la información del cliente asociado.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchClientDataForAuxiliary();
    }, [fetchClientDataForAuxiliary]);
    
    // 3. Crear la función para manejar el clic del botón
    const handleRegisterEmployeeClick = () => {
        if (user && user.associatedClient) {
            // Navega a la página de registro, pasando el ID del cliente asociado
            navigate(`/admin/register-employee-for/${user.associatedClient}`);
        } else {
            toast.error('No se pudo identificar al cliente asociado para registrar un nuevo empleado.');
        }
    };

    if (loading) return <LoadingSpinner />;

    // Pega esta nueva función en tu componente AuxiliarDashboardPage

const handleDeleteEmployee = async (employeeId) => {
    // Pedimos confirmación antes de una acción destructiva
    if (!window.confirm('¿Estás seguro de que quieres eliminar a este empleado? Se borrará permanentemente.')) {
        return;
    }

    try {
        await API.delete(`/api/employees/${employeeId}`);
        toast.success('Empleado eliminado con éxito.');
        // Volvemos a llamar a la función que carga los datos para refrescar la lista
        fetchClientDataForAuxiliary(); 
    } catch (error) {
        toast.error(error.response?.data?.message || 'Error al eliminar el empleado.');
    }
};

    return (
        <div className="dashboard-container">
            <h1>Dashboard de Auxiliar</h1>
            <div className="dashboard-card">
                <h2>Bienvenido, {user?.username}</h2>
                <p>Estás asociado al cliente: <strong>{clientData?.companyName || 'Cargando...'}</strong></p>
                <p>Desde aquí puedes gestionar los horarios de sus empleados.</p>
            </div>

            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Empleados del Cliente</h2>
                    {/* 4. Añadir el botón para registrar */}
                    <button onClick={handleRegisterEmployeeClick} className="button-primary">+ Registrar Mensajero</button>
                </div>
                
                {clientData && clientData.employees.length > 0 ? (
                     <div className="table-responsive-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nombre del Empleado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {clientData.employees.map(employee => (
                                    <tr key={employee._id}>
                                        <td>{employee.fullName}</td>
                                        <td>
    <div style={{ display: 'flex', gap: '8px' }}>
        <Link 
            to={`/time-entries/employee/${employee._id}`} 
            className="button-primary button-small">
            Registrar Horario
        </Link>
        
        {/* --- INICIO DEL CÓDIGO AÑADIDO --- */}
        <button 
            onClick={() => handleDeleteEmployee(employee._id)}
            className="button-delete button-small">
            Eliminar
        </button>
        {/* --- FIN DEL CÓDIGO AÑADIDO --- */}
    </div>
</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p>El cliente no tiene empleados registrados.</p>
                )}
            </div>
        </div>
    );
};

export default AuxiliarDashboardPage;

