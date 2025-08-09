// backend/utils/generateToken.js
import jwt from 'jsonwebtoken';

/**
 * @description Genera un JSON Web Token (JWT) para un ID de usuario.
 * @param {string} id - El ID del usuario.
 * @returns {string} El token JWT generado.
 */
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', // Tiempo de expiración del token (ej. 30 días)
    });
};

export default generateToken;