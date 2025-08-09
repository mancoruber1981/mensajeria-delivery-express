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
     // Bloque 3.1 
     return (req, res, next) => { 
         console.log("--- DEBUG: authorizeRoles (Reforzado) ---"); 
         console.log("Roles permitidos:", roles); 
         if (!req.user || !req.user.role) { 
             console.log("¡ADVERTENCIA DEBUG! req.user o req.user.role NO está definido en authorizeRoles."); 
             return res.status(401).json({ message: "No autorizado. Usuario o rol no definido." }); 
         } 
         console.log("Rol del usuario autenticado (req.user.role):", req.user.role); 
         console.log("ID del usuario autenticado (req.user.id):", req.user.id); 
         console.log("--- FIN DEBUGGING (Reforzado) ---"); 

         // Bloque 3.2 
         if (!roles.includes(req.user.role)) { 
             return res.status(403).json({ 
                 message: `El rol '${req.user.role}' no tiene permiso para acceder a esta ruta` 
             }); 
         } 
         next(); 
     }; 
 }; 

 // Bloque 4 
 module.exports = { protect, authorizeRoles };