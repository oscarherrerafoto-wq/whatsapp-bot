const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = "mi_token_secreto";

// Verificación del webhook
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Recibir mensajes
app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    body.entry?.forEach(entry => {
      entry.changes?.forEach(change => {
        const message = change.value?.messages?.[0];
        if (message) {
          console.log('Mensaje recibido:', message.text?.body);
        }
      });
    });
  }
  res.sendStatus(200);
});

app.listen(3000, () => console.log('Bot corriendo en puerto 3000'));
