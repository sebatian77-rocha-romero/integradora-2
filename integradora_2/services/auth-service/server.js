// ─────────────────────────────────────────────
//  auth-service/server.js
//  Microservicio de autenticación (registro/login/logout/me).
//  Corre en su PROPIO proceso y PROPIO puerto, independiente
//  de sesion-service y feedback-service.
// ─────────────────────────────────────────────

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models');

const app  = express();
const PORT = process.env.PORT || 4001;

app.use(cors({ origin: true, credentials: true })); // el gateway ya filtra el origin real
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/', require('./routes/auth.routes'));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'auth-service', timestamp: new Date().toISOString() });
});

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[auth-service] Conexión a MySQL establecida');
    app.listen(PORT, () => {
      console.log(`[auth-service] corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[auth-service] Error al iniciar:', err);
    process.exit(1);
  }
}

start();
