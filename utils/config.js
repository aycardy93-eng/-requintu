import dotenv from 'dotenv';

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'mi_secreto_super_seguro_123';
export const JWT_EXPIRES_IN = '8h';
export const PORT = Number(process.env.PORT) || 3000;
export const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
