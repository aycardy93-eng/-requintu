import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

for (const variable of ['DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[variable]) {
    throw new Error(`Falta la variable de entorno ${variable}. Defínela en el archivo .env (ver .env.example).`);
  }
}

// Crear la piscina de conexiones (Pool)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;
