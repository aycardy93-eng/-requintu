import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './db.js';
import multer from 'multer';
import path from 'path';
import { ALLOWED_ORIGINS, JWT_SECRET, PORT, PUBLIC_URL, ROLES_PERMITIDOS_EN_REGISTRO } from './config.js';

const app = express();

// Responde con un mensaje genérico y registra el detalle solo en el servidor,
// para no filtrar información interna (SQL, rutas, versiones) al cliente.
const errorServidor = (res, error, contexto) => {
  console.error(`[${contexto}]`, error);
  return res.status(500).json({ message: 'Error en el servidor' });
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

const esPuntuacionValida = (valor) => Number.isInteger(Number(valor)) && Number(valor) >= 1 && Number(valor) <= 5;

const comparacionSegura = (a, b) => {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
};
// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const nombreUnico = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname);
    cb(null, nombreUnico);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|webp/;
    const extensionValida = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
    const mimeValido = tiposPermitidos.test(file.mimetype);
    if (extensionValida && mimeValido) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'));
    }
  }
});

// Middleware para procesar JSON en las peticiones
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    return cb(new Error('Origen no autorizado por CORS'));
  }
}));
app.use(express.json({ limit: '100kb' }));
// Servir las imágenes de forma pública
app.use('/uploads', express.static('uploads'));



  // ==========================================
// 2. RUTA DE LOGIN (POST /api/login)
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios.' });
    }

    // 1. Obtener el usuario desde MySQL
    const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    // Mismo mensaje para usuario inexistente y contraseña incorrecta, para no
    // permitir enumerar las cuentas registradas.
    const credencialesInvalidas = () => res.status(401).json({ message: 'Correo o contraseña incorrectos' });

    if (users.length === 0) {
      return credencialesInvalidas();
    }

    // 2. Definir 'user'
    const user = users[0];

    // 3. Validar la contraseña con bcrypt
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return credencialesInvalidas();
    }

    // 4. Generar el Token con los datos del usuario
    const token = jwt.sign(
      { id: user.id_usuario, email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ message: 'Login exitoso', token });
  } catch (error) {
    errorServidor(res, error, 'POST /api/login');
  }
});
// 1. Declaración correcta de authMiddleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}; // <-- Asegúrate de que esta llave cierre la función antes de cualquier return posterior
// Ruta de publicaciones
app.post('/api/publicaciones', authMiddleware, async (req, res) => {
  try {
    const { contenido, imagen_url } = req.body;
    const usuario_id = req.user.id;

    if (!contenido) {
      return res.status(400).json({ message: 'El contenido es obligatorio.' });
    }

    const [result] = await db.query(
      'INSERT INTO publicaciones (usuario_id, contenido, imagen_url) VALUES (?, ?, ?)',
      [usuario_id, contenido, imagen_url || null]
    );

    res.status(201).json({
      message: 'Publicación creada con éxito',
      publicacion: {
        id: result.insertId,
        usuario_id,
        contenido,
        imagen_url: imagen_url || null
      }
    });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// Listar todas las publicaciones (con el nombre del autor)
app.get('/api/publicaciones', async (req, res) => {
  try {
    const [publicaciones] = await db.query(
      `SELECT p.id, p.contenido, p.imagen_url, p.fecha_creacion,
              u.id_usuario, u.nombre AS autor
       FROM publicaciones p
       JOIN usuarios u ON p.usuario_id = u.id_usuario
       ORDER BY p.fecha_creacion DESC`
    );

    res.status(200).json({ publicaciones });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Ver una publicación específica por ID
app.get('/api/publicaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [publicaciones] = await db.query(
      `SELECT p.id, p.contenido, p.imagen_url, p.fecha_creacion,
              u.id_usuario, u.nombre AS autor
       FROM publicaciones p
       JOIN usuarios u ON p.usuario_id = u.id_usuario
       WHERE p.id = ?`,
      [id]
    );

    if (publicaciones.length === 0) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    res.status(200).json({ publicacion: publicaciones[0] });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Ver las publicaciones de un usuario específico
app.get('/api/usuarios/:id/publicaciones', async (req, res) => {
  try {
    const { id } = req.params;

    const [publicaciones] = await db.query(
      `SELECT id, contenido, imagen_url, fecha_creacion
       FROM publicaciones
       WHERE usuario_id = ?
       ORDER BY fecha_creacion DESC`,
      [id]
    );

    res.status(200).json({ publicaciones });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// Editar una publicación (solo el dueño puede editarla)
app.put('/api/publicaciones/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, imagen_url } = req.body;
    const usuario_id = req.user.id;

    // Verificar que la publicación exista y pertenezca al usuario
    const [publicaciones] = await db.query(
      'SELECT * FROM publicaciones WHERE id = ?',
      [id]
    );

    if (publicaciones.length === 0) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    if (publicaciones[0].usuario_id !== usuario_id) {
      return res.status(403).json({ message: 'No tienes permiso para editar esta publicación' });
    }

    if (!contenido) {
      return res.status(400).json({ message: 'El contenido es obligatorio.' });
    }

    await db.query(
      'UPDATE publicaciones SET contenido = ?, imagen_url = ? WHERE id = ?',
      [contenido, imagen_url || null, id]
    );

    res.status(200).json({
      message: 'Publicación actualizada con éxito',
      publicacion: { id: Number(id), usuario_id, contenido, imagen_url: imagen_url || null }
    });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Eliminar una publicación (solo el dueño puede eliminarla)
app.delete('/api/publicaciones/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const usuario_id = req.user.id;

    const [publicaciones] = await db.query(
      'SELECT * FROM publicaciones WHERE id = ?',
      [id]
    );

    if (publicaciones.length === 0) {
      return res.status(404).json({ message: 'Publicación no encontrada' });
    }

    if (publicaciones[0].usuario_id !== usuario_id) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta publicación' });
    }

    await db.query('DELETE FROM publicaciones WHERE id = ?', [id]);

    res.status(200).json({ message: 'Publicación eliminada con éxito' });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// 2. Ruta de publicaciones
app.post('/api/register', async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'El correo no tiene un formato válido.' });
    }

    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });
    }

    // El rol llega del cliente: solo se aceptan roles de autoservicio para que
    // nadie pueda registrarse como 'admin'.
    const rolSolicitado = rol || 'turista';
    if (!ROLES_PERMITIDOS_EN_REGISTRO.includes(rolSolicitado)) {
      return res.status(400).json({ message: 'Rol no válido.' });
    }

    // Verificar si el usuario ya existe
    const [existing] = await db.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'El correo ya está registrado.' });
    }

    // Encriptar la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insertar el nuevo usuario en la base de datos
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
      [nombre, email, hashedPassword, rolSolicitado]
    );

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      usuario: { id: result.insertId, nombre, email, rol: rolSolicitado }
    });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// ==========================================
// RUTAS DE LOCALES
// ==========================================

// Crear un local (solo comerciante o admin)
app.post('/api/locales', authMiddleware, async (req, res) => {
  try {
    const { rol, id: id_usuario } = req.user;

    if (rol !== 'comerciante' && rol !== 'admin') {
      return res.status(403).json({ message: 'No tienes permiso para crear locales' });
    }

    const { nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio } = req.body;

    if (!nombre || !descripcion) {
      return res.status(400).json({ message: 'Nombre y descripción son obligatorios.' });
    }

    const [result] = await db.query(
      `INSERT INTO locales (nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio, id_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, descripcion, direccion || null, telefono || null, imagen_url || null, id_categoria || null, id_municipio || null, id_usuario]
    );

    res.status(201).json({
      message: 'Local creado con éxito',
      local: { id: result.insertId, nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio, id_usuario }
    });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Listar todos los locales (público, con filtros opcionales)
app.get('/api/locales', async (req, res) => {
  try {
    const { categoria, municipio, buscar } = req.query;

    let sql = `
      SELECT l.id_local, l.nombre, l.descripcion, l.direccion, l.telefono, l.imagen_url,
             c.nombre AS categoria, m.nombre AS municipio
      FROM locales l
      LEFT JOIN categorias c ON l.id_categoria = c.id_categoria
      LEFT JOIN municipios m ON l.id_municipio = m.id_municipio
      WHERE 1 = 1
    `;
    const params = [];

    if (categoria) {
      sql += ' AND l.id_categoria = ?';
      params.push(categoria);
    }

    if (municipio) {
      sql += ' AND l.id_municipio = ?';
      params.push(municipio);
    }

    if (buscar) {
      sql += ' AND l.nombre LIKE ?';
      params.push(`%${buscar}%`);
    }

    sql += ' ORDER BY l.nombre ASC';

    const [locales] = await db.query(sql, params);

    res.status(200).json({ total: locales.length, locales });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Ver un local específico (público)
app.get('/api/locales/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [locales] = await db.query(
      `SELECT l.id_local, l.nombre, l.descripcion, l.direccion, l.telefono, l.imagen_url, l.id_usuario,
              c.nombre AS categoria, m.nombre AS municipio
       FROM locales l
       LEFT JOIN categorias c ON l.id_categoria = c.id_categoria
       LEFT JOIN municipios m ON l.id_municipio = m.id_municipio
       WHERE l.id_local = ?`,
      [id]
    );

    if (locales.length === 0) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    res.status(200).json({ local: locales[0] });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Editar un local (solo admin, o el comerciante dueño)
app.put('/api/locales/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rol, id: id_usuario } = req.user;

    const [locales] = await db.query('SELECT * FROM locales WHERE id_local = ?', [id]);

    if (locales.length === 0) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    const esDueno = locales[0].id_usuario === id_usuario;

    if (rol !== 'admin' && !esDueno) {
      return res.status(403).json({ message: 'No tienes permiso para editar este local' });
    }

    const { nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio } = req.body;

    await db.query(
      `UPDATE locales
       SET nombre = ?, descripcion = ?, direccion = ?, telefono = ?, imagen_url = ?, id_categoria = ?, id_municipio = ?
       WHERE id_local = ?`,
      [nombre, descripcion, direccion || null, telefono || null, imagen_url || null, id_categoria || null, id_municipio || null, id]
    );

    res.status(200).json({ message: 'Local actualizado con éxito' });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Eliminar un local (solo admin, o el comerciante dueño)
app.delete('/api/locales/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rol, id: id_usuario } = req.user;

    const [locales] = await db.query('SELECT * FROM locales WHERE id_local = ?', [id]);

    if (locales.length === 0) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    const esDueno = locales[0].id_usuario === id_usuario;

    if (rol !== 'admin' && !esDueno) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este local' });
    }

    await db.query('DELETE FROM locales WHERE id_local = ?', [id]);

    res.status(200).json({ message: 'Local eliminado con éxito' });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// ==========================================
// RUTAS DE CALIFICACIONES
// ==========================================

// Crear una calificación (cualquier usuario logueado, una vez por local)
app.post('/api/locales/:id_local/calificaciones', authMiddleware, async (req, res) => {
  try {
    const { id_local } = req.params;
    const { puntuacion, comentario } = req.body;
    const id_usuario = req.user.id;

    if (!esPuntuacionValida(puntuacion)) {
      return res.status(400).json({ message: 'La puntuación debe ser un número entero entre 1 y 5.' });
    }

    // Verificar que el local exista
    const [locales] = await db.query('SELECT * FROM locales WHERE id_local = ?', [id_local]);
    if (locales.length === 0) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    // Verificar que el usuario no haya calificado ya este local
    const [existente] = await db.query(
      'SELECT * FROM calificaciones WHERE id_local = ? AND id_usuario = ?',
      [id_local, id_usuario]
    );
    if (existente.length > 0) {
      return res.status(400).json({ message: 'Ya has calificado este local.' });
    }

    const [result] = await db.query(
      'INSERT INTO calificaciones (id_local, id_usuario, puntuacion, comentario) VALUES (?, ?, ?, ?)',
      [id_local, id_usuario, puntuacion, comentario || null]
    );

    res.status(201).json({
      message: 'Calificación creada con éxito',
      calificacion: { id: result.insertId, id_local, id_usuario, puntuacion, comentario: comentario || null }
    });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Ver todas las calificaciones de un local (público, con nombre del usuario)
app.get('/api/locales/:id_local/calificaciones', async (req, res) => {
  try {
    const { id_local } = req.params;

    const [calificaciones] = await db.query(
      `SELECT c.id_resena, c.id_usuario, c.puntuacion, c.comentario, c.fecha,
              u.nombre AS usuario
       FROM calificaciones c
       JOIN usuarios u ON c.id_usuario = u.id_usuario
       WHERE c.id_local = ?
       ORDER BY c.fecha DESC`,
      [id_local]
    );

    // Calcular el promedio de puntuación
    const promedio = calificaciones.length > 0
      ? (calificaciones.reduce((sum, c) => sum + c.puntuacion, 0) / calificaciones.length).toFixed(1)
      : null;

    res.status(200).json({ promedio, total: calificaciones.length, calificaciones });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Editar una calificación (solo el autor)
app.put('/api/calificaciones/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { puntuacion, comentario } = req.body;
    const id_usuario = req.user.id;

    const [calificaciones] = await db.query('SELECT * FROM calificaciones WHERE id_resena = ?', [id]);
    if (calificaciones.length === 0) {
      return res.status(404).json({ message: 'Calificación no encontrada' });
    }

    if (calificaciones[0].id_usuario !== id_usuario) {
      return res.status(403).json({ message: 'No tienes permiso para editar esta calificación' });
    }

    if (!esPuntuacionValida(puntuacion)) {
      return res.status(400).json({ message: 'La puntuación debe ser un número entero entre 1 y 5.' });
    }

    await db.query(
      'UPDATE calificaciones SET puntuacion = ?, comentario = ? WHERE id_resena = ?',
      [puntuacion, comentario || null, id]
    );

    res.status(200).json({ message: 'Calificación actualizada con éxito' });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Eliminar una calificación (solo el autor o admin)
app.delete('/api/calificaciones/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: id_usuario, rol } = req.user;

    const [calificaciones] = await db.query('SELECT * FROM calificaciones WHERE id_resena = ?', [id]);
    if (calificaciones.length === 0) {
      return res.status(404).json({ message: 'Calificación no encontrada' });
    }

    if (calificaciones[0].id_usuario !== id_usuario && rol !== 'admin') {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta calificación' });
    }

    await db.query('DELETE FROM calificaciones WHERE id_resena = ?', [id]);

    res.status(200).json({ message: 'Calificación eliminada con éxito' });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// ==========================================
// RUTAS DE PLANES (promociones/eventos con vigencia)
// ==========================================

// Crear un plan para un local (solo el comerciante dueño del local)
app.post('/api/locales/:id_local/planes', authMiddleware, async (req, res) => {
  try {
    const { id_local } = req.params;
    const { id: id_usuario, rol } = req.user;
    const { titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url } = req.body;

    if (!titulo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ message: 'Título, fecha de inicio y fecha de fin son obligatorios.' });
    }

    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({ message: 'La fecha de fin no puede ser anterior a la fecha de inicio.' });
    }

    // Verificar que el local exista y pertenezca al usuario (o sea admin)
    const [locales] = await db.query('SELECT * FROM locales WHERE id_local = ?', [id_local]);
    if (locales.length === 0) {
      return res.status(404).json({ message: 'Local no encontrado' });
    }

    const esDueno = locales[0].id_usuario === id_usuario;
    if (rol !== 'admin' && !esDueno) {
      return res.status(403).json({ message: 'No tienes permiso para crear planes en este local' });
    }

    const [result] = await db.query(
      `INSERT INTO planes (id_local, titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_local, titulo, descripcion || null, precio || null, fecha_inicio, fecha_fin, imagen_url || null]
    );

    res.status(201).json({
      message: 'Plan creado con éxito',
      plan: { id: result.insertId, id_local, titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url }
    });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Listar planes vigentes de un local (público, oculta los vencidos automáticamente)
app.get('/api/locales/:id_local/planes', async (req, res) => {
  try {
    const { id_local } = req.params;

    const [planes] = await db.query(
      `SELECT id_plan, id_local, titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url
       FROM planes
       WHERE id_local = ? AND fecha_fin >= CURDATE()
       ORDER BY fecha_inicio ASC`,
      [id_local]
    );

    res.status(200).json({ planes });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Editar un plan (solo el dueño del local o admin)
app.put('/api/planes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: id_usuario, rol } = req.user;
    const { titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url } = req.body;

    const [planes] = await db.query(
      `SELECT p.*, l.id_usuario AS dueno_local
       FROM planes p
       JOIN locales l ON p.id_local = l.id_local
       WHERE p.id_plan = ?`,
      [id]
    );

    if (planes.length === 0) {
      return res.status(404).json({ message: 'Plan no encontrado' });
    }

    if (rol !== 'admin' && planes[0].dueno_local !== id_usuario) {
      return res.status(403).json({ message: 'No tienes permiso para editar este plan' });
    }

    if (!titulo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ message: 'Título, fecha de inicio y fecha de fin son obligatorios.' });
    }

    if (new Date(fecha_fin) < new Date(fecha_inicio)) {
      return res.status(400).json({ message: 'La fecha de fin no puede ser anterior a la fecha de inicio.' });
    }

    await db.query(
      `UPDATE planes
       SET titulo = ?, descripcion = ?, precio = ?, fecha_inicio = ?, fecha_fin = ?, imagen_url = ?
       WHERE id_plan = ?`,
      [titulo, descripcion || null, precio || null, fecha_inicio, fecha_fin, imagen_url || null, id]
    );

    res.status(200).json({ message: 'Plan actualizado con éxito' });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Eliminar un plan (solo el dueño del local o admin)
app.delete('/api/planes/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: id_usuario, rol } = req.user;

    const [planes] = await db.query(
      `SELECT p.*, l.id_usuario AS dueno_local
       FROM planes p
       JOIN locales l ON p.id_local = l.id_local
       WHERE p.id_plan = ?`,
      [id]
    );

    if (planes.length === 0) {
      return res.status(404).json({ message: 'Plan no encontrado' });
    }

    if (rol !== 'admin' && planes[0].dueno_local !== id_usuario) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar este plan' });
    }

    await db.query('DELETE FROM planes WHERE id_plan = ?', [id]);

    res.status(200).json({ message: 'Plan eliminado con éxito' });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// ==========================================
// RUTAS DE CATEGORÍAS Y MUNICIPIOS
// ==========================================

// Listar todas las categorías
app.get('/api/categorias', async (req, res) => {
  try {
    const [categorias] = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
    res.status(200).json({ categorias });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// Listar todos los municipios
app.get('/api/municipios', async (req, res) => {
  try {
    const [municipios] = await db.query('SELECT * FROM municipios ORDER BY nombre ASC');
    res.status(200).json({ municipios });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// Consultar el perfil propio
app.get('/api/perfil', authMiddleware, async (req, res) => {
  try {
    const [usuarios] = await db.query(
      'SELECT id_usuario, nombre, email, rol, foto_perfil FROM usuarios WHERE id_usuario = ?',
      [req.user.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({ usuario: usuarios[0] });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// Editar el perfil propio
app.put('/api/perfil', authMiddleware, async (req, res) => {
  try {
    const id_usuario = req.user.id;
    const { nombre, email, password, foto_perfil } = req.body;

    if (!nombre || !email) {
      return res.status(400).json({ message: 'Nombre y correo son obligatorios.' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ message: 'El correo no tiene un formato válido.' });
    }

    if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH)) {
      return res.status(400).json({ message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });
    }

    // Verificar que el nuevo email no esté en uso por otro usuario
    const [existente] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND id_usuario != ?',
      [email, id_usuario]
    );
    if (existente.length > 0) {
      return res.status(400).json({ message: 'Ese correo ya está en uso por otro usuario.' });
    }

    if (password) {
      // Si el usuario quiere cambiar también la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await db.query(
        'UPDATE usuarios SET nombre = ?, email = ?, password_hash = ?, foto_perfil = ? WHERE id_usuario = ?',
        [nombre, email, hashedPassword, foto_perfil || null, id_usuario]
      );
    } else {
      // Solo actualizar nombre y correo
      await db.query(
        'UPDATE usuarios SET nombre = ?, email = ?, foto_perfil = ? WHERE id_usuario = ?',
        [nombre, email, foto_perfil || null, id_usuario]
      );
    }

    res.status(200).json({
      message: 'Perfil actualizado con éxito',
      usuario: { id: id_usuario, nombre, email, foto_perfil: foto_perfil || null }
    });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// ==========================================
// RECUPERACIÓN DE CONTRASEÑA (simulada con console.log)
// ==========================================

// 1. Solicitar código de recuperación
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'El correo es obligatorio.' });
    }

    const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    // Respuesta idéntica exista o no la cuenta, para no revelar qué correos
    // están registrados.
    const respuestaGenerica = () => res.status(200).json({
      message: 'Si el correo está registrado, se enviará un código de recuperación.'
    });

    if (users.length === 0) {
      return respuestaGenerica();
    }

    // Código de 6 dígitos generado con un CSPRNG
    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');

    // Expira en 15 minutos
    const expira = new Date(Date.now() + 15 * 60 * 1000);

    await db.query(
      'UPDATE usuarios SET reset_token = ?, reset_token_expira = ? WHERE email = ?',
      [codigo, expira, email]
    );

    // Simulación del envío de correo: nunca en producción, donde escribir el
    // código en los logs equivale a filtrar la credencial de recuperación.
    if (process.env.NODE_ENV !== 'production') {
      console.log('========================================');
      console.log(`Código de recuperación para ${email}: ${codigo}`);
      console.log('Válido por 15 minutos.');
      console.log('========================================');
    }

    respuestaGenerica();
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});

// 2. Confirmar código y definir nueva contraseña
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, codigo, nuevaPassword } = req.body;

    if (!email || !codigo || !nuevaPassword) {
      return res.status(400).json({ message: 'Correo, código y nueva contraseña son obligatorios.' });
    }

    if (typeof nuevaPassword !== 'string' || nuevaPassword.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` });
    }

    const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

    const codigoInvalido = () => res.status(400).json({ message: 'Código inválido o expirado.' });

    if (users.length === 0) {
      return codigoInvalido();
    }

    const user = users[0];

    if (!user.reset_token || !user.reset_token_expira || new Date() > new Date(user.reset_token_expira)) {
      return codigoInvalido();
    }

    if (!comparacionSegura(user.reset_token, codigo)) {
      return codigoInvalido();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(nuevaPassword, salt);

    await db.query(
      'UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_token_expira = NULL WHERE email = ?',
      [hashedPassword, email]
    );

    res.status(200).json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión con tu nueva clave.' });
  } catch (error) {
    errorServidor(res, error, `${req.method} ${req.originalUrl}`);
  }
});
// ==========================================
// SUBIR IMAGEN (POST /api/upload)
// ==========================================
app.post('/api/upload', authMiddleware, upload.single('imagen'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se envió ninguna imagen.' });
  }
  const imagen_url = `${PUBLIC_URL}/uploads/${req.file.filename}`;
  res.status(200).json({ message: 'Imagen subida con éxito', imagen_url });
});

// Manejo de errores de multer (tipo de archivo inválido, tamaño excedido, etc.)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Error al subir archivo: ${err.message}` });
  }
  if (err && err.message === 'Origen no autorizado por CORS') {
    return res.status(403).json({ message: err.message });
  }
  if (err) {
    console.error('[error no controlado]', err);
    return res.status(400).json({ message: 'Solicitud inválida' });
  }
  next();
});
// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

