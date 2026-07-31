//bloquea el boton de continuar hasta que el participante selle la casilla de consentimineto

document.addEventListener('DOMContentLoaded', () => {
  const chk = document.getElementById('chk-consentimiento');
  const btn = document.getElementById('btn-continuar');
  if (!chk || !btn) return;
 
  btn.addEventListener('click', (e) => {
    if (!chk.checked) {
      e.preventDefault();
      chk.closest('.consentimiento').classList.add('shake');
      setTimeout(() => chk.closest('.consentimiento').classList.remove('shake'), 500);
      chk.focus();
    }
  });
});
 