// ─────────────────────────────────────────────
//  auth.routes.js  (auth-service)
//  registro / inicio de sesion con email+password.
//
//  IMPORTANTE (autonomia de datos): este servicio ya NO toca
//  las tablas usuarios/sesiones/generos directo. Esas son
//  dominio de sesion-service. Cuando este servicio necesita
//  crear o leer esa informacion, se la pide por HTTP via
//  utils/sesionClient.js — nunca importa sus modelos.
// ─────────────────────────────────────────────

const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { sequelize, Cuenta } = require('../models');
const sesionClient = require('../utils/sesionClient');

const JWT_SECRET    = process.env.JWT_SECRET || 'cambia_esto_en_produccion';
const COOKIE_NAME    = 'semk_token';
const COOKIE_MAX_MS  = 7 * 24 * 60 * 60 * 1000; // 7 dias

function firmarToken(cuenta) {
  return jwt.sign(
    { id_cuenta: cuenta.id, id_usuario: cuenta.id_usuario, email: cuenta.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function setCookieSesion(res, cuenta) {
  const token = firmarToken(cuenta);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_MS,
  });
}

// ── Validaciones ───────────────────────────────
const validarRegistro = [
  body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
  body('p_apellido').trim().notEmpty().withMessage('El primer apellido es obligatorio.'),
  body('fecha_nac').isISO8601().withMessage('Fecha de nacimiento invalida (YYYY-MM-DD).'),
  body('id_genero').isInt().withMessage('Selecciona un genero.'),
  body('email').isEmail().normalizeEmail().withMessage('Ingresa un correo electronico valido.'),
  body('pass').isLength({ min: 8 }).withMessage('La contrasena debe tener al menos 8 caracteres.')
    .matches(/[0-9]/).withMessage('La contrasena debe incluir al menos un numero.')
    .matches(/[A-Z]/).withMessage('La contrasena debe incluir al menos una mayuscula.'),
  body('c_pass').custom((value, { req }) => {
    if (value !== req.body.pass) throw new Error('Las contrasenas no coinciden.');
    return true;
  }),
];

const validarLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Ingresa un correo electronico valido.'),
  body('pass').notEmpty().withMessage('Ingresa tu contrasena.'),
];

// ── POST /registro ────────────────────────────
router.post('/registro', validarRegistro, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ ok: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  const { nombre, p_apellido, s_apellido, fecha_nac, id_genero, email, pass } = req.body;

  try {
    // 1. Validar genero contra sesion-service (dueno real del catalogo).
    try {
      await sesionClient.validarGenero(parseInt(id_genero));
    } catch (err) {
      if (err instanceof sesionClient.SesionServiceError && err.status === 503) {
        console.error('[auth-service] sesion-service no disponible al validar genero:', err.message);
        return res.status(503).json({ ok: false, message: 'No se pudo validar el genero, intenta de nuevo en unos momentos.' });
      }
      return res.status(400).json({ ok: false, message: 'Genero no valido.' });
    }

    // 2. Verificar que el correo no este registrado (esto SI es dominio propio).
    const yaExiste = await Cuenta.findOne({ where: { email } });
    if (yaExiste) {
      return res.status(409).json({ ok: false, message: 'Ese correo ya esta registrado.' });
    }

    // 3. Crear el Usuario en sesion-service (dueno real de esa tabla).
    let idUsuario;
    try {
      const resultado = await sesionClient.crearUsuario({
        nombre, p_apellido, s_apellido: s_apellido || null, fecha_nac, id_genero: parseInt(id_genero),
      });
      idUsuario = resultado.data.id;
    } catch (err) {
      console.error('[auth-service] Error al crear usuario en sesion-service:', err.message);
      return res.status(503).json({ ok: false, message: 'No se pudo completar el registro, intenta de nuevo.' });
    }

    // 4. Crear la Cuenta local (esto SI es dominio propio de auth-service).
    const hash = await bcrypt.hash(pass, 10);
    let nuevaCuenta;
    try {
      nuevaCuenta = await Cuenta.create({ id_usuario: idUsuario, email, password_hash: hash });
    } catch (err) {
      // El Usuario ya se creo en sesion-service pero la Cuenta fallo aqui.
      // Nota de diseno: esto deja un Usuario "huerfano" sin cuenta asociada.
      // Es una limitacion conocida de este alcance (no implementamos un paso
      // de compensacion/rollback distribuido); en un sistema mas grande esto
      // se resolveria con una saga o un job de limpieza periodico.
      console.error('[auth-service] Cuenta.create fallo tras crear usuario remoto. usuario_id huerfano:', idUsuario, err);
      return res.status(500).json({ ok: false, message: 'Error interno al registrar la cuenta.' });
    }

    setCookieSesion(res, nuevaCuenta);

    return res.status(201).json({
      ok: true, usuario_id: idUsuario, email: nuevaCuenta.email,
      message: 'Cuenta creada correctamente.',
    });
  } catch (err) {
    console.error('[auth-service] Error en /registro:', err);
    return res.status(500).json({ ok: false, message: 'Error interno al registrar la cuenta.' });
  }
});

// ── POST /login ────────────────────────────────
router.post('/login', validarLogin, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ ok: false, message: errors.array()[0].msg });
  }

  const { email, pass } = req.body;

  try {
    const cuenta = await Cuenta.findOne({ where: { email } });
    if (!cuenta) {
      return res.status(401).json({ ok: false, message: 'Correo o contrasena incorrectos.' });
    }

    const coincide = await bcrypt.compare(pass, cuenta.password_hash);
    if (!coincide) {
      return res.status(401).json({ ok: false, message: 'Correo o contrasena incorrectos.' });
    }

    setCookieSesion(res, cuenta);

    // Best-effort: si sesion-service no responde, el login NO debe fallar
    // por esto — solo se pierde el dato de "ultima sesion", no es critico.
    let ultimaSesionId = null;
    try {
      const resultado = await sesionClient.obtenerUltimaSesion(cuenta.id_usuario);
      ultimaSesionId = resultado.data.sesion_id;
    } catch (err) {
      console.warn('[auth-service] No se pudo obtener ultima sesion (no bloquea el login):', err.message);
    }

    return res.json({
      ok: true,
      usuario_id: cuenta.id_usuario,
      email: cuenta.email,
      ultima_sesion_id: ultimaSesionId,
    });
  } catch (err) {
    console.error('[auth-service] Error en /login:', err);
    return res.status(500).json({ ok: false, message: 'Error interno al iniciar sesion.' });
  }
});

// ── POST /logout ───────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// ── GET /me ─────────────────────────────────────
router.get('/me', async (req, res) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.json({ ok: true, logueado: false });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    return res.json({ ok: true, logueado: false });
  }

  // Datos del usuario SI son criticos para /me (es el punto de la ruta):
  // si sesion-service no responde, hay que decirlo explicitamente en vez
  // de inventar una respuesta o fallar en silencio.
  let usuario;
  try {
    const resultado = await sesionClient.obtenerUsuario(payload.id_usuario);
    usuario = resultado.data;
  } catch (err) {
    if (err instanceof sesionClient.SesionServiceError && err.status === 503) {
      console.error('[auth-service] sesion-service no disponible en /me:', err.message);
      return res.status(503).json({ ok: false, message: 'No se pudo verificar tu sesion, intenta de nuevo.' });
    }
    // 404: el usuario ya no existe en sesion-service (dato inconsistente/borrado).
    res.clearCookie(COOKIE_NAME);
    return res.json({ ok: true, logueado: false });
  }

  // Best-effort: la ultima sesion de test no es critica para /me.
  let ultimaSesionId = null;
  try {
    const resultadoSesion = await sesionClient.obtenerUltimaSesion(payload.id_usuario);
    ultimaSesionId = resultadoSesion.data.sesion_id;
  } catch (err) {
    console.warn('[auth-service] No se pudo obtener ultima sesion en /me (no bloquea):', err.message);
  }

  return res.json({
    ok: true, logueado: true,
    usuario_id: payload.id_usuario,
    email: payload.email,
    nombre: usuario.nombre,
    p_apellido: usuario.p_apellido,
    s_apellido: usuario.s_apellido,
    fecha_nac: usuario.fecha_nac,
    id_genero: usuario.id_genero,
    ultima_sesion_id: ultimaSesionId,
  });
});

module.exports = router;