// backend/routes/upload.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadDocument } = require('../controllers/uploadController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Configuración de almacenamiento para Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Asegúrate de que esta carpeta 'uploads' exista en la raíz de tu carpeta 'backend'
    cb(null, 'backend/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

// Filtro de archivos para aceptar solo imágenes o PDF
const checkFileType = (file, cb) => {
  const filetypes = /jpeg|jpg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Solo se permiten imágenes (JPG, PNG) o PDF!');
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Límite de 5MB
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
});

router.post('/:employeeId', protect, authorizeRoles('admin'), upload.single('document'), uploadDocument);

module.exports = router;
