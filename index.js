const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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
          const aiReply = await askGroq(text);
          await sendMessage(from, aiReply);
        }
      }
    }
  }
  res.sendStatus(200);
});

// Llamar a Groq
async function askGroq(userMessage) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: userMessage }],
        max_tokens: 1024
      })
    });
    const data = await response.json();
    console.log('Respuesta Groq:', JSON.stringify(data));
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error Groq:', error);
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

app.listen(3000, () => console.log('Bot con Groq corriendo en puerto 3000'));
