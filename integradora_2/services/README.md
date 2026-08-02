# SEMK — Arquitectura de microservicios

Este directorio reemplaza el backend monolítico (`backend/`) por **4 procesos
independientes**, cada uno con su propio `server.js`, `package.json`,
dependencias y puerto:

```
services/
├── api-gateway/       (puerto 3000)  → único punto público, sirve el frontend y enruta
├── auth-service/      (puerto 4001)  → registro, login, logout, /me
├── sesion-service/    (puerto 4002)  → catálogos, tests (Stroop/SART/N-Back)
└── feedback-service/  (puerto 4003)  → retroalimentación con IA (DeepSeek)
```

## Por qué se dividió así

| Servicio | Responsabilidad única | Por qué es su propio servicio |
|---|---|---|
| **auth-service** | Identidad: cuentas, contraseñas, JWT/cookie | Cambia por razones distintas al resto (seguridad, políticas de password) y podría escalar/asegurarse aparte |
| **sesion-service** | El dominio central: guardar y leer resultados de los 3 tests | Es el corazón del negocio; concentra casi toda la escritura a BD |
| **feedback-service** | Wrapper sobre una API externa (DeepSeek) | No toca la base de datos, depende de un servicio de terceros con su propia latencia/fallas — si DeepSeek se cae o tarda, no debe tumbar el resto del sistema |
| **api-gateway** | Punto de entrada único + sirve el frontend | El frontend le sigue pegando a `/api/...` igual que siempre; el gateway decide a qué microservicio reenviar cada petición |

Cada servicio expone además `GET /health` para monitoreo independiente.

## Sobre la base de datos

Por ahora los 3 servicios con BD (`auth-service`, `sesion-service`) **siguen
usando la misma base MySQL** (`estudio2`), cada uno con su propio archivo
`models/index.js` que define **solo los modelos que le corresponden a su
dominio** (p. ej. `sesion-service` no conoce el modelo `Cuenta`, eso es
exclusivo de `auth-service`). Esto es una base de datos compartida, no
"database-per-service" puro — es una decisión pragmática válida para un
proyecto académico; si tu materia pide aislamiento total de datos, el
siguiente paso sería darle a cada servicio su propia base de datos y que se
comuniquen por API en vez de por tablas compartidas (p. ej. `sesion-service`
le preguntaría a `auth-service` por un usuario en vez de leer la tabla
`usuarios` directamente).

## Cómo correrlo en local

1. Copia cada `.env.example` a `.env` dentro de su propia carpeta y ajusta
   credenciales (mismo `DB_NAME`/`DB_USER`/`DB_PASS` que ya usabas):
   ```
   cp auth-service/.env.example auth-service/.env
   cp sesion-service/.env.example sesion-service/.env
   cp feedback-service/.env.example feedback-service/.env
   cp api-gateway/.env.example api-gateway/.env
   ```
2. Instala dependencias de los 4 servicios:
   ```
   npm run install:all
   ```
3. Levanta todo junto (usa `concurrently`, ya declarado en este package.json):
   ```
   npm install        # instala concurrently
   npm run dev
   ```
   Verás los logs de los 4 procesos coloreados por servicio.

   O si prefieres correrlos en terminales separadas (más fiel a "servicios
   independientes" para tu presentación):
   ```
   cd auth-service      && npm install && npm run dev
   cd sesion-service     && npm install && npm run dev
   cd feedback-service   && npm install && npm run dev
   cd api-gateway         && npm install && npm run dev
   ```
4. Abre `http://localhost:3000` — el frontend es exactamente el mismo, y
   sigue llamando a `/api/auth/...` y `/api/sesion/...`; el gateway se
   encarga de reenviar cada petición al microservicio correcto.

### Con Docker (opcional)
```
cd services
docker compose up --build
```
Levanta MySQL + los 4 servicios juntos.

## Despliegue en Railway

Cada carpeta (`api-gateway`, `auth-service`, `sesion-service`,
`feedback-service`) es un proyecto Railway independiente (Root Directory
distinto por servicio). En el gateway, configura las variables
`AUTH_SERVICE_URL`, `SESION_SERVICE_URL` y `FEEDBACK_SERVICE_URL` apuntando
a las URLs públicas que Railway le asigne a cada microservicio.

## Qué NO cambió

- El **frontend** (`frontend/`) no se tocó ni una línea: sigue llamando a
  las mismas rutas de siempre.
- La lógica de negocio dentro de cada ruta es idéntica a la del monolito
  original — solo se reorganizó en procesos separados.
