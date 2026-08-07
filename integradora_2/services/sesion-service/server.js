require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models');
 
const verificarInterno = require('./middleware/verificarInterno');
const verificarJWT     = require('./middleware/verificarJWT');
 
const app  = express();
const PORT = process.env.PORT || 4002;
 
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
 
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'sesion-service', timestamp: new Date().toISOString() });
});
 
// Solo el api-gateway (o llamadas internas con la key) pasan de aquí.
app.use(verificarInterno);
 
// Deja disponible req.usuarioAutenticado si viene un JWT válido.
// No bloquea nada por sí solo — el flujo anónimo sigue funcionando igual.
app.use(verificarJWT);
 
app.use('/internal', require('./routes/internal.routes'));
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