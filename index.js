import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db from './db.js';
import { authenticateToken as authMiddleware, firmarToken } from './authMiddleware.js';
import { BASE_URL, PORT } from './utils/config.js';
import { ApiError, asyncHandler } from './utils/apiError.js';
import { encriptarPassword } from './utils/password.js';
import { manejarErroresDeSubida, upload } from './utils/upload.js';
import {
  buscarUsuarioPorEmail,
  consultar,
  exigirPropietario,
  exigirPropietarioOAdmin,
  obtenerRegistroOFallar
} from './utils/recursos.js';
import { exigirCampos, validarPlan, validarPuntuacion } from './utils/validaciones.js';

const app = express();

// Middleware para procesar JSON en las peticiones
app.use(cors());
app.use(express.json());
// Servir las imágenes de forma pública
app.use('/uploads', express.static('uploads'));

const buscarLocal = (id) => obtenerRegistroOFallar({
  tabla: 'locales',
  columnaId: 'id_local',
  id,
  mensajeNoEncontrado: 'Local no encontrado'
});

const buscarPublicacion = (id) => obtenerRegistroOFallar({
  tabla: 'publicaciones',
  columnaId: 'id',
  id,
  mensajeNoEncontrado: 'Publicación no encontrada'
});

const buscarCalificacion = (id) => obtenerRegistroOFallar({
  tabla: 'calificaciones',
  columnaId: 'id_resena',
  id,
  mensajeNoEncontrado: 'Calificación no encontrada'
});

// El dueño del plan es el dueño del local al que pertenece.
const buscarPlanConDueno = (id) => obtenerRegistroOFallar({
  mensajeNoEncontrado: 'Plan no encontrado',
  sql: `SELECT p.*, l.id_usuario AS dueno_local
        FROM planes p
        JOIN locales l ON p.id_local = l.id_local
        WHERE p.id_plan = ?`,
  params: [id]
});

// ==========================================
// AUTENTICACIÓN
// ==========================================
app.post('/api/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await buscarUsuarioPorEmail(email);
  if (!user) {
    throw new ApiError(401, 'Usuario no encontrado');
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new ApiError(401, 'Contraseña incorrecta');
  }

  res.json({ message: 'Login exitoso', token: firmarToken(user) });
}));

app.post('/api/register', asyncHandler(async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  exigirCampos(req.body, ['nombre', 'email', 'password'], 'Todos los campos son obligatorios.');

  if (await buscarUsuarioPorEmail(email)) {
    throw new ApiError(400, 'El correo ya está registrado.');
  }

  const hashedPassword = await encriptarPassword(password);

  const [result] = await db.query(
    'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES (?, ?, ?, ?)',
    [nombre, email, hashedPassword, rol || 'turista']
  );

  res.status(201).json({
    message: 'Usuario registrado con éxito',
    usuario: { id: result.insertId, nombre, email, rol: rol || 'turista' }
  });
}));

// ==========================================
// RUTAS DE PUBLICACIONES
// ==========================================
app.post('/api/publicaciones', authMiddleware, asyncHandler(async (req, res) => {
  const { contenido, imagen_url } = req.body;
  const usuario_id = req.user.id;

  exigirCampos(req.body, ['contenido'], 'El contenido es obligatorio.');

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
}));

// Listar todas las publicaciones (con el nombre del autor)
app.get('/api/publicaciones', asyncHandler(async (req, res) => {
  const publicaciones = await consultar(
    `SELECT p.id, p.contenido, p.imagen_url, p.fecha_creacion,
            u.id_usuario, u.nombre AS autor
     FROM publicaciones p
     JOIN usuarios u ON p.usuario_id = u.id_usuario
     ORDER BY p.fecha_creacion DESC`
  );

  res.status(200).json({ publicaciones });
}));

// Ver una publicación específica por ID
app.get('/api/publicaciones/:id', asyncHandler(async (req, res) => {
  const publicacion = await obtenerRegistroOFallar({
    mensajeNoEncontrado: 'Publicación no encontrada',
    sql: `SELECT p.id, p.contenido, p.imagen_url, p.fecha_creacion,
                 u.id_usuario, u.nombre AS autor
          FROM publicaciones p
          JOIN usuarios u ON p.usuario_id = u.id_usuario
          WHERE p.id = ?`,
    params: [req.params.id]
  });

  res.status(200).json({ publicacion });
}));

// Ver las publicaciones de un usuario específico
app.get('/api/usuarios/:id/publicaciones', asyncHandler(async (req, res) => {
  const publicaciones = await consultar(
    `SELECT id, contenido, imagen_url, fecha_creacion
     FROM publicaciones
     WHERE usuario_id = ?
     ORDER BY fecha_creacion DESC`,
    [req.params.id]
  );

  res.status(200).json({ publicaciones });
}));

// Editar una publicación (solo el dueño puede editarla)
app.put('/api/publicaciones/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { contenido, imagen_url } = req.body;

  const publicacion = await buscarPublicacion(id);
  exigirPropietario(publicacion.usuario_id, req.user, 'No tienes permiso para editar esta publicación');
  exigirCampos(req.body, ['contenido'], 'El contenido es obligatorio.');

  await db.query(
    'UPDATE publicaciones SET contenido = ?, imagen_url = ? WHERE id = ?',
    [contenido, imagen_url || null, id]
  );

  res.status(200).json({
    message: 'Publicación actualizada con éxito',
    publicacion: { id: Number(id), usuario_id: req.user.id, contenido, imagen_url: imagen_url || null }
  });
}));

// Eliminar una publicación (solo el dueño puede eliminarla)
app.delete('/api/publicaciones/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const publicacion = await buscarPublicacion(id);
  exigirPropietario(publicacion.usuario_id, req.user, 'No tienes permiso para eliminar esta publicación');

  await db.query('DELETE FROM publicaciones WHERE id = ?', [id]);

  res.status(200).json({ message: 'Publicación eliminada con éxito' });
}));

// ==========================================
// RUTAS DE LOCALES
// ==========================================

// Crear un local (solo comerciante o admin)
app.post('/api/locales', authMiddleware, asyncHandler(async (req, res) => {
  const { rol, id: id_usuario } = req.user;

  if (rol !== 'comerciante' && rol !== 'admin') {
    throw new ApiError(403, 'No tienes permiso para crear locales');
  }

  const { nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio } = req.body;

  exigirCampos(req.body, ['nombre', 'descripcion'], 'Nombre y descripción son obligatorios.');

  const [result] = await db.query(
    `INSERT INTO locales (nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio, id_usuario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, descripcion, direccion || null, telefono || null, imagen_url || null, id_categoria || null, id_municipio || null, id_usuario]
  );

  res.status(201).json({
    message: 'Local creado con éxito',
    local: { id: result.insertId, nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio, id_usuario }
  });
}));

// Listar todos los locales (público, con filtros opcionales)
app.get('/api/locales', asyncHandler(async (req, res) => {
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

  const locales = await consultar(sql, params);

  res.status(200).json({ total: locales.length, locales });
}));

// Ver un local específico (público)
app.get('/api/locales/:id', asyncHandler(async (req, res) => {
  const local = await obtenerRegistroOFallar({
    mensajeNoEncontrado: 'Local no encontrado',
    sql: `SELECT l.id_local, l.nombre, l.descripcion, l.direccion, l.telefono, l.imagen_url, l.id_usuario,
                 c.nombre AS categoria, m.nombre AS municipio
          FROM locales l
          LEFT JOIN categorias c ON l.id_categoria = c.id_categoria
          LEFT JOIN municipios m ON l.id_municipio = m.id_municipio
          WHERE l.id_local = ?`,
    params: [req.params.id]
  });

  res.status(200).json({ local });
}));

// Editar un local (solo admin, o el comerciante dueño)
app.put('/api/locales/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const local = await buscarLocal(id);
  exigirPropietarioOAdmin(local.id_usuario, req.user, 'No tienes permiso para editar este local');

  const { nombre, descripcion, direccion, telefono, imagen_url, id_categoria, id_municipio } = req.body;

  await db.query(
    `UPDATE locales
     SET nombre = ?, descripcion = ?, direccion = ?, telefono = ?, imagen_url = ?, id_categoria = ?, id_municipio = ?
     WHERE id_local = ?`,
    [nombre, descripcion, direccion || null, telefono || null, imagen_url || null, id_categoria || null, id_municipio || null, id]
  );

  res.status(200).json({ message: 'Local actualizado con éxito' });
}));

// Eliminar un local (solo admin, o el comerciante dueño)
app.delete('/api/locales/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const local = await buscarLocal(id);
  exigirPropietarioOAdmin(local.id_usuario, req.user, 'No tienes permiso para eliminar este local');

  await db.query('DELETE FROM locales WHERE id_local = ?', [id]);

  res.status(200).json({ message: 'Local eliminado con éxito' });
}));

// ==========================================
// RUTAS DE CALIFICACIONES
// ==========================================

// Crear una calificación (cualquier usuario logueado, una vez por local)
app.post('/api/locales/:id_local/calificaciones', authMiddleware, asyncHandler(async (req, res) => {
  const { id_local } = req.params;
  const { puntuacion, comentario } = req.body;
  const id_usuario = req.user.id;

  validarPuntuacion(puntuacion);
  await buscarLocal(id_local);

  // Verificar que el usuario no haya calificado ya este local
  const existentes = await consultar(
    'SELECT * FROM calificaciones WHERE id_local = ? AND id_usuario = ?',
    [id_local, id_usuario]
  );
  if (existentes.length > 0) {
    throw new ApiError(400, 'Ya has calificado este local.');
  }

  const [result] = await db.query(
    'INSERT INTO calificaciones (id_local, id_usuario, puntuacion, comentario) VALUES (?, ?, ?, ?)',
    [id_local, id_usuario, puntuacion, comentario || null]
  );

  res.status(201).json({
    message: 'Calificación creada con éxito',
    calificacion: { id: result.insertId, id_local, id_usuario, puntuacion, comentario: comentario || null }
  });
}));

// Ver todas las calificaciones de un local (público, con nombre del usuario)
app.get('/api/locales/:id_local/calificaciones', asyncHandler(async (req, res) => {
  const calificaciones = await consultar(
    `SELECT c.id_resena, c.id_usuario, c.puntuacion, c.comentario, c.fecha,
            u.nombre AS usuario
     FROM calificaciones c
     JOIN usuarios u ON c.id_usuario = u.id_usuario
     WHERE c.id_local = ?
     ORDER BY c.fecha DESC`,
    [req.params.id_local]
  );

  // Calcular el promedio de puntuación
  const promedio = calificaciones.length > 0
    ? (calificaciones.reduce((sum, c) => sum + c.puntuacion, 0) / calificaciones.length).toFixed(1)
    : null;

  res.status(200).json({ promedio, total: calificaciones.length, calificaciones });
}));

// Editar una calificación (solo el autor)
app.put('/api/calificaciones/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { puntuacion, comentario } = req.body;

  const calificacion = await buscarCalificacion(id);
  exigirPropietario(calificacion.id_usuario, req.user, 'No tienes permiso para editar esta calificación');
  validarPuntuacion(puntuacion);

  await db.query(
    'UPDATE calificaciones SET puntuacion = ?, comentario = ? WHERE id_resena = ?',
    [puntuacion, comentario || null, id]
  );

  res.status(200).json({ message: 'Calificación actualizada con éxito' });
}));

// Eliminar una calificación (solo el autor o admin)
app.delete('/api/calificaciones/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const calificacion = await buscarCalificacion(id);
  exigirPropietarioOAdmin(calificacion.id_usuario, req.user, 'No tienes permiso para eliminar esta calificación');

  await db.query('DELETE FROM calificaciones WHERE id_resena = ?', [id]);

  res.status(200).json({ message: 'Calificación eliminada con éxito' });
}));

// ==========================================
// RUTAS DE PLANES (promociones/eventos con vigencia)
// ==========================================

// Crear un plan para un local (solo el comerciante dueño del local)
app.post('/api/locales/:id_local/planes', authMiddleware, asyncHandler(async (req, res) => {
  const { id_local } = req.params;
  const { titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url } = req.body;

  validarPlan(req.body);

  const local = await buscarLocal(id_local);
  exigirPropietarioOAdmin(local.id_usuario, req.user, 'No tienes permiso para crear planes en este local');

  const [result] = await db.query(
    `INSERT INTO planes (id_local, titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id_local, titulo, descripcion || null, precio || null, fecha_inicio, fecha_fin, imagen_url || null]
  );

  res.status(201).json({
    message: 'Plan creado con éxito',
    plan: { id: result.insertId, id_local, titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url }
  });
}));

// Listar planes vigentes de un local (público, oculta los vencidos automáticamente)
app.get('/api/locales/:id_local/planes', asyncHandler(async (req, res) => {
  const planes = await consultar(
    `SELECT id_plan, id_local, titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url
     FROM planes
     WHERE id_local = ? AND fecha_fin >= CURDATE()
     ORDER BY fecha_inicio ASC`,
    [req.params.id_local]
  );

  res.status(200).json({ planes });
}));

// Editar un plan (solo el dueño del local o admin)
app.put('/api/planes/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, precio, fecha_inicio, fecha_fin, imagen_url } = req.body;

  const plan = await buscarPlanConDueno(id);
  exigirPropietarioOAdmin(plan.dueno_local, req.user, 'No tienes permiso para editar este plan');
  validarPlan(req.body);

  await db.query(
    `UPDATE planes
     SET titulo = ?, descripcion = ?, precio = ?, fecha_inicio = ?, fecha_fin = ?, imagen_url = ?
     WHERE id_plan = ?`,
    [titulo, descripcion || null, precio || null, fecha_inicio, fecha_fin, imagen_url || null, id]
  );

  res.status(200).json({ message: 'Plan actualizado con éxito' });
}));

// Eliminar un plan (solo el dueño del local o admin)
app.delete('/api/planes/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const plan = await buscarPlanConDueno(id);
  exigirPropietarioOAdmin(plan.dueno_local, req.user, 'No tienes permiso para eliminar este plan');

  await db.query('DELETE FROM planes WHERE id_plan = ?', [id]);

  res.status(200).json({ message: 'Plan eliminado con éxito' });
}));

// ==========================================
// RUTAS DE CATEGORÍAS Y MUNICIPIOS
// ==========================================
app.get('/api/categorias', asyncHandler(async (req, res) => {
  const categorias = await consultar('SELECT * FROM categorias ORDER BY nombre ASC');
  res.status(200).json({ categorias });
}));

app.get('/api/municipios', asyncHandler(async (req, res) => {
  const municipios = await consultar('SELECT * FROM municipios ORDER BY nombre ASC');
  res.status(200).json({ municipios });
}));

// ==========================================
// PERFIL
// ==========================================
app.get('/api/perfil', authMiddleware, asyncHandler(async (req, res) => {
  const usuario = await obtenerRegistroOFallar({
    mensajeNoEncontrado: 'Usuario no encontrado',
    sql: 'SELECT id_usuario, nombre, email, rol, foto_perfil FROM usuarios WHERE id_usuario = ?',
    params: [req.user.id]
  });

  res.json({ usuario });
}, 'Error al consultar el perfil'));

app.put('/api/perfil', authMiddleware, asyncHandler(async (req, res) => {
  const id_usuario = req.user.id;
  const { nombre, email, password, foto_perfil } = req.body;

  exigirCampos(req.body, ['nombre', 'email'], 'Nombre y correo son obligatorios.');

  // Verificar que el nuevo email no esté en uso por otro usuario
  const otrosUsuarios = await consultar(
    'SELECT * FROM usuarios WHERE email = ? AND id_usuario != ?',
    [email, id_usuario]
  );
  if (otrosUsuarios.length > 0) {
    throw new ApiError(400, 'Ese correo ya está en uso por otro usuario.');
  }

  if (password) {
    // Si el usuario quiere cambiar también la contraseña
    await db.query(
      'UPDATE usuarios SET nombre = ?, email = ?, password_hash = ?, foto_perfil = ? WHERE id_usuario = ?',
      [nombre, email, await encriptarPassword(password), foto_perfil || null, id_usuario]
    );
  } else {
    await db.query(
      'UPDATE usuarios SET nombre = ?, email = ?, foto_perfil = ? WHERE id_usuario = ?',
      [nombre, email, foto_perfil || null, id_usuario]
    );
  }

  res.status(200).json({
    message: 'Perfil actualizado con éxito',
    usuario: { id: id_usuario, nombre, email, foto_perfil: foto_perfil || null }
  });
}));

// ==========================================
// RECUPERACIÓN DE CONTRASEÑA (simulada con console.log)
// ==========================================

// 1. Solicitar código de recuperación
app.post('/api/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  exigirCampos(req.body, ['email'], 'El correo es obligatorio.');

  if (!(await buscarUsuarioPorEmail(email))) {
    throw new ApiError(404, 'No existe un usuario con ese correo.');
  }

  // Código de 6 dígitos que expira en 15 minutos
  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expira = new Date(Date.now() + 15 * 60 * 1000);

  await db.query(
    'UPDATE usuarios SET reset_token = ?, reset_token_expira = ? WHERE email = ?',
    [codigo, expira, email]
  );

  // Simulación del envío de correo
  console.log('========================================');
  console.log(`Código de recuperación para ${email}: ${codigo}`);
  console.log('Válido por 15 minutos.');
  console.log('========================================');

  res.status(200).json({ message: 'Se generó un código de recuperación. Revisa la consola del servidor (simulación de correo).' });
}));

// 2. Confirmar código y definir nueva contraseña
app.post('/api/reset-password', asyncHandler(async (req, res) => {
  const { email, codigo, nuevaPassword } = req.body;

  exigirCampos(req.body, ['email', 'codigo', 'nuevaPassword'], 'Correo, código y nueva contraseña son obligatorios.');

  const user = await buscarUsuarioPorEmail(email);
  if (!user) {
    throw new ApiError(404, 'No existe un usuario con ese correo.');
  }

  if (user.reset_token !== codigo) {
    throw new ApiError(400, 'Código incorrecto.');
  }

  if (!user.reset_token_expira || new Date() > new Date(user.reset_token_expira)) {
    throw new ApiError(400, 'El código ha expirado. Solicita uno nuevo.');
  }

  await db.query(
    'UPDATE usuarios SET password_hash = ?, reset_token = NULL, reset_token_expira = NULL WHERE email = ?',
    [await encriptarPassword(nuevaPassword), email]
  );

  res.status(200).json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión con tu nueva clave.' });
}));

// ==========================================
// SUBIR IMAGEN (POST /api/upload)
// ==========================================
app.post('/api/upload', authMiddleware, upload.single('imagen'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se envió ninguna imagen.' });
  }
  const imagen_url = `${BASE_URL}/uploads/${req.file.filename}`;
  res.status(200).json({ message: 'Imagen subida con éxito', imagen_url });
});

app.use(manejarErroresDeSubida);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
