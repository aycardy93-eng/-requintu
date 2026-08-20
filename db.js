import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Crear la piscina de conexiones (Pool)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'requintu_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Los errores del pool son asíncronos: sin este listener se pierden o tumban el proceso sin contexto
pool.on('error', (error) => {
  console.error('[db] error en el pool de conexiones:', error);
});

// Avisa al arrancar en lugar de esperar a que la primera petición devuelva un 500 sin explicación
try {
  const conexion = await pool.getConnection();
  await conexion.ping();
  conexion.release();
  console.log(`[db] conectado a MySQL (${process.env.DB_NAME || 'requintu_db'})`);
} catch (error) {
  console.error('[db] no se pudo conectar a MySQL al iniciar:', error);
}

export default pool;
