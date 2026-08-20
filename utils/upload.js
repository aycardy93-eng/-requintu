import multer from 'multer';
import path from 'path';

const TIPOS_PERMITIDOS = /jpeg|jpg|png|webp/;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, nombreUnico);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5MB
  fileFilter: (req, file, cb) => {
    const extensionValida = TIPOS_PERMITIDOS.test(path.extname(file.originalname).toLowerCase());
    const mimeValido = TIPOS_PERMITIDOS.test(file.mimetype);
    if (extensionValida && mimeValido) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
  }
});

// Traduce los errores de multer (tipo inválido, tamaño excedido, etc.) a respuestas 400.
export const manejarErroresDeSubida = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
