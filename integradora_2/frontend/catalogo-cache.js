// ─────────────────────────────────────────────
//  catalogo-cache.js
//  Caché local (localStorage) para catálogos estables
//  (generos, carreras) que sesion-service expone.
//
//  Por qué existe:
//  - /api/sesion/generos y /api/sesion/carreras viven en
//    sesion-service. Si ese servicio se cae, formulario.js y
//    registro.js se quedaban sin poder llenar los <select>,
//    tumbando el flujo completo (formulario -> tests) aunque
//    Stroop/SART/N-Back no necesitan a sesion-service hasta el
//    envío final (POST /api/sesion/completa).
//  - Estos catálogos casi nunca cambian, así que cachearlos es
//    seguro y de bajo riesgo.
//
//  Estrategia (stale-while-revalidate):
//   1. Si hay copia en localStorage -> se devuelve YA, sin
//      esperar red. Se intenta refrescar en segundo plano.
//   2. Si no hay copia -> se espera la red una vez.
//   3. Si la red falla y no hay copia -> fallback estático
//      embebido (semilla real de basededatos2.sql), para que
//      incluso el primer visitante durante una caída pueda
//      continuar con el flujo.
// ─────────────────────────────────────────────

window.SEMK_Catalogo = (function () {
  const TTL_MS = 24 * 60 * 60 * 1000; // 24h: rara vez cambian

  const FALLBACK = {
    generos: [
      { id: 1, descr: 'Femenino' },
      { id: 2, descr: 'Masculino' },
      { id: 3, descr: 'Otro' },
      { id: 4, descr: 'Prefiero no decir' },
    ],
    carreras: [
      { id: 1,  descr: 'Ingeniería en Mecatrónica' },
      { id: 2,  descr: 'Ingeniería en Logística Internacional' },
      { id: 3,  descr: 'Ingeniería en Energías y Desarrollo Sostenible' },
      { id: 4,  descr: 'Ingeniería en Tecnologías de la Información' },
      { id: 5,  descr: 'Licenciatura en Negocios y Mercadotecnia' },
      { id: 6,  descr: 'Licenciatura en Educación' },
      { id: 7,  descr: 'Ingeniería Industrial' },
      { id: 8,  descr: 'Ingeniería en Mantenimiento Industrial' },
      { id: 9,  descr: 'Licenciatura en Diseño Digital y Producción Audiovisual' },
      { id: 10, descr: 'Licenciatura en Comercio Internacional y Aduanas' },
    ],
  };

  function leerCache(clave) {
    try {
      const raw = localStorage.getItem('semk_cache_' + clave);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (!Array.isArray(data) || !data.length) return null;
      return { data, vencida: (Date.now() - ts) > TTL_MS };
    } catch {
      return null; // localStorage corrupto/bloqueado: se ignora, no es crítico
    }
  }

  function guardarCache(clave, data) {
    try {
      localStorage.setItem(
        'semk_cache_' + clave,
        JSON.stringify({ data, ts: Date.now() })
      );
    } catch {
      /* localStorage lleno o bloqueado (modo privado, etc.): no es crítico */
    }
  }

  async function obtener(clave, url) {
    const cache = leerCache(clave);

    const fetchFresco = fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (json.ok && json.data?.length) {
          guardarCache(clave, json.data);
          return json.data;
        }
        throw new Error('respuesta vacía o inválida');
      });

    if (cache) {
      // Ya hay algo que mostrar de inmediato -> no bloqueamos la UI.
      // El refresh en segundo plano actualiza la cache para la próxima vez;
      // si falla, seguimos usando lo que ya teníamos, sin romper nada.
      fetchFresco.catch((err) =>
        console.warn(
          `[SEMK] No se pudo refrescar "${clave}" (usando cache local):`,
          err.message
        )
      );
      return cache.data;
    }

    // Sin cache todavía: sí esperamos la red, con fallback si falla.
    try {
      return await fetchFresco;
    } catch (err) {
      console.warn(
        `[SEMK] "${clave}" no disponible (¿sesion-service caído?). Usando catálogo de respaldo.`,
        err.message
      );
      return FALLBACK[clave];
    }
  }

  return {
    generos: () => obtener('generos', '/api/sesion/generos'),
    carreras: () => obtener('carreras', '/api/sesion/carreras'),
  };
})();