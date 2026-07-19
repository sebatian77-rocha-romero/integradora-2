// ─────────────────────────────────────────────
//  stroop.js
//  Lógica completa del Test de Stroop.
//  Se inicializa llamando a initStroop().
//  Al terminar llama a initSart() automáticamente.
// ─────────────────────────────────────────────

const STROOP_ITEMS = [
  { word:'ROJO',     ink:'#ff4444', answer:'rojo'     },  // congruente
  { word:'VERDE',    ink:'#00e676', answer:'verde'    },  // congruente
  { word:'AZUL',     ink:'#378add', answer:'azul'     },  // congruente
  { word:'AMARILLO', ink:'#e3ff2f', answer:'amarillo' },  // congruente
  { word:'ROJO',     ink:'#00e676', answer:'verde'    },  // incongruente
  { word:'VERDE',    ink:'#ff4444', answer:'rojo'     },  // incongruente
  { word:'AZUL',     ink:'#e3ff2f', answer:'amarillo' },  // incongruente
  { word:'AMARILLO', ink:'#378add', answer:'azul'     },  // incongruente
  { word:'ROJO',     ink:'#378add', answer:'azul'     },  // incongruente
  { word:'VERDE',    ink:'#e3ff2f', answer:'amarillo' },  // incongruente
  { word:'AZUL',     ink:'#ff4444', answer:'rojo'     },  // incongruente
  { word:'AMARILLO', ink:'#00e676', answer:'verde'    },  // incongruente
  { word:'ROJO',     ink:'#e3ff2f', answer:'amarillo' },  // incongruente
  { word:'VERDE',    ink:'#378add', answer:'azul'     },  // incongruente
  { word:'AZUL',     ink:'#00e676', answer:'verde'    },  // incongruente
  { word:'AMARILLO', ink:'#ff4444', answer:'rojo'     },  // incongruente
  { word:'ROJO',     ink:'#ff4444', answer:'rojo'     },  // congruente
  { word:'VERDE',    ink:'#00e676', answer:'verde'    },  // congruente
  { word:'AZUL',     ink:'#378add', answer:'azul'     },  // congruente
  { word:'AMARILLO', ink:'#e3ff2f', answer:'amarillo' },  // congruente
  { word:'ROJO',     ink:'#00e676', answer:'verde'    },  // incongruente
  { word:'VERDE',    ink:'#ff4444', answer:'rojo'     },  // incongruente
  { word:'AZUL',     ink:'#e3ff2f', answer:'amarillo' },  // incongruente
  { word:'AMARILLO', ink:'#378add', answer:'azul'     },  // incongruente
];
 
// Mapa ink → nombre de color (para detectar congruencia)
const INK_MAP = {
  '#ff4444': 'rojo',
  '#00e676': 'verde',
  '#378add': 'azul',
  '#e3ff2f': 'amarillo',
};
 
const STROOP_DURATION = 150; // segundos
const FEEDBACK_MS     = 800; // ms de bloqueo tras respuesta
 
let stroop = {};
let stroopLocked = false; // lockout durante feedback
 
// ── Utilidades ────────────────────────────────
function stroopShuffle(arr) { return [...arr].sort(() => Math.random() - .5); }
function stroopDetail()     { return document.querySelector('details:nth-of-type(1)'); }
function stroopGet(sel)     { return stroopDetail()?.querySelector(sel); }
 
function stroopTimer() {
  const m = String(Math.floor(stroop.secsLeft / 60)).padStart(2, '0');
  const s = String(stroop.secsLeft % 60).padStart(2, '0');
  const el = stroopGet('.timer');
  if (!el) return;
  el.textContent = m + ':' + s;
  el.style.color = stroop.secsLeft <= 15 ? '#ff4444' : '#00e676';
}
 
function stroopUpdateStats() {
  const avg = stroop.rts.length
    ? Math.round(stroop.rts.reduce((a, b) => a + b, 0) / stroop.rts.length) : 0;
  const d = stroopDetail();
  if (!d) return;

  const statValues = d.querySelectorAll('.stats .stat-value');
  if (statValues[0]) statValues[0].textContent = stroop.aciertos;
  if (statValues[1]) statValues[1].textContent = stroop.errores;
  if (statValues[2]) statValues[2].textContent = avg ? avg + ' ms' : '—';
}
 
function stroopUpdateProgress() {
  const d = stroopDetail();
  if (!d) return;
  const pct = Math.round((stroop.idx / STROOP_ITEMS.length) * 100);
  const progEl = d.querySelector('.barra_progreso .llenado_barrra');
  const porcEl = d.querySelector('.porc');
  const numEl  = d.querySelector('.item-num');
  if (progEl) progEl.style.width = pct + '%';
  if (porcEl) porcEl.textContent = pct + '%';
  if (numEl)  numEl.textContent  = stroop.idx + 1;
  const totalEl = d.querySelector('.item-total');
  if (totalEl) totalEl.textContent = STROOP_ITEMS.length;
}
 
// ── Cargar estímulo ───────────────────────────
function stroopLoad() {
  if (stroop.idx >= STROOP_ITEMS.length) { stroopEnd(); return; }
 
  stroop.answered = false;
  stroopLocked    = false;
 
  const item  = stroop.seq[stroop.idx];
  const estEl = stroopGet('.est');
  if (estEl) {
    estEl.textContent  = item.word;
    estEl.style.color  = item.ink;
    estEl.style.fontSize = '4rem';
  }
 
  // Limpiar clases de botones
  stroopDetail()?.querySelectorAll('.color-btn')
    .forEach(b => b.className = 'color-btn');
 
  stroopUpdateProgress();
 
  // Marcar tiempo DESPUÉS del repintado del navegador para mayor precisión
  requestAnimationFrame(() => {
    stroop.rtStart = performance.now();
  });
}
 
// ── Respuesta ─────────────────────────────────
function answer(color) {
  if (stroop.answered || stroopLocked) return;
  stroop.answered = true;
  stroopLocked    = true;
 
  const rt   = Math.round(performance.now() - stroop.rtStart);
  const item = stroop.seq[stroop.idx];
  const ok   = color === item.answer;
 
  // Congruencia: la palabra coincide con el color de la tinta
  const esCong = item.word.toLowerCase() === INK_MAP[item.ink];
 
  stroop.rts.push(rt);
  stroop.detalle.push({
    orden:             stroop.idx + 1,
    tipo:              esCong ? 'congruente' : 'incongruente',
    palabra:           item.word,
    color_tinta:       item.answer,
    respuesta_usuario: color,
    correcto:          ok ? 1 : 0,
    rt_ms:             rt,
  });
  if (ok) {
    stroop.aciertos++;
    if (esCong) { stroop.acCong++;  stroop.rtsCong.push(rt); }
    else        { stroop.acIncong++; stroop.rtsIncong.push(rt); }
  } else {
    stroop.errores++;
    if (esCong) stroop.errCong++; else stroop.errIncong++;
  }
 
  // Feedback visual en botones
  stroopDetail()?.querySelectorAll('.color-btn').forEach(b => {
    const bc = b.textContent.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (bc === item.answer)          b.classList.add('correcto');
    else if (bc === color && !ok)    b.classList.add('incorrecto');
  });
 
  stroopUpdateStats();
  stroop.idx++;
 
  setTimeout(() => {
    stroopLocked = false;
    stroopLoad();
  }, FEEDBACK_MS);
}
 
// ── Fin del test ──────────────────────────────
function stroopEnd() {
  clearInterval(stroop.timerInterval);
  stroopLocked = true;
 
  const total     = stroop.aciertos + stroop.errores;
  const avgCong   = stroop.rtsCong.length
    ? Math.round(stroop.rtsCong.reduce((a, b) => a + b, 0) / stroop.rtsCong.length) : 0;
  const avgIncong = stroop.rtsIncong.length
    ? Math.round(stroop.rtsIncong.reduce((a, b) => a + b, 0) / stroop.rtsIncong.length) : 0;
  const efectoStroop = avgIncong - avgCong;
  const tasaError    = total ? ((stroop.errores / total) * 100).toFixed(1) : '0.0';
 
  const resultadoStroop = {
    rt_congruente_ms:      avgCong,
    rt_incongruente_ms:    avgIncong,
    efecto_stroop_ms:      efectoStroop,
    aciertos_congruente:   stroop.acCong,
    aciertos_incongruente: stroop.acIncong,
    errores_congruente:    stroop.errCong,
    errores_incongruente:  stroop.errIncong,
    total_items:           Math.min(stroop.idx, STROOP_ITEMS.length),
    tasa_error_pct:        parseFloat(tasaError),
    duracion_total_ms:     (STROOP_DURATION - stroop.secsLeft) * 1000,
  };
  resultadoStroop.detalle = stroop.detalle;
  sessionStorage.setItem('semk_stroop', JSON.stringify(resultadoStroop));
 
  const estEl = stroopGet('.est');
  if (estEl) {
    estEl.style.fontSize = '1.2rem';
    estEl.style.color    = '#00e676';
    estEl.textContent    = '✓ TEST COMPLETADO — ' + stroop.aciertos + '/' + STROOP_ITEMS.length + ' aciertos';
  }
 
  setTimeout(() => {
    stroopDetail()?.removeAttribute('open');
    const sartDet = document.querySelector('details:nth-of-type(2)');
    if (sartDet) {
      sartDet.setAttribute('open', '');
      if (typeof initSart === 'function') initSart();
    }
  }, 1500);
}
 
// ── Inicializar ───────────────────────────────

// ── Cuenta regresiva antes del test ──────────
function stroopCountdown(callback) {
  const detail = stroopDetail();
  const estEl  = stroopGet('.est');
  if (!estEl) { callback(); return; }

  // Mostrar botón de inicio
  estEl.style.fontSize = '1.2rem';
  estEl.style.color    = '#00e676';
  estEl.textContent    = '';

  // Crear botón INICIAR si no existe
  let btn = detail.querySelector('.btn-iniciar-test');
  if (!btn) {
    btn = document.createElement('button');
    btn.className   = 'btn-iniciar-test';
    btn.textContent = '[ INICIAR TEST ]';
    btn.style.cssText = 'font-family:VT323,monospace;font-size:1.4rem;letter-spacing:3px;padding:.7rem 2rem;background:transparent;border:1px solid #00e676;border-radius:4px;color:#00e676;cursor:pointer;margin-top:1rem;';
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

function initStroop() {
  stroop = {
    seq: stroopShuffle(STROOP_ITEMS),
    idx: 0, aciertos: 0, errores: 0,
    rts: [], rtStart: 0, secsLeft: STROOP_DURATION,
    timerInterval: null, answered: false,
    detalle: [],
    rtsCong: [], rtsIncong: [],
    errCong: 0, errIncong: 0, acCong: 0, acIncong: 0,
  };
  stroopLocked = false;
 
  const detail = stroopDetail();
  detail?.setAttribute('open', '');

  detail?.querySelectorAll('.color-btn').forEach((btn) => {
    btn.onclick = () => answer(btn.dataset.color);
  });
 
  // El timer de 150s arranca justo cuando termina la cuenta regresiva,
  // no mientras el usuario ve el botón "INICIAR" o el 3-2-1.
  stroopCountdown(() => {
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
  });
}