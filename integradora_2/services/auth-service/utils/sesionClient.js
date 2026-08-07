//se quita cualquier / sobrante, eesto es mas para railway ya que lo solicita en una variable de entorno, sin esto 
//sin esto express reponderia con un 404 aunque exista la ruta
const SESION_SERVICE_URL = (process.env.SESION_SERVICE_URL || 'http://localhost:4002').replace(/\/+$/, '');
const INTERNAL_API_KEY   = process.env.INTERNAL_API_KEY;
const TIMEOUT_MS = 3000;
 
// Error específico para que las rutas puedan distinguir
// "sesion-service no respondió" de un error de validación normal.
class SesionServiceError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'SesionServiceError';
    this.status = status || 503;
  }
}
 
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
 
async function fetchConTimeout(url, options, intentosRestantes = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
 
  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_API_KEY || '',
        ...(options?.headers || {}),
      },
    });
    return resp;
  } catch (err) {
    // Timeout (AbortError) o error de red: reintentamos una vez.
    if (intentosRestantes > 0) {
      await delay(300);
      return fetchConTimeout(url, options, intentosRestantes - 1);
    }
    throw new SesionServiceError('sesion-service no respondió a tiempo.', 503);
  } finally {
    clearTimeout(timer);
  }
}
 
async function llamar(path, options) {
  const resp = await fetchConTimeout(`${SESION_SERVICE_URL}${path}`, options);
  let data;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }
 
  if (!resp.ok) {
    throw new SesionServiceError(
      data?.message || `sesion-service respondió ${resp.status}.`,
      resp.status >= 500 ? 503 : resp.status
    );
  }
  return data;
}
 
// ── Validar que un género exista ──────────────
async function validarGenero(idGenero) {
  return llamar(`/internal/generos/${idGenero}`, { method: 'GET' });
}
 
// ── Crear un Usuario nuevo ────────────────────
async function crearUsuario({ nombre, p_apellido, s_apellido, fecha_nac, id_genero }) {
  return llamar('/internal/usuarios', {
    method: 'POST',
    body: JSON.stringify({ nombre, p_apellido, s_apellido, fecha_nac, id_genero }),
  });
}
 
// ── Obtener un Usuario por id ──────────────────
async function obtenerUsuario(idUsuario) {
  return llamar(`/internal/usuarios/${idUsuario}`, { method: 'GET' });
}
 
// ── Obtener la última sesión de test de un Usuario ─
async function obtenerUltimaSesion(idUsuario) {
  return llamar(`/internal/usuarios/${idUsuario}/ultima-sesion`, { method: 'GET' });
}
 
module.exports = {
  SesionServiceError,
  validarGenero,
  crearUsuario,
  obtenerUsuario,
  obtenerUltimaSesion,
};