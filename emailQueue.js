import pool from './db.js';

// -----------------------------------------------------------------------------
// Cola de correos con reintentos (Brevo)
// -----------------------------------------------------------------------------
// Los correos se guardan primero en la tabla `cola_emails` (o en memoria si la
// BD no está disponible) y un procesador va enviándolos con reintentos y
// backoff exponencial. Así una caída puntual de Brevo o de la red no pierde
// correos: el siguiente intento queda programado en la misma fila.
// -----------------------------------------------------------------------------

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;
const MAX_INTENTOS = Number(process.env.EMAIL_MAX_INTENTOS) || 5;

let colaMemoria = [];
let iniciada = false;
let tablaLista = false;
let procesando = false;

// Backoff exponencial en segundos: 1, 2, 4 y 8 minutos entre reintentos.
const backoffSegundos = (intento) => Math.min(Math.pow(2, intento - 1) * 60, 480);

async function asegurarTabla() {
  if (tablaLista) return true;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cola_emails (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        destinatario VARCHAR(255) NOT NULL,
        asunto VARCHAR(255) NOT NULL,
        html MEDIUMTEXT NOT NULL,
        estado ENUM('pendiente', 'enviado', 'fallido') NOT NULL DEFAULT 'pendiente',
        intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
        proximo_intento DATETIME NULL,
        error VARCHAR(500) NULL,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        enviado_en DATETIME NULL,
        INDEX idx_estado_proximo (estado, proximo_intento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    tablaLista = true;
    return true;
  } catch {
    return false;
  }
}

async function enviarCorreoBrevo(destinatario, asunto, html) {
  try {
    if (!BREVO_API_KEY || !BREVO_SENDER_EMAIL) {
      throw new Error('Brevo no configurado (BREVO_API_KEY / BREVO_SENDER_EMAIL)');
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Requintu', email: BREVO_SENDER_EMAIL },
        to: [{ email: destinatario }],
        subject: asunto,
        htmlContent: html
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `Brevo error ${res.status}`);
    }
    console.log(`Correo enviado a ${destinatario}: ${data.messageId}`);
    return { ok: true, messageId: data.messageId };
  } catch (err) {
    console.error(`Fallo al enviar correo a ${destinatario}:`, err.message);
    return { ok: false, error: err.message };
  }
}

function desencadenarProcesamiento() {
  if (!iniciada) return;
  setImmediate(() => {
    void procesarCola();
  });
}

// Encola un correo: lo persiste en la tabla (si hay BD) para que sobreviva a
// reinicios del servidor; si la BD falla, lo conserva en memoria. Nunca lanza.
export async function encolarCorreo({ destinatario, asunto, html }) {
  try {
    if (await asegurarTabla()) {
      await pool.query(
        'INSERT INTO cola_emails (destinatario, asunto, html) VALUES (?, ?, ?)',
        [destinatario, asunto, html]
      );
      desencadenarProcesamiento();
      return;
    }
    throw new Error('no se pudo crear la tabla cola_emails');
  } catch (err) {
    console.error(`Correo para ${destinatario} se guarda en memoria (BD no disponible):`, err.message);
  }
  colaMemoria.push({ destinatario, asunto, html, siguienteIntento: Date.now() });
  desencadenarProcesamiento();
}

async function procesarTarea(tarea) {
  const resultado = await enviarCorreoBrevo(tarea.destinatario, tarea.asunto, tarea.html);

  if (resultado.ok) {
    if (tarea.enBd) {
      try {
        await pool.query(
          "UPDATE cola_emails SET estado = 'enviado', enviado_en = NOW(), error = NULL WHERE id = ?",
          [tarea.id]
        );
      } catch (err) {
        console.error('No se pudo marcar el correo como enviado:', err.message);
      }
    }
    return;
  }

  const intentos = (tarea.intentos || 0) + 1;

  if (tarea.enBd) {
    try {
      if (intentos >= MAX_INTENTOS) {
        await pool.query(
          "UPDATE cola_emails SET estado = 'fallido', intentos = ?, error = ? WHERE id = ?",
          [intentos, String(resultado.error).slice(0, 500), tarea.id]
        );
        console.error(`Correo a ${tarea.destinatario} marcado como fallido tras ${intentos} intentos.`);
      } else {
        await pool.query(
          'UPDATE cola_emails SET intentos = ?, proximo_intento = DATE_ADD(NOW(), INTERVAL ? SECOND), error = ? WHERE id = ?',
          [intentos, backoffSegundos(intentos), String(resultado.error).slice(0, 500), tarea.id]
        );
        console.warn(`Correo a ${tarea.destinatario} reintentará en ${backoffSegundos(intentos)}s (intento ${intentos}).`);
      }
    } catch (err) {
      console.error('No se pudo actualizar el estado del correo en la cola:', err.message);
    }
    return;
  }

  if (intentos < MAX_INTENTOS) {
    colaMemoria.push({
      ...tarea,
      intentos,
      siguienteIntento: Date.now() + backoffSegundos(intentos) * 1000
    });
  } else {
    console.error(`Correo en memoria a ${tarea.destinatario} descartado tras ${intentos} intentos fallidos.`);
  }
}

async function procesarCola() {
  if (!iniciada || procesando) return;
  procesando = true;

  try {
    const tareas = [];
    const ahora = Date.now();

    // Primero los pendientes guardados en memoria cuyo momento ya llegó
    const memoria = colaMemoria;
    colaMemoria = [];
    for (const item of memoria) {
      if ((item.siguienteIntento || 0) <= ahora) tareas.push(item);
      else colaMemoria.push(item);
    }

    // Después los pendientes de la BD cuyo proximo_intento ya venció
    if (tablaLista) {
      const [pendientes] = await pool.query(
        `SELECT id, destinatario, asunto, html, intentos
         FROM cola_emails
         WHERE estado = 'pendiente' AND (proximo_intento IS NULL OR proximo_intento <= NOW())
         ORDER BY id ASC
         LIMIT 20`
      );
      for (const fila of pendientes) {
        tareas.push({ id: fila.id, destinatario: fila.destinatario, asunto: fila.asunto, html: fila.html, intentos: fila.intentos, enBd: true });
      }
    }

    for (const tarea of tareas) {
      await procesarTarea(tarea);
    }
  } finally {
    procesando = false;
  }
}

// Arranca el procesador: crea la tabla si hace falta, reanuda los pendientes
// que dejaron correos sin enviar (p. ej. tras un reinicio) y programa el escaneo.
export async function iniciarColaCorreos() {
  try {
    if (await asegurarTabla()) {
      console.log('Cola de correos lista (tabla cola_emails disponible).');
    } else {
      console.warn('Cola de correos en modo memoria: no se pudo crear la tabla cola_emails.');
    }
  } catch (err) {
    console.warn('Cola de correos en modo memoria:', err.message);
  }
  iniciada = true;
  setInterval(() => { void procesarCola(); }, 15000).unref();
  desencadenarProcesamiento();
}