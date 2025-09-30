// ====================
// Página: Registro de Horarios por Empleado
// Componente: TimeEntriesPage
// Descripción: Permite registrar y gestionar las horas trabajadas por un empleado, incluyendo horas brutas, descuentos, deducciones y cálculo de valor final.
// ====================

// Bloque 1: Importaciones y Hooks de React
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './TimeEntriesPage.css';

// Bloque 2: Definición del Componente y Estado Inicial
const TimeEntriesPage = () => {
    const { employeeId } = useParams();
    const navigate = useNavigate();
    const formRef = useRef(null);
    const { user } = useAuth();
    
    // ✅ CORRECCIÓN: Declara 'clientRates' primero, antes de usarlo.
    const [clientRates, setClientRates] = useState({ default: '0', holiday: '0' });
    
    // ✅ CORRECCIÓN: Ahora estas variables están definidas correctamente.
    const isAuxiliar = user?.role === 'auxiliar';
    const isClient = user?.role === 'cliente';
    const isAdmin = user?.role === 'admin';
    const defaultHourlyRateForClient = clientRates.default;
    const holidayHourlyRateForClient = clientRates.holiday;

    const [employeeName, setEmployeeName] = useState('Cargando...');
    const [timeLogs, setTimeLogs] = useState([]);
    const [editingLog, setEditingLog] = useState(null);
    const [loading, setLoading] = useState(true);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        horaInicio: '',
        horaFin: '',
        valorHora: '0',
        festivo: false,
        minutosAlmuerzoSinPago: '0',
        empresa: '',
        montoPrestamoDeducir: '0'
    });
    
    const [horasTotales, setHorasTotales] = useState(0); 
    const [subtotal, setSubtotal] = useState(0);
    const [valorNeto, setValorNeto] = useState(0);
    const [valorFinalConDeducciones, setValorFinalConDeducciones] = useState(0);
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [settlementDetails, setSettlementDetails] = useState(null);
    const [deductSS, setDeductSS] = useState(true);

    const handleOpenSettlementModal = async () => {
        setLoading(true);
        try {
            const { data } = await API.get(`/admin/preview-settlement/${employeeId}`);
            setSettlementDetails(data);
            setShowSettlementModal(true);
        } catch (err) {
            toast.error(err.response?.data?.message || "Error al obtener los datos de liquidación.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmSettlement = async () => {
        try {
            setLoading(true);
            const { data } = await API.post(`/admin/settle-fortnight/${employeeId}`, {
                deductSocialSecurity: deductSS
            });
            toast.success(data.message);
            setShowSettlementModal(false);
           fetchData() // Esta función ya existe en tu archivo, así que funcionará
        } catch (err) {
            toast.error(err.response?.data?.message || "Error al confirmar la liquidación.");
        } finally {
            setLoading(false);
        }
    };

// Bloque 3: Función de Recálculo de Totales
    const recalculateTotals = useCallback((data) => {
        const { horaInicio, horaFin, valorHora, descuentoAlmuerzo, minutosAlmuerzoSinPago, montoPrestamoDeducir } = data;
        
        if (horaInicio && horaFin && valorHora) {
            const start = new Date(`1970-01-01T${horaInicio}:00`);
            let end = new Date(`1970-01-01T${horaFin}:00`);
            if (end < start) end.setDate(end.getDate() + 1);
            
            const totalDiffMs = end - start;
            const valorHoraNum = parseFloat(valorHora) || 0;
            
            const totalHoursDecimal = totalDiffMs / (1000 * 60 * 60);
            
            let almuerzoADescontar = 0;
            const minutosSinPagoNum = parseInt(minutosAlmuerzoSinPago, 10) || 0;

            if (isAuxiliar) {
                almuerzoADescontar = (minutosSinPagoNum / 60) * valorHoraNum;
            } else {
                almuerzoADescontar = parseFloat(descuentoAlmuerzo) || 0;
            }
            
            const sub = totalHoursDecimal * valorHoraNum;
            
            const total = sub - almuerzoADescontar;
            
            const prestamoADeducir = parseFloat(montoPrestamoDeducir) || 0;
            const finalValue = total - prestamoADeducir;

            setHorasTotales(totalHoursDecimal); 
            setSubtotal(sub);
            setValorNeto(total);
            setValorFinalConDeducciones(finalValue);
        } else {
            setHorasTotales(0);
            setSubtotal(0);
            setValorNeto(0);
            setValorFinalConDeducciones(0);
        }
    }, [isAuxiliar]);

// Bloque 4: Lógica para Obtener Datos (FetchData)
    const fetchData = useCallback(async () => {
        if (!employeeId || !user) return;
        try {
            setLoading(true);
            const employeeRes = await API.get(`/api/employees/${employeeId}`);
            setEmployeeName(employeeRes.data.fullName);

            const logsRes = await API.get(`/api/timelogs/employee/${employeeId}`);
            setTimeLogs(logsRes.data);

            if (user.role === 'cliente' || user.role === 'auxiliar') {
                const clientId = user.role === 'cliente' ? user.profile._id : user.associatedClient;
                const clientRes = await API.get(`/api/clients/${clientId}`);
                const defaultRate = clientRes.data.defaultHourlyRate?.toString() || '0';
                
                setClientRates({
                    default: defaultRate,
                    holiday: clientRes.data.holidayHourlyRate?.toString() || '0'
                });
                setFormData(prev => ({ ...prev, valorHora: defaultRate, empresa: clientRes.data.companyName }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al cargar datos.");
            navigate(user.role === 'cliente' ? '/dashboard-cliente' : '/login');
        } finally {
            setLoading(false);
        }
    }, [employeeId, user, navigate]);

// Bloque 5: Hooks de Efecto para Cargar Datos y Actualizar Cálculos
    useEffect(() => {
        if (user) fetchData();
    }, [fetchData, user]);

    useEffect(() => {
        recalculateTotals(formData);
    }, [formData, recalculateTotals]);

    useEffect(() => {
        if (editingLog) return;
        let clientCompanyName = '';
        if (isClient && user.profile?.companyName) {
            clientCompanyName = user.profile.companyName;
        } else if (isAuxiliar && user.associatedClientProfile?.companyName) {
            clientCompanyName = user.associatedClientProfile.companyName;
        }
        const rateToApply = formData.festivo ? holidayHourlyRateForClient : defaultHourlyRateForClient;
        setFormData(prev => ({
            ...prev,
            empresa: clientCompanyName,
            valorHora: (isAuxiliar || isClient) ? rateToApply : prev.valorHora
        }));
    }, [user, isClient, isAuxiliar, editingLog, formData.festivo, defaultHourlyRateForClient, holidayHourlyRateForClient]);

// Bloque 6: Lógica para el Modo Edición
    useEffect(() => {
        if (editingLog) {
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

// Bloque 7: Manejador de Cambios del Formulario
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

// Bloque 8: Manejador de Envío del Formulario
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
            horasBrutas: horasTotales,
            subtotal: subtotal,
            valorNeto: valorNeto
        };

        try {
            if (editingLog) {
                await API.put(`/api/timelogs/${editingLog._id}`, dataToSend);
                toast.success('Registro actualizado con éxito');
            } else {
                await API.post('/api/timelogs', dataToSend);
                toast.success('Registro guardado con éxito');
            }
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
            fetchData();
        } catch (err) {
            console.error("Error en handleSubmit:", err);
            toast.error(err.response?.data?.message || 'Error al guardar.');
        }
    };

// Bloque 9: Manejador de Edición de Registros
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

// Bloque 10: Manejador de Eliminación de Registros
    const handleDelete = async (logId) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            try {
                await API.delete(`/api/timelogs/${logId}`);
                toast.success('Registro eliminado con éxito.');
                fetchData(); 
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al eliminar.');
            }
        }
    };

    const totals = timeLogs.reduce((acc, log) => {
        const valorNetoInicial = log.valorNeto || 0;
        const deduccion = log.totalLoanDeducted || 0;
        
        acc.totalValorNeto += valorNetoInicial;
        acc.totalDeducciones += deduccion;
        acc.totalFinal += (valorNetoInicial - deduccion);

        return acc;
    }, {
        totalValorNeto: 0,
        totalDeducciones: 0,
        totalFinal: 0,
    });

// Bloque 11: Renderizado del Componente - Contenedor Principal
    return (
        <div className="time-entry-page-wrapper">
            <div className="time-entry-form-wrapper">
                <div className="form-container" ref={formRef}>
                    <h3 className="form-header">Registrar Horario para: {employeeName}</h3>
                    <form onSubmit={handleSubmit}>

{/* Bloque 12: Campos del Formulario (Fecha, Empresa, Horas) */}
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

{/* Bloque 13: Campos del Formulario (Descuentos y Deducciones) */}
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

{/* Bloque 14: Sección de Cálculos Automáticos */}
                        {!(isAuxiliar) && (
                            <>
                                <h4>Cálculos Automáticos:</h4>
                                <div className="form-row">
                                    <div className="form-group form-group-half">
                                        <label>Horas Brutas:</label>
                                        <input
                                            type="text"
                                            value={`${Math.floor(horasTotales)}:${Math.round((horasTotales - Math.floor(horasTotales)) * 60).toString().padStart(2, '0')}`}
                                            readOnly
                                            className="read-only-input"
                                        />
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

{/* Bloque 15: Sección de Historial de Registros */}
            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h3>Historial de Registros</h3>
                {loading ? (
                    // ✅ CORRECCIÓN: Usando el componente LoadingSpinner para corregir la advertencia de 'no-unused-vars'
                    <LoadingSpinner />
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
                                        <td>
                                            {log.horasBrutas ? `${Math.floor(log.horasBrutas)}:${Math.round((log.horasBrutas - Math.floor(log.horasBrutas)) * 60).toString().padStart(2, '0')}` : 'N/A'}
                                        </td>
                                        {!(isAuxiliar) && (
                                            <>
                                                <td>${(log.valorNeto || 0).toLocaleString('es-CO')}</td>
                                                <td>${(log.totalLoanDeducted || 0).toLocaleString('es-CO')}</td>
                                                <td>${((log.valorNeto || 0) - (log.totalLoanDeducted || 0)).toLocaleString('es-CO')}</td>
                                            </>
                                        )}
                                       <td className="action-buttons">
    {(isClient || isAuxiliar) && (
        <>
            {/* Si el registro NO está pagado, el cliente/auxiliar puede editarlo */}
            {!log.isPaid ? (
                <>
                    <button className="button-edit" onClick={() => handleEdit(log)}>Editar</button>
                    <button className="button-delete" onClick={() => handleDelete(log._id)}>Eliminar</button>
                </>
            ) : (
                /* Si el registro YA está pagado, solo ven una etiqueta y no pueden hacer nada */
                <span className="paid-badge">Liquidado</span>
            )}
        </>
    )}
</td>
                                    </tr>
                                ))}
                            </tbody>

                            {/* ========== INICIO: CÓDIGO A AÑADIR (PASO 2) ========== */}
                            { !isAuxiliar && timeLogs.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan="7" className="summary-label">Suma Valor Neto:</td>
                                        <td className="summary-value">
                                            {totals.totalValorNeto.toLocaleString('es-CO', {
                                                style: 'currency',
                                                currency: 'COP',
                                            })}
                                        </td>
                                        <td></td> {/* Celda vacía para la columna de Acciones */}
                                    </tr>
                                    <tr>
                                        <td colSpan="7" className="summary-label">Suma Deducciones:</td>
                                        <td className="summary-value">
                                            {totals.totalDeducciones.toLocaleString('es-CO', {
                                                style: 'currency',
                                                currency: 'COP',
                                            })}
                                        </td>
                                        <td></td> {/* Celda vacía para la columna de Acciones */}
                                    </tr>
                                    <tr className="total-row">
                                        <td colSpan="7" className="summary-label">Total Final:</td>
                                        <td className="summary-value">
                                            {totals.totalFinal.toLocaleString('es-CO', {
                                                style: 'currency',
                                                currency: 'COP',
                                            })}
                                        </td>
                                        <td></td> {/* Celda vacía para la columna de Acciones */}
                                    </tr>
                                </tfoot>
                            )}
                            {/* ========== FIN: CÓDIGO A AÑADIR (PASO 2) ========== */}

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