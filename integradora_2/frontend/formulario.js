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

    const nombre     = document.getElementById('nombre')?.value.trim()     || '';
    const p_apellido = document.getElementById('p-apellido')?.value.trim() || '';
    const s_apellido = document.getElementById('s-apellido')?.value.trim() || '';
    const fechaNac   = document.getElementById('fecha-nac')?.value         || '';
    const horasCel   = document.getElementById('uso-telefono')?.value      || '';
    const appsSelect = document.getElementById('apps')?.value              || '';
    const appsOtra   = document.getElementById('apps-otra')?.value.trim()  || '';
    const appTop     = appsSelect === 'otras' ? appsOtra : appsSelect;

    // ID numérico del catálogo (viene del value=id)
    const id_genero  = document.getElementById('genero')?.value  || '';
    const id_carrera = document.getElementById('carrera')?.value || '';

    // Texto visible para mostrar en resultados.html
    const selectGenero  = document.getElementById('genero');
    const selectCarrera = document.getElementById('carrera');
    const generoText    = selectGenero?.options[selectGenero?.selectedIndex]?.text   || '';
    const carreraText   = selectCarrera?.options[selectCarrera?.selectedIndex]?.text || '';

    const edad = calcularEdad(fechaNac);

    // Validaciones
    if (!nombre)     { alert('Por favor ingresa tu nombre.');                          return; }
    if (!p_apellido) { alert('Por favor ingresa tu primer apellido.');                 return; }
    if (!s_apellido) { alert('Por favor ingresa tu segundo apellido.');                return; }
    if (!fechaNac)   { alert('Por favor ingresa tu fecha de nacimiento.');             return; }
    if (!id_genero)  { alert('Por favor selecciona tu género.');                       return; }
    if (!id_carrera) { alert('Por favor selecciona tu carrera.');                      return; }
    if (!horasCel)   { alert('Por favor selecciona las horas de uso del celular.');    return; }
    if (!appTop)     { alert('Por favor selecciona la app que más tiempo te quita.');  return; }

    // Guardar en sessionStorage
    // ID para enviar a la BD, texto para mostrar en resultados
    const datosUsuario = {
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