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

    // Función para exportar a Excel
    const handleExportExcel = () => {
        if (transactions.length === 0) {
            alert('No hay datos para exportar. Genera el reporte primero.');
            return;
        }

        const excelData = [['FECHA', 'DESCRIPCION', 'VALOR', 'TIPO', 'CEDULA', 'TELEFONO', 'DIRECCION', 'EMAIL']];
        transactions.forEach(item => {
            excelData.push([
                new Date(item.date).toLocaleDateString('es-CO'),
                item.description,
                item.amount,
                item.type === 'income' ? 'Ingreso' : 'Egreso',
                item.cedula || 'N/A',
                item.telefono || 'N/A',
                item.direccion || 'N/A',
                item.email || 'N/A'
            ]);
        });

        excelData.push([]);
        excelData.push(['', 'SALDO FINAL:', saldoFinal, '', '', '', '', '']);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        ws['!cols'] = [{wch: 12}, {wch: 40}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}, {wch: 25}];

        for (let i = 1; i < excelData.length - 2; i++) {
            const valueCellAddress = XLSX.utils.encode_cell({ r: i, c: 2 });
            const typeCellAddress = XLSX.utils.encode_cell({ r: i, c: 3 });
            if (ws[valueCellAddress]) ws[valueCellAddress].z = '#,##0.00';
            if (ws[typeCellAddress] && excelData[i][3] === 'Egreso') {
                ws[valueCellAddress].s = { font: { color: { rgb: "FF0000" } } };
            } else if (ws[typeCellAddress] && excelData[i][3] === 'Ingreso') {
                ws[valueCellAddress].s = { font: { color: { rgb: "008000" } } };
            }
        }
        
        const finalBalanceCellAddress = XLSX.utils.encode_cell({ r: excelData.length - 1, c: 2 });
        if (ws[finalBalanceCellAddress]) {
            ws[finalBalanceCellAddress].z = '#,##0.00';
            ws[finalBalanceCellAddress].s = { font: { bold: true, color: { rgb: saldoFinal >= 0 ? "0000FF" : "FF0000" } } };
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Libro Contable');
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const dataBlob = new Blob([excelBuffer], { type: 'application/octet-stream' });
        saveAs(dataBlob, `Libro_Contable_${startDate}_${endDate}.xlsx`);
    };

    // Renderizado del componente (JSX)
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