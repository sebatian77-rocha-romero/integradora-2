// ─────────────────────────────────────────────
//  Rechaza cualquier petición que NO venga del api-gateway.
//  El gateway inyecta el header x-internal-key con un secreto
//  compartido (INTERNAL_API_KEY) que solo él y los microservicios
//  conocen. Si alguien llama directo a la URL pública de Railway
//  de este servicio (saltándose el gateway), no tendrá ese header
//  y la petición se rechaza aquí, con un 401 explícito.
// ─────────────────────────────────────────────

const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

function verificarInterno(req, res, next) {
  // /health se deja libre: Railway y el propio equipo lo usan
  // para monitoreo y no debe depender del secreto interno.
  if (req.path === '/health') return next();

  if (!INTERNAL_KEY) {
    // Si el servicio no tiene el secreto configurado, es un error
    // de despliegue, no de autenticación: lo dejamos pasar pero
    // avisamos fuerte en consola para no bloquear silenciosamente
    // en local si alguien olvidó el .env.
    console.warn('[verificarInterno] INTERNAL_API_KEY no configurada en este servicio.');
    return next();
  }

  const recibida = req.headers['x-internal-key'];

  if (!recibida || recibida !== INTERNAL_KEY) {
    console.warn(`[verificarInterno] Petición rechazada sin credencial interna válida. IP: ${req.ip}, ruta: ${req.path}`);
    return res.status(401).json({
      ok: false,
      message: 'No autorizado: esta ruta solo acepta peticiones a través del api-gateway.',
    });
  }

  next();
}

module.exports = verificarInterno;