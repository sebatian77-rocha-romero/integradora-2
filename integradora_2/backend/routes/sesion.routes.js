const express = require('express');
const router  = express.Router();
const { Op }  = require('sequelize');

const {
  sequelize,
  Genero, Carrera,
  Usuario, DatosAcademicos, DatosDispositivo,
  Sesion,
  ResultadoStroop, ResultadoSart, ResultadoNback, StroopDetalle,
  ComportamientoSesion,
} = require('../models');

// ── Resolver género ───────────────────────────
async function resolverGenero(valor, t) {
  if (!valor) { const f = await Genero.findOne({ transaction: t }); return f?.id || 1; }
  if (!isNaN(valor)) { const g = await Genero.findByPk(parseInt(valor), { transaction: t }); if (g) return g.id; }
  const g = await Genero.findOne({ where: { descr: { [Op.like]: `%${valor}%` } }, transaction: t });
  if (g) return g.id;
  const any = await Genero.findOne({ transaction: t });
  return any?.id || 1;
}

// ── Resolver carrera ──────────────────────────
async function resolverCarrera(valor, t) {
  if (!valor) return null;
  if (!isNaN(valor)) { const c = await Carrera.findByPk(parseInt(valor), { transaction: t }); if (c) return c.id; }
  const exact = await Carrera.findOne({ where: { descr: valor }, transaction: t });
  if (exact) return exact.id;
  const partial = await Carrera.findOne({ where: { descr: { [Op.like]: `%${valor}%` } }, transaction: t });
  if (partial) return partial.id;
  const todas = await Carrera.findAll({ transaction: t });
  const match = todas.find(c => c.descr.toLowerCase().includes(String(valor).toLowerCase()) || String(valor).toLowerCase().includes(c.descr.toLowerCase()));
  return match?.id || null;
}

// ── GET /api/sesion/generos ───────────────────
router.get('/generos', async (req, res) => {
  try {
    const generos = await Genero.findAll({ raw: true });
    res.json({ ok: true, data: generos });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/sesion/carreras ──────────────────
router.get('/carreras', async (req, res) => {
  try {
    const carreras = await Carrera.findAll({ raw: true });
    res.json({ ok: true, data: carreras });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /api/sesion/completa ─────────────────
router.post('/completa', async (req, res) => {
  const { usuario, academico, dispositivo, stroop, sart, nback, comportamiento } = req.body;

  console.log('[SEMK] POST /completa — usuario:', JSON.stringify(usuario));
  console.log('[SEMK] POST /completa — academico:', JSON.stringify(academico));
  console.log('[SEMK] POST /completa — dispositivo:', JSON.stringify(dispositivo));

  if (!usuario || !academico || !stroop || !sart || !nback) {
    return res.status(400).json({ ok: false, message: 'Faltan datos: usuario, academico, stroop, sart, nback.' });
  }
  if (!usuario.nombre || !usuario.p_apellido) {
    return res.status(400).json({ ok: false, message: 'nombre y p_apellido son obligatorios.' });
  }
  if (!usuario.fecha_nac) {
    return res.status(400).json({ ok: false, message: 'fecha_nac es obligatorio (YYYY-MM-DD).' });
  }

  const t = await sequelize.transaction();

  try {
    // 1. Resolver catálogos
    let id_genero  = parseInt(usuario.id_genero)   || null;
    let id_carrera = parseInt(academico.id_carrera) || null;
    if (!id_genero)  id_genero  = await resolverGenero(usuario.genero, t);
    if (!id_carrera) id_carrera = await resolverCarrera(academico.carrera, t);

    console.log('[SEMK] id_genero:', id_genero, '| id_carrera:', id_carrera);

    if (!id_carrera) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: 'Carrera no encontrada en la BD.' });
    }
    if (!id_genero) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: 'Genero no encontrado en la BD.' });
    }

    // 2. Usuario
    const nuevoUsuario = await Usuario.create({
      p_apellido: usuario.p_apellido,
      s_apellido: usuario.s_apellido || null,
      nombre:     usuario.nombre,
      fecha_nac:  usuario.fecha_nac,
      id_genero,
    }, { transaction: t });

    const idUsuario = nuevoUsuario.id;

    // 3. Datos académicos
    await DatosAcademicos.create({
      id_usuario: idUsuario,
      id_carrera,
      grado: parseInt(academico.grado) || 1,
    }, { transaction: t });

    // 4. Datos dispositivo
    // IMPORTANTE: el campo enum se llama 'dispositivo' en la BD
    // pero en el payload viene dentro del objeto 'dispositivo'
    // como la propiedad 'dispositivo' — hay que leerla explícitamente
    const tipoDispositivo = dispositivo?.dispositivo || null;
    const horasCelular    = parseFloat(dispositivo?.horas_celular) || 0;

    await DatosDispositivo.create({
      id_usuario:               idUsuario,
      horas_celular:            horasCelular,
      apps_distractoras:        dispositivo?.apps_distractoras || [],
      tiempo_pantalla_real_min: dispositivo?.tiempo_pantalla_real_min || null,
      app_mas_usada_real:       dispositivo?.app_mas_usada_real       || null,
      origen:                   dispositivo?.origen || 'web',
      dispositivo:              tipoDispositivo,      // enum: movil|escritorio|tablet
      sistema_operativo:        dispositivo?.sistema_operativo || null,
      navegador:                dispositivo?.navegador         || null,
      tipo_red:                 dispositivo?.tipo_red          || null,
    }, { transaction: t });

    // 5. Sesión
    const nuevaSesion = await Sesion.create({
      id_usuario: idUsuario,
      completada: 1,
      ip_origen:  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                  || req.socket?.remoteAddress || null,
    }, { transaction: t });

    const idSesion = nuevaSesion.id;

    // 5b. Comportamiento de sesion (tracking del frontend)
    await ComportamientoSesion.create({
      id_sesion:         idSesion,
      cambios_pestana:   comportamiento?.cambios_pestana   || 0,
      segundos_fuera:    comportamiento?.segundos_fuera    || 0,
      en_que_test_salio: comportamiento?.en_que_test_salio || [],
      orientacion:       comportamiento?.orientacion       || null,
      tipo_input:        comportamiento?.tipo_input        || null,
      nivel_bateria_pct: comportamiento?.nivel_bateria_pct ?? null,
    }, { transaction: t });

    // 6. Stroop
    await ResultadoStroop.create({
      id_sesion:             idSesion,
      rt_congruente_ms:      stroop.rt_congruente_ms      || 0,
      rt_incongruente_ms:    stroop.rt_incongruente_ms    || 0,
      efecto_stroop_ms:      stroop.efecto_stroop_ms      || 0,
      aciertos_congruente:   stroop.aciertos_congruente   || 0,
      aciertos_incongruente: stroop.aciertos_incongruente || 0,
      errores_congruente:    stroop.errores_congruente     || 0,
      errores_incongruente:  stroop.errores_incongruente  || 0,
      total_items:           stroop.total_items            || 0,
      tasa_error_pct:        stroop.tasa_error_pct         || 0,
      duracion_total_ms:     stroop.duracion_total_ms      || 0,
    }, { transaction: t });

    // 6b. Stroop detalle (item por item)
    if (Array.isArray(stroop.detalle) && stroop.detalle.length) {
      await Promise.all(stroop.detalle.map(d =>
        StroopDetalle.create({
          id_sesion:         idSesion,
          orden:             d.orden,
          tipo:              d.tipo,
          palabra:           d.palabra,
          color_tinta:       d.color_tinta,
          respuesta_usuario: d.respuesta_usuario,
          correcto:          d.correcto,
          rt_ms:             d.rt_ms,
        }, { transaction: t })
      ));
      console.log('[SEMK] stroop_detalle OK — items:', stroop.detalle.length);
    }

    // 7. SART
    await ResultadoSart.create({
      id_sesion:         idSesion,
      errores_omision:   sart.errores_omision   || 0,
      errores_comision:  sart.errores_comision  || 0,
      aciertos:          sart.aciertos          || 0,
      total_go:          sart.total_go          || 0,
      total_nogo:        sart.total_nogo        || 0,
      tasa_omision_pct:  sart.tasa_omision_pct  || 0,
      tasa_comision_pct: sart.tasa_comision_pct || 0,
      rt_promedio_ms:    sart.rt_promedio_ms    || 0,
      rt_desviacion_ms:  sart.rt_desviacion_ms  || 0,
      duracion_total_ms: sart.duracion_total_ms || 0,
    }, { transaction: t });

    // 8. N-Back
    await ResultadoNback.create({
      id_sesion:         idSesion,
      nivel_n:           nback.nivel_n          || 2,
      pct_aciertos:      nback.pct_aciertos     || 0,
      aciertos:          nback.aciertos         || 0,
      errores_omision:   nback.errores_omision  || 0,
      errores_comision:  nback.errores_comision || 0,
      total_targets:     nback.total_targets    || 0,
      total_lures:       nback.total_lures      || 0,
      rt_promedio_ms:    nback.rt_promedio_ms   || 0,
      rt_desviacion_ms:  nback.rt_desviacion_ms || 0,
      duracion_total_ms: nback.duracion_total_ms|| 0,
    }, { transaction: t });

    await t.commit();
    console.log('[SEMK] Sesion guardada. sesion_id:', idSesion, 'usuario_id:', idUsuario);

    return res.status(201).json({
      ok:         true,
      sesion_id:  idSesion,
      usuario_id: idUsuario,
      message:    'Sesion guardada correctamente.',
    });

  } catch (err) {
    await t.rollback();
      console.error('[SEMK] Error al guardar sesion:', err);

      // En entornos de desarrollo devolvemos más detalles para depuración.
      const isDev = process.env.NODE_ENV !== 'production';
      const resp = { ok: false, message: 'Error interno al guardar los resultados.' };
      if (isDev) {
        resp.error = err.message;
        resp.stack = err.stack;
      }

      return res.status(500).json(resp);
  }
});

// ── GET /api/sesion/:id ───────────────────────
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) return res.status(400).json({ ok: false, message: 'ID invalido.' });
  try {
    const sesion = await Sesion.findByPk(id, { include: [{ model: Usuario }] });
    if (!sesion) return res.status(404).json({ ok: false, message: 'Sesion no encontrada.' });
    const [stroop, sart, nback] = await Promise.all([
      ResultadoStroop.findOne({ where: { id_sesion: id }, raw: true }),
      ResultadoSart.findOne(  { where: { id_sesion: id }, raw: true }),
      ResultadoNback.findOne( { where: { id_sesion: id }, raw: true }),
    ]);
    return res.json({ ok: true, data: { usuario: sesion.Usuario || sesion, sesion, stroop, sart, nback } });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /api/sesion ───────────────────────────
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;
    const sesiones = await Sesion.findAll({
      include: [{ model: Usuario }],
      limit: parseInt(limit), offset: parseInt(offset),
      order: [['created_at', 'DESC']],
    });
    return res.json({ ok: true, total: sesiones.length, data: sesiones });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});


// ── POST /api/sesion/retroalimentacion ───────
router.post('/retroalimentacion', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ ok: false, message: 'Falta el prompt.' });
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    if (data.error) {
      console.error('[SEMK] Error DeepSeek:', data.error);
      return res.status(500).json({ ok: false, message: data.error.message });
    }
    res.json({ ok: true, texto: data.choices?.[0]?.message?.content || '' });
  } catch (err) {
    console.error('[SEMK] Error IA:', err.message);
    res.status(500).json({ ok: false, message: err.message });
  }
});

module.exports = router;