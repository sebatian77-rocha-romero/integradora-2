// ─────────────────────────────────────────────
//  nback.js
//  Lógica completa del Test N-Back.
//  Fase 1: 10 ítems de práctica (1-back)
//  Fase 2: 20 ítems reales     (2-back)
//  Se inicializa llamando a initNback().
//  Al terminar guarda resultados y llama a
//  enviarResultados() para subir todo al backend.
// ─────────────────────────────────────────────

const NBACK_LETTERS  = ['A','B','C','D','F','G','H','J','K','L'];
const NBACK_PRACTICA = 10;  // ítems de calentamiento (1-back, no se guardan)
const NBACK_REAL     = 20;  // ítems de medición      (2-back, se guardan)
const NBACK_STIM_MS  = 2000;
const NBACK_BLANK_MS = 300;
const NBACK_DURATION = 150; // segundos totales

// ── Estado interno ────────────────────────────
let nback = {
  seq: [], idx: 0, fase: 'practica', // 'practica' | 'real'
  n: 1, // empieza en 1-back (práctica), sube a 2 en fase real
  aciertos: 0, errores: 0, omisiones: 0,
  rts: [], rtStart: 0,
  secsLeft: NBACK_DURATION,
  timerInterval: null, stimTimeout: null,
  waitingResponse: false, currentItem: null,
  historia: [],
};

// ── Utilidades ────────────────────────────────
function nbackDetail() { return document.querySelector('details:nth-of-type(3)'); }

function nbackRandLetter(exclude) {
  let l;
  do { l = NBACK_LETTERS[Math.floor(Math.random() * NBACK_LETTERS.length)]; }
  while (l === exclude);
  return l;
}

function nbackBuildSeq(n, total, matchRatio = 0.35) {
  const seq = [];
  for (let i = 0; i < total; i++) {
    if (i >= n && Math.random() < matchRatio) {
      seq.push({ letter: seq[i - n].letter, isMatch: true });
    } else {
      const excl = i >= n ? seq[i - n].letter : null;
      seq.push({ letter: nbackRandLetter(excl), isMatch: false });
    }
  }
  return seq;
}

function nbackUpdateTimer() {
  const m  = String(Math.floor(nback.secsLeft / 60)).padStart(2,'0');
  const s  = String(nback.secsLeft % 60).padStart(2,'0');
  const el = nbackDetail()?.querySelector('.timer');
  if (el) {
    el.textContent = m + ':' + s;
    el.style.color = nback.secsLeft <= 20 ? '#ff4444' : '';
  }
}

function nbackUpdateStats() {
  const detail = nbackDetail();
  if (!detail) return;
  detail.querySelector('#s-aciertos').textContent = nback.aciertos;
  detail.querySelector('#s-errores').textContent  = nback.errores;
  const avg = nback.rts.length
    ? Math.round(nback.rts.reduce((a,b)=>a+b,0) / nback.rts.length) : 0;
  detail.querySelector('#s-rt').textContent = avg ? avg + 'ms' : '—';
}

function nbackUpdateProgress() {
  const detail = nbackDetail();
  if (!detail) return;
  const numEl   = detail.querySelector('#item-num');
  const totalEl = detail.querySelector('#item-total');
  if (numEl)   numEl.textContent   = nback.idx + 1;
  if (totalEl) totalEl.textContent = nback.fase === 'practica' ? NBACK_PRACTICA : NBACK_REAL;

  // barra inversa por estímulo
  const barra = detail.querySelector('.barra-iversa');
  if (barra) {
    barra.style.transition = 'none';
    barra.style.width      = '100%';
    barra.style.height     = '4px';
    barra.style.background = '#7b2fff';
    barra.style.borderRadius = '2px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      barra.style.transition = `width ${NBACK_STIM_MS}ms linear`;
      barra.style.width = '0%';
    }));
  }
}

function nbackFeedback(msg, color) {
  const estEl = nbackDetail()?.querySelector('.est');
  if (!estEl) return;
  estEl.style.color    = color;
  estEl.style.fontSize = '1rem';
  estEl.textContent    = msg;
}

function nbackShowLetter(letter) {
  const estEl = nbackDetail()?.querySelector('.est');
  if (!estEl) return;
  estEl.style.color    = '#7b2fff';
  estEl.style.fontSize = '10rem';
  estEl.textContent    = letter;
}

// ── Mostrar estímulo ──────────────────────────
function nbackNext() {
  const totalFase = nback.fase === 'practica' ? NBACK_PRACTICA : NBACK_REAL;

  if (nback.idx >= totalFase) {
    if (nback.fase === 'practica') {
      // Pasar a fase real (2-back)
      nbackFeedback('PRÁCTICA TERMINADA — INICIANDO FASE REAL (2-back)', '#00e676');
      setTimeout(() => {
        nback.fase   = 'real';
        nback.n      = 2;
        nback.idx    = 0;
        nback.seq    = nbackBuildSeq(2, NBACK_REAL);
        nback.historia = [];
        nbackNext();
      }, 2000);
      return;
    } else {
      nbackEnd();
      return;
    }
  }

  nback.waitingResponse = true;
  nback.currentItem     = nback.seq[nback.idx];
  nback.historia.push(nback.currentItem.letter);
  nback.rtStart         = performance.now();

  nbackShowLetter(nback.currentItem.letter);
  nbackUpdateProgress();

  // Indicador de historial (últimas n letras)
  const histLabel = nback.historia.slice(-3).join(' → ');
  const detail    = nbackDetail();
  let histEl = detail?.querySelector('.nback-hist');
  if (!histEl && detail) {
    histEl = document.createElement('div');
    histEl.className = 'nback-hist';
    histEl.style.cssText = 'font-size:1.25rem;color:#7b2fff;margin:6px 0;letter-spacing:2px;';
    detail.querySelector('.estimulo')?.after(histEl);
  }
  if (histEl) histEl.textContent = 'SECUENCIA: ' + histLabel;

  nback.stimTimeout = setTimeout(() => {
    if (!nback.waitingResponse) return;
    nback.waitingResponse = false;

    // Si era un match y no respondió → omisión
    if (nback.idx >= nback.n && nback.currentItem.isMatch) {
      nback.omisiones++;
      nbackFeedback('— OMISIÓN: era coincidencia', '#ffaa00');
    }

    nback.idx++;
    setTimeout(nbackNext, NBACK_BLANK_MS);
  }, NBACK_STIM_MS);
}

// ── Botón COINCIDEN ───────────────────────────
function nbackCoincidir() {
  if (!nback.waitingResponse) return;
  nback.waitingResponse = false;
  clearTimeout(nback.stimTimeout);

  const rt      = Math.round(performance.now() - nback.rtStart);
  const esMatch = nback.idx >= nback.n && nback.currentItem.isMatch;

  if (esMatch) {
    nback.aciertos++;
    nback.rts.push(rt);
    nbackFeedback('✓ CORRECTO — ' + rt + 'ms', '#00e676');
  } else {
    nback.errores++;
    nbackFeedback('✗ FALSO POSITIVO — no era coincidencia', '#ff4444');
  }

  nbackUpdateStats();
  nback.idx++;
  setTimeout(nbackNext, NBACK_BLANK_MS);
}

// ── Fin del test ──────────────────────────────
function nbackEnd() {
  clearInterval(nback.timerInterval);
  clearTimeout(nback.stimTimeout);

  const totalTargets = nback.seq.filter(i => i.isMatch).length;
  const totalLures   = nback.seq.length - totalTargets;
  const avgRt        = nback.rts.length
    ? Math.round(nback.rts.reduce((a,b)=>a+b,0) / nback.rts.length) : 0;

  let rtDev = 0;
  if (nback.rts.length > 1) {
    const mean = avgRt;
    rtDev = Math.round(Math.sqrt(
      nback.rts.reduce((s,r) => s + Math.pow(r - mean, 2), 0) / nback.rts.length
    ));
  }

  const pctAciertos = totalTargets
    ? ((nback.aciertos / totalTargets) * 100).toFixed(1) : '0.0';

  const resultadoNback = {
    nivel_n:          2,
    pct_aciertos:     parseFloat(pctAciertos),
    aciertos:         nback.aciertos,
    errores_omision:  nback.omisiones,
    errores_comision: nback.errores,
    total_targets:    totalTargets,
    total_lures:      totalLures,
    rt_promedio_ms:   avgRt,
    rt_desviacion_ms: rtDev,
    duracion_total_ms:(NBACK_DURATION - nback.secsLeft) * 1000,
  };
  sessionStorage.setItem('semk_nback', JSON.stringify(resultadoNback));

  nbackFeedback('✓ BATERÍA COMPLETA — ENVIANDO RESULTADOS...', '#00e676');

  // Enviar todo al backend
  setTimeout(enviarResultados, 1000);
}

// ── Enviar resultados al backend ──────────────
async function enviarResultados() {
  const usuario = JSON.parse(sessionStorage.getItem('semk_usuario') || '{}');
  const stroop  = JSON.parse(sessionStorage.getItem('semk_stroop')  || '{}');
  const sart    = JSON.parse(sessionStorage.getItem('semk_sart')    || '{}');
  const nbackR  = JSON.parse(sessionStorage.getItem('semk_nback')   || '{}');

  // Datos automáticos del dispositivo
  const ua  = navigator.userAgent;
  const dispositivo = /Mobi|Android/i.test(ua) ? 'movil'
    : /iPad|Tablet/i.test(ua) ? 'tablet' : 'escritorio';
  const tipo_red = navigator.connection?.effectiveType || null;

  const payload = {
    usuario: {
      nombre:    usuario.nombre + ' ' + usuario.apellido,
      edad:      parseInt(usuario.edad),
      genero:    usuario.genero === 'Masculino' ? 'M'
               : usuario.genero === 'Femenino'  ? 'F' : 'NE',
      carrera:   usuario.carrera,
      grado:     1, // puedes agregar campo grado al formulario
      horas_celular: parseFloat(usuario.horasCel) || 0,
      apps_distractoras: [usuario.appTop],
      origen:    'web',
      dispositivo,
      sistema_operativo: ua.match(/\(([^)]+)\)/)?.[1]?.split(';')[0] || null,
      navegador: ua.match(/(Chrome|Safari|Firefox|Edge)\/[\d.]+/)?.[0] || null,
      tipo_red,
    },
    stroop:  stroop,
    sart:    sart,
    nback:   nbackR,
  };

  try {
    const res = await fetch('/api/sesion/completa', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      nbackFeedback('✓ RESULTADOS GUARDADOS CORRECTAMENTE', '#00e676');
      // Redirigir a resultados
      setTimeout(() => { window.location.href = '/resultados.html?id=' + data.sesion_id; }, 1500);
    } else {
      throw new Error(data.message || 'Error del servidor');
    }
  } catch (err) {
    console.error('Error al enviar resultados:', err);
    nbackFeedback('⚠ ERROR AL GUARDAR — revisa la consola', '#ff4444');
  }
}

// ── Inicializar ───────────────────────────────
function initNback() {
  nback = {
    seq:      nbackBuildSeq(1, NBACK_PRACTICA), // empieza con 1-back práctica
    idx:      0, fase: 'practica', n: 1,
    aciertos: 0, errores: 0, omisiones: 0,
    rts: [], rtStart: 0,
    secsLeft: NBACK_DURATION,
    timerInterval: null, stimTimeout: null,
    waitingResponse: false, currentItem: null,
    historia: [],
  };

  nbackDetail()?.setAttribute('open', '');

  // Reasignar onclick del botón COINCIDEN
  const btnCoinc = nbackDetail()?.querySelector('.res');
  if (btnCoinc) btnCoinc.onclick = nbackCoincidir;

  // Mostrar instrucción de práctica
  nbackFeedback('FASE DE PRÁCTICA (1-back) — INICIANDO...', '#7b2fff');

  nback.timerInterval = setInterval(() => {
    nback.secsLeft--;
    nbackUpdateTimer();
    if (nback.secsLeft <= 0) {
      clearInterval(nback.timerInterval);
      nbackEnd();
    }
  }, 1000);

  nbackUpdateTimer();
  setTimeout(nbackNext, 1500);
}

