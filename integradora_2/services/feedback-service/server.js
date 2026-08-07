//  Microservicio de retroalimentación con IA (DeepSeek).
//  no toca la base de datos, es un simple wrapper sobre una API
//  externa. Se beneficia de escalar/cachear/tolerar fallos
//  de forma independiente al resto del sistema.

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
 
const verificarInterno = require('./middleware/verificarInterno');
 
const app  = express();
const PORT = process.env.PORT || 4003;
 
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
 
// Solo el api-gateway puede llegar más allá de /health.
// Esto evita que cualquiera llame directo a la URL pública de
// Railway de este servicio y queme la API key de DeepSeek.
app.use(verificarInterno);
 
app.post('/retroalimentacion', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ ok: false, message: 'Falta el prompt.' });
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    if (data.error) {
      console.error('[feedback-service] Error DeepSeek:', data.error);
      return res.status(500).json({ ok: false, message: data.error.message });
    }
    res.json({ ok: true, texto: data.choices?.[0]?.message?.content || '' });
  } catch (err) {
    console.error('[feedback-service] Error IA:', err.message);
    res.status(500).json({ ok: false, message: err.message });
  }
});
 
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'feedback-service', timestamp: new Date().toISOString() });
});
 
app.listen(PORT, () => {
  console.log(`[feedback-service] corriendo en http://localhost:${PORT}`);
});