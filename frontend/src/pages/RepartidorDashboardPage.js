// fronted/src/RepartidorDashboardPage/pagina espejo para ver los registros del repartidor
// ==================== BLOQUE 1: Importaciones y Funciones Auxiliares ====================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../index.css';
import './RepartidorDashboardPage.css';

// Esta función auxiliar se mantiene para formatear la visualización
const formatHoursAndMinutes = (decimalHours) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// **Aquí va la nueva función**
const parse12HourTime = (timeString) => {
    if (!timeString) return null;
    const [time, period] = timeString.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period && period.toLowerCase() === 'p.m.' && hours !== 12) {
        hours += 12;
    } else if (period && period.toLowerCase() === 'a.m.' && hours === 12) {
        hours = 0;
    }
    return { hours, minutes };
}


// ==================== BLOQUE 2: Componente Principal, Hooks y Estado Inicial ====================
const RepartidorDashboardPage = () => {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const { user, loading: authLoading } = useAuth();
    const { employeeId } = useParams();
    const [viewingAsAdmin, setViewingAsAdmin] = useState(false);
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [settlementDetails, setSettlementDetails] = useState(null);
    const [deductSS, setDeductSS] = useState(true); // Checkbox para Seguridad Social
    const [loading, setLoading] = useState(false); // ✅ AÑADE ESTA LÍNEA

    // Función que se llama al presionar "Liquidar Quincena"
    const handleOpenSettlementModal = async () => {
    setLoading(true); // Muestra un indicador de carga general
    try {
        // 1. Pide al backend un cálculo previo de la liquidación (activamos la llamada)
        const { data } = await API.get(`/admin/preview-settlement/${employeeId}`);

        // 2. Guardamos los detalles en el estado para que el modal los pueda usar
        setSettlementDetails(data);
        
        // 3. Ahora que tenemos los datos, mostramos el modal
        setShowSettlementModal(true);

    } catch (err) {
        toast.error(err.response?.data?.message || "Error al obtener los datos de liquidación.");
    } finally {
        setLoading(false); // Ocultamos el indicador de carga, tanto si hay éxito como si hay error
    }
};

    // Función que se llama al confirmar desde el modal
    const handleConfirmSettlement = async () => {
    try {
        setLoading(true);
        // ✅ VERIFICA QUE LA URL ES EXACTAMENTE ESTA
        const { data } = await API.post(`/admin/settle-fortnight/${employeeId}`, {
            deductSocialSecurity: deductSS
        });
        toast.success(data.message);
        setShowSettlementModal(false);
        fetchRepartidorData();
    } catch (err) {
        toast.error(err.response?.data?.message || "Error al confirmar la liquidación.");
    } finally {
        setLoading(false);
    }
};

    const isAdminView = user?.role === 'admin' && employeeId;
    const targetEmployeeId = isAdminView ? employeeId : user?.profile?._id;

    // Bloque 2.2
    const [employeeName, setEmployeeName] = useState('Cargando...');
    const [repartidorBalance, setRepartidorBalance] = useState(0); // ✅ Estado para el balance
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


// ==================== BLOQUE 3: Lógica de Recálculo de Totales (useCallback) ====================
    const recalculateTotals = useCallback((data) => {
        const { horaInicio, horaFin, valorHora, minutosAlmuerzoSinPago, montoPrestamoDeducir } = data;

        if (horaInicio && horaFin && valorHora) {
            const [startHours, startMinutes] = horaInicio.split(':').map(Number);
            const [endHours, endMinutes] = horaFin.split(':').map(Number);

            let totalMinutesBrutos = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
            if (totalMinutesBrutos < 0) {
                totalMinutesBrutos += 24 * 60;
            }

            const minutosSinPagoNum = parseInt(minutosAlmuerzoSinPago, 10) || 0;
            const valorHoraNum = parseFloat(valorHora) || 0;
            const prestamoADeducir = parseFloat(montoPrestamoDeducir) || 0;

            const totalMinutesNetos = totalMinutesBrutos - minutosSinPagoNum;
            const valorNetoCalculado = (totalMinutesNetos / 60) * valorHoraNum;
            const subtotalCalculado = (totalMinutesBrutos / 60) * valorHoraNum;
            const finalValue = valorNetoCalculado - prestamoADeducir;
            const horasBrutasFormato = formatHoursAndMinutes(totalMinutesBrutos / 60);

            return {
                minutosBrutos: totalMinutesBrutos,
                horasBrutas: horasBrutasFormato,
                subtotal: subtotalCalculado,
                valorNeto: valorNetoCalculado,
                valorFinalConDeducciones: finalValue
            };
        } else {
            return {
                minutosBrutos: 0,
                horasBrutas: '00:00',
                subtotal: 0,
                valorNeto: 0,
                valorFinalConDeducciones: 0
            };
        }
    }, []);


// ==================== BLOQUE 4: useEffect para Actualizar Cálculos ====================
    useEffect(() => {
        const results = recalculateTotals(formData);
        setHorasBrutas(results.horasBrutas);
        setSubtotal(results.subtotal);
        setValorNeto(results.valorNeto);
        setValorFinalConDeducciones(results.valorFinalConDeducciones);
    }, [formData, recalculateTotals]);


// ==================== BLOQUE 5: useEffect para Editar Registros ====================
    useEffect(() => {
        if (editingLog) {
            const logFormatted = {
                ...editingLog,
                valorHora: editingLog.valorHora?.toString() || '0',
                date: new Date(editingLog.date).toISOString().split('T')[0],
                festivo: editingLog.festivo ?? false,
                descuentoAlmuerzo: editingLog.descuentoAlmuerzo?.toString() || '0',
                minutosAlmuerzoSinPago: editingLog.minutosAlmuerzoSinPago?.toString() || '0',
                horaInicio: editingLog.horaInicio || '',
                horaFin: editingLog.horaFin || '',
                empresa: editingLog.empresa || '',
                montoPrestamoDeducir: editingLog.totalLoanDeducted?.toString() || '0'
            };
            setFormData(logFormatted);
        }
    }, [editingLog]);


// ==================== BLOQUE 6: Fetch de Datos del Repartidor (Centralizado y CORREGIDO) ====================
    const fetchRepartidorData = useCallback(async () => {
        setPageLoading(true);
        setError(null);

        let currentTargetEmployeeId;
        if (isAdminView) {
            currentTargetEmployeeId = employeeId;
            setViewingAsAdmin(true);
        } else {
            currentTargetEmployeeId = user?.profile?._id;
        }

        if (!user || !currentTargetEmployeeId) {
            setError('No se pudo determinar el ID del empleado o el perfil del usuario.');
            setPageLoading(false);
            return;
        }

        try {
            let employeeDisplayName = '';
            let currentBalance = 0;

            if (isAdminView) {
                const employeeRes = await API.get(`/employees/${currentTargetEmployeeId}`);
                employeeDisplayName = employeeRes.data.fullName || 'Empleado Desconocido';
                currentBalance = employeeRes.data.currentBalance;
            } else {
                employeeDisplayName = user.profile?.fullName || user.username;
                currentBalance = user.profile?.currentBalance || 0;
            }

            setEmployeeName(employeeDisplayName);
            setRepartidorBalance(currentBalance);
            const res = await API.get(`/timelogs/employee/${currentTargetEmployeeId}`);
            setTimeLogs(res.data);
        } catch (err) {
            console.error("ERROR al cargar datos del repartidor:", err.response?.data?.message || err.message);
            setError(err.response?.data?.message || "Error al cargar los datos del repartidor.");
            toast.error(err.response?.data?.message || "Error al cargar los datos del repartidor.");
        } finally {
            setPageLoading(false);
        }
    }, [user, employeeId, isAdminView]);


// ==================== BLOQUE 7: useEffect para Cargar Datos Iniciales ====================
    useEffect(() => {
        if (!authLoading) {
            fetchRepartidorData();
        }
    }, [authLoading, fetchRepartidorData]);


// ==================== BLOQUE 8: Manejador de Cambios de Formulario ====================
    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };


// ==================== BLOQUE 9: Manejador de Envío de Formulario (handleSubmit) ====================
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

        const calculatedValues = recalculateTotals(formData);

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

            horasBrutas: calculatedValues.minutosBrutos / 60,
            subtotal: calculatedValues.subtotal,
            valorNeto: calculatedValues.valorNeto,
            valorNetoFinal: calculatedValues.valorFinalConDeducciones,
        };

        try {
            if (editingLog && editingLog._id) {
                await API.put(`/timelogs/${editingLog._id}`, dataToSend);
                toast.success('Registro actualizado con éxito');
            } else {
                await API.post('/timelogs', dataToSend);
                toast.success('Registro guardado con éxito');
            }

            fetchRepartidorData();

            setEditingLog(null);
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
        } catch (err) {
            console.error("Error en handleSubmit:", err.response?.data?.message || err.message);
            toast.error(err.response?.data?.message || 'Error al guardar.');
        }
    };


// ==================== BLOQUE 10: Manejadores de Acciones de la Tabla (handleEdit y handleDelete) ====================
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
        formRef?.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    };

    const handleDelete = async (logId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            try {
                await API.delete(`/timelogs/${logId}`);
                toast.success('Registro eliminado con éxito.');
                fetchRepartidorData();
            } catch (err) {
                // ...
            }
        }
    };


// ==================== BLOQUE 11: Manejadores de Liquidación y Pago ====================
    const handlePaid = async (logId) => {
        if (user?.role !== 'admin') {
            toast.error("Acceso denegado. Solo los administradores pueden marcar registros como pagados.");
            return;
        }

        if (window.confirm('¿Estás seguro de que quieres marcar este registro como PAGADO?')) {
            try {
                await API.put(`/timelogs/mark-paid/${logId}`);
                toast.success('Registro marcado como pagado con éxito.');
                fetchRepartidorData();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al marcar como pagado.');
            }
        }
    };

    const handleSettleEmployee = async (employeeId, employeeName) => {
        if (window.confirm(`¿Estás seguro de que quieres liquidar la quincena completa para ${employeeName}?`)) {
            try {
                toast.info('Procesando liquidación individual...');
                const { data } = await API.post(`/admin/settle-fortnight/${employeeId}`);
                toast.success(data.message);
                
                fetchRepartidorData(); 
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al procesar la liquidación.');
            }
        }
    };


// ==================== BLOQUE 12: Lógica de Renderizado Condicional ====================
    if (pageLoading) return <LoadingSpinner />;
    if (error) return <div className="error-message">Error: {error}</div>;

    if (user?.role !== 'repartidor' && !(user?.role === 'admin' && employeeId)) {
        return <div className="error-message">Acceso denegado.</div>;
    }


// ==================== BLOQUE 13: Renderizado JSX del Componente ====================
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
                                    <input type="text" value={`$ ${subtotal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="read-only-input" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Valor Neto Inicial ($):</label>
                                <input type="text" value={`$ ${valorNeto.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="read-only-input" />
                            </div>
                            <div className="form-group">
                                <label>Valor Neto Final ($):</label>
                                <input type="text" value={`$ ${valorFinalConDeducciones.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} readOnly className="read-only-input" />
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
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px' }}>
                    <h3>
                        {viewingAsAdmin ? `Historial de Registros de ${employeeName}` : "Mi Historial de Registros"}
                    </h3>
                    {viewingAsAdmin && (
                        <button 
                            onClick={handleOpenSettlementModal} 
                            className="btn btn-danger" 
                            style={{ marginTop: '10px' }}
                        >
                            Liquidar Quincena de {employeeName}
                        </button>
                    )}
                </div>

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
                                {timeLogs.map(log => {
                                    const valorNetoInicial = log.valorNeto || 0;
                                    const deduccion = log.totalLoanDeducted || 0;
                                    const valorNetoFinal = valorNetoInicial - deduccion;
                                    const horasBrutasFormateadas = formatHoursAndMinutes(log.horasBrutas);
                                    return (
                                        <tr key={log._id} className={log.isPaid ? 'paid-row' : ''}>
                                            <td>{new Date(log.date).toLocaleDateString('es-CO', { timeZone: 'UTC' })}</td>
                                            <td>{log.empresa || 'N/A'}</td>
                                            <td>{log.horaInicio}</td>
                                            <td>{log.horaFin}</td>
                                            <td>{horasBrutasFormateadas}</td>
                                            <td>${valorNetoInicial.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td>${deduccion.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td>${valorNetoFinal.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="action-buttons">
                                                {user?.role === 'admin'? (
                                                    <>
                                                        <button className="button-edit" onClick={() => handleEdit(log)}>Editar</button>
                                                        <button className="button-delete" onClick={() => handleDelete(log._id)}>Eliminar</button>
                                                        <button className="btn-pagado" onClick={() => handlePaid(log._id)}>Pagado</button>
                                                    </>
                                                ) : user?.role === 'repartidor' && !log.isFixed ? (
                                                    <>
                                                        <button className="button-edit" onClick={() => handleEdit(log)}>Editar</button>
                                                        <button className="button-delete" onClick={() => handleDelete(log._id)}>Eliminar</button>
                                                    </>
                                                ) : (
                                                    <span className="paid-label">Pagado</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p>No hay registros personales aún.</p>
                    )}
                </div>
            </div>

            {showSettlementModal && settlementDetails && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Confirmar Liquidación para {employeeName}</h3>
                        <hr />
                        <p><strong>Total Bruto a Pagar:</strong> ${settlementDetails.grossTotal.toLocaleString('es-CO')}</p>
                        <p><strong>Descuento Préstamo:</strong> - ${settlementDetails.loanRepayment.toLocaleString('es-CO')}</p>
                        <label style={{ display: 'flex', alignItems: 'center', margin: '15px 0' }}>
                            <input 
                                type="checkbox" 
                                checked={deductSS} 
                                onChange={() => setDeductSS(!deductSS)}
                                style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                            />
                            Descontar Seguridad Social (${settlementDetails.socialSecurityDeduction.toLocaleString('es-CO')})
                        </label>
                        <hr/>
                        <h4 style={{ textAlign: 'right' }}>
                            Total Final a Pagar: 
                            <strong>
                                ${ (settlementDetails.grossTotal - settlementDetails.loanRepayment - (deductSS ? settlementDetails.socialSecurityDeduction : 0)).toLocaleString('es-CO') }
                            </strong>
                        </h4>
                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setShowSettlementModal(false)} className="btn">Cancelar</button>
                            <button onClick={handleConfirmSettlement} className="btn btn-success">Confirmar y Liquidar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RepartidorDashboardPage;