// ─────────────────────────────────────────────
//  nback.js
//  Lógica completa del Test N-Back.
//  Fase 1: 10 ítems de práctica (1-back)
//  Fase 2: 20 ítems reales     (2-back)
//  Se inicializa llamando a initNback().
//  Al terminar guarda resultados y llama a
//  enviarResultados() para subir todo al backend.
// ─────────────────────────────────────────────

const NBACK_LETTERS   = ['A','B','C','D','F','G','H','J','K','L'];
const NBACK_PRACTICA  = 10;
const NBACK_REAL      = 20;
const NBACK_STIM_MS   = 2000;
const NBACK_BLANK_MS  = 300;
const NBACK_DURATION  = 150;
 
let nback = {};
let nbackBlankActive = false;
 
// ── Utilidades ────────────────────────────────
function nbackDetail() { return document.querySelector('details:nth-of-type(3)'); }
function nbackGet(sel) { return nbackDetail()?.querySelector(sel); }
 
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
  const m  = String(Math.floor(nback.secsLeft / 60)).padStart(2, '0');
  const s  = String(nback.secsLeft % 60).padStart(2, '0');
  const el = nbackGet('.timer');
  if (!el) return;
  el.textContent = m + ':' + s;
  el.style.color = nback.secsLeft <= 20 ? '#ff4444' : '#7b2fff';
}
 
function nbackUpdateStats() {
  const d = nbackDetail();
  if (!d) return;
 
  const statValues = d.querySelectorAll('.stats .stat-value');
  if (statValues[0]) statValues[0].textContent = nback.aciertos;
  if (statValues[1]) statValues[1].textContent = nback.errores + nback.omisiones;
  const avg = nback.rts.length
    ? Math.round(nback.rts.reduce((a, b) => a + b, 0) / nback.rts.length) : 0;
  if (statValues[2]) statValues[2].textContent = avg ? avg + ' ms' : '—';
}
 
function nbackUpdateProgress() {
  const d = nbackDetail();
  if (!d) return;
  const totalFase = nback.fase === 'practica' ? NBACK_PRACTICA : NBACK_REAL;
  const numEl   = d.querySelector('.item-num');
  const totalEl = d.querySelector('.item-total');
  if (numEl)   numEl.textContent   = nback.idx + 1;
  if (totalEl) totalEl.textContent = totalFase;
 
  const barra = d.querySelector('.barra-iversa');
  if (barra) {
    barra.style.transition   = 'none';
    barra.style.width        = '100%';
    barra.style.height       = '4px';
    barra.style.background   = '#7b2fff';
    barra.style.borderRadius = '2px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      barra.style.transition = `width ${NBACK_STIM_MS}ms linear`;
      barra.style.width = '0%';
    }));
  }
}
 
function nbackShowLetter(letter) {
  const estEl = nbackGet('.est');
  if (!estEl) return;
  estEl.style.color    = '#7b2fff';
  estEl.style.fontSize = '10rem';
  estEl.textContent    = letter;
}
 
function nbackHideStimulus() {
  const estEl = nbackGet('.est');
  if (estEl) estEl.textContent = '';
}
 
function nbackFeedback(msg, color) {
  const estEl = nbackGet('.est');
  if (!estEl) return;
  estEl.style.color    = color;
  estEl.style.fontSize = '1.1rem';
  estEl.textContent    = msg;
}
 
function nbackUpdateHist(currentLetter, isMatch) {
  // historial oculto
  const detail = nbackDetail();
  if (!detail) return;
  const histEl = detail.querySelector('.nback-hist');
  if (histEl) histEl.style.display = 'none';
}
 
// ── Mostrar estímulo ──────────────────────────
function nbackNext() {
  const totalFase = nback.fase === 'practica' ? NBACK_PRACTICA : NBACK_REAL;
 
  if (nback.idx >= totalFase) {
    if (nback.fase === 'practica') {
      nbackFeedback('PRÁCTICA TERMINADA — INICIANDO FASE REAL (2-back)', '#00e676');
      setTimeout(() => {
        nback.fase    = 'real';
        nback.n       = 2;
        nback.idx     = 0;
        nback.aciertos = 0;
        nback.errores  = 0;
        nback.omisiones= 0;
        nback.rts      = [];
        nback.seq     = nbackBuildSeq(2, NBACK_REAL, 0.35);
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
  nbackBlankActive      = false;
  nback.historia.push(nback.currentItem.letter);
 
  nbackShowLetter(nback.currentItem.letter);
  nbackUpdateProgress();
  nbackUpdateHist(nback.currentItem.letter, false);
 
  // Marcar tiempo tras repintado
  requestAnimationFrame(() => {
    nback.rtStart = performance.now();
  });
 
  nback.stimTimeout = setTimeout(() => {
    if (!nback.waitingResponse) return;
    nback.waitingResponse = false;
    nbackHideStimulus();
    nbackBlankActive = true;
 
    // Omisión solo en fase real y si era un match
    if (nback.fase === 'real' && nback.idx >= nback.n && nback.currentItem.isMatch) {
      nback.omisiones++;
      nbackFeedback('— OMISIÓN: era coincidencia', '#ffaa00');
      nbackUpdateStats();
    }
 
    nback.idx++;
    setTimeout(() => {
      nbackBlankActive = false;
      nbackNext();
    }, NBACK_BLANK_MS);
 
  }, NBACK_STIM_MS);
}
 
// ── Botón COINCIDEN ───────────────────────────
function nbackCoincidir() {
  if (!nback.waitingResponse || nbackBlankActive) return;
  nback.waitingResponse = false;
  clearTimeout(nback.stimTimeout);
 
  const rt      = Math.round(performance.now() - nback.rtStart);
  const esMatch = nback.idx >= nback.n && nback.currentItem.isMatch;
 
  nbackHideStimulus();
  nbackBlankActive = true;
 
  if (esMatch) {
    if (nback.fase === 'real') { nback.aciertos++; nback.rts.push(rt); }
    nbackFeedback('✓ CORRECTO — ' + rt + ' ms', '#00e676');
    nbackUpdateHist(nback.currentItem.letter, true);
  } else {
    if (nback.fase === 'real') nback.errores++;
    nbackFeedback('✗ FALSO POSITIVO', '#ff4444');
  }
 
  nbackUpdateStats();
  nback.idx++;
 
  setTimeout(() => {
    nbackBlankActive = false;
    nbackNext();
  }, NBACK_BLANK_MS);
}
 
// ── Fin del test ──────────────────────────────
function nbackEnd() {
  clearInterval(nback.timerInterval);
  clearTimeout(nback.stimTimeout);
 
  const totalTargets = nback.seq.filter(i => i.isMatch).length;
  const totalLures   = nback.seq.length - totalTargets;
 
  const avgRt = nback.rts.length
    ? Math.round(nback.rts.reduce((a, b) => a + b, 0) / nback.rts.length) : 0;
 
  let rtDev = 0;
  if (nback.rts.length > 1) {
    rtDev = Math.round(Math.sqrt(
      nback.rts.reduce((s, r) => s + Math.pow(r - avgRt, 2), 0) / nback.rts.length
    ));
  }
 
  const pctAciertos = totalTargets
    ? parseFloat(((nback.aciertos / totalTargets) * 100).toFixed(1)) : 0;
 
  const resultadoNback = {
    nivel_n:          2,
    pct_aciertos:     pctAciertos,
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
  setTimeout(enviarResultados, 1000);
}
 
// ── Enviar resultados al backend ──────────────
async function enviarResultados() {
  const usuario = JSON.parse(sessionStorage.getItem('semk_usuario') || '{}');
  console.log('[SEMK] semk_usuario completo:', JSON.stringify(usuario, null, 2));
  console.log('[SEMK] fecha_nac:', usuario.fecha_nac);
  console.log('[SEMK] id_genero:', usuario.id_genero);
  console.log('[SEMK] id_carrera:', usuario.id_carrera);
  const stroopR = JSON.parse(sessionStorage.getItem('semk_stroop')  || '{}');
  const sartR   = JSON.parse(sessionStorage.getItem('semk_sart')    || '{}');
  const nbackR  = JSON.parse(sessionStorage.getItem('semk_nback')   || '{}');
 
  const ua = navigator.userAgent;
  const dispositivo = /Mobi|Android/i.test(ua) ? 'movil'
    : /iPad|Tablet/i.test(ua) ? 'tablet' : 'escritorio';
 
  const payload = {
    // Coincide con la tabla `usuarios` de basededatos2.sql
    usuario: {
      nombre:     usuario.nombre || '',
      p_apellido: usuario.p_apellido || '',
      s_apellido: usuario.s_apellido || null,
      // aceptar ambos nombres de campo: `fecha_nac` (formulario) o `fechaNac`
      fecha_nac:  usuario.fecha_nac || usuario.fechaNac || null,   // formato YYYY-MM-DD
      // permitir enviar id_genero si está disponible
      id_genero:  usuario.id_genero ? parseInt(usuario.id_genero) : undefined,
      genero:     usuario.genero || null,
    },
    // Coincide con la tabla `datos_academicos`
    academico: {
      // enviar id_carrera si existe, si no enviar texto para resolverlo en backend
      id_carrera: usuario.id_carrera ? parseInt(usuario.id_carrera) : undefined,
      carrera:    usuario.carrera || '',         // texto; el backend resuelve el id_carrera si falta el id
      grado:      parseInt(usuario.grado) || 1,
    },
    // Coincide con la tabla `datos_dispositivo`
    dispositivo: {
      // aceptar tanto `horas_celular` como `horasCel`
      horas_celular:     parseFloat(usuario.horas_celular ?? usuario.horasCel) || 0,
      apps_distractoras: usuario.apps_distractoras || [usuario.appTop].filter(Boolean),
      origen:            'web',
      dispositivo,
      sistema_operativo: ua.match(/\(([^)]+)\)/)?.[1]?.split(';')[0]?.trim() || null,
      navegador:         ua.match(/(Chrome|Safari|Firefox|Edge)\/[\d.]+/)?.[0] || null,
      tipo_red:          navigator.connection?.effectiveType || null,
    },
    stroop: stroopR,
    sart:   sartR,
    nback:  nbackR,
    // Coincide con la tabla `comportamiento_sesion`
    comportamiento: typeof obtenerComportamiento === 'function'
      ? obtenerComportamiento()
      : {},
  };
 
  try {
    console.log('[SEMK] Payload a enviar:', JSON.stringify(payload, null, 2));  // ← aquí
    const res  = await fetch('/api/sesion/completa', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      nbackFeedback('✓ RESULTADOS GUARDADOS', '#00e676');
      setTimeout(() => {
        window.location.href = '/resultados.html?id=' + data.sesion_id;
      }, 1500);
    } else {
      throw new Error(data.message || 'Error del servidor');
    }
  } catch (err) {
    console.error('[SEMK] Error al enviar resultados:', err);
    console.error('[SEMK] Mensaje:', err.message);
    nbackFeedback('⚠ ERROR AL GUARDAR — revisa la consola', '#ff4444');
  }
}
 
// ── Inicializar ───────────────────────────────
 
// ── Cuenta regresiva antes del test ──────────
function nbackCountdown(callback) {
  const detail = nbackDetail();
  const estEl  = nbackGet('.est');
  if (!estEl) { callback(); return; }
 
  estEl.style.fontSize = '1.2rem';
  estEl.style.color    = '#7b2fff';
  estEl.textContent    = '';
 
  let btn = detail.querySelector('.btn-iniciar-test');
  if (!btn) {
    btn = document.createElement('button');
    btn.className   = 'btn-iniciar-test';
    btn.textContent = '[ INICIAR TEST ]';
    btn.style.cssText = 'font-family:VT323,monospace;font-size:1.4rem;letter-spacing:3px;padding:.7rem 2rem;background:transparent;border:1px solid #7b2fff;border-radius:4px;color:#7b2fff;cursor:pointer;margin-top:1rem;';
    estEl.after(btn);
  }
  btn.style.display = 'inline-block';
 
  btn.onclick = () => {
    btn.style.display = 'none';
    let count = 3;
    estEl.style.fontSize = '6rem';
    estEl.textContent    = count;
    estEl.style.color    = '#7b2fff';
 
    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        estEl.textContent = count;
        estEl.style.color = count === 2 ? '#ffaa00' : '#ff4444';
      } else {
        clearInterval(iv);
        estEl.textContent = '¡YA!';
        estEl.style.color = '#00e676';
        setTimeout(callback, 400);
      }
    }, 800);
  };
}
 
function initNback() {
  nback = {
    seq:      nbackBuildSeq(1, NBACK_PRACTICA, 0.40), // práctica: 40% matches (más fácil)
    idx:      0, fase: 'practica', n: 1,
    aciertos: 0, errores: 0, omisiones: 0,
    rts: [], rtStart: 0,
    secsLeft: NBACK_DURATION,
    timerInterval: null, stimTimeout: null,
    waitingResponse: false, currentItem: null,
    historia: [],
  };
  nbackBlankActive = false;
 
  nbackDetail()?.setAttribute('open', '');
 
  const btnCoinc = nbackGet('.res');
  if (btnCoinc) btnCoinc.onclick = nbackCoincidir;
 
  // feedback inicial removido — se muestra botón INICIAR
 
  // El timer de 150s arranca justo cuando termina la cuenta regresiva
  nbackCountdown(() => {
    nback.timerInterval = setInterval(() => {
      nback.secsLeft--;
      nbackUpdateTimer();
      if (nback.secsLeft <= 0) {
        clearInterval(nback.timerInterval);
        clearTimeout(nback.stimTimeout);
        nbackEnd();
      }
    }, 1000);
 
    nbackUpdateTimer();
    setTimeout(nbackNext, 500);
  });
}