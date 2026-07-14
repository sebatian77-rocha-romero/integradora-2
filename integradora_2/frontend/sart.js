// ─────────────────────────────────────────────
//  sart.js
//  Lógica completa del Test SART.
//  Se inicializa llamando a initSart().
//  Al terminar llama a initNback() automáticamente.
// ─────────────────────────────────────────────

const SART_TOTAL    = 54;   // 6 bloques de 9 números
const SART_DURATION = 180;  // segundos (3:00)
const SART_STIM_MS  = 1000; // ms que el número está visible
const SART_BLANK_MS = 250;  // ms de pantalla en blanco entre estímulos
const SART_NOGO     = 3;    // número que NO debe responderse
 
let sart = {};
let sartBlankActive = false; // bloquear respuesta durante blank
 
// ── Utilidades ────────────────────────────────
function sartDetail()  { return document.querySelector('details:nth-of-type(2)'); }
function sartGet(sel)  { return sartDetail()?.querySelector(sel); }
 
function sartBuildSeq() {
  // Construir 6 bloques de 9 (1-9 aleatorizado) para garantizar
  // exactamente 6 nogo en 54 estímulos — protocolo SART estándar
  const block = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const arr = [];
  for (let b = 0; b < 6; b++) {
    arr.push(...[...block].sort(() => Math.random() - .5));
  }
  return arr;
}
 
function sartUpdateTimer() {
  const m  = String(Math.floor(sart.secsLeft / 60)).padStart(2, '0');
  const s  = String(sart.secsLeft % 60).padStart(2, '0');
  const el = sartGet('.timer');
  if (!el) return;
  el.textContent = m + ':' + s;
  el.style.color = sart.secsLeft <= 20 ? '#ff4444' : '#00e676';
}
 
function sartUpdateStats() {
  const d = sartDetail();
  if (!d) return;

  const statValues = d.querySelectorAll('.stats .stat-value');
  if (statValues[0]) statValues[0].textContent = sart.aciertos;
  if (statValues[1]) statValues[1].textContent = sart.comisiones + sart.omisiones;
  const avg = sart.rts.length
    ? Math.round(sart.rts.reduce((a, b) => a + b, 0) / sart.rts.length) : 0;
  if (statValues[2]) statValues[2].textContent = avg ? avg + ' ms' : '—';
}
 
function sartUpdateProgress() {
  const d = sartDetail();
  if (!d) return;
  const numEl   = d.querySelector('.item-num');
  const totalEl = d.querySelector('.item-total');
  if (numEl)   numEl.textContent   = sart.idx + 1;
  if (totalEl) totalEl.textContent = SART_TOTAL;
 
  // Barra que se vacía con el tiempo del estímulo
  const barra = d.querySelector('.barra-iversa');
  if (barra) {
    barra.style.transition  = 'none';
    barra.style.width       = '100%';
    barra.style.height      = '4px';
    barra.style.background  = '#00e676';
    barra.style.borderRadius = '2px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      barra.style.transition = `width ${SART_STIM_MS}ms linear`;
      barra.style.width = '0%';
    }));
  }
}
 
function sartShowFeedback(msg, color) {
  const estEl = sartGet('.est');
  if (!estEl) return;
  estEl.style.color    = color;
  estEl.style.fontSize = '1.1rem';
  estEl.textContent    = msg;
}
 
function sartHideStimulus() {
  const estEl = sartGet('.est');
  if (estEl) estEl.textContent = '';
}
 
// ── Mostrar estímulo ──────────────────────────
function sartNext() {
  if (sart.idx >= SART_TOTAL) { sartEnd(); return; }
 
  sart.currentNum      = sart.seq[sart.idx];
  sart.waitingResponse = true;
  sartBlankActive      = false;
 
  const estEl = sartGet('.est');
  if (estEl) {
    estEl.textContent    = sart.currentNum;
    estEl.style.color    = sart.currentNum === SART_NOGO ? '#ff4444' : '#e0e0ff';
    estEl.style.fontSize = '6rem';
  }
 
  sartUpdateProgress();
 
  // Marcar tiempo tras repintado para mayor precisión
  requestAnimationFrame(() => {
    sart.rtStart = performance.now();
  });
 
  // Timeout: fin del tiempo de respuesta
  sart.stimTimeout = setTimeout(() => {
    if (!sart.waitingResponse) return;
    sart.waitingResponse = false;
    sartHideStimulus();
    sartBlankActive = true;
 
    if (sart.currentNum !== SART_NOGO) {
      // Go — no respondió → omisión
      sart.omisiones++;
      sartShowFeedback('— OMISIÓN', '#ffaa00');
    } else {
      // Nogo — no respondió → correcto (inhibición exitosa)
      sart.aciertos++;
    }
 
    sartUpdateStats();
    sart.idx++;
 
    setTimeout(() => {
      sartBlankActive = false;
      sartNext();
    }, SART_BLANK_MS);
 
  }, SART_STIM_MS);
}
 
// ── Botón RESPONDER ───────────────────────────
function sartResponder() {
  if (!sart.waitingResponse || sartBlankActive) return;
  sart.waitingResponse = false;
  clearTimeout(sart.stimTimeout);
 
  const rt = Math.round(performance.now() - sart.rtStart);
  sartHideStimulus();
  sartBlankActive = true;
 
  if (sart.currentNum === SART_NOGO) {
    // Respondió al nogo → comisión (impulsividad)
    sart.comisiones++;
    sartShowFeedback('✗ COMISIÓN — era el 3', '#ff4444');
  } else {
    // Respondió al go → acierto
    sart.aciertos++;
    sart.rts.push(rt);
    sartShowFeedback('✓ ' + rt + ' ms', '#00e676');
  }
 
  sartUpdateStats();
  sart.idx++;
 
  setTimeout(() => {
    sartBlankActive = false;
    sartNext();
  }, SART_BLANK_MS);
}
 
// ── Fin del test ──────────────────────────────
function sartEnd() {
  clearInterval(sart.timerInterval);
  clearTimeout(sart.stimTimeout);
 
  const completed = Math.min(sart.idx, SART_TOTAL);
  const totalGo   = sart.seq.slice(0, completed).filter(n => n !== SART_NOGO).length;
  const totalNogo = sart.seq.slice(0, completed).filter(n => n === SART_NOGO).length;
 
  const avgRt = sart.rts.length
    ? Math.round(sart.rts.reduce((a, b) => a + b, 0) / sart.rts.length) : 0;
 
  let rtDev = 0;
  if (sart.rts.length > 1) {
    rtDev = Math.round(Math.sqrt(
      sart.rts.reduce((s, r) => s + Math.pow(r - avgRt, 2), 0) / sart.rts.length
    ));
  }
 
  const resultadoSart = {
    errores_omision:   sart.omisiones,
    errores_comision:  sart.comisiones,
    aciertos:          sart.aciertos,
    total_go:          totalGo,
    total_nogo:        totalNogo,
    tasa_omision_pct:  totalGo   ? parseFloat(((sart.omisiones  / totalGo)   * 100).toFixed(1)) : 0,
    tasa_comision_pct: totalNogo ? parseFloat(((sart.comisiones / totalNogo)  * 100).toFixed(1)) : 0,
    rt_promedio_ms:    avgRt,
    rt_desviacion_ms:  rtDev,
    duracion_total_ms: (SART_DURATION - sart.secsLeft) * 1000,
  };
  sessionStorage.setItem('semk_sart', JSON.stringify(resultadoSart));
 
  sartShowFeedback('✓ TEST COMPLETADO', '#00e676');
 
  setTimeout(() => {
    sartDetail()?.removeAttribute('open');
    const nbackDet = document.querySelector('details:nth-of-type(3)');
    if (nbackDet) {
      nbackDet.setAttribute('open', '');
      if (typeof initNback === 'function') initNback();
    }
  }, 1500);
}
 
// ── Inicializar ───────────────────────────────
function initSart() {
  sart = {
    seq: sartBuildSeq(),
    idx: 0, aciertos: 0, comisiones: 0, omisiones: 0,
    rts: [], rtStart: 0,
    secsLeft: SART_DURATION,
    timerInterval: null, stimTimeout: null,
    currentNum: null, waitingResponse: false,
  };
  sartBlankActive = false;
 
  sartDetail()?.setAttribute('open', '');
 
  // Reasignar onclick del botón RESPONDER
  const btnRes = sartGet('.res');
  if (btnRes) btnRes.onclick = sartResponder;
 
  sart.timerInterval = setInterval(() => {
    sart.secsLeft--;
    sartUpdateTimer();
    if (sart.secsLeft <= 0) {
      clearInterval(sart.timerInterval);
      clearTimeout(sart.stimTimeout);
      sartEnd();
    }
  }, 1000);
 
  sartUpdateTimer();
  setTimeout(sartNext, 600);
}