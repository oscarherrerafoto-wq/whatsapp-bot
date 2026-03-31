const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Verificación del webhook
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Recibir y responder mensajes
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const message = change.value?.messages?.[0];
        if (message && message.type === 'text') {
          const from = message.from;
          const text = message.text.body;
          console.log('Mensaje de:', from, '→', text);
          const aiReply = await askGemini(text);
          await sendMessage(from, aiReply);
        }
      }
    }
  }
  res.sendStatus(200);
});

// Llamar a Gemini
async function askGemini(userMessage) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }]
        })
      }
    );
    const data = await response.json();
    console.log('Respuesta Gemini:', JSON.stringify(data));
    if (data.candidates && data.candidates[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      return 'No pude generar una respuesta. Intenta de nuevo.';
    }
  } catch (error) {
    console.error('Error Gemini:', error);
    return 'Lo siento, ocurrió un error. Intenta de nuevo.';
  }
}

// Enviar mensaje por WhatsApp
async function sendMessage(to, text) {
  try {
    await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        text: { body: text }
      })
    });
  } catch (error) {
    console.error('Error WhatsApp:', error);
  }
}

app.listen(3000, () => console.log('Bot con Gemini corriendo en puerto 3000'));
