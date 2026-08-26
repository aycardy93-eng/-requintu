import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const configuracion = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'requintu_db',

  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 5,
  queueLimit: 50,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 5000
};

// Las BD de MySQL administradas en la nube (Aiven, TiDB, etc.) exigen TLS
if (process.env.DB_SSL === 'true') {
  configuracion.ssl = { rejectUnauthorized: true };
}

const pool = mysql.createPool(configuracion);

// Verificar conexión a MySQL
export const checkDatabaseHealth = async () => {
  let conexion;

  try {
    conexion = await pool.getConnection();

    await conexion.query('SELECT 1');

    console.log('Conexión a la base de datos verificada con éxito.');
  } catch (error) {
    console.error(
      'Error durante la verificación de la base de datos:',
      error.message
    );

    throw error;
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

export default pool;