// ─────────────────────────────────────────────
//  resultados.js
//  Carga los datos del participante desde:
//  1. sessionStorage (si viene directo del test)
//  2. GET /api/sesion/:id (si viene por URL ?id=N)
//  Rellena la página y genera retroalimentación con IA.
// ─────────────────────────────────────────────

let usuario = {}, stroop = {}, sart = {}, nback = {};

// ── Determinar fuente de datos ────────────────
async function cargarDatos() {
  const params   = new URLSearchParams(window.location.search);
  const sesionId = params.get('id');

  if (sesionId) {
    // Vino redirigido desde nback.js con un id real
    try {
      const res  = await fetch('/api/sesion/' + sesionId);
      const json = await res.json();
      if (json.ok) {
        usuario = json.data.usuario || json.data.sesion?.Usuario || json.data.sesion || {};
        stroop  = json.data.stroop  || {};
        sart    = json.data.sart    || {};
        nback   = json.data.nback   || {};
      } else {
        console.warn('[SEMK] Sesión no encontrada, usando sessionStorage como fallback.');
        cargarDesdeSession();
      }
    } catch (err) {
      console.warn('[SEMK] Error al consultar API, usando sessionStorage:', err.message);
      cargarDesdeSession();
    }
  } else {
    // No hay id en la URL — usar sessionStorage directamente
    cargarDesdeSession();
  }

  renderizar();
}

function cargarDesdeSession() {
  usuario = JSON.parse(sessionStorage.getItem('semk_usuario') || '{}');
  stroop  = JSON.parse(sessionStorage.getItem('semk_stroop')  || '{}');
  sart    = JSON.parse(sessionStorage.getItem('semk_sart')    || '{}');
  nback   = JSON.parse(sessionStorage.getItem('semk_nback')   || '{}');
}

// ── Renderizar toda la página ─────────────────
function renderizar() {
  renderUsuario();
  renderStroop();
  renderSart();
  renderNback();
  renderScore();
  renderBarras();
  renderInterpretaciones();
}

// ── Usuario ───────────────────────────────────
function renderUsuario() {
  const nombre = [usuario.nombre, usuario.p_apellido, usuario.s_apellido].filter(Boolean).join(' ') || 'Participante';
  document.getElementById('user-name').textContent = nombre;

  const chips = document.getElementById('user-chips');
  chips.innerHTML = '';
  const addChip = (txt, cls = '') => {
    const s = document.createElement('span');
    s.className = 'chip' + (cls ? ' ' + cls : '');
    s.textContent = txt;
    chips.appendChild(s);
  };
  if (usuario.carrera)   addChip(usuario.carrera);
  if (usuario.grado)     addChip('Grado ' + usuario.grado);
  if (usuario.horas_celular) addChip(usuario.horas_celular + ' hrs/día celular', 'violet');
  const app = Array.isArray(usuario.apps_distractoras)
    ? usuario.apps_distractoras[0]
    : usuario.apps_distractoras || usuario.appTop;
  if (app) addChip(app, 'green');
  if (usuario.dispositivo) addChip(usuario.dispositivo);
}

// ── Badge helper ──────────────────────────────
function setBadge(id, label, cls) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = label;
  el.className   = 'badge ' + cls;
}

// ── Stroop ────────────────────────────────────
function renderStroop() {
  if (!stroop.rt_congruente_ms) return;

  document.getElementById('st-rtc').textContent = stroop.rt_congruente_ms + ' ms';
  document.getElementById('st-rti').textContent = stroop.rt_incongruente_ms + ' ms';

  const ef    = stroop.efecto_stroop_ms;
  const efEl  = document.getElementById('st-ef');
  efEl.textContent = ef + ' ms';
  efEl.className   = 'mv ' + (ef < 150 ? 'g' : ef < 200 ? 'y' : 'r');

  const errEl = document.getElementById('st-err');
  errEl.textContent = stroop.tasa_error_pct + '%';
  errEl.className   = 'mv ' + (stroop.tasa_error_pct < 15 ? 'g' : stroop.tasa_error_pct < 25 ? 'y' : 'r');

  setBadge('badge-stroop',
    ef < 150 ? 'ÓPTIMO' : ef < 200 ? 'MODERADO' : 'BAJO',
    ef < 150 ? 'good'   : ef < 200 ? 'warn'     : 'bad');
}

// ── SART ──────────────────────────────────────
function renderSart() {
  if (sart.errores_comision === undefined) return;

  const comEl = document.getElementById('sa-com');
  comEl.textContent = sart.errores_comision;
  comEl.className   = 'mv ' + (sart.errores_comision <= 2 ? 'g' : sart.errores_comision <= 4 ? 'y' : 'r');

  const omEl = document.getElementById('sa-om');
  omEl.textContent = sart.errores_omision;
  omEl.className   = 'mv ' + (sart.errores_omision <= 2 ? 'g' : 'y');

  document.getElementById('sa-rt').textContent = sart.rt_promedio_ms + ' ms';

  const devEl = document.getElementById('sa-dev');
  devEl.textContent = '±' + sart.rt_desviacion_ms + ' ms';
  devEl.className   = 'mv ' + (sart.rt_desviacion_ms < 60 ? 'g' : sart.rt_desviacion_ms < 90 ? 'y' : 'r');

  const tot = sart.errores_comision + sart.errores_omision;
  setBadge('badge-sart',
    tot <= 2 ? 'ÓPTIMO' : tot <= 5 ? 'MODERADO' : 'BAJO',
    tot <= 2 ? 'good'   : tot <= 5 ? 'warn'     : 'bad');
}

// ── N-Back ────────────────────────────────────
function renderNback() {
  if (nback.pct_aciertos === undefined) return;

  const pctEl = document.getElementById('nb-pct');
  pctEl.textContent = nback.pct_aciertos + '%';
  pctEl.className   = 'mv ' + (nback.pct_aciertos >= 75 ? 'g' : nback.pct_aciertos >= 60 ? 'y' : 'r');

  document.getElementById('nb-rt').textContent = nback.rt_promedio_ms + ' ms';
  document.getElementById('nb-om').textContent = nback.errores_omision;

  const fpEl = document.getElementById('nb-fp');
  fpEl.textContent = nback.errores_comision;
  fpEl.className   = 'mv ' + (nback.errores_comision <= 1 ? 'g' : 'y');

  setBadge('badge-nback',
    nback.pct_aciertos >= 75 ? 'ÓPTIMO' : nback.pct_aciertos >= 60 ? 'MODERADO' : 'BAJO',
    nback.pct_aciertos >= 75 ? 'good'   : nback.pct_aciertos >= 60 ? 'warn'     : 'bad');
}

// ── Score global ──────────────────────────────
function renderScore() {
  let score = 0;
  if (stroop.efecto_stroop_ms !== undefined)
    score += stroop.efecto_stroop_ms < 150 ? 33 : stroop.efecto_stroop_ms < 200 ? 22 : 11;
  if (sart.errores_comision !== undefined) {
    const t = sart.errores_comision + sart.errores_omision;
    score += t <= 2 ? 33 : t <= 5 ? 22 : 11;
  }
  if (nback.pct_aciertos !== undefined)
    score += nback.pct_aciertos >= 75 ? 34 : nback.pct_aciertos >= 60 ? 23 : 12;

  const el = document.getElementById('score-val');
  if (!el) return;
  el.textContent = score;
  el.style.color = score >= 80 ? '#00e676' : score >= 55 ? '#ffaa00' : '#ff4444';
}

// ── Barras RT ─────────────────────────────────
function renderBarras() {
  const maxRT = Math.max(
    stroop.rt_incongruente_ms || 0,
    sart.rt_promedio_ms       || 0,
    nback.rt_promedio_ms      || 0,
    700
  );
  const setBar = (id, ms) => {
    const el = document.getElementById(id);
    if (!el || !ms) return;
    el.textContent = ms + ' ms';
    setTimeout(() => {
      el.style.width = Math.min(Math.round((ms / maxRT) * 100), 100) + '%';
    }, 300);
  };
  setBar('bar-stc', stroop.rt_congruente_ms);
  setBar('bar-sti', stroop.rt_incongruente_ms);
  setBar('bar-sa',  sart.rt_promedio_ms);
  setBar('bar-nb',  nback.rt_promedio_ms);
}

// ── Interpretaciones ──────────────────────────
function renderInterpretaciones() {
  // Stroop
  if (stroop.efecto_stroop_ms !== undefined) {
    const ef = stroop.efecto_stroop_ms;
    document.getElementById('int-stroop').textContent =
      ef < 150 ? 'Excelente control inhibitorio. Ignoras distractores con facilidad.'
    : ef < 200 ? 'Interferencia moderada (' + ef + ' ms). Algo de dificultad para ignorar información irrelevante.'
    :            'Interferencia alta (' + ef + ' ms). El cerebro tarda considerablemente más ante estímulos conflictivos.';
  }

  // SART
  if (sart.errores_comision !== undefined) {
    const com = sart.errores_comision;
    const dev = sart.rt_desviacion_ms;
    document.getElementById('int-sart').textContent =
      com <= 2 && dev < 60
        ? 'Atención sostenida estable. Mantuviste el foco de forma consistente durante el test.'
    : com > 3 || dev > 80
        ? 'Dificultad para mantener foco prolongado. Alta variabilidad (±' + dev + ' ms) y ' + com + ' respuestas impulsivas.'
        : 'Atención sostenida moderada. Algunos lapsos de concentración durante el test.';
  }

  // N-Back
  if (nback.pct_aciertos !== undefined) {
    const pct = nback.pct_aciertos;
    document.getElementById('int-nback').textContent =
      pct >= 75 ? 'Memoria de trabajo dentro del rango esperado. Buen manejo de información simultánea.'
    : pct >= 60 ? 'Memoria de trabajo moderada (' + pct + '%). Cierta dificultad para actualizar información en tiempo real.'
    :             'Memoria de trabajo baja (' + pct + '%). El 2-back resultó exigente, lo cual se asocia con alta exposición a contenido de formato corto.';
  }

  // Dimensión más afectada
  const peorMap = {
    'Atención selectiva (Stroop)': stroop.efecto_stroop_ms > 200 ? 0 : stroop.efecto_stroop_ms > 150 ? 1 : 2,
    'Atención sostenida (SART)':   (sart.errores_comision + sart.errores_omision) > 5 ? 0 : (sart.errores_comision + sart.errores_omision) > 2 ? 1 : 2,
    'Memoria de trabajo (N-Back)': nback.pct_aciertos < 60 ? 0 : nback.pct_aciertos < 75 ? 1 : 2,
  };
  const peor = Object.entries(peorMap).sort((a, b) => a[1] - b[1])[0];
  if (peor) {
    document.getElementById('int-peor').textContent =
      peor[0] + ' — presenta mayor oportunidad de mejora según los resultados obtenidos.';
  }
}

// ── Retroalimentación IA ──────────────────────
async function generarRetro() {
  const btn = document.getElementById('ia-btn');
  const out = document.getElementById('ia-out');
  btn.disabled    = true;
  btn.textContent = '[ ANALIZANDO... ]';
  out.className   = 'ia-body muted';
  out.innerHTML   = 'Procesando tu perfil cognitivo<span class="cursor"></span>';

  const app = Array.isArray(usuario.apps_distractoras)
    ? usuario.apps_distractoras[0]
    : usuario.apps_distractoras || usuario.appTop || '—';

  const prompt = `Eres un psicólogo educativo de la Universidad Tecnológica de Durango. Un estudiante acaba de completar una evaluación cognitiva. Sus resultados son:

Test Stroop (atención selectiva): efecto de ${stroop.efecto_stroop_ms || '—'} ms (esperado 120-150 ms), tasa de error ${stroop.tasa_error_pct || '—'}%.
Test SART (atención sostenida): ${sart.errores_comision || 0} comisiones, ${sart.errores_omision || 0} omisiones, variabilidad ±${sart.rt_desviacion_ms || '—'} ms.
Test N-Back 2-back (memoria de trabajo): ${nback.pct_aciertos || '—'}% de aciertos (umbral esperado 75%).
Perfil: ${usuario.horas_celular || '—'} horas de celular al día. App principal: ${app}.

Escribe una retroalimentación en español de exactamente 3 párrafos cortos. Párrafo 1: qué dicen los resultados en lenguaje simple, sin números técnicos. Párrafo 2: cuál dimensión está más afectada y por qué importa para el rendimiento académico diario. Párrafo 3: exactamente 2 recomendaciones concretas y prácticas que pueda aplicar esta semana. Tono: empático, directo, motivador. Habla de tú. Sin diagnóstico clínico. Sin tecnicismos.`;

  try {
    const res = await fetch('/api/sesion/retroalimentacion', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ prompt })
    });
    const data  = await res.json();
    const texto = data.texto || 'No se pudo generar la retroalimentación.';

    out.className = 'ia-body';
    out.innerHTML = '';
    let i = 0;
    (function type() {
      if (i < texto.length) {
        out.innerHTML = texto.slice(0, i + 1).replace(/\n\n/g, '<br><br>') + '<span class="cursor"></span>';
        i++;
        setTimeout(type, 10);
      } else {
        out.innerHTML   = texto.replace(/\n\n/g, '<br><br>');
        btn.textContent = '[ REGENERAR ]';
        btn.disabled    = false;
      }
    })();

  } catch (err) {
    console.error('[SEMK] Error IA:', err);
    out.className   = 'ia-body muted';
    out.textContent = 'Error al conectar con la IA. Verifica tu conexión e intenta de nuevo.';
    btn.textContent = '[ INTENTAR DE NUEVO ]';
    btn.disabled    = false;
  }
}

// ── Arrancar ──────────────────────────────────
document.addEventListener('DOMContentLoaded', cargarDatos);