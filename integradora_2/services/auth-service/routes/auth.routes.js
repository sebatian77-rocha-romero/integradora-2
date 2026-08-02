// ─────────────────────────────────────────────
//  auth.routes.js  (auth-service)
//  Registro / inicio de sesión con email+password.
//  Sin cambios de lógica respecto al monolito original,
//  solo vive ahora dentro de su propio microservicio.
// ─────────────────────────────────────────────

const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const { sequelize, Usuario, Cuenta, Genero, Sesion } = require('../models');

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
  body('fecha_nac').isISO8601().withMessage('Fecha de nacimiento inválida (YYYY-MM-DD).'),
  body('id_genero').isInt().withMessage('Selecciona un género.'),
  body('email').isEmail().normalizeEmail().withMessage('Ingresa un correo electrónico válido.'),
  body('pass').isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
    .matches(/[0-9]/).withMessage('La contraseña debe incluir al menos un número.')
    .matches(/[A-Z]/).withMessage('La contraseña debe incluir al menos una mayúscula.'),
  body('c_pass').custom((value, { req }) => {
    if (value !== req.body.pass) throw new Error('Las contraseñas no coinciden.');
    return true;
  }),
];

const validarLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Ingresa un correo electrónico válido.'),
  body('pass').notEmpty().withMessage('Ingresa tu contraseña.'),
];

// ── POST /registro ────────────────────────────
router.post('/registro', validarRegistro, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ ok: false, message: errors.array()[0].msg, errors: errors.array() });
  }

  const { nombre, p_apellido, s_apellido, fecha_nac, id_genero, email, pass } = req.body;

  const t = await sequelize.transaction();
  try {
    const genero = await Genero.findByPk(parseInt(id_genero), { transaction: t });
    if (!genero) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: 'Género no válido.' });
    }

    const yaExiste = await Cuenta.findOne({ where: { email }, transaction: t });
    if (yaExiste) {
      await t.rollback();
      return res.status(409).json({ ok: false, message: 'Ese correo ya está registrado.' });
    }

    const nuevoUsuario = await Usuario.create({
      nombre, p_apellido, s_apellido: s_apellido || null,
      fecha_nac, id_genero: parseInt(id_genero),
    }, { transaction: t });

    const hash = await bcrypt.hash(pass, 10);
    const nuevaCuenta = await Cuenta.create({
      id_usuario: nuevoUsuario.id, email, password_hash: hash,
    }, { transaction: t });

    await t.commit();
    setCookieSesion(res, nuevaCuenta);

    return res.status(201).json({
      ok: true, usuario_id: nuevoUsuario.id, email: nuevaCuenta.email,
      message: 'Cuenta creada correctamente.',
    });
  } catch (err) {
    await t.rollback();
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
      return res.status(401).json({ ok: false, message: 'Correo o contraseña incorrectos.' });
    }

    const coincide = await bcrypt.compare(pass, cuenta.password_hash);
    if (!coincide) {
      return res.status(401).json({ ok: false, message: 'Correo o contraseña incorrectos.' });
    }

    setCookieSesion(res, cuenta);

    const ultimaSesion = await Sesion.findOne({
      where: { id_usuario: cuenta.id_usuario },
      order: [['created_at', 'DESC']],
    });

    return res.json({
      ok: true,
      usuario_id: cuenta.id_usuario,
      email: cuenta.email,
      ultima_sesion_id: ultimaSesion ? ultimaSesion.id : null,
    });
  } catch (err) {
    console.error('[auth-service] Error en /login:', err);
    return res.status(500).json({ ok: false, message: 'Error interno al iniciar sesión.' });
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

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const usuario = await Usuario.findByPk(payload.id_usuario);
    if (!usuario) return res.json({ ok: true, logueado: false });

    const ultimaSesion = await Sesion.findOne({
      where: { id_usuario: payload.id_usuario },
      order: [['created_at', 'DESC']],
    });

    return res.json({
      ok: true, logueado: true,
      usuario_id: payload.id_usuario,
      email: payload.email,
      nombre: usuario.nombre,
      p_apellido: usuario.p_apellido,
      s_apellido: usuario.s_apellido,
      fecha_nac: usuario.fecha_nac,
      id_genero: usuario.id_genero,
      ultima_sesion_id: ultimaSesion ? ultimaSesion.id : null,
    });
  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    return res.json({ ok: true, logueado: false });
  }
});

module.exports = router;
