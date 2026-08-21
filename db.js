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

/**
 * Verifica el estado de la conexión a la base de datos durante el arranque.
 * Utiliza try...finally para garantizar que la conexión prestada siempre se devuelva al pool.
 */
export const checkDatabaseHealth = async () => {
  let conexion;
  try {
    conexion = await pool.getConnection();
    await conexion.query('SELECT 1');
    console.log('Conexión a la base de datos verificada con éxito.');
  } catch (error) {
    console.error('Error durante la verificación de la base de datos:', error.message);
    throw error;
  } finally {
    if (conexion) {
      conexion.release();
    }
  }
};

export default pool;