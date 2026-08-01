// ─────────────────────────────────────────────
//  index.js
//  Verifica si hay una sesión de cuenta activa
//  (GET /api/auth/me). Si el usuario ya tiene un
//  test completado, el botón principal lo manda
//  directo a sus resultados en vez de repetir el test.
// ─────────────────────────────────────────────

let ultimaSesionId = null;
 
async function chequearSesion() {
  try {
    const res  = await fetch('/api/auth/me');
    const data = await res.json();
    if (!data.logueado) return;
 
    // Ocultar "Iniciar sesión", convertir "Registrarme" en "Cerrar sesión"
    const navLogin = document.getElementById('nav-login');
    const navReg   = document.getElementById('nav-registro');
    if (navLogin) navLogin.style.display = 'none';
    if (navReg) {
      navReg.textContent = 'Cerrar sesión (' + (data.nombre || data.email) + ')';
      navReg.href = '#';
      navReg.addEventListener('click', cerrarSesion);
    }
 
    if (data.ultima_sesion_id) {
      ultimaSesionId = data.ultima_sesion_id;
      const textos = ['btn-ingresar-text', 'btn-ingresar-layer1', 'btn-ingresar-layer2'];
      textos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'VER MIS RESULTADOS';
      });
      const retest = document.getElementById('auth-nav-retest');
      if (retest) retest.style.display = 'flex';
    }
  } catch (err) {
    console.warn('[SEMK] No se pudo verificar la sesión:', err.message);
  }
}
 
function irSiguiente() {
  if (ultimaSesionId) {
    window.location.href = 'resultados.html?id=' + ultimaSesionId;
  } else {
    window.location.href = 'instrucciones.html';
  }
}
 
async function cerrarSesion(e) {
  e.preventDefault();
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('[SEMK] Error al cerrar sesión:', err.message);
  }
  window.location.reload();
}
 
document.addEventListener('DOMContentLoaded', () => {
  chequearSesion();
 
  const btnIngresar = document.getElementById('btn-ingresar');
  if (btnIngresar) {
    btnIngresar.addEventListener('click', irSiguiente);
  }
});