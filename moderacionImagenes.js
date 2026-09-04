import * as tf from '@tensorflow/tfjs';
import { load } from 'nsfwjs';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

// Modelo NSFWJS (MobileNetV2) en memoria: pornografía, hentai, "sexy".
// Todo corre local (sin claves ni servicios externos).
let modelo = null;
let cargando = null;

async function obtenerModelo() {
  if (modelo) return modelo;
  if (!cargando) {
    cargando = load()
      .then((m) => {
        modelo = m;
      })
      .finally(() => {
        cargando = null;
      });
  }
  return cargando;
}

// Decodifica a RGBA según los magic bytes (JPEG o PNG). WebP y otros formatos
// no tienen decodificador local: se devuelve null (la imagen se permite, se registra).
function decodificar(buffer) {
  if (!buffer || buffer.length < 8) return null;

  const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const esPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;

  if (esJpeg) {
    const img = jpeg.decode(buffer, { useTArray: true });
    return { data: img.data, width: img.width, height: img.height };
  }

  if (esPng) {
    const img = PNG.sync.read(buffer);
    return { data: img.data, width: img.width, height: img.height };
  }

  return null;
}

async function clasificar(buffer) {
  const img = decodificar(buffer);
  if (!img) throw new Error('Formato de imagen no analizable localmente');

  const t4 = tf.tensor4d(img.data, [1, img.height, img.width, 4]);
  const tensor = t4.slice([0, 0, 0, 0], [1, img.height, img.width, 3]);
  t4.dispose();

  try {
    const modeloCargado = await obtenerModelo();
    const predicciones = await modeloCargado.classify(tensor.squeeze());
    return predicciones;
  } finally {
    tensor.dispose();
  }
}

// Umbrales: pornografía y hentai se bloquean con un 60% de probabilidad;
// "sexy" es más propenso a falsos positivos (trajes de baño), se exige 85%.
const UMBRALES = { Porn: 0.6, Hentai: 0.6, Sexy: 0.85 };

const MOTIVOS = {
  Porn: 'contiene contenido pornográfico',
  Hentai: 'contiene contenido sexual explícito (animado)',
  Sexy: 'contiene contenido sexual',
};

// Devuelve { aprobada, motivo? }. Si la imagen no se puede analizar (formato
// raro o error puntual) se permite y se registra, para no bloquear subidas válidas.
export async function moderarImagen(buffer) {
  try {
    const predicciones = await clasificar(buffer);

    for (const p of predicciones) {
      const umbral = UMBRALES[p.className];
      if (umbral !== undefined && p.probability >= umbral) {
        const confianza = `${Math.round(p.probability * 100)}%`;
        return {
          aprobada: false,
          motivo: `La imagen ${MOTIVOS[p.className]} (${p.className}, ${confianza}) y viola las políticas de la comunidad.`
        };
      }
    }

    return { aprobada: true };
  } catch (err) {
    console.warn('Moderación: no se pudo analizar la imagen, se permite con aviso:', err.message);
    return { aprobada: true };
  }
}