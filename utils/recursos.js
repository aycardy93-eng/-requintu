import db from '../db.js';
import { ApiError } from './apiError.js';

// Ejecuta una consulta y devuelve solo las filas.
export const consultar = async (sql, params = []) => {
  const [filas] = await db.query(sql, params);
  return filas;
};

// Ejecuta una consulta y devuelve la primera fila (o null).
export const consultarUno = async (sql, params = []) => {
  const filas = await consultar(sql, params);
  return filas[0] || null;
};

// Busca un registro por su id y lanza un 404 con el mensaje indicado si no existe.
export const obtenerRegistroOFallar = async ({ tabla, columnaId, id, mensajeNoEncontrado, sql, params }) => {
  const registro = sql
    ? await consultarUno(sql, params)
    : await consultarUno(`SELECT * FROM ${tabla} WHERE ${columnaId} = ?`, [id]);

  if (!registro) {
    throw new ApiError(404, mensajeNoEncontrado);
  }

  return registro;
};

// Solo el dueño del registro puede continuar.
export const exigirPropietario = (propietarioId, usuario, mensaje) => {
  if (propietarioId !== usuario.id) {
    throw new ApiError(403, mensaje);
  }
};

// El dueño del registro o un administrador pueden continuar.
export const exigirPropietarioOAdmin = (propietarioId, usuario, mensaje) => {
  if (usuario.rol !== 'admin' && propietarioId !== usuario.id) {
    throw new ApiError(403, mensaje);
  }
};

export const buscarUsuarioPorEmail = (email) => (
  consultarUno('SELECT * FROM usuarios WHERE email = ?', [email])
);
