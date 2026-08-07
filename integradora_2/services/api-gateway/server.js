// ─────────────────────────────────────────────
//  api-gateway/server.js
//  Único punto de entrada público de SEMK.
//  - Enruta /api/auth/*            -> auth-service
//  - Enruta /api/sesion/retroalimentacion -> feedback-service
//  - Enruta /api/sesion/*          -> sesion-service (el resto)
// ─────────────────────────────────────────────

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const helmet    = require('helmet');                              // lo que me paso emilio
const { createProxyMiddleware } = require('http-proxy-middleware');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// endurecimiento básico --> lo que me paso emilio
app.disable('x-powered-by');                                      
// CSP desactivada explícitamente: el default de helmet bloquea    
// Google Fonts (fonts.googleapis.com / fonts.gstatic.com) que     
// usa el frontend. Los demás headers de helmet (X-Frame-Options,  
// X-Content-Type-Options, etc.) sí quedan activos.                
app.use(helmet({ contentSecurityPolicy: false }));                 
 
// Límite de tamaño de payload (evita requests gigantes)           
const limitarPayload = (req, res, next) => {                       
  const MAX_BYTES = 1 * 1024 * 1024; // 1MB                        
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > MAX_BYTES) {  
    return res.status(413).json({ ok: false, message: 'Payload demasiado grande.' });          
  }                                                                 
  next();                                                           
};                                                                   
app.use(limitarPayload);                                            
 
 
const AUTH_SERVICE_URL     = process.env.AUTH_SERVICE_URL     || 'http://localhost:4001';
const SESION_SERVICE_URL   = process.env.SESION_SERVICE_URL   || 'http://localhost:4002';
const FEEDBACK_SERVICE_URL = process.env.FEEDBACK_SERVICE_URL || 'http://localhost:4003';
const INTERNAL_API_KEY     = process.env.INTERNAL_API_KEY;
 
if (!INTERNAL_API_KEY) {
  console.warn('[gateway] INTERNAL_API_KEY no configurada: los microservicios rechazaran todo con 401.');
}
 
// Inyecta el header que verificarInterno espera en cada microservicio.
// Sin esto, TODAS las peticiones (incluso las legitimas via gateway)
// son rechazadas con 401 por verificarInterno.
function inyectarClaveInterna(proxyReq) {
  proxyReq.setHeader('x-internal-key', INTERNAL_API_KEY || '');
}
 
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
 
// ── Bloqueo de rutas internas ─────────────────
// /internal/* de cada microservicio es SOLO para llamadas
// servicio-a-servicio (ej. auth-service -> sesion-service),
// que van directo por la red interna y NUNCA pasan por aquí.
// Sin este bloqueo, el header x-internal-key que este gateway
// inyecta abajo en TODA petición reenviada terminaría abriendo
// /api/sesion/internal/... al público, porque el gateway le
// pondría la credencial sin distinguir quién la pidió.
app.use((req, res, next) => {
  if (req.path.includes('/internal')) {
    console.warn('[gateway] Bloqueado intento de acceso a ruta interna desde el público:', req.path, '| IP:', req.ip);
    return res.status(404).json({ ok: false, message: 'No encontrado.' });
  }
  next();
});
 
// ── Proxies hacia cada microservicio ──────────
// IMPORTANTE: rutas mas especificas primero (retroalimentacion
// antes que /api/sesion general), si no, nunca se alcanza.
 
app.use('/api/sesion/retroalimentacion', createProxyMiddleware({
  target: FEEDBACK_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/sesion/retroalimentacion': '/retroalimentacion' },
  onProxyReq: inyectarClaveInterna,
}));
 
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
  onProxyReq: inyectarClaveInterna,
}));
 
app.use('/api/sesion', createProxyMiddleware({
  target: SESION_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/sesion': '' },
  onProxyReq: inyectarClaveInterna,
}));
 
// healthcheck del gateway (Railway)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'api-gateway', timestamp: new Date().toISOString() });
});
 
// frontend estático
app.use(express.static(path.join(__dirname, '../../frontend')));
 
//cualquier archivo que no coincida con el archivo estatico ni con las rutas de arriba es un 404 real
app.get((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '../../frontend/404.html'));
});
 
app.listen(PORT, () => {
  console.log(`[api-gateway] corriendo en http://localhost:${PORT}`);
  console.log(`[api-gateway] -> auth-service:     ${AUTH_SERVICE_URL}`);
  console.log(`[api-gateway] -> sesion-service:    ${SESION_SERVICE_URL}`);
  console.log(`[api-gateway] -> feedback-service:  ${FEEDBACK_SERVICE_URL}`);
});