// ─────────────────────────────────────────────
//  este middleware es OPCIONAL, no obligatorio: el flujo de
//  captura de tests es público y anónimo por diseño (personas
//  sin cuenta también pueden hacer el test). Por eso, si no
//  viene cookie o el token es inválido, simplemente seguimos
//  con req.usuarioAutenticado = null — NO se rechaza la petición
//  aquí.
//
//  Lo que sí hace: si SÍ viene un token válido, deja disponible
//  quién es el usuario autenticado (req.usuarioAutenticado) para
//  que las rutas que lo necesiten (ej. POST /completa cuando
//  mandan id_usuario_existente) puedan comparar identidad y
//  rechazar con un 403 explícito si alguien intenta usar el id
//  de otra persona.
// ─────────────────────────────────────────────

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET; // debe ser EXACTAMENTE el mismo valor que en auth-service sino lannzara un error 403
const COOKIE_NAME = 'semk_token';

function verificarJWT(req, res, next) {
  req.usuarioAutenticado = null;

  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  if (!JWT_SECRET) {
    console.warn('[verificarJWT] JWT_SECRET no configurado en sesion-service; no se puede validar el token.');
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuarioAutenticado = {
      id_usuario: payload.id_usuario,
      id_cuenta:  payload.id_cuenta,
      email:      payload.email,
    };
  } catch (err) {
    // Token presente pero inválido/expirado: no se tumba la petición
    // (puede ser un participante anónimo con una cookie vieja de otra
    // pestaña), simplemente lo tratamos como no autenticado.
    req.usuarioAutenticado = null;
  }

  next();
}

module.exports = verificarJWT;