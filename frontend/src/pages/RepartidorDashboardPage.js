// Bloque 1
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../index.css';

// Bloque 2
const RepartidorDashboardPage = () => {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const { user, loading: authLoading } = useAuth();
    const { employeeId } = useParams();
    const [viewingAsAdmin, setViewingAsAdmin] = useState(false);

    //Bolque 2.1 Esta es la única lógica de roles que necesitas aquí
    const isAdminView = user?.role === 'admin' && employeeId;
    const targetEmployeeId = isAdminView ? employeeId : user?.profile?._id;

    // Bloque 2.2
    const [employeeName, setEmployeeName] = useState('Cargando...');
    const [timeLogs, setTimeLogs] = useState([]);
    const [editingLog, setEditingLog] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        horaInicio: '',
        horaFin: '',
        valorHora: '0',
        festivo: false,
        descuentoAlmuerzo: '0',
        minutosAlmuerzoSinPago: '0',
        empresa: '',
        montoPrestamoDeducir: '0'
    });

    // Bloque 2.3
    const [horasBrutas, setHorasBrutas] = useState('0:00');
    const [subtotal, setSubtotal] = useState(0);
    const [valorNeto, setValorNeto] = useState(0);
    const [valorFinalConDeducciones, setValorFinalConDeducciones] = useState(0);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    // Bloque 3
    const recalculateTotals = useCallback((data) => {
        const { horaInicio, horaFin, valorHora, descuentoAlmuerzo, minutosAlmuerzoSinPago, montoPrestamoDeducir } = data;

        if (horaInicio && horaFin && valorHora) {
            const start = new Date(`1970-01-01T${horaInicio}:00`);
            let end = new Date(`1970-01-01T${horaFin}:00`);
            if (end < start) end.setDate(end.getDate() + 1);

            let diffMs = end - start;

            const minutosSinPagoNum = parseInt(minutosAlmuerzoSinPago, 10) || 0;
            const valorHoraNum = parseFloat(valorHora) || 0;

            const almuerzoDescontadoMonetario = (parseFloat(descuentoAlmuerzo) || 0);

            diffMs -= minutosSinPagoNum * 60 * 1000;

            const totalHours = diffMs / (1000 * 60 * 60);
            const hours = Math.floor(totalHours);
            const minutes = Math.round((totalHours - hours) * 60);

            const sub = totalHours * valorHoraNum;

            const total = sub - almuerzoDescontadoMonetario;

            const prestamoADeducir = parseFloat(montoPrestamoDeducir) || 0;
            const finalValue = total - prestamoADeducir;

            setHorasBrutas(`${hours}:${minutes.toString().padStart(2, '0')}`);
            setSubtotal(sub);
            setValorNeto(total);
            setValorFinalConDeducciones(finalValue);
        } else {
            setHorasBrutas('0:00');
            setSubtotal(0);
            setValorNeto(0);
            setValorFinalConDeducciones(0);
        }
    }, []);

    // Bloque 4
    useEffect(() => {
        recalculateTotals(formData);
    }, [formData, recalculateTotals]);

    // Bloque 5
    useEffect(() => {
        if (editingLog) {
            setFormData(prev => ({
                ...prev,
                valorHora: editingLog.valorHora?.toString() || '0',
                date: new Date(editingLog.date).toISOString().split('T')[0],
                festivo: editingLog.festivo ?? false,
                descuentoAlmuerzo: editingLog.descuentoAlmuerzo?.toString() || '0',
                minutosAlmuerzoSinPago: editingLog.minutosAlmuerzoSinPago?.toString() || '0',
                horaInicio: editingLog.horaInicio || '',
                horaFin: editingLog.horaFin || '',
                empresa: editingLog.empresa || '',
                montoPrestamoDeducir: editingLog.totalLoanDeducted?.toString() || '0'
            }));
            recalculateTotals({
                ...editingLog,
                montoPrestamoDeducir: editingLog.totalLoanDeducted || 0
            });
        }
    }, [editingLog, recalculateTotals]);

    // Bloque 6: Fetch de Datos del Repartidor (Centralizado)
    const fetchRepartidorData = useCallback(async () => {
        setPageLoading(true); // Siempre activar loading al iniciar la carga
        setError(null); // Limpiar errores previos
        const currentTargetEmployeeId = isAdminView ? employeeId : user?.profile?._id;

        if (!user || !currentTargetEmployeeId) {
            setError('No se pudo determinar el ID del empleado o el perfil del usuario.');
            setPageLoading(false);
            return;
        }

        try {
            let employeeDisplayName = '';
            if (isAdminView) {
                const employeeRes = await API.get(`/employees/${currentTargetEmployeeId}`);
                employeeDisplayName = employeeRes.data.fullName || 'Empleado Desconocido';
            } else {
                employeeDisplayName = user.profile?.fullName || user.username;
            }
            setEmployeeName(employeeDisplayName);

            const res = await API.get(`/timelogs/employee/${currentTargetEmployeeId}`);
            setTimeLogs(res.data);
        } catch (err) {
            console.error("ERROR al cargar datos del repartidor:", err.response?.data?.message || err.message);
            setError(err.response?.data?.message || "Error al cargar los datos del repartidor.");
            toast.error(err.response?.data?.message || "Error al cargar los datos del repartidor.");
        } finally {
            setPageLoading(false); // Siempre desactivar loading al finalizar (éxito o error)
        }
    }, [user, employeeId, isAdminView]);

    // Bloque 7: useEffect para Cargar Datos Iniciales
    useEffect(() => {
        if (!authLoading) {
            fetchRepartidorData();
        }
    }, [authLoading, fetchRepartidorData]);

    // Bloque 8
    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    // Bloque 9 (Corregido: handleSubmit)
    const handleSubmit = async (e) => {
        e.preventDefault();
        const currentTargetEmployeeId = isAdminView ? employeeId : user?.profile?._id;

        if (!user || !currentTargetEmployeeId) {
            toast.error("Error: No se pudo identificar el perfil del usuario o el ID del empleado.");
            return;
        }
        if (!formData.empresa.trim()) {
            toast.error("Por favor, ingresa el nombre de la empresa/cliente.");
            return;
        }

        const dataToSend = {
            employee: currentTargetEmployeeId,
            date: formData.date,
            horaInicio: formData.horaInicio,
            horaFin: formData.horaFin,
            valorHora: parseFloat(formData.valorHora),
            festivo: formData.festivo,
            descuentoAlmuerzo: parseFloat(formData.descuentoAlmuerzo),
            minutosAlmuerzoSinPago: parseInt(formData.minutosAlmuerzoSinPago, 10),
            empresa: formData.empresa.trim(),
            totalLoanDeducted: parseFloat(formData.montoPrestamoDeducir) || 0,
        };

        try {
            if (editingLog) {
                await API.put(`/timelogs/${editingLog._id}`, dataToSend);
                toast.success('Registro actualizado con éxito');
            } else {
                await API.post('/timelogs', dataToSend);
                toast.success('Registro guardado con éxito');
            }

            fetchRepartidorData();

            setFormData({
                date: new Date().toISOString().split('T')[0],
                horaInicio: '',
                horaFin: '',
                valorHora: '0',
                festivo: false,
                descuentoAlmuerzo: '0',
                minutosAlmuerzoSinPago: '0',
                empresa: '',
                montoPrestamoDeducir: '0'
            });
            setEditingLog(null);
        } catch (err) {
            console.error("Error en handleSubmit:", err.response?.data?.message || err.message);
            toast.error(err.response?.data?.message || 'Error al guardar.');
        }
    };

    // Bloque 10
    const handleEdit = (logToEdit) => {
        const logFormatted = {
            ...logToEdit,
            date: new Date(logToEdit.date).toISOString().split('T')[0],
            festivo: logToEdit.festivo ?? false,
            descuentoAlmuerzo: logToEdit.descuentoAlmuerzo?.toString() || '0',
            minutosAlmuerzoSinPago: logToEdit.minutosAlmuerzoSinPago?.toString() || '0',
            valorHora: logToEdit.valorHora?.toString() || '0',
            horaInicio: logToEdit.horaInicio || '',
            horaFin: logToEdit.horaFin || '',
            empresa: logToEdit.empresa || '',
            montoPrestamoDeducir: logToEdit.totalLoanDeducted?.toString() || '0'
        };

        setEditingLog(logToEdit);
        setFormData(logFormatted);
        recalculateTotals(logFormatted);
        formRef?.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

    // Bloque 11 (Corregido: handleDelete)
    const handleDelete = async (logId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            try {
                await API.delete(`/timelogs/${logId}`);
                toast.success('Registro eliminado con éxito.');
                fetchRepartidorData();
            } catch (err) {
                console.error("Error al eliminar registro:", err.response?.data?.message || err.message);
                toast.error(err.response?.data?.message || 'Error al eliminar el registro.');
            }
        }
    };

    // Bloque 12 (Corregido)
    if (pageLoading) return <LoadingSpinner />;
    if (error) return <div className="error-message">Error: {error}</div>;

    // --- INICIO DE LA CORRECCIÓN ---
    // Verificamos si el usuario es repartidor O si es un admin viendo un perfil específico
    if (user?.role !== 'repartidor' && !(user?.role === 'admin' && employeeId)) {
        return <div className="error-message">Acceso denegado.</div>;
    }
    // --- FIN DE LA CORRECCIÓN ---

    // Bloque 13
    return (
        <div className="time-entry-page-wrapper">
            <div className="time-entry-form-wrapper">
                <div className="form-container" ref={formRef}>
                    <h3 className="form-header">Registrar Horario Personal: {employeeName}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group form-group-half">
                                <label>Fecha:</label>
                                <input type="date" name="date" value={formData.date} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group form-group-half">
                                <label>Nombre de la Empresa/Cliente:</label>
                                <input
                                    type="text"
                                    name="empresa"
                                    value={formData.empresa}
                                    onChange={handleFormChange}
                                    required
                                    placeholder="Escribe el nombre de la empresa"
                                />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group form-group-half">
                                <label>Valor por Hora ($):</label>
                                <input type="number" name="valorHora" value={formData.valorHora} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group form-group-half">
                                <label>Hora Inicio:</label>
                                <input type="time" name="horaInicio" value={formData.horaInicio} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group form-group-half">
                                <label>Hora Fin:</label>
                                <input type="time" name="horaFin" value={formData.horaFin} onChange={handleFormChange} required />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group form-group-half">
                                <label>Descuento Almuerzo ($):</label>
                                <input type="number" name="descuentoAlmuerzo" value={formData.descuentoAlmuerzo} onChange={handleFormChange} />
                            </div>
                            <div className="form-group form-group-half">
                                <label>Minutos de Almuerzo (sin pago):</label>
                                <input type="number" name="minutosAlmuerzoSinPago" value={formData.minutosAlmuerzoSinPago} onChange={handleFormChange} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group form-group-half">
                                <label>Deducción Préstamo ($):</label>
                                <input
                                    type="number"
                                    name="montoPrestamoDeducir"
                                    value={formData.montoPrestamoDeducir}
                                    onChange={handleFormChange}
                                    placeholder="Monto a deducir"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label style={{ display: 'flex', alignItems: 'center' }}>
                                <input type="checkbox" name="festivo" checked={formData.festivo} onChange={handleFormChange} style={{ width: 'auto', marginRight: '10px' }} />
                                ¿Es día festivo?
                            </label>
                        </div>
                        <hr />
                        <>
                            <h4>Cálculos Automáticos:</h4>
                            <div className="form-row">
                                <div className="form-group form-group-half">
                                    <label>Horas Brutas:</label>
                                    <input type="text" value={horasBrutas} readOnly className="read-only-input" />
                                </div>
                                <div className="form-group form-group-half">
                                    <label>Subtotal ($):</label>
                                    <input type="text" value={`$ ${subtotal.toLocaleString('es-CO')}`} readOnly className="read-only-input" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Valor Neto Inicial ($):</label>
                                <input type="text" value={`$ ${valorNeto.toLocaleString('es-CO')}`} readOnly className="read-only-input" />
                            </div>
                            <div className="form-group">
                                <label>Valor Neto Final ($):</label>
                                <input type="text" value={`$ ${valorFinalConDeducciones.toLocaleString('es-CO')}`} readOnly className="read-only-input" />
                            </div>
                            <hr />
                        </>
                        <div className="form-group">
                            <button type="submit" className="button-success">Guardar Registro</button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h3>
                    {viewingAsAdmin
                        ? `Historial de Registros de ${employeeName}`
                        : "Mi Historial de Registros"
                    }
                </h3>
                <div className="table-responsive-container">
                    {timeLogs.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Empresa</th>
                                    <th>Inicio</th>
                                    <th>Fin</th>
                                    <th>H. Brutas</th>
                                    <th>V. Neto Inicial</th>
                                    <th>Deducción</th>
                                    <th>V. Neto Final</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timeLogs.map(log => (
                                    <tr key={log._id}>
                                        <td>{new Date(log.date).toLocaleDateString('es-CO', { timeZone: 'UTC' })}</td>
                                        <td>{log.empresa || 'N/A'}</td>
                                        <td>{log.horaInicio}</td>
                                        <td>{log.horaFin}</td>
                                        <td>{log.horasBrutas}</td>
                                        <td>${(log.valorNeto || 0).toLocaleString('es-CO')}</td>
                                        <td>${(log.totalLoanDeducted || 0).toLocaleString('es-CO')}</td>
                                        <td>${((log.valorNeto || 0) - (log.totalLoanDeducted || 0)).toLocaleString('es-CO')}</td>
                                        <td className="action-buttons">
                                            <button className="button-edit" onClick={() => handleEdit(log)}>Editar</button>
                                            <button className="button-delete" onClick={() => handleDelete(log._id)}>Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No hay registros personales aún.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RepartidorDashboardPage;