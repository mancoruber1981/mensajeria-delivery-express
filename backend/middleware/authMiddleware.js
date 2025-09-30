//backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');

// Bloque 2 
 const protect = asyncHandler(async (req, res, next) => { 
     console.log("--- DEBUG: protect (Entrada de Función) ---"); 
     let token; 

     // Bloque 2.1 
     if ( 
         req.headers.authorization && 
         req.headers.authorization.startsWith('Bearer') 
     ) { 
         try { 
             // Bloque 2.2 
             token = req.headers.authorization.split(' ')[1]; 
             console.log("DEBUG: Token extraído:", token ? "OK" : "Vacío"); 
             const decoded = jwt.verify(token, process.env.JWT_SECRET); 
             console.log("DEBUG: Token decodificado. Payload:", decoded); // Mejor log para ver todo el contenido 

             // --- INICIO DE LA CORRECCIÓN CLAVE --- 
             // Bloque 2.3 (Ahora busca por decoded.id o decoded._id) 
             const userId = decoded.id || decoded._id; 
             if (!userId) { 
                 throw new Error('El token no contiene un ID de usuario válido.'); 
             } 
             req.user = await User.findById(userId).select('-password'); 
             // --- FIN DE LA CORRECCIÓN CLAVE --- 

             // Bloque 2.4 
             if (!req.user) { 
                 res.status(401); 
                 throw new Error('Usuario no encontrado'); 
             } 

             console.log("DEBUG: Usuario autenticado encontrado. Rol:", req.user.role); 
             console.log("DEBUG: Usuario autenticado _id:", req.user._id); 

             next(); 

         } catch (error) { 
             // Bloque 2.5 (mejorado) 
             console.error("ERROR en protect (catch):", error.message); 

             if (error.name === 'TokenExpiredError') { 
                 return res.status(401).json({ message: 'Token expirado, por favor vuelve a iniciar sesión.' }); 
             } 

             return res.status(401).json({ message: 'No autorizado, token falló' }); 
         } 
     } else { 
         // Bloque 2.6 
         console.log("DEBUG: No hay token en headers."); 
         res.status(401); 
         throw new Error('No autorizado, no hay token'); 
     } 

     console.log("--- DEBUG: protect (Fin, si next() fue llamado) ---"); 
 }); 

 // Bloque 3 
 const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        console.log('--- DEBUG: Verificando Permisos ---');
        console.log('Roles permitidos para esta ruta:', roles);
        
        if (!req.user || !req.user.role) {
            console.error('ERROR DEBUG: El usuario o su rol no están definidos en este punto.');
            return res.status(401).json({ message: "No se pudo verificar el rol del usuario." });
        }

        console.log('Usuario que intenta acceder (obtenido por el token):', req.user.username);
        console.log(`Rol del usuario: '${req.user.role}'`);

        const hasPermission = roles.includes(req.user.role);
        console.log(`¿Está el rol '${req.user.role}' en la lista [${roles}]?:`, hasPermission);

        if (!hasPermission) {
            console.error('--- DEBUG: Permiso DENEGADO. ---');
            return res.status(403).json({
                message: `El rol '${req.user.role}' no tiene permiso para acceder a esta ruta.`
            });
        }
        
        console.log('--- DEBUG: Permiso CONCEDIDO. ---');
        next();
    };
}; 

 // Bloque 4 
 module.exports = { protect, authorizeRoles };