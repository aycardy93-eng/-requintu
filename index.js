import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import pool, { checkDatabaseHealth } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET no está definido. Configúralo en el archivo .env antes de iniciar el servidor.');
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Middlewares Globales
// -----------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo' }
});

app.use('/api', apiLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

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
// Middlewares de Autenticación y Autorización
// -----------------------------------------------------------------------------
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado, token requerido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
// Rutas de Autenticación y Perfil
// -----------------------------------------------------------------------------
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;
    const rolesValidos = ['turista', 'comerciante'];
    const rolUsuario = rolesValidos.includes(rol) ? rol : 'turista';

    const [existing] = await pool.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hashedPassword, rolUsuario]
    );

    res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuarioId: result.insertId });
  } catch (err) {
    console.error('Error al registrar el usuario:', err.message);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const payload = { id: user.id_usuario, nombre: user.nombre, rol: user.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: { id: user.id_usuario, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (err) {
    console.error('Error en la autenticación:', err.message);
    res.status(500).json({ error: 'Error en la autenticación' });
  }
});

app.get('/api/perfil', authMiddleware, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id_usuario, nombre, email, rol, fecha_registro FROM usuarios WHERE id_usuario = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(users[0]);
  } catch (err) {
    console.error('Error al obtener perfil:', err.message);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// -----------------------------------------------------------------------------
// Datos Base (Municipios y Categorías)
// -----------------------------------------------------------------------------
app.get('/api/municipios', async (req, res) => {
  try {
    const [municipios] = await pool.query('SELECT * FROM municipios ORDER BY nombre ASC');
    res.json(municipios);
  } catch (err) {
    console.error('Error al obtener municipios:', err.message);
    res.status(500).json({ error: 'Error al obtener municipios' });
  }
});

app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await pool.query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.json(categorias);
  } catch (err) {
    console.error('Error al obtener categorías:', err.message);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// -----------------------------------------------------------------------------
// Mapa: Departamentos y Municipios
// -----------------------------------------------------------------------------
app.get('/api/departamentos', async (req, res) => {
  try {
    const [departamentos] = await pool.query(`
      SELECT departamento, COUNT(*) AS total_municipios
      FROM municipios
      GROUP BY departamento
      ORDER BY departamento ASC
    `);
    res.json({ departamentos });
  } catch (err) {
    console.error('Error al obtener departamentos:', err.message);
    res.status(500).json({ error: 'Error al obtener departamentos' });
  }
});

app.get('/api/departamentos/:nombre/municipios', async (req, res) => {
  try {
    const { nombre } = req.params;
    const [municipios] = await pool.query(
      'SELECT id_municipio, nombre FROM municipios WHERE departamento = ? ORDER BY nombre ASC',
      [nombre]
    );
    res.json({ municipios });
  } catch (err) {
    console.error('Error al obtener municipios:', err.message);
    res.status(500).json({ error: 'Error al obtener municipios' });
  }
});

// -----------------------------------------------------------------------------
// Subida de Archivos
// -----------------------------------------------------------------------------
app.post('/api/upload', authMiddleware, upload.single('imagen'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Por favor selecciona un archivo' });
  }
  res.json({ mensaje: 'Imagen subida correctamente', url: `/uploads/${req.file.filename}` });
});

// -----------------------------------------------------------------------------
// CRUD: Locales
// -----------------------------------------------------------------------------
app.get('/api/locales', async (req, res) => {
  try {
    const { categoria, municipio, buscar } = req.query;
    let query = `
      SELECT l.*, c.nombre AS categoria_nombre, m.nombre AS municipio_nombre, m.departamento
      FROM locales l
      LEFT JOIN categorias c ON l.id_categoria = c.id_categoria
      LEFT JOIN municipios m ON l.id_municipio = m.id_municipio
      WHERE 1=1
    `;
    const params = [];

    if (categoria) {
      query += ' AND l.id_categoria = ?';
      params.push(categoria);
    }
    if (municipio) {
      query += ' AND l.id_municipio = ?';
      params.push(municipio);
    }
    if (buscar) {
      query += ' AND l.nombre LIKE ?';
      params.push(`%${buscar}%`);
    }

    const [locales] = await pool.query(query, params);
    res.json({ locales });
  } catch (err) {
    console.error('Error al obtener locales:', err.message);
    res.status(500).json({ error: 'Error al obtener locales' });
  }
});

app.post('/api/locales', authMiddleware, checkRole(['comerciante', 'admin']), async (req, res) => {
  try {
    const { nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio } = req.body;
    const [result] = await pool.query(
      'INSERT INTO locales (nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, direccion, telefono || null, imagen_url || null, id_categoria, id_municipio, req.user.id]
    );
    res.status(201).json({ mensaje: 'Local creado con éxito', id: result.insertId });
  } catch (err) {
    console.error('Error al crear el local:', err.message);
    res.status(500).json({ error: 'Error al crear el local' });
  }
});

app.get('/api/locales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT l.*, c.nombre AS categoria, m.nombre AS municipio, m.departamento
       FROM locales l
       LEFT JOIN categorias c ON l.id_categoria = c.id_categoria
       LEFT JOIN municipios m ON l.id_municipio = m.id_municipio
       WHERE l.id_local = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }
    res.json({ local: rows[0] });
  } catch (err) {
    console.error('Error al obtener el local:', err.message);
    res.status(500).json({ error: 'Error al obtener el local' });
  }
});

// -----------------------------------------------------------------------------
// Calificaciones
// -----------------------------------------------------------------------------
app.get('/api/locales/:id/calificaciones', async (req, res) => {
  try {
    const { id } = req.params;
    const [calificaciones] = await pool.query(
      `SELECT r.*, u.nombre AS usuario
       FROM calificaciones r
       JOIN usuarios u ON r.id_usuario = u.id_usuario
       WHERE r.id_local = ?
       ORDER BY r.fecha DESC`,
      [id]
    );

    const promedio = calificaciones.length
      ? (calificaciones.reduce((suma, c) => suma + c.puntuacion, 0) / calificaciones.length).toFixed(1)
      : null;

    res.json({ calificaciones, promedio });
  } catch (err) {
    console.error('Error al obtener calificaciones:', err.message);
    res.status(500).json({ error: 'Error al obtener calificaciones' });
  }
});

app.post('/api/locales/:id/calificaciones', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { puntuacion, comentario } = req.body;

    const [localRows] = await pool.query('SELECT id_usuario FROM locales WHERE id_local = ?', [id]);
    if (localRows.length === 0) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }
    if (localRows[0].id_usuario === req.user.id) {
      return res.status(403).json({ error: 'No puedes calificar tu propio local' });
    }

    const [existente] = await pool.query(
      'SELECT id_resena FROM calificaciones WHERE id_local = ? AND id_usuario = ?',
      [id, req.user.id]
    );
    if (existente.length > 0) {
      return res.status(400).json({ error: 'Ya calificaste este local' });
    }

    await pool.query(
      'INSERT INTO calificaciones (id_local, id_usuario, puntuacion, comentario) VALUES (?, ?, ?, ?)',
      [id, req.user.id, puntuacion, comentario || null]
    );
    res.status(201).json({ mensaje: 'Calificación enviada con éxito' });
  } catch (err) {
    console.error('Error al enviar la calificación:', err.message);
    res.status(500).json({ error: 'Error al enviar la calificación' });
  }
});

// -----------------------------------------------------------------------------
// Planes (promociones y eventos de un local)
// -----------------------------------------------------------------------------
app.get('/api/locales/:id/planes', async (req, res) => {
  try {
    const { id } = req.params;
    const [planes] = await pool.query(
      `SELECT * FROM planes WHERE id_local = ? AND fecha_fin >= CURDATE() ORDER BY fecha_inicio ASC`,
      [id]
    );
    res.json({ planes });
  } catch (err) {
    console.error('Error al obtener planes:', err.message);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

const verificarDuenoDelLocal = async (idLocal, userId, rol) => {
  if (rol === 'admin') return true;
  const [rows] = await pool.query('SELECT id_usuario FROM locales WHERE id_local = ?', [idLocal]);
  if (rows.length === 0) return false;
  return rows[0].id_usuario === userId;
};

const verificarPermisoPlan = async (idPlan, req, res, accion) => {
  const [rows] = await pool.query('SELECT id_local FROM planes WHERE id_plan = ?', [idPlan]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Plan no encontrado' });
    return false;
  }
  const autorizado = await verificarDuenoDelLocal(rows[0].id_local, req.user.id, req.user.rol);
  if (!autorizado) {
    res.status(403).json({ error: `No tienes permiso para ${accion} este plan` });
    return false;
  }
  return true;
};

const verificarPermisoPublicacion = async (idPublicacion, req, res, accion) => {
  const [rows] = await pool.query('SELECT usuario_id FROM publicaciones WHERE id = ?', [idPublicacion]);
  if (rows.length === 0) {
    res.status(404).json({ error: 'Publicación no encontrada' });
    return false;
  }
  const esDueño = rows[0].usuario_id === req.user.id;
  if (!esDueño && req.user.rol !== 'admin') {
    res.status(403).json({ error: `No tienes permiso para ${accion} esta publicación` });
    return false;
  }
  return true;
};

app.post('/api/locales/:id/planes', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url } = req.body;

    const autorizado = await verificarDuenoDelLocal(id, req.user.id, req.user.rol);
    if (!autorizado) {
      return res.status(403).json({ error: 'No tienes permiso para crear planes en este local' });
    }

    const [result] = await pool.query(
      'INSERT INTO planes (id_local, titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, titulo, descripcion || null, precio || 0, fecha_inicio, fecha_fin, imagen_url || null]
    );
    res.status(201).json({ mensaje: 'Plan creado con éxito', id: result.insertId });
  } catch (err) {
    console.error('Error al crear el plan:', err.message);
    res.status(500).json({ error: 'Error al crear el plan' });
  }
});

app.put('/api/planes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url } = req.body;

    if (!(await verificarPermisoPlan(id, req, res, 'editar'))) return;

    await pool.query(
      'UPDATE planes SET titulo = ?, descripcion = ?, precio = ?, fecha_inicio = ?, fecha_fin = ?, imagen_url = ? WHERE id_plan = ?',
      [titulo, descripcion || null, precio || 0, fecha_inicio, fecha_fin, imagen_url || null, id]
    );
    res.json({ mensaje: 'Plan actualizado con éxito' });
  } catch (err) {
    console.error('Error al actualizar el plan:', err.message);
    res.status(500).json({ error: 'Error al actualizar el plan' });
  }
});

app.delete('/api/planes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await verificarPermisoPlan(id, req, res, 'eliminar'))) return;

    await pool.query('DELETE FROM planes WHERE id_plan = ?', [id]);
    res.json({ mensaje: 'Plan eliminado con éxito' });
  } catch (err) {
    console.error('Error al eliminar el plan:', err.message);
    res.status(500).json({ error: 'Error al eliminar el plan' });
  }
});

// -----------------------------------------------------------------------------
// CRUD: Publicaciones
// -----------------------------------------------------------------------------
app.get('/api/publicaciones', async (req, res) => {
  try {
    const [publicaciones] = await pool.query(`
      SELECT p.*, u.nombre AS autor 
      FROM publicaciones p 
      JOIN usuarios u ON p.usuario_id = u.id_usuario 
      ORDER BY p.fecha_creacion DESC
    `);
    res.json({ publicaciones });
  } catch (err) {
    console.error('Error al obtener publicaciones:', err.message);
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

app.post('/api/publicaciones', authMiddleware, checkRole(['turista', 'admin']), async (req, res) => {
  try {
    const { contenido, imagen_url } = req.body;

    if (!contenido || !contenido.trim()) {
      return res.status(400).json({ error: 'El contenido es obligatorio' });
    }

    const [result] = await pool.query(
      'INSERT INTO publicaciones (usuario_id, contenido, imagen_url) VALUES (?, ?, ?)',
      [req.user.id, contenido, imagen_url || null]
    );
    res.status(201).json({ mensaje: 'Publicación creada con éxito', id: result.insertId });
  } catch (err) {
    console.error('Error al crear publicación:', err.message);
    res.status(500).json({ error: 'Error al crear publicación' });
  }
});

app.put('/api/publicaciones/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, imagen_url } = req.body;

    if (!(await verificarPermisoPublicacion(id, req, res, 'editar'))) return;

    await pool.query(
      'UPDATE publicaciones SET contenido = ?, imagen_url = ? WHERE id = ?',
      [contenido, imagen_url || null, id]
    );
    res.json({ mensaje: 'Publicación actualizada con éxito' });
  } catch (err) {
    console.error('Error al actualizar publicación:', err.message);
    res.status(500).json({ error: 'Error al actualizar publicación' });
  }
});

app.delete('/api/publicaciones/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!(await verificarPermisoPublicacion(id, req, res, 'eliminar'))) return;

    await pool.query('DELETE FROM publicaciones WHERE id = ?', [id]);
    res.json({ mensaje: 'Publicación eliminada con éxito' });
  } catch (err) {
    console.error('Error al eliminar publicación:', err.message);
    res.status(500).json({ error: 'Error al eliminar publicación' });
  }
});

// -----------------------------------------------------------------------------
// Manejo Global de Errores y Servidor
// -----------------------------------------------------------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El archivo excede el límite de 5MB' });
    }
    return res.status(400).json({ error: err.message });
  }
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function arrancarServidor() {
  try {
    await checkDatabaseHealth();
    app.listen(PORT, () => {
      console.log(`Servidor de Requintu ejecutándose en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor debido a fallos en MySQL.');
    process.exit(1);
  }
}

arrancarServidor();