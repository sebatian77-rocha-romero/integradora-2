//  server.js
//  servidor principal de SEMK
//  node.js + express + sequelize + mysql

require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const cookieParser = require('cookie-parser');
const { sequelize } = require('./models');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// Middlewares
//  CORS con credentials: true, porque el login/registro usa cookies
//  httpOnly (semk_token) y el navegador BLOQUEA cualquier fetch con
//  credentials:"include" si el servidor responde con
//  Access-Control-Allow-Origin: "*" (lo que hacía cors() sin opciones).
//  Hay que reflejar el origin exacto que pide, no "*".
//
//  App nativa (iOS/Android, Expo Go en el celular): no manda header
//  Origin, así que no aplica CORS y siempre pasa (origin === undefined).
//  Expo Web / navegador: sí manda Origin, y solo lo dejamos pasar si
//  está en la lista de abajo. Agrega aquí cualquier URL nueva desde la
//  que pruebes (otro puerto de `expo start --web`, dominio de Vercel/
//  Netlify si despliegas el web, etc.).
const ORIGENES_PERMITIDOS = [
  'http://localhost:8081',   // expo start --web (Metro)
  'http://localhost:19006',  // expo start --web (puerto clásico de Expo)
  'http://localhost:3000',   // frontend servido en local por este mismo backend
];
 
app.use(cors({
  origin(origin, callback) {
    if (!origin || ORIGENES_PERMITIDOS.includes(origin)) {
      return callback(null, true);
    }
    console.warn('[SEMK][cors] Origin bloqueado:', origin);
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../frontend')));
 
// rutas de la API 
const sesionRoutes = require('./routes/sesion.routes');
const authRoutes    = require('./routes/auth.routes');
app.use('/api/sesion', sesionRoutes);
app.use('/api/auth', authRoutes);
 
// ruta de salud (Railway la usa para healthcheck)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'SEMK API', timestamp: new Date().toISOString() });
});
 
// Fallback: servir index.html para rutas del frontend
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});
 
// arrancar servidor 
async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL establecida');
 
    // NOTA: la base de datos ya está creada por basededatos2.sql.
    // nO usamos sync({alter:true}) aquí porque intenta modificar en vivo
    // tablas que ya existen  y eso puede tumbar el arranque (ALTER TABLE fallando con ECONNRESET, por ejemplo).
    // Sequelize solo necesita autenticar; las tablas ya están listas para
    // recibir INSERT/SELECT a través de los modelos.
    console.log('ℹUsando el esquema existente de basededatos2.sql (sin sync/alter)');
 
    app.listen(PORT, () => {
      console.log(`Servidor SEMK corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error al iniciar el servidor:', err);
    process.exit(1);
  }
}
 
start();