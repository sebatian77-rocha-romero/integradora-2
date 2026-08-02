// ─────────────────────────────────────────────
//  sesion-service/server.js
//  Microservicio de catálogos + sesiones de test
//  (Stroop, SART, N-Back). Su propio proceso y puerto.
// ─────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { sequelize } = require('./models');

const app  = express();
const PORT = process.env.PORT || 4002;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'sesion-service', timestamp: new Date().toISOString() });
});

app.use('/', require('./routes/sesion.routes'));

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[sesion-service] Conexión a MySQL establecida');
    app.listen(PORT, () => {
      console.log(`[sesion-service] corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[sesion-service] Error al iniciar:', err);
    process.exit(1);
  }
}

start();