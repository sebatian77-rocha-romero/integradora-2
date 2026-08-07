//----------------------------------------------
//Este es el único lugar del sistema donde se permite
//  crear o leer un Usuario/Genero fuera de sesion-service:
//  sesion-service es el dueño real de esas tablas.
//----------------------------------------------
const express = require('express');
const router  = express.Router();
 
const { Usuario, Sesion, Genero } = require('../models');
 
// ── GET /internal/generos/:id ─────────────────
// Usado por auth-service en /registro para validar que el
// género que mandó el usuario exista, sin tocar la tabla directo.
router.get('/generos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ ok: false, message: 'ID de género inválido.' });
  }
  try {
    const genero = await Genero.findByPk(id, { raw: true });
    if (!genero) {
      return res.status(404).json({ ok: false, message: 'Género no encontrado.' });
    }
    return res.json({ ok: true, data: genero });
  } catch (err) {
    console.error('[sesion-service][internal] Error en GET /generos/:id:', err);
    return res.status(500).json({ ok: false, message: 'Error interno al validar género.' });
  }
});
 
// ── POST /internal/usuarios ───────────────────
// Crea un Usuario "desnudo" (sin datos académicos/dispositivo,
// eso solo aplica al flujo de test en /completa). Usado por
// auth-service en /registro.
router.post('/usuarios', async (req, res) => {
  const { nombre, p_apellido, s_apellido, fecha_nac, id_genero } = req.body;
 
  if (!nombre || !p_apellido || !fecha_nac || !id_genero) {
    return res.status(400).json({
      ok: false,
      message: 'Faltan datos obligatorios: nombre, p_apellido, fecha_nac, id_genero.',
    });
  }
 
  try {
    const genero = await Genero.findByPk(parseInt(id_genero));
    if (!genero) {
      return res.status(400).json({ ok: false, message: 'Género no válido.' });
    }
 
    const nuevoUsuario = await Usuario.create({
      nombre,
      p_apellido,
      s_apellido: s_apellido || null,
      fecha_nac,
      id_genero: parseInt(id_genero),
    });
 
    return res.status(201).json({ ok: true, data: { id: nuevoUsuario.id } });
  } catch (err) {
    console.error('[sesion-service][internal] Error en POST /usuarios:', err);
    return res.status(500).json({ ok: false, message: 'Error interno al crear usuario.' });
  }
});
 
// ── GET /internal/usuarios/:id ────────────────
// Usado por auth-service en /me para mostrar nombre, apellidos, etc.
router.get('/usuarios/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ ok: false, message: 'ID de usuario inválido.' });
  }
  try {
    const usuario = await Usuario.findByPk(id, { raw: true });
    if (!usuario) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }
    return res.json({ ok: true, data: usuario });
  } catch (err) {
    console.error('[sesion-service][internal] Error en GET /usuarios/:id:', err);
    return res.status(500).json({ ok: false, message: 'Error interno al consultar usuario.' });
  }
});
 
// ── GET /internal/usuarios/:id/ultima-sesion ──
// Usado por auth-service en /login y /me.
router.get('/usuarios/:id/ultima-sesion', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) {
    return res.status(400).json({ ok: false, message: 'ID de usuario inválido.' });
  }
  try {
    const ultimaSesion = await Sesion.findOne({
      where: { id_usuario: id },
      order: [['created_at', 'DESC']],
      raw: true,
    });
    return res.json({ ok: true, data: { sesion_id: ultimaSesion ? ultimaSesion.id : null } });
  } catch (err) {
    console.error('[sesion-service][internal] Error en GET /usuarios/:id/ultima-sesion:', err);
    return res.status(500).json({ ok: false, message: 'Error interno al consultar la última sesión.' });
  }
});
 
module.exports = router;
 