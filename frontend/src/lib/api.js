export const API_URL = 'http://localhost:3000/api';

async function leerCuerpo(respuesta) {
  const texto = await respuesta.text();

  if (!texto) {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch {
    // El backend puede responder HTML (proxy caído, ruta inexistente) en lugar de JSON
    return { message: texto.slice(0, 200) };
  }
}

// Único punto de acceso a la API: registra el fallo y lanza un Error con el mensaje del backend,
// de modo que ninguna respuesta de error se confunda con una respuesta vacía correcta.
export async function apiFetch(ruta, opciones = {}) {
  let respuesta;

  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones);
  } catch (error) {
    console.error(`[api] fallo de red en ${ruta}:`, error);
    throw new Error('No se pudo conectar con el servidor.');
  }

  const datos = await leerCuerpo(respuesta);

  if (!respuesta.ok) {
    console.error(`[api] ${ruta} respondió ${respuesta.status}:`, datos);
    throw new Error(datos?.message || `Error ${respuesta.status} al consultar el servidor.`);
  }

  return datos ?? {};
}

export function encabezadosAuth(token, extra = {}) {
  return { Authorization: `Bearer ${token}`, ...extra };
}

export async function subirImagen(file, token) {
  const formData = new FormData();
  formData.append('imagen', file);

  const datos = await apiFetch('/upload', {
    method: 'POST',
    headers: encabezadosAuth(token),
    body: formData,
  });

  return datos.imagen_url;
}
