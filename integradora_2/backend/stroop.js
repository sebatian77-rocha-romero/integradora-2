// ─────────────────────────────────────────────
//  stroop.js
//  Lógica completa del Test de Stroop.
//  Se inicializa llamando a initStroop().
//  Al terminar llama a initSart() automáticamente.
// ─────────────────────────────────────────────

const STROOP_ITEMS = [
  { word:'ROJO',     ink:'#00e676', answer:'verde'    },
  { word:'VERDE',    ink:'#e3ff2f', answer:'rojo'     },
  { word:'AZUL',     ink:'#ff4444', answer:'rojo'     },
  { word:'AMARILLO', ink:'#378add', answer:'azul'     },
  { word:'ROJO',     ink:'#ff4444', answer:'rojo'     },
  { word:'VERDE',    ink:'#00e676', answer:'verde'    },
  { word:'AZUL',     ink:'#e3ff2f', answer:'rojo'     },
  { word:'AMARILLO', ink:'#00e676', answer:'verde'    },
  { word:'ROJO',     ink:'#378add', answer:'azul'     },
  { word:'VERDE',    ink:'#ff4444', answer:'rojo'     },
  { word:'AZUL',     ink:'#00e676', answer:'verde'    },
  { word:'AMARILLO', ink:'#e3ff2f', answer:'rojo'     },
  { word:'ROJO',     ink:'#e3ff2f', answer:'rojo'     },
  { word:'VERDE',    ink:'#378add', answer:'azul'     },
  { word:'AZUL',     ink:'#ff4444', answer:'rojo'     },
  { word:'AMARILLO', ink:'#00e676', answer:'verde'    },
  { word:'ROJO',     ink:'#378add', answer:'azul'     },
  { word:'VERDE',    ink:'#e3ff2f', answer:'rojo'     },
  { word:'AZUL',     ink:'#378add', answer:'azul'     },
  { word:'AMARILLO', ink:'#ff4444', answer:'rojo'     },
  { word:'ROJO',     ink:'#00e676', answer:'verde'    },
  { word:'VERDE',    ink:'#ff4444', answer:'rojo'     },
  { word:'AZUL',     ink:'#e3ff2f', answer:'rojo'     },
  { word:'AMARILLO', ink:'#378add', answer:'azul'     },
];

// ── Estado interno ────────────────────────────
let stroop = {
  seq: [], idx: 0, aciertos: 0, errores: 0,
  rts: [], rtStart: 0, secsLeft: 150,
  timerInterval: null, answered: false,
  // métricas por condición
  rtsCong: [], rtsIncong: [],
  errCong: 0, errIncong: 0,
  acCong: 0, acIncong: 0,
};

// ── Utilidades ────────────────────────────────
function stroopShuffle(arr) { return [...arr].sort(() => Math.random() - .5); }

function stroopEl(id) { return document.getElementById(id); }

function stroopTimer() {
  const m = String(Math.floor(stroop.secsLeft / 60)).padStart(2,'0');
  const s = String(stroop.secsLeft % 60).padStart(2,'0');
  // El timer del Stroop está dentro del primer details
  const timerEl = document.querySelector('details:nth-of-type(1) .timer');
  if (timerEl) {
    timerEl.textContent = m + ':' + s;
    timerEl.style.color = stroop.secsLeft <= 15 ? '#ff4444' : '';
  }
}

function stroopUpdateStats() {
  const avg = stroop.rts.length
    ? Math.round(stroop.rts.reduce((a,b) => a+b, 0) / stroop.rts.length)
    : 0;
  const detail = document.querySelector('details:nth-of-type(1)');
  if (!detail) return;
  detail.querySelector('#s-aciertos').textContent = stroop.aciertos;
  detail.querySelector('#s-errores').textContent  = stroop.errores;
  detail.querySelector('#s-rt').textContent       = avg ? avg + 'ms' : '—';
}

function stroopUpdateProgress() {
  const detail = document.querySelector('details:nth-of-type(1)');
  if (!detail) return;
  const pct = Math.round((stroop.idx / STROOP_ITEMS.length) * 100);
  const progEl = detail.querySelector('#prog');
  const porcEl = detail.querySelector('#porc');
  const numEl  = detail.querySelector('#item-num');
  if (progEl) progEl.style.width = pct + '%';
  if (porcEl) porcEl.textContent = pct + '%';
  if (numEl)  numEl.textContent  = stroop.idx + 1;
  detail.querySelector('#item-total').textContent = STROOP_ITEMS.length;
}

// ── Cargar estímulo ───────────────────────────
function stroopLoad() {
  if (stroop.idx >= STROOP_ITEMS.length) {
    stroopEnd(); return;
  }
  stroop.answered = false;
  const item   = stroop.seq[stroop.idx];
  const detail = document.querySelector('details:nth-of-type(1)');
  if (!detail) return;

  const estEl = detail.querySelector('.est');
  if (estEl) {
    estEl.textContent  = item.word;
    estEl.style.color  = item.ink;
    estEl.style.fontSize = '4rem';
  }

  // limpiar feedback anterior
  const fb = detail.querySelector('.feedback-stroop');
  if (fb) fb.textContent = '';

  // limpiar clases de botones
  detail.querySelectorAll('.color-btn').forEach(b => b.className = 'color-btn');

  stroopUpdateProgress();
  stroop.rtStart = performance.now();
}

// ── Respuesta ─────────────────────────────────
function answer(color) {
  if (stroop.answered) return;
  stroop.answered = true;

  const rt   = Math.round(performance.now() - stroop.rtStart);
  const item = stroop.seq[stroop.idx];
  const ok   = color === item.answer;

  // ¿congruente o incongruente?
  const esCong = item.word.toLowerCase() === item.answer;

  stroop.rts.push(rt);
  if (ok) {
    stroop.aciertos++;
    esCong ? (stroop.acCong++,  stroop.rtsCong.push(rt))
           : (stroop.acIncong++, stroop.rtsIncong.push(rt));
  } else {
    stroop.errores++;
    esCong ? stroop.errCong++ : stroop.errIncong++;
  }

  // feedback en botones
  const detail = document.querySelector('details:nth-of-type(1)');
  detail.querySelectorAll('.color-btn').forEach(b => {
    const bc = b.textContent.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    if (bc === item.answer) b.classList.add('correcto');
    else if (bc === color && !ok) b.classList.add('incorrecto');
  });

  stroopUpdateStats();
  stroop.idx++;
  setTimeout(stroopLoad, 900);
}

// ── Fin del test ──────────────────────────────
function stroopEnd() {
  clearInterval(stroop.timerInterval);

  const total    = stroop.aciertos + stroop.errores;
  const avgCong  = stroop.rtsCong.length
    ? Math.round(stroop.rtsCong.reduce((a,b)=>a+b,0) / stroop.rtsCong.length) : 0;
  const avgIncong = stroop.rtsIncong.length
    ? Math.round(stroop.rtsIncong.reduce((a,b)=>a+b,0) / stroop.rtsIncong.length) : 0;
  const efectoStroop = avgIncong - avgCong;
  const tasaError    = total ? ((stroop.errores / total) * 100).toFixed(1) : '0.0';

  // Guardar resultados para enviar al backend
  const resultadoStroop = {
    rt_congruente_ms:      avgCong,
    rt_incongruente_ms:    avgIncong,
    efecto_stroop_ms:      efectoStroop,
    aciertos_congruente:   stroop.acCong,
    aciertos_incongruente: stroop.acIncong,
    errores_congruente:    stroop.errCong,
    errores_incongruente:  stroop.errIncong,
    total_items:           stroop.idx,
    tasa_error_pct:        parseFloat(tasaError),
    duracion_total_ms:     (150 - stroop.secsLeft) * 1000,
  };
  sessionStorage.setItem('semk_stroop', JSON.stringify(resultadoStroop));

  // Mostrar resumen en el details del Stroop
  const detail = document.querySelector('details:nth-of-type(1)');
  const estEl  = detail.querySelector('.est');
  if (estEl) {
    estEl.style.fontSize = '1rem';
    estEl.style.color    = '#00e676';
    estEl.textContent    = '✓ TEST COMPLETADO';
  }

  // Mostrar métricas finales
  detail.querySelector('#s-aciertos').textContent = stroop.aciertos;
  detail.querySelector('#s-errores').textContent  = stroop.errores;
  detail.querySelector('#s-rt').textContent       = avgIncong + 'ms (incong)';

  // Cerrar este details y abrir el siguiente (SART)
  setTimeout(() => {
    detail.removeAttribute('open');
    const sartDetail = document.querySelector('details:nth-of-type(2)');
    if (sartDetail) {
      sartDetail.setAttribute('open', '');
      if (typeof initSart === 'function') initSart();
    }
  }, 1500);
}

// ── Inicializar ───────────────────────────────
function initStroop() {
  stroop = {
    seq: stroopShuffle(STROOP_ITEMS),
    idx: 0, aciertos: 0, errores: 0,
    rts: [], rtStart: 0, secsLeft: 150,
    timerInterval: null, answered: false,
    rtsCong: [], rtsIncong: [],
    errCong: 0, errIncong: 0,
    acCong: 0, acIncong: 0,
  };

  // Abrir el details del Stroop
  const detail = document.querySelector('details:nth-of-type(1)');
  if (detail) detail.setAttribute('open', '');

  stroop.timerInterval = setInterval(() => {
    stroop.secsLeft--;
    stroopTimer();
    if (stroop.secsLeft <= 0) {
      clearInterval(stroop.timerInterval);
      stroopEnd();
    }
  }, 1000);

  stroopTimer();
  stroopLoad();
}