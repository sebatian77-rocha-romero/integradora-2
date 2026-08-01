// ─────────────────────────────────────────────
//  inicio_sesion.js
//  Envía el login a POST /api/auth/login.
//  Si el usuario ya tiene una sesión de test previa,
//  lo manda directo a resultados.html en vez de
//  hacerlo repetir el test.
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const btn      = document.getElementById('btn-login');
  const errorBox = document.getElementById('auth-error');

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

    const email = document.getElementById('email')?.value.trim();
    const pass  = document.getElementById('pass')?.value;

    if (!email || !pass) return mostrarError('Ingresa tu correo y contraseña.');

    btn.disabled = true;
    btn.textContent = 'ENTRANDO...';

    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pass }),
      });
      const data = await res.json();

      if (!data.ok) {
        mostrarError(data.message || 'Correo o contraseña incorrectos.');
        btn.disabled = false;
        btn.textContent = 'INICIAR SESIÓN';
        return;
      }

      if (data.ultima_sesion_id) {
        window.location.href = 'resultados.html?id=' + data.ultima_sesion_id;
      } else {
        window.location.href = 'index.html';
      }
    } catch (err) {
      console.error('[SEMK] Error al iniciar sesión:', err);
      mostrarError('Error de conexión. Intenta de nuevo.');
      btn.disabled = false;
      btn.textContent = 'INICIAR SESIÓN';
    }
  });
});