// ─────────────────────────────────────────────
//  api-gateway/server.js
//  Único punto de entrada público de SEMK.
//  - Sirve el frontend estático (igual que antes).
//  - Enruta /api/auth/*            -> auth-service
//  - Enruta /api/sesion/retroalimentacion -> feedback-service
//  - Enruta /api/sesion/*          -> sesion-service (el resto)
//  El frontend NO cambia: sigue pegándole a las mismas rutas
//  /api/... de siempre; el gateway decide a quién reenviar.
// ─────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app  = express();
const PORT = process.env.PORT || 3000;

const AUTH_SERVICE_URL     = process.env.AUTH_SERVICE_URL     || 'http://localhost:4001';
const SESION_SERVICE_URL   = process.env.SESION_SERVICE_URL   || 'http://localhost:4002';
const FEEDBACK_SERVICE_URL = process.env.FEEDBACK_SERVICE_URL || 'http://localhost:4003';

const ORIGENES_PERMITIDOS = [
  'http://localhost:8081',
  'http://localhost:19006',
  'http://localhost:3000',
  'https://integradora-2-production.up.railway.app',
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || ORIGENES_PERMITIDOS.includes(origin)) return callback(null, true);
    console.warn('[gateway][cors] Origin bloqueado:', origin);
    return callback(new Error('No permitido por CORS'));
  },
  credentials: true,
}));

// ── Proxies hacia cada microservicio ──────────
// IMPORTANTE: rutas mas especificas primero (retroalimentacion
// antes que /api/sesion general), si no, nunca se alcanza.

app.use('/api/sesion/retroalimentacion', createProxyMiddleware({
  target: FEEDBACK_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/sesion/retroalimentacion': '/retroalimentacion' },
}));

app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
}));

app.use('/api/sesion', createProxyMiddleware({
  target: SESION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/sesion': '' },
}));

// ── Healthcheck del gateway (Railway) ─────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'api-gateway', timestamp: new Date().toISOString() });
});

// ── Frontend estático (sin cambios) ───────────
app.use(express.static(path.join(__dirname, '../../frontend')));

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`[api-gateway] corriendo en http://localhost:${PORT}`);
  console.log(`[api-gateway] -> auth-service:     ${AUTH_SERVICE_URL}`);
  console.log(`[api-gateway] -> sesion-service:    ${SESION_SERVICE_URL}`);
  console.log(`[api-gateway] -> feedback-service:  ${FEEDBACK_SERVICE_URL}`);
});
