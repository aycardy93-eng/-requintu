import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { v2 as cloudinary } from 'cloudinary';
import pool, { checkDatabaseHealth } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const esProduccion = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('JWT_SECRET no está definido. Configúralo en el archivo .env antes de iniciar el servidor.');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.get('/api/debug/cloudinary', (req, res) => {
  res.json({
    cloud_name: CLOUD_NAME ? 'OK' : 'FALTA',
    api_key: CLOUD_API_KEY ? 'OK' : 'FALTA',
    api_secret: CLOUD_API_SECRET ? 'OK' : 'FALTA',
  });
});

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUD_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUD_API_SECRET = process.env.CLOUDINARY_API_SECRET;
console.log('Cloudinary config:', CLOUD_NAME ? 'OK' : 'FALTA', CLOUD_API_KEY ? 'OK' : 'FALTA', CLOUD_API_SECRET ? 'OK' : 'FALTA');

// -----------------------------------------------------------------------------
// Middlewares Globales
// -----------------------------------------------------------------------------
if (esProduccion) {
  app.set('trust proxy', 1);
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true }
}));

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'https://requintu.vercel.app',
  ...((process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean))
]);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

if (esProduccion) {
  app.use((req, res, next) => {
    if (req.secure) {
      return next();
    }
    res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
  });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_API_MAX) || 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_AUTH_MAX) || 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos antes de volver a intentarlo' }
});

app.use('/api', apiLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

const validar = (validaciones) => [
  ...validaciones,
  (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
      return res.status(400).json({ error: errores.array()[0].msg });
    }
    next();
  }
];

// -----------------------------------------------------------------------------
// Configuración de Multer (Subida de Archivos)
// -----------------------------------------------------------------------------
const storage = multer.memoryStorage();

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
// Refresh Tokens (cookie httpOnly)
// -----------------------------------------------------------------------------
const COOKIE_OPCIONES = {
  httpOnly: true,
  secure: esProduccion,
  sameSite: 'lax',
  path: '/api/auth'
};

const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

async function emitirRefreshToken(idUsuario, res) {
  const token = crypto.randomBytes(64).toString('hex');
  await pool.query(
    'INSERT INTO refresh_tokens (id_usuario, token_hash, expira_en) VALUES (?, ?, ?)',
    [idUsuario, hashRefreshToken(token), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
  );
  res.cookie('refresh_token', token, { ...COOKIE_OPCIONES, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

// -----------------------------------------------------------------------------
// Rutas de Autenticación y Perfil
// -----------------------------------------------------------------------------
app.post('/api/register', validar([
  body('nombre').trim().isLength({ min: 2, max: 60 }).withMessage('El nombre debe tener entre 2 y 60 caracteres'),
  body('email').trim().isEmail().withMessage('Correo electrónico inválido'),
  body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
]), async (req, res) => {
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

app.post('/api/login', validar([
  body('email').trim().notEmpty().withMessage('El usuario o correo es obligatorio'),
  body('password').notEmpty().withMessage('La contraseña es obligatoria')
]), async (req, res) => {
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
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    await emitirRefreshToken(user.id_usuario, res);

    res.json({ token, user: { id: user.id_usuario, nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch (err) {
    console.error('Error en la autenticación:', err.message);
    res.status(500).json({ error: 'Error en la autenticación' });
  }
});

app.post('/api/auth/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) {
      return res.status(401).json({ error: 'No hay sesión para renovar' });
    }

    await pool.query('DELETE FROM refresh_tokens WHERE expira_en < NOW()');

    const [filas] = await pool.query(
      'SELECT id, id_usuario FROM refresh_tokens WHERE token_hash = ? AND revocado = 0 AND expira_en > NOW()',
      [hashRefreshToken(token)]
    );
    if (filas.length === 0) {
      res.clearCookie('refresh_token', COOKIE_OPCIONES);
      return res.status(401).json({ error: 'Sesión inválida o expirada' });
    }

    const [usuarios] = await pool.query(
      'SELECT id_usuario, nombre, email, rol FROM usuarios WHERE id_usuario = ?',
      [filas[0].id_usuario]
    );
    if (usuarios.length === 0) {
      res.clearCookie('refresh_token', COOKIE_OPCIONES);
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    await pool.query('UPDATE refresh_tokens SET revocado = 1 WHERE id = ?', [filas[0].id]);
    await emitirRefreshToken(usuario.id_usuario, res);

    const nuevoToken = jwt.sign(
      { id: usuario.id_usuario, nombre: usuario.nombre, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ token: nuevoToken, user: { id: usuario.id_usuario, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });
  } catch (err) {
    console.error('Error al renovar la sesión:', err.message);
    res.status(500).json({ error: 'Error al renovar la sesión' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      await pool.query('UPDATE refresh_tokens SET revocado = 1 WHERE token_hash = ?', [hashRefreshToken(token)]);
    }
    res.clearCookie('refresh_token', COOKIE_OPCIONES);
    res.json({ mensaje: 'Sesión cerrada con éxito' });
  } catch (err) {
    console.error('Error al cerrar la sesión:', err.message);
    res.status(500).json({ error: 'Error al cerrar la sesión' });
  }
});

// -----------------------------------------------------------------------------
// Recuperación de contraseña
// -----------------------------------------------------------------------------
const transportadorCorreo = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }
    })
  : null;

app.post('/api/forgot-password', authLimiter, validar([
  body('email').isEmail().withMessage('Debes proporcionar un correo válido').normalizeEmail()
]), async (req, res) => {
  const { email } = req.body;

  try {
    const [usuarios] = await pool.query(
      'SELECT id_usuario FROM usuarios WHERE email = ?',
      [email]
    );

    if (usuarios.length > 0) {
      await pool.query('DELETE FROM password_resets WHERE expira_en < NOW()');

      const token = crypto.randomBytes(32).toString('hex');
      await pool.query(
        'INSERT INTO password_resets (id_usuario, token_hash, expira_en) VALUES (?, ?, ?)',
        [usuarios[0].id_usuario, hashRefreshToken(token), new Date(Date.now() + 60 * 60 * 1000)]
      );

      if (transportadorCorreo) {
        const enlace = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
        await transportadorCorreo.sendMail({
          from: `"Requintu" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Recupera tu contraseña - Requintu',
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #0284c7;">¿Olvidaste tu contraseña?</h2>
              <p>Hola, recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Requintu</strong>.</p>
              <p style="text-align: center; margin: 25px 0;">
                <a href="${enlace}"
                   style="background: #ccff00; color: #0284c7; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                  Restablecer contraseña
                </a>
              </p>
              <p style="color: #666; font-size: 13px;">Este enlace expira en <strong>1 hora</strong> y solo puede usarse una vez.</p>
              <p style="color: #666; font-size: 13px;">Si no solicitaste este cambio, ignora este mensaje y tu contraseña seguirá siendo la misma.</p>
            </div>
          `
        });
      } else {
        console.warn(`EMAIL_USER/EMAIL_PASSWORD no configurados. Token de reset generado para ${email} pero no enviado por correo.`);
      }
    }

    res.json({
      mensaje: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'
    });
  } catch (err) {
    console.error('Error al procesar la recuperación:', err.message);
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
});

app.post('/api/reset-password', authLimiter, validar([
  body('token').isString().trim().isLength({ min: 64, max: 64 }).withMessage('Enlace inválido'),
  body('password').isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres')
]), async (req, res) => {
  const { token, password } = req.body;

  try {
    const tokenHash = hashRefreshToken(token);
    const [filas] = await pool.query(
      'SELECT id_usuario FROM password_resets WHERE token_hash = ? AND usado = 0 AND expira_en > NOW()',
      [tokenHash]
    );

    if (filas.length === 0) {
      return res.status(400).json({ error: 'El enlace es inválido o ya expiró. Solicita uno nuevo.' });
    }

    const idUsuario = filas[0].id_usuario;
    const hashPassword = await bcrypt.hash(password, 10);

    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?', [hashPassword, idUsuario]);
    await pool.query('UPDATE password_resets SET usado = 1 WHERE token_hash = ?', [tokenHash]);
    await pool.query('UPDATE refresh_tokens SET revocado = 1 WHERE id_usuario = ?', [idUsuario]);

    res.json({ mensaje: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
  } catch (err) {
    console.error('Error al restablecer la contraseña:', err.message);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
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

const verificarFirmaImagen = async (ruta) => {
  let manejador;
  try {
    manejador = await fs.promises.open(ruta, 'r');
    const buffer = Buffer.alloc(12);
    await manejador.read(buffer, 0, 12, 0);

    const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const esPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const esWebp =
      buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
      buffer.subarray(8, 12).toString('latin1') === 'WEBP';

    return esJpeg || esPng || esWebp;
  } catch {
    return false;
  } finally {
    if (manejador) await manejador.close().catch(() => {});
  }
};

// -----------------------------------------------------------------------------
// Subida de Archivos
// -----------------------------------------------------------------------------
app.post('/api/upload', authMiddleware, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Por favor selecciona un archivo' });
    }

    const cloudName = CLOUD_NAME;
    const apiKey = CLOUD_API_KEY;
    const apiSecret = CLOUD_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Cloudinary no está configurado en el servidor' });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = 'requintu';
    const publicId = `requintu_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

    const stringToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    const formData = new FormData();
    formData.append('file', `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('signature', signature);
    formData.append('transformation', 'c_limit,w_800,h_600');

    const result = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await result.json();

    if (!result.ok) {
      throw new Error(data.error?.message || 'Error de Cloudinary');
    }

    res.json({ mensaje: 'Imagen subida correctamente', url: data.secure_url });
  } catch (err) {
    console.error('Error al subir la imagen:', err.message, err);
    res.status(500).json({ error: 'Error al subir la imagen: ' + (err.message || 'Error desconocido') });
  }
});

// -----------------------------------------------------------------------------
// CRUD: Locales
// -----------------------------------------------------------------------------
app.get('/api/locales', async (req, res) => {
  try {
    const { categoria, municipio, departamento, buscar } = req.query;
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
    if (departamento) {
      query += ' AND m.departamento = ?';
      params.push(departamento);
    }
    if (buscar) {
      const escapedBuscar = buscar.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      query += ' AND l.nombre LIKE ? ESCAPE \'\\\\\'';
      params.push(`%${escapedBuscar}%`);
    }

    const [locales] = await pool.query(query, params);
    res.json({ locales });
  } catch (err) {
    console.error('Error al obtener locales:', err.message);
    res.status(500).json({ error: 'Error al obtener locales' });
  }
});

app.post('/api/locales', authMiddleware, checkRole(['comerciante', 'admin']), validar([
  body('nombre').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre del local debe tener entre 2 y 100 caracteres'),
  body('descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),
  body('direccion').trim().notEmpty().withMessage('La dirección es obligatoria'),
  body('telefono').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('El teléfono no puede exceder 20 caracteres'),
  body('imagen_url').optional({ values: 'falsy' }).trim(),
  body('id_categoria').optional({ values: 'null' }).isInt().withMessage('Categoría inválida'),
  body('id_municipio').optional({ values: 'null' }).isInt().withMessage('Municipio inválido')
]), async (req, res) => {
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

app.put('/api/locales/:id', authMiddleware, validar([
  body('nombre').optional().trim().isLength({ min: 2, max: 100 }),
  body('descripcion').optional().trim().isLength({ max: 1000 }),
  body('direccion').optional().trim(),
  body('telefono').optional().trim().isLength({ max: 20 }),
  body('imagen_url').optional({ values: 'falsy' }).trim(),
  body('id_categoria').optional({ values: 'null' }).isInt(),
  body('id_municipio').optional({ values: 'null' }).isInt()
]), async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id_usuario FROM locales WHERE id_local = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Local no encontrado' });
    if (rows[0].id_usuario !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para editar este local' });
    }

    const campos = [];
    const params = [];
    const { nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio } = req.body;

    if (nombre !== undefined) { campos.push('nombre = ?'); params.push(nombre); }
    if (descripcion !== undefined) { campos.push('descripcion = ?'); params.push(descripcion || null); }
    if (direccion !== undefined) { campos.push('direccion = ?'); params.push(direccion || null); }
    if (telefono !== undefined) { campos.push('telefono = ?'); params.push(telefono || null); }
    if (imagen_url !== undefined) { campos.push('imagen_url = ?'); params.push(imagen_url || null); }
    if (id_categoria !== undefined) { campos.push('id_categoria = ?'); params.push(id_categoria || null); }
    if (id_municipio !== undefined) { campos.push('id_municipio = ?'); params.push(id_municipio || null); }

    if (campos.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    params.push(id);
    await pool.query(`UPDATE locales SET ${campos.join(', ')} WHERE id_local = ?`, params);
    res.json({ mensaje: 'Local actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar local:', err.message);
    res.status(500).json({ error: 'Error al actualizar local' });
  }
});

app.delete('/api/locales/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id_usuario FROM locales WHERE id_local = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Local no encontrado' });
    }
    if (rows[0].id_usuario !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este local' });
    }
    await pool.query('DELETE FROM locales WHERE id_local = ?', [id]);
    res.json({ mensaje: 'Local eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar local:', err.message);
    res.status(500).json({ error: 'Error al eliminar local' });
  }
});

// -----------------------------------------------------------------------------
// Eliminar perfil de usuario
// -----------------------------------------------------------------------------
app.delete('/api/usuarios/perfil', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [req.user.id]);
    res.clearCookie('refresh_token', COOKIE_OPCIONES);
    res.json({ mensaje: 'Cuenta eliminada correctamente' });
  } catch (err) {
    console.error('Error al eliminar perfil:', err.message);
    res.status(500).json({ error: 'Error al eliminar perfil' });
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

app.post('/api/locales/:id/calificaciones', authMiddleware, validar([
  body('puntuacion').isInt({ min: 1, max: 5 }).withMessage('La puntuación debe estar entre 1 y 5'),
  body('comentario').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('El comentario no puede exceder 500 caracteres')
]), async (req, res) => {
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
  const [rows] = await pool.query('SELECT id_usuario FROM locales WHERE id_local = ?', [idLocal]);
  if (rows.length === 0) return false;
  if (rol === 'admin') return true;
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

app.post('/api/locales/:id/planes', authMiddleware, validar([
  body('titulo').trim().isLength({ min: 3, max: 100 }).withMessage('El título debe tener entre 3 y 100 caracteres'),
  body('descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),
  body('precio').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('El precio no puede ser negativo'),
  body('fecha_inicio').isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').isISO8601().withMessage('Fecha de fin inválida')
]), async (req, res) => {
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

app.put('/api/planes/:id', authMiddleware, validar([
  body('titulo').trim().isLength({ min: 3, max: 100 }).withMessage('El título debe tener entre 3 y 100 caracteres'),
  body('descripcion').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),
  body('precio').optional({ values: 'null' }).isFloat({ min: 0 }).withMessage('El precio no puede ser negativo'),
  body('fecha_inicio').isISO8601().withMessage('Fecha de inicio inválida'),
  body('fecha_fin').isISO8601().withMessage('Fecha de fin inválida')
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url } = req.body;

    if (!(await verificarPermisoPlan(id, req, res, 'editar'))) return;

    await pool.query(
      `UPDATE planes SET
        titulo = ?,
        descripcion = COALESCE(?, descripcion),
        precio = COALESCE(?, precio),
        fecha_inicio = ?,
        fecha_fin = ?,
        imagen_url = COALESCE(?, imagen_url)
      WHERE id_plan = ?`,
      [titulo, descripcion ?? null, precio ?? null, fecha_inicio, fecha_fin, imagen_url ?? null, id]
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

app.post('/api/publicaciones', authMiddleware, checkRole(['turista', 'admin']), validar([
  body('contenido').trim().isLength({ min: 1, max: 2000 }).withMessage('El contenido es obligatorio (máximo 2000 caracteres)')
]), async (req, res) => {
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

app.put('/api/publicaciones/:id', authMiddleware, validar([
  body('contenido').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('El contenido no puede estar vacío (máximo 2000 caracteres)')
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido, imagen_url } = req.body;

    if (!(await verificarPermisoPublicacion(id, req, res, 'editar'))) return;

    const updates = [];
    const params = [];
    if (contenido !== undefined) {
      updates.push('contenido = ?');
      params.push(contenido);
    }
    if (imagen_url !== undefined) {
      updates.push('imagen_url = ?');
      params.push(imagen_url || null);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }
    params.push(id);

    await pool.query(
      `UPDATE publicaciones SET ${updates.join(', ')} WHERE id = ?`,
      params
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
  if (err.message && err.message.startsWith('Solo se permiten')) {
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

const esModuloPrincipal = import.meta.url === pathToFileURL(process.argv[1] || '').href;

if (esModuloPrincipal) {
  arrancarServidor();
}

export default app;