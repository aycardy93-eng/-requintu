import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jwt-simple';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_123';

// -----------------------------------------------------------------------------
// Middlewares Globales
// -----------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------------------------------------------------------------
// Configuración de Multer (Subida de Archivos)
// -----------------------------------------------------------------------------
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp/;
  const allowedMimeTypes = /image\/(jpeg|jpg|png|webp)/;

  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedMimeTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }
  cb(new Error('Solo se permiten imágenes (JPEG, JPG, PNG, WEBP)'));
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
  fileFilter
});

// -----------------------------------------------------------------------------
// Conexión a MongoDB
// -----------------------------------------------------------------------------
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/turismo_db')
  .then(() => console.log('Conectado exitosamente a MongoDB'))
  .catch((err) => console.error('Error conectando a MongoDB:', err));

// -----------------------------------------------------------------------------
// Modelos Mongoose
// -----------------------------------------------------------------------------
const userSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['turista', 'comerciante', 'admin'], default: 'turista' }
}, { timestamps: true });

const localSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  categoria: { type: String, required: true },
  descripcion: String,
  direccion: String,
  imagen: String,
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const publicacionSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  contenido: { type: String, required: true },
  imagen: String,
  localId: { type: mongoose.Schema.Types.ObjectId, ref: 'Local' },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const calificacionSchema = new mongoose.Schema({
  puntuacion: { type: Number, required: true, min: 1, max: 5 },
  comentario: String,
  localId: { type: mongoose.Schema.Types.ObjectId, ref: 'Local', required: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Local = mongoose.model('Local', localSchema);
const Publicacion = mongoose.model('Publicacion', publicacionSchema);
const Calificacion = mongoose.model('Calificacion', calificacionSchema);

// -----------------------------------------------------------------------------
// Middlewares de Autenticación y Autorización
// -----------------------------------------------------------------------------
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado, token requerido' });
  }

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'No tienes permisos para realizar esta acción' });
    }
    next();
  };
};

// -----------------------------------------------------------------------------
// Rutas de Autenticación
// -----------------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password } = req.body; // Se excluye rol del body por seguridad

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      nombre,
      email,
      password: hashedPassword,
      rol: 'turista' // Rol asignado por defecto de forma segura
    });

    await newUser.save();
    res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar el usuario', detalles: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const payload = {
      id: user._id,
      nombre: user.nombre,
      rol: user.rol
    };

    const token = jwt.encode(payload, JWT_SECRET);
    res.json({ token, user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ error: 'Error en la autenticación', detalles: err.message });
  }
});

// -----------------------------------------------------------------------------
// Ruta para Subida de Archivos
// -----------------------------------------------------------------------------
app.post('/api/upload', authMiddleware, upload.single('imagen'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Por favor selecciona un archivo' });
  }
  // Se usa ruta relativa para compatibilidad en producción
  res.json({ url: `/uploads/${req.file.filename}` });
});

// -----------------------------------------------------------------------------
// CRUD: Locales
// -----------------------------------------------------------------------------
app.get('/api/locales', async (req, res) => {
  try {
    const locales = await Local.find().populate('usuarioId', 'nombre email');
    res.json(locales);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener locales', detalles: err.message });
  }
});

app.post('/api/locales', authMiddleware, checkRole(['comerciante', 'admin']), async (req, res) => {
  try {
    const nuevoLocal = new Local({
      ...req.body,
      usuarioId: req.user.id
    });
    await nuevoLocal.save();
    res.status(201).json(nuevoLocal);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el local', detalles: err.message });
  }
});

// -----------------------------------------------------------------------------
// CRUD: Publicaciones
// -----------------------------------------------------------------------------
app.get('/api/publicaciones', async (req, res) => {
  try {
    const publicaciones = await Publicacion.find()
      .populate('usuarioId', 'nombre')
      .populate('localId', 'nombre');
    res.json(publicaciones);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener publicaciones', detalles: err.message });
  }
});

app.post('/api/publicaciones', authMiddleware, async (req, res) => {
  try {
    const nuevaPublicacion = new Publicacion({
      ...req.body,
      usuarioId: req.user.id
    });
    await nuevaPublicacion.save();
    res.status(201).json(nuevaPublicacion);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear publicación', detalles: err.message });
  }
});

app.delete('/api/publicaciones/:id', authMiddleware, async (req, res) => {
  try {
    const publicacion = await Publicacion.findById(req.params.id);
    if (!publicacion) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    if (publicacion.usuarioId.toString() !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No autorizado para eliminar esta publicación' });
    }

    await publicacion.deleteOne();
    res.json({ mensaje: 'Publicación eliminada correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar publicación', detalles: err.message });
  }
});

// -----------------------------------------------------------------------------
// CRUD: Calificaciones
// -----------------------------------------------------------------------------
app.get('/api/calificaciones/local/:localId', async (req, res) => {
  try {
    const calificaciones = await Calificacion.find({ localId: req.params.localId })
      .populate('usuarioId', 'nombre');
    res.json(calificaciones);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener calificaciones', detalles: err.message });
  }
});

app.post('/api/calificaciones', authMiddleware, async (req, res) => {
  try {
    const nuevaCalificacion = new Calificacion({
      ...req.body,
      usuarioId: req.user.id
    });
    await nuevaCalificacion.save();
    res.status(201).json(nuevaCalificacion);
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar la calificación', detalles: err.message });
  }
});

// -----------------------------------------------------------------------------
// Middleware Global de Manejo de Errores para Multer
// -----------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'El archivo excede el límite permitido de 5MB' });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

// -----------------------------------------------------------------------------
// Inicio del Servidor
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});