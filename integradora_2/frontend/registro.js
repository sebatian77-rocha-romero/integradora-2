//  Envía el formulario de creación de cuenta a
//  POST /api/auth/registro. Reutiliza el mismo
//  catálogo de géneros que usa el test (formulario.js).
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const selectGenero = document.getElementById('genero');
  const btn           = document.getElementById('btn-registro');
  const errorBox       = document.getElementById('auth-error');

  // ── Cargar géneros desde la bd
  try {
    const res  = await fetch('/api/sesion/generos');
    const json = await res.json();
    if (json.ok && json.data?.length) {
      selectGenero.innerHTML = '<option value="">-- SELECCIONE --</option>';
      json.data.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.descr;
        selectGenero.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('[SEMK] No se pudieron cargar los géneros:', err.message);
  }

  function mostrarError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }
  function limpiarError() {
    errorBox.textContent = '';
    errorBox.classList.remove('show');
  }

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    limpiarError();

    const payload = {
      nombre:     document.getElementById('nombre')?.value.trim(),
      p_apellido: document.getElementById('p-apellido')?.value.trim(),
      s_apellido: document.getElementById('s-apellido')?.value.trim() || null,
      fecha_nac:  document.getElementById('fecha-nac')?.value,
      id_genero:  selectGenero.value,
      email:      document.getElementById('email')?.value.trim(),
      pass:       document.getElementById('pass')?.value,
      c_pass:     document.getElementById('c-pass')?.value,
    };

    if (!payload.nombre || !payload.p_apellido) return mostrarError('Ingresa tu nombre y primer apellido.');
    if (!payload.fecha_nac)                     return mostrarError('Ingresa tu fecha de nacimiento.');
    if (!payload.id_genero)                     return mostrarError('Selecciona tu género.');
    if (!payload.email)                          return mostrarError('Ingresa tu correo electrónico.');
    if (!payload.pass || payload.pass.length < 8) return mostrarError('La contraseña debe tener al menos 8 caracteres.');
    if (payload.pass !== payload.c_pass)         return mostrarError('Las contraseñas no coinciden.');

    btn.disabled = true;
    btn.textContent = 'CREANDO CUENTA...';

    try {
      const res  = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.ok) {
        mostrarError(data.message || 'No se pudo crear la cuenta.');
        btn.disabled = false;
        btn.textContent = 'CREAR CUENTA';
        return;
      }

      window.location.href = 'index.html';
    } catch (err) {
      console.error('[SEMK] Error al registrar:', err);
      mostrarError('Error de conexión. Intenta de nuevo.');
      btn.disabled = false;
      btn.textContent = 'CREAR CUENTA';
    }
  });
});