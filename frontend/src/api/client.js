export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Llama a la API y devuelve el JSON. Lanza un Error con el mensaje del backend si la respuesta falla.
export async function apiFetch(ruta, { token, body, metodo, headers, ...opciones } = {}) {
  const esFormData = body instanceof FormData;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      ...opciones,
      method: metodo || (body ? 'POST' : 'GET'),
      headers: {
        ...(esFormData || !body ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body ? { body: esFormData ? body : JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor.');
  }

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.message || 'Ocurrió un error inesperado.');
  }

  return datos;
}

// Sube una imagen (si hay archivo) y devuelve su URL pública.
export async function subirImagen(file, token) {
  if (!file) return null;

  const formData = new FormData();
  formData.append('imagen', file);

  const { imagen_url } = await apiFetch('/upload', { metodo: 'POST', token, body: formData });
  return imagen_url;
}
