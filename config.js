import dotenv from 'dotenv';

dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error('Falta la variable de entorno JWT_SECRET. Defínela en el archivo .env (ver .env.example).');
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const PORT = Number(process.env.PORT) || 3000;
export const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
export const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
export const ROLES_PERMITIDOS_EN_REGISTRO = ['turista', 'comerciante'];
