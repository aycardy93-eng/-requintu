// Filtro de groserías para Requintu.
// Normaliza el texto (mayúsculas, leetspeak, caracteres repetidos) y lo compara
// contra una lista de palabras inapropiadas en español.

const PALABRAS_PROHIBIDAS = [
  'hijueputa', 'hijueputas', 'hijuepucha', 'malparido', 'malparida',
  'malparidos', 'malparidas', 'gonorrea', 'gonorreas', 'carechimba',
  'carepicha', 'marica', 'maricas', 'maricon', 'maricona', 'maricones',
  'puta', 'putas', 'puto', 'putos', 'puterio', 'putefico',
  'pendejo', 'pendeja', 'pendejos', 'pendejas', 'pendejada', 'pendejadas',
  'hpta', 'hijueputa', 'hp', 'mierda', 'mierdas', 'verga', 'vergas',
  'culiao', 'culiada', 'culiado', 'huevon', 'huevona', 'huevones',
  'guevon', 'guevona', 'huevonada', 'guevonada',
  'pene', 'vagina', 'coño', 'cono', 'fetos', 'prostituta',
  'prostitutos', 'pornografia', 'desnudo', 'desnuda', 'chucha',
  'chupame', 'mamame', 'mamadas', 'perra', 'perras', 'zoofilico',
  'conchudo', 'conchuda', 'cabron', 'cabrona', 'cabrones', 'cabronas',
  'estupido', 'estupida', 'estupidos', 'estupidas', 'estupidez',
  'imbecil', 'imbercil', 'tarado', 'tarada', 'retrasado', 'retrasada',
  'subnormal', 'mongolico', 'mongola', 'soplapollas', 'capullo', 'capullos',
  'gilipollas', 'joder', 'joda', 'culo', 'culos', 'trasero', 'traseros',
  'tetas', 'teta', 'pechugona', 'nalgas', 'nalga', 'sexo', 'follar', 'follando',
  'masturbacion', 'masturbando', 'porno', 'xxx', 'acuestate', 'acostemonos',
  'pajaro', 'pajarin', 'careculo', 'bacano', 'chimbas'
];

// Sustituciones leetspeak y de letras similares.
const MAPA_SUSTITUCIONES = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't',
  '@': 'a', '8': 'b', '6': 'g', '#': 'h', '$': 's', '!': 'i',
  '|': 'i', '*': 'o', '+': 't', '<3': 'c'
};

// Palabras cortas que requieren estar delimitadas (evitar falsos positivos
// como "pero" conteniendo "perra").
const MIN_LONGITUD_PROHIBIDA = 3;

// Abreviaciones comunes (2 letras) que no pasan el mínimo de longitud.
const ABREVIACIONES = ['hp', 'ptm', 'qmrd'];

function normalizarTexto(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    // Quita espacios y caracteres no-ascii al separar las palabras
    .replace(/[\u0300-\u036f]/g, '')
    // Mapea dígitos y símbolos a letras (leetspeak), también dentro de palabras
    .replace(/[0-9@#\$!\|\*\+]/g, (ch) => MAPA_SUSTITUCIONES[ch] || ch)
    .replace(/[^a-z0-9\s]/g, ' ')
    // Colapsa caracteres repetidos: "putaaaa" -> "puta", "perra" -> "pera"
    .replace(/(.)\1{1,}/g, '$1')
    // Colapsa espacios múltiples
    .replace(/\s+/g, ' ')
    .trim();
}

function limpiarDelimitadores(palabra) {
  return palabra
    .replace(/([a-z0-9])\1{1,}/g, '$1')
    .replace(/[^a-z0-9]/g, '');
}

export function contieneGroserias(texto) {
  const normalizado = normalizarTexto(texto);

  // Variante compacta sin espacios ni signos: "hijuep uta" -> "hijueputa"
  const compacto = normalizado.replace(/\s+/g, '');

  const detectadas = [];

  for (const palabra of PALABRAS_PROHIBIDAS) {
    const normalizada = limpiarDelimitadores(palabra);

    if (normalizada.length < MIN_LONGITUD_PROHIBIDA) {
      continue;
    }

    // Búsqueda con límites de palabra en el texto normalizado.
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizada)}([^a-z0-9]|$)`, 'i');
    if (regex.test(normalizado)) {
      detectadas.push(palabra);
      continue;
    }

    // Si no tiene espacios, prueba contra la versión compacta.
    if (/^[a-z0-9]+$/.test(normalizada)) {
      const regexCompacta = new RegExp(`(^|[^a-z0-9])${escapeRegex(normalizada)}([^a-z0-9]|$)`, 'i');
      if (regexCompacta.test(compacto)) {
        detectadas.push(palabra);
      }
    }
  }

  // Abreviaciones cortas: se buscan solo como palabra completa.
  for (const abrev of ABREVIACIONES) {
    const regex = new RegExp(`(^|[^a-z0-9])${escapeRegex(abrev)}([^a-z0-9]|$)`, 'i');
    if (regex.test(normalizado)) {
      detectadas.push(abrev.toUpperCase());
    }
  }

  return [...new Set(detectadas)];
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}