// ─────────────────────────────────────────────
//  formulario.js  v2
//  Cambios principales:
//  - Carga carreras desde GET /api/sesion/carreras
//  - Carga géneros desde GET /api/sesion/generos
//  - Ambos selects se llenan dinámicamente desde la BD
//  - Guarda id_carrera e id_genero (no el texto) en sessionStorage
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
 
  const btnContinuar  = document.querySelector('.continuar');
  const secFormulario = document.querySelector('.formulario');
  const secTests      = document.querySelector('.tests');
 
  if (!btnContinuar)  console.error('[SEMK] No se encontró el botón ".continuar".');
  if (!secFormulario) console.error('[SEMK] No se encontró la sección ".formulario".');
  if (!secTests)      console.error('[SEMK] No se encontró la sección ".tests".');
  if (!btnContinuar || !secFormulario || !secTests) return;
 
  // Ocultar tests al inicio
  secTests.style.display = 'none';
 
  // ── Verificar si ya hay una cuenta con sesión activa ──
  let cuentaActual = null;
  try {
    const resAuth  = await fetch('/api/auth/me');
    const dataAuth = await resAuth.json();
    if (dataAuth.logueado) {
      cuentaActual = dataAuth;
      const grupoIdentidad   = document.getElementById('grupo-identidad');
      const avisoContinuidad = document.getElementById('auth-continuidad');
      if (grupoIdentidad) grupoIdentidad.style.display = 'none';
      if (avisoContinuidad) {
        avisoContinuidad.textContent = 'Continuando como ' +
          [cuentaActual.nombre, cuentaActual.p_apellido].filter(Boolean).join(' ') +
          ' (' + cuentaActual.email + ')';
        avisoContinuidad.style.display = 'block';
      }
    }
  } catch (err) {
    console.warn('[SEMK] No se pudo verificar la sesión de cuenta:', err.message);
  }
 
  // ── Cargar catálogos desde la BD ─────────────
  await Promise.all([cargarCarreras(), cargarGeneros()]);
 
  // ── Mostrar input libre cuando se elige "Otras" en apps ──
  const selectApps = document.getElementById('apps');
  const inputAppsOtra = document.getElementById('apps-otra');
  if (selectApps && inputAppsOtra) {
    selectApps.addEventListener('change', () => {
      const esOtra = selectApps.value === 'otras';
      inputAppsOtra.style.display = esOtra ? 'block' : 'none';
      if (!esOtra) inputAppsOtra.value = '';
    });
  }
 
  // ── Calcular edad a partir de fecha_nac ───────
  function calcularEdad(fecha) {
    if (!fecha) return '';
    const nac = new Date(fecha);
    if (isNaN(nac.getTime())) return '';
    const hoy = new Date();
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }
 
  // ── Llenar select de carreras desde la API ────
  async function cargarCarreras() {
    const select = document.getElementById('carrera');
    if (!select) return;
 
    try {
      const res  = await fetch('/api/sesion/carreras');
      const json = await res.json();
 
      if (!json.ok || !json.data?.length) {
        console.warn('[SEMK] No se pudieron cargar las carreras desde la BD.');
        return;
      }
 
      select.innerHTML = '<option value="">-- SELECCIONE --</option>';
      json.data.forEach(c => {
        const opt = document.createElement('option');
        opt.value       = c.id;
        opt.textContent = c.descr;
        select.appendChild(opt);
      });
 
      console.log('[SEMK] Carreras cargadas desde BD:', json.data.length);
    } catch (err) {
      console.error('[SEMK] Error al cargar carreras:', err.message);
    }
  }
 
  // ── Llenar select de géneros desde la API ─────
  async function cargarGeneros() {
    const select = document.getElementById('genero');
    if (!select) return;
 
    try {
      const res  = await fetch('/api/sesion/generos');
      const json = await res.json();
 
      if (!json.ok || !json.data?.length) {
        console.warn('[SEMK] No se pudieron cargar los géneros desde la BD.');
        return;
      }
 
      select.innerHTML = '<option value="">-- SELECCIONE --</option>';
      json.data.forEach(g => {
        const opt = document.createElement('option');
        opt.value       = g.id;
        opt.textContent = g.descr;
        select.appendChild(opt);
      });
 
      console.log('[SEMK] Géneros cargados desde BD:', json.data.length);
    } catch (err) {
      console.error('[SEMK] Error al cargar géneros:', err.message);
    }
  }
 
  // ── Procesar CONTINUAR ────────────────────────
  function procesarContinuar(evento) {
    if (evento) evento.preventDefault();
 
    const horasCel    = document.getElementById('uso-telefono')?.value      || '';
    const appsSelect  = document.getElementById('apps')?.value              || '';
    const appsOtra    = document.getElementById('apps-otra')?.value.trim()  || '';
    const appTop      = appsSelect === 'otras' ? appsOtra : appsSelect;
    const id_carrera  = document.getElementById('carrera')?.value || '';
    const selectCarrera = document.getElementById('carrera');
    const carreraText   = selectCarrera?.options[selectCarrera?.selectedIndex]?.text || '';
 
    if (!id_carrera) { alert('Por favor selecciona tu carrera.');                      return; }
    if (!horasCel)   { alert('Por favor selecciona las horas de uso del celular.');    return; }
    if (!appTop)     { alert('Por favor selecciona la app que más tiempo te quita.');  return; }
 
    let datosUsuario;
 
    if (cuentaActual) {
      // Ya tenemos su identidad desde la cuenta — no se repite el registro
      datosUsuario = {
        id_usuario_existente: cuentaActual.usuario_id,
        nombre:     cuentaActual.nombre,
        p_apellido: cuentaActual.p_apellido,
        s_apellido: cuentaActual.s_apellido,
        id_carrera:    parseInt(id_carrera),
        carrera:       carreraText,
        horas_celular: parseFloat(horasCel) || horasCel,
        apps_distractoras: [appTop],
        appTop,
      };
    } else {
      const nombre      = document.getElementById('nombre')?.value.trim()     || '';
      const p_apellido  = document.getElementById('p-apellido')?.value.trim() || '';
      const s_apellido  = document.getElementById('s-apellido')?.value.trim() || '';
      const fechaNac    = document.getElementById('fecha-nac')?.value         || '';
      const id_genero   = document.getElementById('genero')?.value  || '';
      const selectGenero = document.getElementById('genero');
      const generoText    = selectGenero?.options[selectGenero?.selectedIndex]?.text || '';
      const edad = calcularEdad(fechaNac);
 
      if (!nombre)     { alert('Por favor ingresa tu nombre.');                          return; }
      if (!p_apellido) { alert('Por favor ingresa tu primer apellido.');                 return; }
      if (!s_apellido) { alert('Por favor ingresa tu segundo apellido.');                return; }
      if (!fechaNac)   { alert('Por favor ingresa tu fecha de nacimiento.');             return; }

      // Rechaza fechas absurdas que el input type="date" a veces deja pasar
      // (ej. años con dígitos de más por scroll accidental del mouse).
      const anioNac = parseInt(fechaNac.split('-')[0], 10);
      const anioActual = new Date().getFullYear();
      if (isNaN(anioNac) || anioNac < 1930 || anioNac > anioActual) {
        alert('La fecha de nacimiento no es válida. Verifica el año ingresado.');
        return;
      }
      if (!id_genero)  { alert('Por favor selecciona tu género.');                       return; }
 
      datosUsuario = {
        nombre,
        p_apellido,
        s_apellido,
        fecha_nac:     fechaNac,
        edad,
        id_genero:     parseInt(id_genero),
        genero:        generoText,
        id_carrera:    parseInt(id_carrera),
        carrera:       carreraText,
        horas_celular: parseFloat(horasCel) || horasCel,
        apps_distractoras: [appTop],
        appTop,
      };
    }
    sessionStorage.setItem('semk_usuario', JSON.stringify(datosUsuario));
    console.log('[SEMK] Datos guardados:', datosUsuario);
 
    // Transición
    secFormulario.style.transition = 'opacity 0.4s';
    secFormulario.style.opacity    = '0';
 
    setTimeout(() => {
      secFormulario.style.display = 'none';
      secTests.style.display      = 'block';
      secTests.style.opacity      = '0';
      secTests.style.transition   = 'opacity 0.4s';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { secTests.style.opacity = '1'; });
      });
 
      if (typeof initStroop === 'function') {
        initStroop();
      } else {
        console.error('[SEMK] initStroop() no definida. Verifica el orden de los scripts.');
      }
    }, 400);
  }
 
  btnContinuar.addEventListener('click', procesarContinuar);
 
  const formPadre = btnContinuar.closest('form');
  if (formPadre) formPadre.addEventListener('submit', procesarContinuar);
});