// ─────────────────────────────────────────────
//  tracking.js
//  Captura datos de comportamiento_sesion:
//  - cambios_pestana / segundos_fuera / en_que_test_salio
//  - orientacion (vertical|horizontal)
//  - tipo_input (touch|mouse|teclado)
//  - nivel_bateria_pct
//  Debe cargarse ANTES de stroop.js/sart.js/nback.js en test.html.
//  nback.js llama a obtenerComportamiento() al armar el payload final.
// ─────────────────────────────────────────────

let comportamiento = {
  cambios_pestana:    0,
  segundos_fuera:     0,
  en_que_test_salio:  [],
  tipo_input:         null,
  nivel_bateria_pct:  null,
};

let comportamientoHiddenAt = null;

// ── Detectar cuál test está abierto en este momento ──
function comportamientoTestActivo() {
  const abierto = document.querySelector('section.tests details[open]');
  if (!abierto) return null;
  const testDiv = abierto.querySelector('.test');
  return testDiv?.dataset.test || null;
}

// ── Cambios de pestaña / tiempo fuera ─────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    comportamientoHiddenAt = performance.now();
    comportamiento.cambios_pestana++;
    const test = comportamientoTestActivo();
    if (test) comportamiento.en_que_test_salio.push(test);
  } else if (comportamientoHiddenAt !== null) {
    const secs = Math.round((performance.now() - comportamientoHiddenAt) / 1000);
    comportamiento.segundos_fuera += secs;
    comportamientoHiddenAt = null;
  }
});

// ── Tipo de input (se queda con la última interacción detectada) ──
window.addEventListener('touchstart', () => { comportamiento.tipo_input = 'touch';   }, { passive: true });
window.addEventListener('mousedown',  () => { comportamiento.tipo_input = 'mouse';   });
window.addEventListener('keydown',    () => { comportamiento.tipo_input = 'teclado'; });

// ── Orientación actual (se recalcula al momento de guardar) ──
function comportamientoOrientacion() {
  if (screen.orientation?.type) {
    return screen.orientation.type.startsWith('portrait') ? 'vertical' : 'horizontal';
  }
  return window.innerHeight >= window.innerWidth ? 'vertical' : 'horizontal';
}

// ── Nivel de batería (soportado solo en algunos navegadores; si no, queda null) ──
if (navigator.getBattery) {
  navigator.getBattery()
    .then(battery => {
      comportamiento.nivel_bateria_pct = Math.round(battery.level * 100);
      // Mantener actualizado si cambia durante el test
      battery.addEventListener('levelchange', () => {
        comportamiento.nivel_bateria_pct = Math.round(battery.level * 100);
      });
    })
    .catch(() => { /* API no soportada — se queda en null */ });
}

// ── Snapshot final para enviar al backend ─────
function obtenerComportamiento() {
  return {
    cambios_pestana:    comportamiento.cambios_pestana,
    segundos_fuera:     comportamiento.segundos_fuera,
    en_que_test_salio:  comportamiento.en_que_test_salio,
    orientacion:        comportamientoOrientacion(),
    tipo_input:         comportamiento.tipo_input,
    nivel_bateria_pct:  comportamiento.nivel_bateria_pct,
  };
}
