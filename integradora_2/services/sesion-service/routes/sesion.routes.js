//  Catálogos + guardado y consulta de sesiones de test.
//  Nota: /retroalimentacion se movió a feedback-service,
//  porque no necesita base de datos y llama a una API externa (IA).
// ─────────────────────────────────────────────

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

const { evaluarSesion } = require('../utils/service_evaluacion');

// resolver género
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

// ── GET /generos ───────────────────────────────
router.get('/generos', async (req, res) => {
  try {
    const generos = await Genero.findAll({ raw: true });
    res.json({ ok: true, data: generos });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET /carreras ──────────────────────────────
router.get('/carreras', async (req, res) => {
  try {
    const carreras = await Carrera.findAll({ raw: true });
    res.json({ ok: true, data: carreras });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ── POST /completa ─────────────────────────────
router.post('/completa', async (req, res) => {
  const { usuario, academico, dispositivo, stroop, sart, nback, comportamiento, id_usuario_existente } = req.body;

  console.log('[sesion-service] POST /completa — usuario:', JSON.stringify(usuario));
  console.log('[sesion-service] POST /completa — academico:', JSON.stringify(academico));
  console.log('[sesion-service] POST /completa — dispositivo:', JSON.stringify(dispositivo));
  console.log('[sesion-service] POST /completa — id_usuario_existente:', id_usuario_existente);

  if (!academico || !stroop || !sart || !nback) {
    return res.status(400).json({ ok: false, message: 'Faltan datos: academico, stroop, sart, nback.' });
  }
  if (!id_usuario_existente) {
    if (!usuario || !usuario.nombre || !usuario.p_apellido) {
      return res.status(400).json({ ok: false, message: 'nombre y p_apellido son obligatorios.' });
    }
    if (!usuario.fecha_nac) {
      return res.status(400).json({ ok: false, message: 'fecha_nac es obligatorio (YYYY-MM-DD).' });
    }
  }

  const t = await sequelize.transaction();

  try {
    let idUsuario;
    let id_carrera = parseInt(academico.id_carrera) || null;
    if (!id_carrera) id_carrera = await resolverCarrera(academico.carrera, t);

    if (!id_carrera) {
      await t.rollback();
      return res.status(400).json({ ok: false, message: 'Carrera no encontrada en la BD.' });
    }

    if (id_usuario_existente) {
      // Si mandan un id_usuario_existente, exigimos que el JWT del
      // request corresponda EXACTAMENTE a ese usuario. Esto evita que
      // alguien logueado como Usuario A mande el id de Usuario B y le
      // "inyecte" resultados de test a una cuenta que no es la suya.
      //
      // Nota: esto NO afecta el flujo anónimo (personas sin cuenta que
      // hacen el test por primera vez) — ahí simplemente no se manda
      // id_usuario_existente y se sigue por la rama de "crear usuario
      // nuevo" de abajo, sin pedir login.
      if (!req.usuarioAutenticado) {
        await t.rollback();
        console.warn('[sesion-service] Intento de usar id_usuario_existente sin sesión válida. id_usuario_existente:', id_usuario_existente);
        return res.status(401).json({
          ok: false,
          message: 'Debes iniciar sesión para continuar con una cuenta existente.',
        });
      }
      if (parseInt(id_usuario_existente) !== req.usuarioAutenticado.id_usuario) {
        await t.rollback();
        console.warn(
          '[sesion-service] Intento de usar id_usuario_existente ajeno. Autenticado:',
          req.usuarioAutenticado.id_usuario, '| Solicitado:', id_usuario_existente
        );
        return res.status(403).json({
          ok: false,
          message: 'No puedes guardar resultados a nombre de otra cuenta.',
        });
      }

      const usuarioExistente = await Usuario.findByPk(parseInt(id_usuario_existente), { transaction: t });
      if (!usuarioExistente) {
        await t.rollback();
        return res.status(400).json({ ok: false, message: 'La cuenta indicada no existe.' });
      }
      idUsuario = usuarioExistente.id;
      console.log('[sesion-service] Reutilizando usuario existente. idUsuario:', idUsuario);
    } else {
      let id_genero = parseInt(usuario.id_genero) || null;
      if (!id_genero) id_genero = await resolverGenero(usuario.genero, t);

      console.log('[sesion-service] id_genero:', id_genero, '| id_carrera:', id_carrera);

      if (!id_genero) {
        await t.rollback();
        return res.status(400).json({ ok: false, message: 'Genero no encontrado en la BD.' });
      }

      const nuevoUsuario = await Usuario.create({
        p_apellido: usuario.p_apellido,
        s_apellido: usuario.s_apellido || null,
        nombre:     usuario.nombre,
        fecha_nac:  usuario.fecha_nac,
        id_genero,
      }, { transaction: t });

      idUsuario = nuevoUsuario.id;
    }

    await DatosAcademicos.create({
      id_usuario: idUsuario,
      id_carrera,
      grado: parseInt(academico.grado) || 1,
    }, { transaction: t });

    const tipoDispositivo = dispositivo?.dispositivo || null;
    const horasCelular    = parseFloat(dispositivo?.horas_celular) || 0;

    await DatosDispositivo.create({
      id_usuario:               idUsuario,
      horas_celular:            horasCelular,
      apps_distractoras:        dispositivo?.apps_distractoras || [],
      tiempo_pantalla_real_min: dispositivo?.tiempo_pantalla_real_min || null,
      app_mas_usada_real:       dispositivo?.app_mas_usada_real       || null,
      origen:                   dispositivo?.origen || 'web',
      dispositivo:              tipoDispositivo,
      sistema_operativo:        dispositivo?.sistema_operativo || null,
      navegador:                dispositivo?.navegador         || null,
      tipo_red:                 dispositivo?.tipo_red          || null,
    }, { transaction: t });

    const nuevaSesion = await Sesion.create({
      id_usuario: idUsuario,
      completada: 1,
      ip_origen:  req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                  || req.socket?.remoteAddress || null,
    }, { transaction: t });

    const idSesion = nuevaSesion.id;

    await ComportamientoSesion.create({
      id_sesion:         idSesion,
      cambios_pestana:   comportamiento?.cambios_pestana   || 0,
      segundos_fuera:    comportamiento?.segundos_fuera    || 0,
      en_que_test_salio: comportamiento?.en_que_test_salio || [],
      orientacion:       comportamiento?.orientacion       || null,
      tipo_input:        comportamiento?.tipo_input        || null,
      nivel_bateria_pct: comportamiento?.nivel_bateria_pct ?? null,
    }, { transaction: t });

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
      console.log('[sesion-service] stroop_detalle OK — items:', stroop.detalle.length);
    }

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

    await ResultadoNback.create({
      id_sesion:         idSesion,
      nivel_n:           nback.nivel_n          || 2,
      pct_aciertos:      nback.pct_aciertos     || 0,
      aciertos:          nback.aciertos         || 0,
      errores_omision:   nback.errores_omision  || 0,
      errores_comision:  nback.errores_comision || 0,
      total_targets:     nback.total_targets    || 0,
      total_lures:       nback.total_lures ?? nback.total_no_objetivo ?? 0,
      rt_promedio_ms:    nback.rt_promedio_ms   || 0,
      rt_desviacion_ms:  nback.rt_desviacion_ms || 0,
      duracion_total_ms: nback.duracion_total_ms|| 0,
    }, { transaction: t });

    await t.commit();
    console.log('[sesion-service] Sesion guardada. sesion_id:', idSesion, 'usuario_id:', idUsuario);

    return res.status(201).json({
      ok:         true,
      sesion_id:  idSesion,
      usuario_id: idUsuario,
      message:    'Sesion guardada correctamente.',
    });

  } catch (err) {
    await t.rollback();
    console.error('[sesion-service] Error al guardar sesion:', err);

    const isDev = process.env.NODE_ENV !== 'production';
    const resp = { ok: false, message: 'Error interno al guardar los resultados.' };
    if (isDev) {
      resp.error = err.message;
      resp.stack = err.stack;
    }

    return res.status(500).json(resp);
  }
});

// ── GET /:id ────────────────────────────────────
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
    const evaluacion = evaluarSesion({ stroop, sart, nback });
    return res.json({ ok: true, data: { usuario: sesion.Usuario || sesion, sesion, stroop, sart, nback, evaluacion } });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message });
  }
});

// ── GET / ───────────────────────────────────────
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

module.exports = router;