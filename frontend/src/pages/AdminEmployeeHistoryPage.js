// ====================
// Página: Historial de Empleado (Vista de Administrador)
// Componente: AdminEmployeeHistoryPage
// Descripción: Permite al administrador ver, registrar, editar y liquidar los horarios de un repartidor específico.
// ====================

// Bloque 1: Importaciones y Funciones Auxiliares
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import API from '../api/api';
import LoadingSpinner from '../components/LoadingSpinner';
import '../index.css';
import './RepartidorDashboardPage.css';


const formatHoursAndMinutes = (decimalHours) => {
    if (typeof decimalHours !== 'number' || isNaN(decimalHours)) return '0:00';
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

// Bloque 2: Componente Principal y Estado Inicial
const AdminEmployeeHistoryPage = () => {
    const navigate = useNavigate();
    const formRef = useRef(null);
    const { user, loading: authLoading } = useAuth();
    const { employeeId } = useParams();

// Declara la variable aquí
    let dashboardTitle = 'Vista de Usuario'; //
    
if (user) {
    if (user.role === 'admin') {
        dashboardTitle = 'Vista de Administrador';
    } else if (user.role === 'repartidor') {
        dashboardTitle = 'Vista de Repartidor';
    } else if (user.role === 'auxiliar') {
        dashboardTitle = 'Vista de Auxiliar';
    } else if (user.role === 'cliente') {
        dashboardTitle = 'Vista de Cliente';
    } else {
        dashboardTitle = 'Vista de Usuario Desconocido';
    }
}
    

    // Bloque 3: Estados del Componente
    const [isAuxiliar, setIsAuxiliar] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isRepartidor, setIsRepartidor] = useState(false);
    const [defaultHourlyRateForClient, setDefaultHourlyRateForClient] = useState('0');
    const [holidayHourlyRateForClient, setHolidayHourlyRateForClient] = useState('0');
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
        descuentoAlmuerzo: '0',
        minutosAlmuerzoSinPago: '0',
        empresa: '',
        montoPrestamoDeducir: '0'
    });
    // ✅ Renombramos 'horasBrutas' a 'horasNetas' y creamos una nueva para el total
    const [horasTotales, setHorasTotales] = useState(0); 
    const [subtotal, setSubtotal] = useState(0);
    const [valorNeto, setValorNeto] = useState(0);
    const [valorFinalConDeducciones, setValorFinalConDeducciones] = useState(0);
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [settlementDetails, setSettlementDetails] = useState(null);
    const [deductSS, setDeductSS] = useState(true);
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [includeSSInReport, setIncludeSSInReport] = useState(true);

    // Bloque 6: Función de Recálculo de Totales (Lógica Corregida)
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

            // ✅ Establecemos las horas totales antes de la deducción de minutos
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

    // Bloque 9: Función para Obtener Registros de Tiempo
    const fetchTimeLogs = useCallback(async () => {
        if (!employeeId) return;
        try {
            setLoading(true);
            const res = await API.get(`/api/timelogs/employee/${employeeId}`);
            setTimeLogs(res.data);
        } catch (error) {
            toast.error(error.response?.data?.message || "No se pudo cargar el historial.");
            if (isClient) navigate('/dashboard-cliente');
            else if (isAuxiliar) navigate('/auxiliar-home');
            else navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [employeeId, navigate, isClient, isAuxiliar]);

    // Bloque 10 REFACTORIZADO: Cargar detalles del empleado, tarifas del cliente y logs en un solo useEffect
useEffect(() => {
    // Si no hay un ID de empleado, no hacemos nada.
    if (!employeeId) return;

    // 1. Ponemos los roles basados en el usuario
    if (user) {
        setIsAuxiliar(user.role === 'auxiliar');
        setIsClient(user.role === 'cliente');
        setIsAdmin(user.role === 'admin');
        setIsRepartidor(user.role === 'repartidor');
    }

    // 2. Definimos la función para cargar los datos del empleado.
    const fetchData = async () => {
        setLoading(true);
        console.log("Intentando cargar historial para el ID:", employeeId);

        try {
            const employeeRes = await API.get(`/api/employees/${employeeId}`);
            setEmployeeName(employeeRes.data.fullName);
            const logsRes = await API.get(`/api/timelogs/employee/${employeeId}`);
            setTimeLogs(logsRes.data);
        } catch (error) {
            console.error("¡La petición a la API falló!", error);
            toast.error("Error al cargar el historial del empleado.");
            navigate('/admin/employees'); 
        } finally {
            setLoading(false); 
        }
    };
    
    fetchData();

}, [employeeId]);

    // Bloque 7: Efecto para Actualizar Cálculos
    useEffect(() => {
        recalculateTotals(formData);
    }, [formData, recalculateTotals]);

    // Bloque Adicional: Establecer el valor por hora dinámicamente y nombre de empresa
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

    // Bloque 8: Efecto para Cargar Datos en Modo Edición
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

    // Bloque 12: Manejador de Envío del Formulario (Ahora envía todos los datos)
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
            // ✅ Envía 'horasTotales' al backend
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
                await API.delete(`/api/timelogs/${logId}`);
                toast.success('Registro eliminado con éxito.');
                fetchTimeLogs();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al eliminar.');
            }
        }
    };

    const handleOpenSettlementModal = async () => {
        setLoading(true);
        try {
            const { data } = await API.get(`/api/admin/preview-settlement/${employeeId}`);
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
            const { data } = await API.post(`/api/admin/settle-fortnight/${employeeId}`, {
                deductSocialSecurity: deductSS
            });
            toast.success(data.message);
            setShowSettlementModal(false);
            fetchTimeLogs(); // Llama a la función de refresco de este archivo
        } catch (err) {
            toast.error(err.response?.data?.message || "Error al confirmar la liquidación.");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsPaid = async (logId) => {
        if (!window.confirm('¿Estás seguro de que quieres marcar este registro como pagado?')) return;
        try {
           await API.put(`/api/timelogs/mark-paid/${logId}`);
            toast.success('Registro marcado como pagado.');
            fetchTimeLogs(); // Recargamos los datos para que se actualice la vista
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al marcar como pagado.');
        }
    };

    // Función para liquidar todos los registros pendientes del empleado
    const handleSettleFortnight = async () => {
    const unpaidLogs = timeLogs.filter(log => !log.isPaid);
    if (unpaidLogs.length === 0) {
        toast.info('No hay registros pendientes para liquidar.');
        return;
    }

    if (!window.confirm(`¿Estás seguro de que quieres liquidar ${unpaidLogs.length} registros pendientes para ${employeeName}? Esta acción no se puede deshacer.`)) return;

    try {
        // ========== LA LÍNEA CORREGIDA ESTÁ AQUÍ ==========
        await API.post(`/api/admin/settle-fortnight/${employeeId}`);
        // =================================================

        toast.success(`Quincena de ${employeeName} liquidada con éxito.`);
        fetchTimeLogs(); // Recargamos para ver todos los registros como pagados
    } catch (err) {
        toast.error(err.response?.data?.message || 'Error al liquidar la quincena.');
    }
};

     if (loading || authLoading) {
    return <LoadingSpinner />;
}

const calculateTotals = (logs) => {
    // Si no hay registros, devolvemos los totales en cero.
    if (!logs || !Array.isArray(logs)) {
        return { grandTotal: 0, pendingTotal: 0 };
    }

    // Función auxiliar para obtener el valor final real de un registro (Neto - Deducción de Préstamo)
    const getFinalValue = (log) => {
        const valorNeto = log.valorNeto || 0;
        const deduccion = log.totalLoanDeducted || 0;
        return valorNeto - deduccion;
    };

    // 1. Total General Histórico: Suma el valor final de TODOS los registros.
    const grandTotal = logs.reduce((acc, log) => acc + getFinalValue(log), 0);

    // 2. Total Pendiente por Pagar: Filtra los que NO están pagados (`!isPaid`) y LUEGO los suma.
    const pendingTotal = logs
        .filter(log => !log.isPaid)
        .reduce((acc, log) => acc + getFinalValue(log), 0);

    return {
        grandTotal,
        pendingTotal,
    };
};

    const totals = calculateTotals(timeLogs);

// --- NUEVA FUNCIÓN PARA GENERAR Y DESCARGAR EL REPORTE ---
const handleGenerateReport = async () => {
    if (!reportStartDate || !reportEndDate) {
        toast.error("Por favor, selecciona una fecha de inicio y de fin.");
        return;
    }
    setIsGeneratingReport(true);
    try {
        const response = await API.get(`/api/admin/employee/${employeeId}/settlement-report`, {
            params: {
                startDate: reportStartDate,
                endDate: reportEndDate,
                includeSS: includeSSInReport // <-- PARÁMETRO NUEVO
            },
            responseType: 'blob',
        });

        // Lógica para descargar el archivo
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        const contentDisposition = response.headers['content-disposition'];
        let fileName = `Reporte_${employeeName}.xlsx`; // Nombre por defecto
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
            if (fileNameMatch && fileNameMatch.length > 1) {
                fileName = fileNameMatch[1];
            }
        }
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        toast.success("¡Reporte generado con éxito!");

    } catch (err) {
        // Lógica mejorada para leer el mensaje de error del backend si lo hay
        if (err.response && err.response.data && err.response.data.toString() === '[object Blob]') {
            const errorBlob = err.response.data;
            const errorText = await errorBlob.text();
            try {
                const errorJson = JSON.parse(errorText);
                toast.error(errorJson.message || 'Error al generar el reporte.');
            } catch (jsonError) {
                toast.error('Ocurrió un error inesperado al procesar el reporte.');
            }
        } else {
             toast.error(err.response?.data?.message || 'Error al generar el reporte.');
        }
    } finally {
        setIsGeneratingReport(false);
    }
};

    // Línea para filtrar los registros no pagados
const unpaidLogs = timeLogs.filter(log => !log.isPaid);


    // Bloque 15: Renderizado del Componente (JSX)
    return (
        <div className="time-entry-page-wrapper">
            <div className="time-entry-form-wrapper">
                <div className="form-container" ref={formRef}>
                    <h3 className="form-header">{dashboardTitle}: {employeeName}</h3>
                    <form onSubmit={handleSubmit}>
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
                                        <input
                                            type="text"
                                            // ✅ Usamos 'horasTotales' para la visualización de las horas brutas
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

            {/* Bloque 15: Historial de Registros */}
            <div className="dashboard-card" style={{ marginTop: '2rem' }}>
                <h3>Historial de Registros</h3>
                {isAdmin && unpaidLogs.length > 0 && (
        <div style={{ textAlign: 'center', margin: '15px 0' }}>
            <button className="button-settle" onClick={handleOpenSettlementModal}>
                Liquidar Quincena de {employeeName}
            </button>
        </div>
    )}

    {/* --- SECCIÓN PARA GENERAR REPORTE --- */}
<div className="report-generator-box" style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', margin: '20px 0', backgroundColor: '#f9f9f9' }}>
    <h4>Generar Reporte de Liquidación</h4>
    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div className="form-group">
            <label>Fecha de Inicio:</label>
            <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} />
        </div>
        <div className="form-group">
            <label>Fecha de Fin:</label>
            <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} />
        </div>
    </div>
    {/* --- NUEVO CHECKBOX AÑADIDO --- */}
    <div className="form-group" style={{marginTop: '15px', textAlign: 'center'}}>
        <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
            <input 
                type="checkbox" 
                checked={includeSSInReport} 
                onChange={(e) => setIncludeSSInReport(e.target.checked)}
                style={{ marginRight: '8px', transform: 'scale(1.2)' }}
            />
            Incluir Descuento de Seguridad Social en el Reporte
        </label>
    </div>
    <div style={{textAlign: 'center', marginTop: '15px'}}>
        <button onClick={handleGenerateReport} className="button-success" disabled={isGeneratingReport}>
            {isGeneratingReport ? 'Generando...' : 'Generar Excel'}
        </button>
    </div>
</div>
{/* --- FIN DE LA SECCIÓN DEL REPORTE --- */}
    {/* ========== FIN: CÓDIGO A AÑADIR (PASO 2) ========== */}

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
                                        {/* ✅ Formato para mostrar el valor numérico como HH:mm */}
                                        <td>
                                            {log.horasBrutas ? formatHoursAndMinutes(log.horasBrutas) : 'N/A'}
                                        </td>
                                        {!(isAuxiliar) && (
                                            <>
                                                <td>${(log.valorNeto || 0).toLocaleString('es-CO')}</td>
                                                <td>${(log.totalLoanDeducted || 0).toLocaleString('es-CO')}</td>
                                                <td>${((log.valorNeto || 0) - (log.totalLoanDeducted || 0)).toLocaleString('es-CO')}</td>
                                            </>
                                        )}
                                        <td className="action-buttons">
    {isAdmin ? (
        // --- VISTA PARA EL ADMIN (CON BOTONES SIEMPRE ACTIVOS) ---
        <>
            {/* Estos dos botones SIEMPRE están visibles para el admin */}
            <button className="button-edit" onClick={() => handleEdit(log)}>Editar</button>
            <button className="button-delete" onClick={() => handleDelete(log._id)}>Eliminar</button>

            {/* Este botón o etiqueta cambia según el estado de pago */}
            {!log.isPaid ? (
                <button className="button-paid" onClick={() => handleMarkAsPaid(log._id)}>Pagado</button>
            ) : (
                <span className="paid-badge">Liquidado</span>
            )}
        </>

    ) : isRepartidor ? (
        // --- VISTA PARA EL REPARTIDOR (SE MANTIENE IGUAL) ---
        <>
            {log.isPaid ? (
                <span className="paid-badge">Pagado</span>
            ) : (
                <span style={{ color: 'gray', fontSize: '0.8em' }}>Pendiente</span>
            )}
        </>

    ) : (
        // --- VISTA PARA OTROS ROLES (SE MANTIENE IGUAL) ---
        <>
            {(isClient || isAuxiliar) && !log.isFixed && (
                 <button className="button-edit" onClick={() => handleEdit(log)}>Editar</button>
            )}
            {(isClient || isAuxiliar) && log.isFixed && (
                <span style={{ color: 'gray', fontSize: '0.8em' }}>Fijado</span>
            )}
        </>
    )}
</td>

                                    </tr>
                                ))}
                            </tbody>

                                {/* ========== INICIO: CÓDIGO A AGREGAR (NUEVA VERSIÓN) ========== */}
                                                               { !isAuxiliar && timeLogs.length > 0 && (
                                    // REEMPLAZA TU <tfoot> CON ESTE:
<tfoot>
    <tr style={{ backgroundColor: '#fffbe6', borderTop: '2px solid #ccc' }}>
        {/* Este colSpan se ajusta para alinear los totales a la derecha */}
        <td colSpan="8" style={{ fontWeight: 'bold', textAlign: 'right', padding: '10px' }}>
            TOTAL PENDIENTE POR PAGAR:
        </td>
        <td style={{ fontWeight: 'bold', padding: '10px' }}>
            {totals.pendingTotal.toLocaleString('es-CO', {
                style: 'currency', currency: 'COP', minimumFractionDigits: 0
            })}
        </td>
        <td></td> {/* Celda vacía para la columna de Acciones */}
    </tr>
    <tr style={{ backgroundColor: '#f8f9fa' }}>
        <td colSpan="8" style={{ textAlign: 'right', padding: '8px' }}>
            Total General Histórico:
        </td>
        <td style={{ padding: '8px' }}>
            {totals.grandTotal.toLocaleString('es-CO', {
                style: 'currency', currency: 'COP', minimumFractionDigits: 0
            })}
        </td>
        <td></td> {/* Celda vacía para la columna de Acciones */}
    </tr>
</tfoot>
                                )}

                                {/* ========== FIN: CÓDIGO A AGREGAR (NUEVA VERSIÓN) ========== */}

                            </table>
                        
                    </div>
                ) : (
                    <p>No hay registros para este mensajero.</p>
                )}
            </div>
{/* ✅ AÑADE EL CÓDIGO DEL MODAL AQUÍ */}
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
                        <button onClick={handleConfirmSettlement} className="button-success">Confirmar y Liquidar</button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
};

// Bloque 16: Exportación del Componente
export default AdminEmployeeHistoryPage;