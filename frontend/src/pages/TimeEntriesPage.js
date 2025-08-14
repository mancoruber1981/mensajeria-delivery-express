// ====================
// Página: Registro de Horarios por Empleado
// Componente: TimeEntriesPage
// Descripción: Permite registrar y gestionar las horas trabajadas por un empleado, incluyendo horas brutas, descuentos, deducciones y cálculo de valor final.
// ====================

// Bloque 1: Importaciones 
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import '../index.css';
import './TimeEntriesPage.css';

// Bloque 2: Definición del Componente y Variables Iniciales
const TimeEntriesPage = () => {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const formRef = useRef(null);
    const { user } = useAuth();

    const isAuxiliar = user && user.role === 'auxiliar';
    const isClient = user && user.role === 'cliente';
    const isAdmin = user && user.role === 'admin';

    // Bloque 3: Estados del Componente (se añade el estado de loading)
    const [defaultHourlyRateForClient, setDefaultHourlyRateForClient] = useState('0');
    const [holidayHourlyRateForClient, setHolidayHourlyRateForClient] = useState('0');
    const [employeeName, setEmployeeName] = useState('Cargando...');
    const [timeLogs, setTimeLogs] = useState([]);
    const [editingLog, setEditingLog] = useState(null);
    const [loading, setLoading] = useState(true); // <-- CORRECCIÓN: Estado de carga añadido
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
    const [horasBrutas, setHorasBrutas] = useState('0:00');
    const [subtotal, setSubtotal] = useState(0);
    const [valorNeto, setValorNeto] = useState(0);
    const [valorFinalConDeducciones, setValorFinalConDeducciones] = useState(0);

    // Bloque 6: Función de Recálculo de Totales
    const recalculateTotals = useCallback((data) => {
        const { horaInicio, horaFin, valorHora, descuentoAlmuerzo, minutosAlmuerzoSinPago, montoPrestamoDeducir } = data;
        if (horaInicio && horaFin && valorHora) {
            const start = new Date(`1970-01-01T${horaInicio}:00`);
            let end = new Date(`1970-01-01T${horaFin}:00`);
            if (end < start) end.setDate(end.getDate() + 1);
            let diffMs = end - start;
            const minutosSinPagoNum = parseInt(minutosAlmuerzoSinPago, 10) || 0;
            const valorHoraNum = parseFloat(valorHora) || 0;
            const almuerzoDescontadoMonetario = (isAuxiliar)
                ? (minutosSinPagoNum / 60) * valorHoraNum
                : (parseFloat(descuentoAlmuerzo) || 0);
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
    }, [isAuxiliar]);

    // Bloque 9: Función para Obtener Registros de Tiempo
    const fetchTimeLogs = useCallback(async () => {
        if (!employeeId) return;

        try {
            setLoading(true); // <-- CORRECCIÓN: Iniciar estado de carga
            const res = await API.get(`/timelogs/employee/${employeeId}`);
            setTimeLogs(res.data);
        } catch (error) {
            toast.error(error.response?.data?.message || "No se pudo cargar el historial.");
            if (isClient) navigate('/dashboard-cliente');
            else if (isAuxiliar) navigate('/auxiliar-home');
            else navigate('/login');
        } finally {
            setLoading(false); // <-- CORRECCIÓN: Finalizar estado de carga
        }
    }, [employeeId, navigate, isClient, isAuxiliar]);

    // Bloque 10 REFACTORIZADO: Cargar detalles del empleado, tarifas del cliente y logs en un solo useEffect
    useEffect(() => {
        const fetchData = async () => {
            if (!employeeId) {
                setLoading(false);
                return;
            }

            try {
                // <-- CORRECCIÓN: Se inician todas las cargas
                setLoading(true);

                // Cargar nombre del empleado
                const employeeRes = await API.get(`/employees/${employeeId}`);
                setEmployeeName(employeeRes.data.fullName);

                // Cargar tarifas del cliente asociado
                let clientIdToFetch = null;
                if (isClient && user.profile?._id) {
                    clientIdToFetch = user.profile._id;
                } else if (isAuxiliar && user.associatedClientProfile?._id) {
                    clientIdToFetch = user.associatedClientProfile._id;
                }

                if (clientIdToFetch) {
                    const clientRes = await API.get(`/clients/${clientIdToFetch}`);
                    setDefaultHourlyRateForClient(clientRes.data.defaultHourlyRate?.toString() || '0');
                    setHolidayHourlyRateForClient(clientRes.data.holidayHourlyRate?.toString() || '0');
                }

                // Cargar registros de tiempo
                const logsRes = await API.get(`/timelogs/employee/${employeeId}`);
                setTimeLogs(logsRes.data);

            } catch (error) {
                console.error("Error al cargar datos iniciales:", error);
                toast.error(error.response?.data?.message || "Error al cargar la información inicial.");
                if (isClient) navigate('/dashboard-cliente');
                else if (isAuxiliar) navigate('/auxiliar-home');
                else navigate('/login');
            } finally {
                setLoading(false); // <-- CORRECCIÓN: Finalizar estado de carga
            }
        };

        fetchData();
    }, [employeeId, navigate, isClient, isAuxiliar, user]);

    // Bloque 7: Efecto para Actualizar Cálculos
    useEffect(() => {
        recalculateTotals(formData);
    }, [formData, recalculateTotals]);

    // Bloque Adicional: Establecer el valor por hora dinámicamente y nombre de empresa
    useEffect(() => {
        if (editingLog) return;

        // Lógica para prellenar el nombre de la empresa
        let clientCompanyName = '';
        if (isClient && user.profile?.companyName) {
            clientCompanyName = user.profile.companyName;
        } else if (isAuxiliar && user.associatedClientProfile?.companyName) {
            clientCompanyName = user.associatedClientProfile.companyName;
        }

        // Lógica para establecer la tarifa por hora
        const rateToApply = formData.festivo ? holidayHourlyRateForClient : defaultHourlyRateForClient;

        setFormData(prev => ({
            ...prev,
            empresa: clientCompanyName,
            valorHora: (isAuxiliar || isClient) ? rateToApply : prev.valorHora
        }));
    }, [user, isClient, isAuxiliar, editingLog, formData.festivo, defaultHourlyRateForClient, holidayHourlyRateForClient]);


    // Bloque 8: Efecto para Cargar Datos en Modo Edición
    useEffect(() => {
        if (editingLog) {
            // ... (Tu lógica existente para cargar datos de edición) ...
            const minutosSinPagoNum = parseInt(editingLog.minutosAlmuerzoSinPago, 10) || 0;
            const valorHoraNum = parseFloat(editingLog.valorHora) || 0;
            const almuerzoDescontadoMonetarioCalculado = (isAuxiliar)
                ? (minutosSinPagoNum / 60) * valorHoraNum
                : (parseFloat(editingLog.descuentoAlmuerzo) || 0);

            const rateForEdit = (isAuxiliar || isClient)
                ? (editingLog.festivo ? holidayHourlyRateForClient : defaultHourlyRateForClient)
                : (editingLog.valorHora?.toString() || '0');

            setFormData(prev => ({
                ...prev,
                valorHora: rateForEdit,
                date: new Date(editingLog.date).toISOString().split('T')[0],
                festivo: editingLog.festivo ?? false,
                descuentoAlmuerzo: almuerzoDescontadoMonetarioCalculado.toString(),
                minutosAlmuerzoSinPago: editingLog.minutosAlmuerzoSinPago?.toString() || '0',
                horaInicio: editingLog.horaInicio || '',
                horaFin: editingLog.horaFin || '',
                empresa: editingLog.empresa || '',
                montoPrestamoDeducir: editingLog.totalLoanDeducted?.toString() || '0'
            }));
            recalculateTotals({
                ...editingLog,
                descuentoAlmuerzo: almuerzoDescontadoMonetarioCalculado,
                montoPrestamoDeducir: editingLog.totalLoanDeducted || 0,
                valorHora: (isAuxiliar || isClient)
                    ? (editingLog.festivo ? parseFloat(holidayHourlyRateForClient) : parseFloat(defaultHourlyRateForClient))
                    : parseFloat(editingLog.valorHora || 0)
            });
        }
    }, [editingLog, recalculateTotals, isAuxiliar, isClient, defaultHourlyRateForClient, holidayHourlyRateForClient]);


    // Bloque 11: Manejador de Cambios del Formulario
    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'festivo' && (isAuxiliar || isClient)) {
            const newFestivoStatus = checked;
            const rateToApply = newFestivoStatus ? holidayHourlyRateForClient : defaultHourlyRateForClient;
            setFormData(prev => ({
                ...prev,
                [name]: newFestivoStatus,
                valorHora: rateToApply
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        }
    };

    // Bloque 12: Manejador de Envío del Formulario
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.empresa.trim()) {
            toast.error("Por favor, ingresa el nombre de la empresa/cliente.");
            return;
        }

        const minutosSinPagoNum = parseInt(formData.minutosAlmuerzoSinPago, 10) || 0;
        const valorHoraNum = parseFloat(formData.valorHora) || 0;
        const almuerzoDescontadoMonetario = (isAuxiliar)
            ? (minutosSinPagoNum / 60) * valorHoraNum
            : (parseFloat(formData.descuentoAlmuerzo) || 0);

        const dataToSend = {
            employee: employeeId,
            date: formData.date,
            horaInicio: formData.horaInicio,
            horaFin: formData.horaFin,
            valorHora: valorHoraNum,
            festivo: formData.festivo,
            descuentoAlmuerzo: almuerzoDescontadoMonetario,
            minutosAlmuerzoSinPago: minutosSinPagoNum,
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

            // Reseteamos el formulario y el estado de edición.
            setFormData({
                date: new Date().toISOString().split('T')[0],
                horaInicio: '',
                horaFin: '',
                valorHora: (isAuxiliar || isClient) ? (formData.festivo ? holidayHourlyRateForClient : defaultHourlyRateForClient) : '0',
                festivo: false,
                descuentoAlmuerzo: '0',
                minutosAlmuerzoSinPago: '0',
                empresa: (isAuxiliar && user.associatedClientProfile?.companyName) ? user.associatedClientProfile.companyName :
                    (isClient && user.profile?.companyName) ? user.profile.companyName : '',
                montoPrestamoDeducir: '0'
            });
            setEditingLog(null);

            fetchTimeLogs();

        } catch (err) {
            console.error("Error en handleSubmit:", err);
            toast.error(err.response?.data?.message || 'Error al guardar.');
        }
    };

    // Bloque 13: Manejador de Edición
    const handleEdit = (logToEdit) => {
        const minutosSinPagoNum = parseInt(logToEdit.minutosAlmuerzoSinPago, 10) || 0;
        const valorHoraNum = parseFloat(logToEdit.valorHora) || 0;
        const almuerzoDescontadoMonetarioCalculado = (isAuxiliar)
            ? (minutosSinPagoNum / 60) * valorHoraNum
            : (parseFloat(logToEdit.descuentoAlmuerzo) || 0);
        const logFormatted = {
            ...logToEdit,
            date: new Date(logToEdit.date).toISOString().split('T')[0],
            festivo: logToEdit.festivo ?? false,
            descuentoAlmuerzo: almuerzoDescontadoMonetarioCalculado.toString(),
            minutosAlmuerzoSinPago: logToEdit.minutosAlmuerzoSinPago?.toString() || '0',
            valorHora: (isAuxiliar || isClient) ? (logToEdit.festivo ? holidayHourlyRateForClient : defaultHourlyRateForClient) : (logToEdit.valorHora?.toString() || '0'),
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

    // Bloque 14: Manejador de Eliminación
    const handleDelete = async (logId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            try {
                await API.delete(`/timelogs/${logId}`);
                toast.success('Registro eliminado con éxito.');
                fetchTimeLogs();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al eliminar.');
            }
        }
    };

    // Bloque 15: Renderizado del Componente (JSX)
    return (
        <div className="time-entry-page-wrapper">
            <div className="time-entry-form-wrapper">
                <div className="form-container" ref={formRef}>
                    <h3 className="form-header">Registrar Horario para: {employeeName}</h3>
                    <form onSubmit={handleSubmit}>
                        {/* ... El resto del formulario se mantiene igual ... */}
                        <div className="form-row">
                            <div className="form-group form-group-half">
                                <label>Fecha:</label>
                                <input type="date" name="date" value={formData.date} onChange={handleFormChange} required />
                            </div>
                            <div className="form-group form-group-half">
                                <label>Nombre de la Empresa/Cliente:</label>
                                {(isAuxiliar || isClient) ? (
                                    <input
                                        type="text"
                                        name="empresa"
                                        value={formData.empresa}
                                        readOnly
                                        className="read-only-input"
                                        required
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        name="empresa"
                                        value={formData.empresa}
                                        onChange={handleFormChange}
                                        required
                                        placeholder="Escribe el nombre de la empresa"
                                    />
                                )}
                            </div>
                        </div>
                        <div className="form-row">
                            {!(isAuxiliar || isClient) && (
                                <div className="form-group form-group-half">
                                    <label>Valor por Hora ($):</label>
                                    <input type="number" name="valorHora" value={formData.valorHora} onChange={handleFormChange} required />
                                </div>
                            )}
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
                            {!(isAuxiliar) && (
                                <div className="form-group form-group-half">
                                    <label>Descuento Almuerzo ($):</label>
                                    <input type="number" name="descuentoAlmuerzo" value={formData.descuentoAlmuerzo} onChange={handleFormChange} />
                                </div>
                            )}
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
                        {!(isAuxiliar) && (
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
                        )}
                        <div className="form-group">
                            <button type="submit" className="button-success">Guardar Registro</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Bloque 15: Historial de Registros */}
            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h3>Historial de Registros</h3>
                {/* <-- CORRECCIÓN: Se usa el estado de 'loading' para mostrar el historial */}
                {loading ? (
                    <p>Cargando registros...</p>
                ) : timeLogs.length > 0 ? (
                    <div className="table-responsive-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Empresa</th>
                                    <th>Inicio</th>
                                    <th>Fin</th>
                                    <th>H. Brutas</th>
                                    {!(isAuxiliar) && (
                                        <>
                                            <th>V. Neto Inicial</th>
                                            <th>Deducción</th>
                                            <th>V. Neto Final</th>
                                        </>
                                    )}
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
                                        {!(isAuxiliar) && (
                                            <>
                                                <td>${(log.valorNeto || 0).toLocaleString('es-CO')}</td>
                                                <td>${(log.totalLoanDeducted || 0).toLocaleString('es-CO')}</td>
                                                <td>${((log.valorNeto || 0) - (log.totalLoanDeducted || 0)).toLocaleString('es-CO')}</td>
                                            </>
                                        )}
                                        <td className="action-buttons">
                                            {(isAdmin || ((isClient || isAuxiliar) && !log.isFixed)) && (
                                                <>
                                                    <button className="button-edit" onClick={() => handleEdit(log)}>Editar</button>
                                                    <button className="button-delete" onClick={() => handleDelete(log._id)}>Eliminar</button>
                                                </>
                                            )}
                                            {((isClient || isAuxiliar) && log.isFixed) && (
                                                <span style={{ color: 'gray', fontSize: '0.8em' }}>Fijado</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p>No hay registros para este mensajero.</p>
                )}
            </div>
        </div>
    );
};

// Bloque 16: Exportación del Componente
export default TimeEntriesPage;