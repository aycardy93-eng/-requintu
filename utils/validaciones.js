import { ApiError } from './apiError.js';

// Lanza un 400 si alguno de los campos indicados viene vacío.
export const exigirCampos = (datos, campos, mensaje) => {
  if (campos.some((campo) => !datos[campo])) {
    throw new ApiError(400, mensaje);
  }
};

export const validarPuntuacion = (puntuacion) => {
  if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
    throw new ApiError(400, 'La puntuación debe ser un número entre 1 y 5.');
  }
};

// Valida los campos obligatorios y la coherencia de fechas de un plan.
export const validarPlan = ({ titulo, fecha_inicio, fecha_fin }) => {
  exigirCampos(
    { titulo, fecha_inicio, fecha_fin },
    ['titulo', 'fecha_inicio', 'fecha_fin'],
    'Título, fecha de inicio y fecha de fin son obligatorios.'
  );

  if (new Date(fecha_fin) < new Date(fecha_inicio)) {
    throw new ApiError(400, 'La fecha de fin no puede ser anterior a la fecha de inicio.');
  }
};
