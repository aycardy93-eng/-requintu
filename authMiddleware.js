import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from './utils/config.js';

export const firmarToken = (usuario) => jwt.sign(
  { id: usuario.id_usuario, email: usuario.email, rol: usuario.rol },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acceso denegado, token requerido.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch {
    res.status(403).json({ message: 'Token inválido o expirado' });
  }
};
