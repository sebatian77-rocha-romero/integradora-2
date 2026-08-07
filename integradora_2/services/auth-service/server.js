// ─────────────────────────────────────────────
//  auth-service/server.js
//  microservicio de autenticación (registro/login/logout/me).
//  Corre en su PROPIO proceso y PROPIO puerto, independiente
//  de sesion-service y feedback-service.

//  no tiene copia local de Usuario/Sesion/Genero: para esos
//  datos le pide a sesion-service por HTTP (ver utils/ .js
//  y SESION_SERVICE_URL). Solo posee su tabla `cuentas`.
// ───────────────────────────


require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models');
 
const verificarInterno = require('./middleware/verificarInterno');
 
const app  = express();
const PORT = process.env.PORT || 4001;
 
app.use(cors({ origin: true, credentials: true })); // el gateway ya filtra el origin real
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
 
// Solo el api-gateway puede llegar más allá de /health.
app.use(verificarInterno);
 
app.use('/', require('./routes/auth.routes'));
 
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'auth-service', timestamp: new Date().toISOString() });
});
 
async function start() {
  try {
    await sequelize.authenticate();
    console.log('[auth-service] Conexión a MySQL establecida (solo tabla cuentas)');
    console.log('[auth-service] -> sesion-service:', process.env.SESION_SERVICE_URL || 'http://localhost:4002');
    app.listen(PORT, () => {
      console.log(`[auth-service] corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[auth-service] Error al iniciar:', err);
    process.exit(1);
  }
}
 
start();