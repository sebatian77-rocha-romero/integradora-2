//   Si sesion-service está caído justo cuando el usuario termina
//    los 3 tests, antes se quedaba trabado en "ERROR AL GUARDAR"
//    sin poder avanzar. Con formulario.js/registro.js cacheando
//    generos/carreras, todo el flujo (formulario -> Stroop -> SART
//    -> N-Back) ya no depende de sesion-service HASTA este envío
//    final — este archivo evita que ese único punto rompa la
//    autonomía del resto de la página.
 
window.SEMK_Pendientes = (function () {
  const CLAVE = 'semk_pendientes';
 
  function leerCola() {
    try {
      const raw = localStorage.getItem(CLAVE);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
 
  function guardarCola(cola) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(cola));
    } catch {
      /* localStorage lleno/bloqueado: no es crítico */
    }
  }
 
  // Agrega un payload que no se pudo enviar, para reintentar después.
  function encolar(payload) {
    const cola = leerCola();
    cola.push({ payload, intentos: 0, ts: Date.now() });
    guardarCola(cola);
  }
 
  function hayPendientes() {
    return leerCola().length > 0;
  }
 
  // Intenta enviar un solo payload. Devuelve { ok, sesion_id? }.
  async function intentarEnviar(payload) {
    try {
      const res  = await fetch('/api/sesion/completa', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) return { ok: true, sesion_id: data.sesion_id };
      return { ok: false };
    } catch {
      return { ok: false };
    }
  }
 
  // Recorre la cola e intenta reenviar cada elemento.
  // Se puede llamar sin miedo en cualquier página: si no hay
  // pendientes, no hace nada.
  async function sincronizar() {
    let cola = leerCola();
    if (!cola.length) return;
 
    const restantes = [];
    for (const item of cola) {
      const resultado = await intentarEnviar(item.payload);
      if (resultado.ok) {
        console.log('[SEMK] Resultado pendiente sincronizado con éxito.');
      } else {
        item.intentos += 1;
        // Tope de reintentos para no acumular basura para siempre
        // (48h de vida de la cola, revisada en cada carga de página).
        const vencido = (Date.now() - item.ts) > 48 * 60 * 60 * 1000;
        if (!vencido) restantes.push(item);
      }
    }
    guardarCola(restantes);
  }
 
  return { encolar, hayPendientes, intentarEnviar, sincronizar };
})();
 
// Sincroniza en segundo plano cada vez que se carga cualquier
// página que incluya este script (no bloquea el render).
document.addEventListener('DOMContentLoaded', () => {
  window.SEMK_Pendientes.sincronizar();
});