// ─────────────────────────────────────────────
//  server.js
//  Servidor principal de SEMK
//  Node.js + Express + Sequelize + MySQL
// ─────────────────────────────────────────────


require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { sequelize } = require('./models');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// ── Middlewares ───────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 
// ── Archivos estáticos del frontend ──────────
app.use(express.static(path.join(__dirname, '../frontend')));
 
// ── Rutas de la API ───────────────────────────
const sesionRoutes = require('./routes/sesion.routes');
app.use('/api/sesion', sesionRoutes);
 
// ── Ruta de salud (Railway la usa para healthcheck) ──
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'SEMK API', timestamp: new Date().toISOString() });
});
 
// ── Fallback: servir index.html para rutas del frontend ──
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
 
// ── Arrancar servidor ─────────────────────────
async function start() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida');
 
    // NOTA: la base de datos ya está creada por basededatos2.sql.
    // NO usamos sync({alter:true}) aquí porque intenta modificar en vivo
    // tablas que ya existen (columnas sobrantes, FKs, etc.) y eso puede
    // tumbar el arranque (ALTER TABLE fallando con ECONNRESET, por ejemplo).
    // Sequelize solo necesita autenticar; las tablas ya están listas para
    // recibir INSERT/SELECT a través de los modelos.
    console.log('ℹ️  Usando el esquema existente de basededatos2.sql (sin sync/alter)');
 
    app.listen(PORT, () => {
      console.log(`✅ Servidor SEMK corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error al iniciar el servidor:', err);
    process.exit(1);
  }
}
 
start();