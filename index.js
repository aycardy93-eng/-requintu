import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool, { checkDatabaseHealth } from './db.js';

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
    const rolUsuario = rol || 'turista';

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
    res.status(500).json({ error: 'Error al registrar el usuario', detalles: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [users] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const payload = { id: user.id_usuario, nombre: user.nombre, rol: user.rol };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: { id: user.id_usuario, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (err) {
    res.status(500).json({ error: 'Error en la autenticación', detalles: err.message });
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
    res.status(500).json({ error: 'Error al obtener perfil', detalles: err.message });
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
    res.status(500).json({ error: 'Error al obtener municipios', detalles: err.message });
  }
});

app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await pool.query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías', detalles: err.message });
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
    res.status(500).json({ error: 'Error al obtener departamentos', detalles: err.message });
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
    res.status(500).json({ error: 'Error al obtener municipios', detalles: err.message });
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
      SELECT l.*, c.nombre AS categoria_nombre, m.nombre AS municipio_nombre 
      FROM locales l
      LEFT JOIN categorias c ON l.categoria_id = c.id
      LEFT JOIN municipios m ON l.municipio_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (categoria) {
      query += ' AND l.categoria_id = ?';
      params.push(categoria);
    }
    if (municipio) {
      query += ' AND l.municipio_id = ?';
      params.push(municipio);
    }
    if (buscar) {
      query += ' AND l.nombre LIKE ?';
      params.push(`%${buscar}%`);
    }

    const [locales] = await pool.query(query, params);
    res.json(locales);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener locales', detalles: err.message });
  }
});

app.post('/api/locales', authMiddleware, checkRole(['comerciante', 'admin']), async (req, res) => {
  try {
    const { nombre, descripcion, direccion, imagen, categoria_id, municipio_id } = req.body;
    const [result] = await pool.query(
      'INSERT INTO locales (nombre, descripcion, direccion, imagen, categoria_id, municipio_id, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nombre, descripcion, direccion, imagen, categoria_id, municipio_id, req.user.id]
    );
    res.status(201).json({ mensaje: 'Local creado con éxito', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear el local', detalles: err.message });
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
      JOIN usuarios u ON p.usuario_id = u.id 
      ORDER BY p.created_at DESC
    `);
    res.json(publicaciones);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener publicaciones', detalles: err.message });
  }
});

app.post('/api/publicaciones', authMiddleware, async (req, res) => {
  try {
    const { titulo, contenido, imagen, local_id } = req.body;
    const [result] = await pool.query(
      'INSERT INTO publicaciones (titulo, contenido, imagen, local_id, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [titulo, contenido, imagen, local_id || null, req.user.id]
    );
    res.status(201).json({ mensaje: 'Publicación creada con éxito', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: 'Error al crear publicación', detalles: err.message });
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
  res.status(500).json({ error: err.message || 'Error interno del servidor' });
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