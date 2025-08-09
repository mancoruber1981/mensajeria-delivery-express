import React, { useState, useEffect } from 'react';
import '../index.css';

const EditTimeLogModal = ({ log, onClose, onSave }) => {
  const [formData, setFormData] = useState(log);

  useEffect(() => {
    if (log) {
      setFormData({
        ...log,
        date: new Date(log.date).toISOString().split('T')[0],
      });
    }
  }, [log]);

  // ✅ NUEVO: Este método faltaba
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData); // Esto llama a handleSave() en TimeEntriesPage
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  if (!log) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close-button" onClick={onClose}>×</button>
        <h3>Editando Registro de Horario</h3>

        {/* ✅ El formulario ahora dispara handleSubmit */}
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group form-group-half">
              <label>Fecha:</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group form-group-half">
              <label>Valor por Hora ($):</label>
              <input
                type="number"
                name="valorHora"
                value={formData.valorHora}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group form-group-half">
              <label>Hora Inicio:</label>
              <input
                type="time"
                name="horaInicio"
                value={formData.horaInicio}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group form-group-half">
              <label>Hora Fin:</label>
              <input
                type="time"
                name="horaFin"
                value={formData.horaFin}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <button type="submit" className="button-success">
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTimeLogModal;