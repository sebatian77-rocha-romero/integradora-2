// ─────────────────────────────────────────────
//  formulario.js---formulario de prueba y muestra
//  Valida el formulario y muestra la sección
//  de tests al pulsar CONTINUAR.
//  Guarda los datos del usuario en sessionStorage
//  para que los tests los puedan usar al enviar.
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  const btnContinuar = document.querySelector('.continuar');
  const secFormulario = document.querySelector('.formulario');
  const secTests      = document.querySelector('.tests');

  // Ocultar tests al inicio
  secTests.style.display = 'none';

  btnContinuar.addEventListener('click', () => {

    // ── Recoger valores ──────────────────────
    const nombre   = document.querySelectorAll('input[type="text"]')[0].value.trim();
    const apellido = document.querySelectorAll('input[type="text"]')[1].value.trim();
    const genero   = document.querySelectorAll('select')[0].value;
    const edad     = document.getElementById('edad').value;
    const carrera  = document.querySelectorAll('select')[1].value;
    const horasCel = document.querySelectorAll('select')[2].value;
    const appTop   = document.querySelectorAll('select')[3].value;

    // ── Validación básica ────────────────────
    if (!nombre)   { alert('Por favor ingresa tu nombre.');    return; }
    if (!apellido) { alert('Por favor ingresa tu apellido.');  return; }
    if (!genero)   { alert('Por favor selecciona tu género.'); return; }
    if (!carrera)  { alert('Por favor selecciona tu carrera.');return; }
    if (!horasCel) { alert('Por favor selecciona las horas de uso del celular.'); return; }
    if (!appTop)   { alert('Por favor selecciona la app que más tiempo te quita.'); return; }

    // ── Guardar en sessionStorage ────────────
    const datosUsuario = { nombre, apellido, genero, edad, carrera, horasCel, appTop };
    sessionStorage.setItem('semk_usuario', JSON.stringify(datosUsuario));

    // ── Transición ───────────────────────────
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

      // Iniciar el primer test (Stroop)
      if (typeof initStroop === 'function') initStroop();

    }, 400);
  });
});