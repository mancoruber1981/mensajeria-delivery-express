// frontend/src/pages/MyProfilePage.js
import React, { useState, useEffect } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

const MyProfilePage = () => {
    const { user, fetchUser } = useAuth(); // Obtener el usuario del contexto
    const [profileData, setProfileData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [noteText, setNoteText] = useState('');

    useEffect(() => {
        if (user) {
            // El perfil ya viene en el objeto 'user' del contexto
            setProfileData(user.profile);
        }
    }, [user]);

    // Función para manejar cambios en el formulario de edición
    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Función para enviar la actualización del perfil
    const handleSubmitUpdate = async (e) => {
        e.preventDefault();
        try {
            await API.put('/auth/me/profile', profileData); // Enviar solo los campos que pueden editar
            toast.success('Perfil actualizado con éxito.');
            setIsEditing(false);
            // Opcional: recargar el usuario en el contexto si los datos del perfil cambiaron
            // fetchUser(); // Asumiendo que AuthContext tenga una función para recargar el usuario
            window.location.reload(); // Recargar para ver cambios en Navbar
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al actualizar el perfil.');
            console.error('Error al actualizar perfil:', err.response?.data || err.message);
        }
    };

    // Función para fijar el perfil
    const handleFixProfile = async () => {
        if (window.confirm('¿Estás seguro de que quieres fijar tu perfil? Una vez fijado, no podrás modificarlo directamente.')) {
            try {
                await API.put('/auth/me/fix-profile');
                toast.success('Perfil fijado con éxito.');
                // fetchUser();
                window.location.reload();
            } catch (err) {
                toast.error(err.response?.data?.message || 'Error al fijar el perfil.');
                console.error('Error al fijar perfil:', err.response?.data || err.message);
            }
        }
    };

    // Funciones para el modal de notas
    const openNoteModal = () => {
        setNoteText('');
        setShowNoteModal(true);
    };

    const closeNoteModal = () => {
        setShowNoteModal(false);
        setNoteText('');
    };

    const handleSubmitNote = async (e) => {
        e.preventDefault();
        if (!noteText.trim()) {
            toast.warn('La nota no puede estar vacía.');
            return;
        }
        try {
            await API.post('/auth/me/note', { text: noteText });
            toast.success('Nota añadida al perfil con éxito.');
            closeNoteModal();
            // fetchUser();
            window.location.reload();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al añadir nota al perfil.');
            console.error('Error al añadir nota al perfil:', err.response?.data || err.message);
        }
    };

    // Asegurarse de que 'user' y 'profileData' estén cargados y el rol sea gestionable
    if (!user || user.loading || !(user.role === 'repartidor' || user.role === 'cliente')) {
        return <p style={{ textAlign: 'center', marginTop: '50px', color: '#6c757d' }}>Cargando perfil o no tienes permiso para ver esta página.</p>;
    }

    // Determinar los campos a mostrar/editar según el rol
    const isRepartidor = user.role === 'repartidor';
    const isFixed = profileData?.isFixed;

    const displayProfile = isRepartidor ? profileData : profileData; // Simple display for now

    return (
        <div className="container">
            <h2 style={{ color: '#007bff', marginBottom: '20px' }}>Mi Perfil / Mis Datos</h2>
            <p style={{ marginBottom: '30px', color: '#555' }}>
                Aquí puedes gestionar tu información personal. Una vez que tu perfil esté fijado, no podrás modificarlo directamente.
            </p>

            <div className="form-container">
                <h3>{isRepartidor ? 'Datos del Repartidor' : 'Datos del Cliente/Socio'}</h3>
                {profileData ? (
                    <form onSubmit={handleSubmitUpdate}>
                        {isRepartidor ? (
                            <>
                                <div className="form-group">
                                    <label>Nombre Completo:</label>
                                    <input type="text" name="fullName" value={profileData.fullName || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                                <div className="form-group">
                                    <label>Dirección:</label>
                                    <input type="text" name="address" value={profileData.address || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                                <div className="form-group">
                                    <label>Cédula:</label>
                                    <input type="text" name="idCard" value={profileData.idCard || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                                <div className="form-group">
                                    <label>Teléfono:</label>
                                    <input type="text" name="phone" value={profileData.phone || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                                <div className="form-group">
                                    <label>Correo Electrónico:</label>
                                    <input type="email" name="email" value={profileData.email || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                                <div className="form-group">
                                    <label>Horario Asignado:</label>
                                    <input type="text" name="assignedSchedule" value={profileData.assignedSchedule || 'No Asignado'} onChange={handleChange} readOnly={isFixed || !isEditing} />
                                </div>
                            </>
                        ) : ( // Es Cliente
                            <>
                                <div className="form-group">
                                    <label>Nombre Completo del Titular:</label>
                                    <input type="text" name="fullNameHolder" value={profileData.fullNameHolder || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                                <div className="form-group">
                                    <label>Cédula del Titular:</label>
                                    <input type="text" name="idCard" value={profileData.idCard || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                                <div className="form-group">
                                    <label>NIT:</label>
                                    <input type="text" name="nit" value={profileData.nit || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                                <div className="form-group">
                                    <label>Razón Social:</label>
                                    <input type="text" name="companyName" value={profileData.companyName || ''} onChange={handleChange} readOnly={isFixed || !isEditing} required />
                                </div>
                            </>
                        )}

                        <p style={{ marginTop: '15px', fontWeight: 'bold', color: isFixed ? 'red' : 'green' }}>
                            Estado del Perfil: {isFixed ? 'Fijado (No se puede editar directamente)' : 'Abierto (Editable)'}
                        </p>

                        <div className="form-group" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                            {!isFixed && !isEditing && ( // Botón "Editar" solo si no está fijado y no está editando
                                <button type="button" onClick={() => setIsEditing(true)}>Editar Perfil</button>
                            )}
                            {isEditing && ( // Botones de guardar/cancelar al editar
                                <>
                                    <button type="submit" style={{ backgroundColor: '#007bff' }}>Guardar Cambios</button>
                                    <button type="button" onClick={() => { setIsEditing(false); setProfileData(user.profile); }} style={{ backgroundColor: '#6c757d' }}>Cancelar</button>
                                </>
                            )}
                            {!isFixed && !isEditing && ( // Botón "Fijar" solo si no está fijado y no editando
                                <button type="button" onClick={handleFixProfile} style={{ backgroundColor: '#28a745' }}>Fijar Perfil</button>
                            )}
                            <button type="button" onClick={openNoteModal} style={{ backgroundColor: '#17a2b8' }}>Añadir Nota a Perfil</button>
                        </div>
                    </form>
                ) : (
                    <p>Cargando datos del perfil o no hay un perfil asociado a este usuario.</p>
                )}
            </div>

            {/* Modal para Añadir Nota al Perfil */}
            {showNoteModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Añadir Nota al Perfil</h3>
                        <p>Deja una observación o aclaración sobre tu perfil. Esta nota será visible para el administrador y contador.</p>
                        <form onSubmit={handleSubmitNote}>
                            <div className="form-group">
                                <label htmlFor="noteText">Nota:</label>
                                <textarea id="noteText" value={noteText} onChange={(e) => setNoteText(e.target.value)} rows="4" required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}></textarea>
                            </div>
                            <div className="form-group" style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button type="submit">Guardar Nota</button>
                                <button type="button" onClick={closeNoteModal} style={{ backgroundColor: '#6c757d' }}>Cancelar</button>
                            </div>
                        </form>
                        <button className="modal-close-button" onClick={closeNoteModal}>X</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyProfilePage;