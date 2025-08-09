// backend/utils/profileUtils.js
import Employee from '../models/Employee.js';
import Client from '../models/Client.js';

/**
 * @description Busca y devuelve el perfil (Empleado o Cliente) asociado a un usuario.
 * @param {object} user - El objeto de usuario (generalmente de req.user).
 * @throws {Error} Si el perfil no se encuentra o el rol no es válido para tener un perfil.
 * @returns {Promise<object>} El documento del perfil encontrado (un documento de Mongoose).
 */
export const findUserProfile = async (user) => {
    const { _id, role } = user;
    let ProfileModel;

    // Determina qué modelo de perfil usar basado en el rol del usuario
    if (role === 'repartidor') {
        ProfileModel = Employee;
    } else if (role === 'cliente') {
        ProfileModel = Client;
    } else {
        // Si el rol no tiene un perfil de este tipo, lanzamos un error de permiso.
        const error = new Error('Este rol no tiene un perfil gestionable.');
        error.statusCode = 403; // Forbidden
        throw error;
    }

    // Busca el perfil asociado al ID del usuario
    const profile = await ProfileModel.findOne({ user: _id });

    // Si no se encuentra ningún perfil, lanzamos un error.
    if (!profile) {
        const error = new Error(`Perfil de ${role} no encontrado.`);
        error.statusCode = 404; // Not Found
        throw error;
    }

    return profile;
};