// ─────────────────────────────────────────────
//  utils/evaluacion.js
//  Lógica única de clasificación y score global.
//  IMPORTANTE: esta es la fuente de verdad. Tanto el
//  frontend web como la app móvil deben consumir el
//  campo `evaluacion` que devuelve GET /api/sesion/:id
//  en vez de recalcular esto por su cuenta, para evitar
//  que ambas plataformas diverjan (como pasó antes: el
//  score marcaba 100/100 "ÓPTIMO" en Stroop con 37.5%
//  de tasa de error y un efecto Stroop negativo).
// ─────────────────────────────────────────────

// ── Stroop ─────────────────────────────────────
// Clasifica combinando el efecto (interferencia) Y la tasa de error.
// Una tasa de error alta invalida el resultado sin importar el efecto,
// y un efecto negativo (RT incongruente < RT congruente) es un patrón
// atípico, no un signo de buen control inhibitorio.
function clasificarStroop(ef, tasaError, acCong, acIncong) {
  if (ef === undefined || ef === null || tasaError === undefined || tasaError === null) return null;

  if (tasaError > 25) return 'BAJO';
  if (tasaError > 15) return ef < 150 ? 'MODERADO' : 'BAJO';
  if (ef < 0)          return 'MODERADO';

  const datosInsuficientes = !acCong || !acIncong;
  if (datosInsuficientes)  return ef < 200 ? 'MODERADO' : 'BAJO';

  if (ef < 150)         return 'ÓPTIMO';
  if (ef < 200)         return 'MODERADO';
  return 'BAJO';
}

// ── SART ───────────────────────────────────────
function clasificarSart(comisiones, omisiones) {
  if (comisiones === undefined || comisiones === null || omisiones === undefined || omisiones === null) return null;
  const t = comisiones + omisiones;
  if (t <= 2) return 'ÓPTIMO';
  if (t <= 5) return 'MODERADO';
  return 'BAJO';
}

// ── N-Back ─────────────────────────────────────
function clasificarNback(pctAciertos) {
  if (pctAciertos === undefined || pctAciertos === null) return null;
  if (pctAciertos >= 75) return 'ÓPTIMO';
  if (pctAciertos >= 60) return 'MODERADO';
  return 'BAJO';
}

const PUNTOS = { 'ÓPTIMO': 1, 'MODERADO': 2 / 3, 'BAJO': 1 / 3 };

// ── Score global (0-100) ────────────────────────
// Stroop y SART valen 33 pts máx, N-Back 34 pts máx (suman 100).
function calcularScore({ stroopClasif, sartClasif, nbackClasif }) {
  let score = 0;
  if (stroopClasif) score += Math.round(PUNTOS[stroopClasif] * 33);
  if (sartClasif)   score += Math.round(PUNTOS[sartClasif]   * 33);
  if (nbackClasif)  score += Math.round(PUNTOS[nbackClasif]  * 34);
  return score;
}

// ── Dimensión con mayor oportunidad de mejora ───
function dimensionMasAfectada({ stroopClasif, sartClasif, nbackClasif }) {
  const RANGO = { 'BAJO': 0, 'MODERADO': 1, 'ÓPTIMO': 2, null: 3, undefined: 3 };
  const candidatos = [
    ['Atención selectiva (Stroop)', stroopClasif],
    ['Atención sostenida (SART)',   sartClasif],
    ['Memoria de trabajo (N-Back)', nbackClasif],
  ].filter(([, c]) => c !== null && c !== undefined);

  if (!candidatos.length) return null;
  candidatos.sort((a, b) => RANGO[a[1]] - RANGO[b[1]]);
  return candidatos[0][0];
}

// ── Punto de entrada: recibe los 3 resultados crudos ──
// y devuelve el objeto `evaluacion` completo.
function evaluarSesion({ stroop, sart, nback }) {
  const stroopClasif = stroop ? clasificarStroop(stroop.efecto_stroop_ms, stroop.tasa_error_pct, stroop.aciertos_congruente, stroop.aciertos_incongruente) : null;
  const sartClasif   = sart   ? clasificarSart(sart.errores_comision, sart.errores_omision)       : null;
  const nbackClasif  = nback  ? clasificarNback(nback.pct_aciertos)                                : null;

  return {
    stroop: stroopClasif,
    sart:   sartClasif,
    nback:  nbackClasif,
    score:  calcularScore({ stroopClasif, sartClasif, nbackClasif }),
    dimension_mas_afectada: dimensionMasAfectada({ stroopClasif, sartClasif, nbackClasif }),
  };
}

module.exports = {
  clasificarStroop,
  clasificarSart,
  clasificarNback,
  calcularScore,
  dimensionMasAfectada,
  evaluarSesion,
};