// ─────────────────────────────────────────────
//  sart.js
//  Lógica completa del Test SART.
//  Se inicializa llamando a initSart().
//  Al terminar llama a initNback() automáticamente.
// ─────────────────────────────────────────────

const SART_TOTAL    = 54;
const SART_DURATION = 180; // segundos
const SART_STIM_MS  = 1100;
const SART_BLANK_MS = 150;

// ── Estado interno ────────────────────────────
let sart = {
  seq: [], idx: 0,
  aciertos: 0, comisiones: 0, omisiones: 0,
  rts: [], rtStart: 0,
  secsLeft: SART_DURATION,
  timerInterval: null, stimTimeout: null,
  currentNum: null, waitingResponse: false,
};

// ── Utilidades ────────────────────────────────
function sartDetail()  { return document.querySelector('details:nth-of-type(2)'); }
function sartTimerEl() { return sartDetail()?.querySelector('.timer'); }

function sartBuildSeq() {
  const arr = [];
  for (let i = 0; i < SART_TOTAL; i++) arr.push((i % 9) + 1);
  return arr.sort(() => Math.random() - .5);
}

function sartUpdateTimer() {
  const m  = String(Math.floor(sart.secsLeft / 60)).padStart(2,'0');
  const s  = String(sart.secsLeft % 60).padStart(2,'0');
  const el = sartTimerEl();
  if (el) {
    el.textContent = m + ':' + s;
    el.style.color = sart.secsLeft <= 20 ? '#ff4444' : '';
  }
}

function sartUpdateStats() {
  const detail = sartDetail();
  if (!detail) return;
  detail.querySelector('#s-aciertos').textContent = sart.aciertos;
  detail.querySelector('#s-errores').textContent  = sart.comisiones + sart.omisiones;
  const avg = sart.rts.length
    ? Math.round(sart.rts.reduce((a,b) => a+b,0) / sart.rts.length) : 0;
  detail.querySelector('#s-rt').textContent = avg ? avg + 'ms' : '—';
}

function sartUpdateProgress() {
  const detail = sartDetail();
  if (!detail) return;
  const numEl = detail.querySelector('#item-num');
  if (numEl) numEl.textContent = sart.idx + 1;
  detail.querySelector('#item-total').textContent = SART_TOTAL;

  // barra inversa (se vacía con el tiempo del estímulo)
  const barra = detail.querySelector('.barra-iversa');
  if (barra) {
    barra.style.transition = 'none';
    barra.style.width = '100%';
    barra.style.height = '4px';
    barra.style.background = 'var(--green, #00e676)';
    barra.style.borderRadius = '2px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      barra.style.transition = `width ${SART_STIM_MS}ms linear`;
      barra.style.width = '0%';
    }));
  }
}

function sartFeedback(msg, color) {
  // Usar el elemento .est del SART para feedback breve
  const detail = sartDetail();
  const estEl  = detail?.querySelector('.est');
  if (!estEl) return;
  estEl.style.color    = color;
  estEl.style.fontSize = '1rem';
  estEl.textContent    = msg;
}

// ── Mostrar estímulo ──────────────────────────
function sartNext() {
  if (sart.idx >= SART_TOTAL) { sartEnd(); return; }

  sart.currentNum       = sart.seq[sart.idx];
  sart.waitingResponse  = true;
  sart.rtStart          = performance.now();

  const detail = sartDetail();
  const estEl  = detail?.querySelector('.est');
  if (estEl) {
    estEl.textContent  = sart.currentNum;
    estEl.style.color  = sart.currentNum === 3 ? '#ff4444' : '#e0e0ff';
    estEl.style.fontSize = '6rem';
  }

  sartUpdateProgress();

  // Timeout: si no responde en STIM_MS se cuenta como omisión (si era go)
  sart.stimTimeout = setTimeout(() => {
    if (!sart.waitingResponse) return;
    sart.waitingResponse = false;

    if (sart.currentNum !== 3) {
      // Debía responder y no lo hizo → omisión
      sart.omisiones++;
      sartFeedback('— OMISIÓN', '#ffaa00');
    }
    // Si era 3 y no respondió → correcto (no se registra como error)
    else {
      sart.aciertos++;
    }

    sartUpdateStats();
    sart.idx++;
    setTimeout(sartNext, SART_BLANK_MS);
  }, SART_STIM_MS);
}

// ── Botón RESPONDER ───────────────────────────
// Esta función es llamada desde el onclick del HTML
function sartResponder() {
  if (!sart.waitingResponse) return;
  sart.waitingResponse = false;
  clearTimeout(sart.stimTimeout);

  const rt = Math.round(performance.now() - sart.rtStart);

  if (sart.currentNum === 3) {
    // Respondió ante el nogo → error de comisión
    sart.comisiones++;
    sartFeedback('✗ COMISIÓN — era el 3', '#ff4444');
  } else {
    // Respondió ante go → acierto
    sart.aciertos++;
    sart.rts.push(rt);
    sartFeedback('✓ ' + rt + 'ms', '#00e676');
  }

  sartUpdateStats();
  sart.idx++;
  setTimeout(sartNext, SART_BLANK_MS);
}

// ── Fin del test ──────────────────────────────
function sartEnd() {
  clearInterval(sart.timerInterval);
  clearTimeout(sart.stimTimeout);

  const totalGo   = sart.seq.slice(0, sart.idx).filter(n => n !== 3).length;
  const totalNogo = sart.seq.slice(0, sart.idx).filter(n => n === 3).length;
  const avgRt     = sart.rts.length
    ? Math.round(sart.rts.reduce((a,b)=>a+b,0) / sart.rts.length) : 0;

  // Desviación estándar del RT
  let rtDev = 0;
  if (sart.rts.length > 1) {
    const mean = avgRt;
    rtDev = Math.round(Math.sqrt(
      sart.rts.reduce((s,r) => s + Math.pow(r - mean, 2), 0) / sart.rts.length
    ));
  }

  const tasaCom = totalNogo ? ((sart.comisiones / totalNogo) * 100).toFixed(1) : '0.0';
  const tasaOm  = totalGo   ? ((sart.omisiones  / totalGo)  * 100).toFixed(1) : '0.0';

  const resultadoSart = {
    errores_omision:   sart.omisiones,
    errores_comision:  sart.comisiones,
    aciertos:          sart.aciertos,
    total_go:          totalGo,
    total_nogo:        totalNogo,
    tasa_omision_pct:  parseFloat(tasaOm),
    tasa_comision_pct: parseFloat(tasaCom),
    rt_promedio_ms:    avgRt,
    rt_desviacion_ms:  rtDev,
    duracion_total_ms: (SART_DURATION - sart.secsLeft) * 1000,
  };
  sessionStorage.setItem('semk_sart', JSON.stringify(resultadoSart));

  // Feedback final
  sartFeedback('✓ TEST COMPLETADO', '#00e676');

  // Pasar al N-Back
  setTimeout(() => {
    sartDetail()?.removeAttribute('open');
    const nbackDetail = document.querySelector('details:nth-of-type(3)');
    if (nbackDetail) {
      nbackDetail.setAttribute('open', '');
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

  sartDetail()?.setAttribute('open', '');

  // Reasignar el onclick del botón RESPONDER al handler correcto
  const btnRes = sartDetail()?.querySelector('.res');
  if (btnRes) btnRes.onclick = sartResponder;

  sart.timerInterval = setInterval(() => {
    sart.secsLeft--;
    sartUpdateTimer();
    if (sart.secsLeft <= 0) {
      clearInterval(sart.timerInterval);
      sartEnd();
    }
  }, 1000);

  sartUpdateTimer();
  setTimeout(sartNext, 600);
}