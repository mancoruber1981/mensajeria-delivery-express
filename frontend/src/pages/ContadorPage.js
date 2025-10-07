import React, { useState, useEffect, useCallback } from 'react';
import API from '../api/api';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import './ContadorPage.css';

function ContadorPage() {
    // Estados de la página
    const [transactions, setTransactions] = useState([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [totalIngresos, setTotalIngresos] = useState(0);
    const [totalEgresos, setTotalEgresos] = useState(0);
    const [saldoFinal, setSaldoFinal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Función para generar el reporte
    const handleGenerateReport = useCallback(async () => {
        if (!startDate || !endDate) {
            setError("Por favor, selecciona un rango de fechas.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await API.get(
                `/api/admin/accountant-report?startDate=${startDate}&endDate=${endDate}`
            );
            
            const { transactions, totalIncome, totalExpense, finalBalance } = response.data;
            
            setTransactions(transactions);
            setTotalIngresos(totalIncome);
            setTotalEgresos(totalExpense);
            setSaldoFinal(finalBalance);

        } catch (err) {
            console.error('Error al obtener el libro contable unificado:', err);
            const errorMessage = err.response?.data?.message || 'Error al obtener el libro contable. Revisa la consola.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]); // Dependencies for useCallback

    // useEffect para cargar el reporte al abrir la página y al cambiar las fechas
    useEffect(() => {
        if (startDate && endDate) {
            handleGenerateReport();
        }
    }, [startDate, endDate, handleGenerateReport]);

   const handleExportExcel = async () => {
    // 1. Validamos que las fechas estén seleccionadas
    if (!startDate || !endDate) {
        alert('Por favor, selecciona un rango de fechas para exportar.');
        return;
    }

    try {
        // 2. Mostramos un mensaje de espera
        alert('Generando el Reporte Maestro... Esto puede tardar unos segundos.');

        // 3. Hacemos la llamada a la nueva ruta del backend
        const response = await API.get('/api/admin/export-master-report', {
            params: {
                startDate: startDate,
                endDate: endDate
            },
            responseType: 'blob', // Le decimos que esperamos un archivo
        });

        // 4. Usamos la respuesta del backend para crear y descargar el archivo
        const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `Reporte_Maestro_Contable_${startDate}_a_${endDate}.xlsx`);

    } catch (err) {
        // 5. Manejamos cualquier error que ocurra
        console.error('Error al generar el reporte maestro:', err);
        const errorBlob = err.response?.data;
        if (errorBlob && errorBlob.toString() === '[object Blob]') {
            const errorText = await errorBlob.text();
            try {
                const errorJson = JSON.parse(errorText);
                alert(errorJson.message || 'Ocurrió un error en el servidor.');
            } catch (jsonError) {
                alert('Ocurrió un error inesperado al generar el reporte.');
            }
        } else {
            alert(err.response?.data?.message || 'Error al generar el reporte. Revisa la consola.');
        }
    }
};
    return (
        <div className="contador-page-container">
            <h1 className="header">Libro Contable Unificado</h1>
            <div className="date-filter-section">
                <label htmlFor="startDate">Fecha Inicio:</label>
                <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="date-input"
                />
                <label htmlFor="endDate">Fecha Fin:</label>
                <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="date-input"
                />
                <button 
                    onClick={handleGenerateReport}
                    className="generate-button"
                    disabled={loading || !startDate || !endDate}
                >
                    {loading ? 'Cargando...' : 'Generar Reporte'}
                </button>
            </div>
            {error && <div className="error-message">{error}</div>}
            <div className="summary-totals">
                <p>Total Ingresos: <strong>${totalIngresos.toLocaleString('es-CO')}</strong></p>
                <p>Total Egresos: <strong style={{ color: 'red' }}>${totalEgresos.toLocaleString('es-CO')}</strong></p>
                <p>Saldo Final: <strong style={{ color: saldoFinal >= 0 ? 'blue' : 'red' }}>${saldoFinal.toLocaleString('es-CO')}</strong></p>
            </div>
            <h2 className="sub-header">Movimientos del Período</h2>
            {loading ? (
                <p className="loading-message">Cargando datos...</p>
            ) : transactions.length > 0 ? (
                <>
                    <div className="table-responsive-wrapper">
                        <table className="contador-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Descripción</th>
                                    <th>Ingreso</th>
                                    <th>Egreso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, index) => (
                                    <tr key={index}>
                                        <td>{t.date ? new Date(t.date).toLocaleDateString('es-CO') : '-'}</td>
                                        <td>{t.description}</td>
                                        <td className="ingreso-cell">{t.type === 'income' ? `$${t.amount.toLocaleString('es-CO')}` : '-'}</td>
                                        <td className="egreso-cell">{t.type === 'expense' ? `$${t.amount.toLocaleString('es-CO')}` : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button
                        onClick={handleExportExcel}
                        className="export-button"
                        disabled={transactions.length === 0}
                    >
                        Exportar a Excel Contable
                    </button>
                </>
            ) : (
                <p className="no-data-message">Selecciona un rango de fechas y haz clic en "Generar Reporte".</p>
            )}
        </div>
    );
}

export default ContadorPage;