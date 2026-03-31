const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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
          const aiReply = await askClaude(text);
          await sendMessage(from, aiReply);
        }
      }
    }
  }
  res.sendStatus(200);
});

// Llamar a Claude
async function askClaude(userMessage) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userMessage }]
      })
    });
    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error Claude:', error);
    return 'Lo siento, ocurrió un error. Intenta de nuevo.';
  }
}

// Enviar mensaje por WhatsApp
async function sendMessage(to, text) {
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
}
app.listen(3000, () => console.log('Bot con IA corriendo en puerto 3000'));
