# README - Chatbot AI per Caldaia

## 🤖 Panoramica

Chatbot basato su AI che permette il controllo della caldaia in linguaggio naturale italiano. Utilizza Ollama (llama3.2) per comprendere le richieste e il servizio boiler_ai per la validazione di sicurezza.

## 🚀 Avvio Servizi

```bash
cd /home/vito/lab_data/MQTT-Boiler-App/Phase2

# Build e avvio di tutti i nuovi servizi
sudo docker-compose build window_simulator chatbot
sudo docker-compose up -d window_simulator chatbot

# Verifica stato
sudo docker-compose ps
```

## 💬 Utilizzo Chatbot

### API Endpoint

**POST** `http://localhost:8003/chat`

**Richiesta:**
```json
{
  "message": "Imposta la temperatura a 22 gradi",
  "entity_id": "climate.boiler"
}
```

**Risposta:**
```json
{
  "response": "✅ Temperatura impostata a 22°C",
  "action_taken": "set_temperature",
  "validated": true,
  "intent": {
    "action": "set_temperature",
    "value": 22.0,
    "confidence": 0.95
  }
}
```

### Esempi di Comandi

```bash
# Imposta temperatura
curl -X POST http://localhost:8003/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Imposta a 21 gradi"}'

# Stato attuale
curl -X POST http://localhost:8003/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Quale è la temperatura?"}'

# Spegni caldaia
curl -X POST http://localhost:8003/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Spegni la caldaia"}'
```

### Comandi Bloccati

Il chatbot blocca automaticamente comandi pericolosi:

```bash
# Tentativo temperatura troppo alta (> 25°C)
curl -X POST http://localhost:8003/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Imposta al massimo 30 gradi"}'

# Risposta:
# {
#   "response": "❌ Temperature 30°C exceeds safety limit of 25°C\n💡 Suggerimento: Set temperature to 25°C instead",
#   "validated": false
# }
```

## 🪟Window Simulator

### Finestre Disponibili

- **window_living_room** - Soggiorno
- **window_bedroom** - Camera da Letto
- **window_kitchen** - Cucina
- **window_bathroom** - Bagno

### Controllo Finestre

```bash
# Apri finestra soggiorno
mosquitto_pub -h 172.28.0.20 -t "homeassistant/binary_sensor/window_living_room/set" -m "on"

# Chiudi finestra soggiorno
mosquitto_pub -h 172.28.0.20 -t "homeassistant/binary_sensor/window_living_room/set" -m "off"

# Stato finestre in Home Assistant
curl http://172.28.0.10:8123/api/states/binary_sensor.window_living_room \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Architettura

```
User Message
     ↓
[Chatbot Service:8003]
     ↓ (Ollama NLU)
Extract Intent
     ↓
[Boiler AI:8002]
     ↓ (Validate)
Security Guardrail
     ↓ (if allowed)
[Home Assistant:8123]
     ↓
Execute Command
```

## 📊 Flusso di Validazione

1. **User Input**: "Imposta a 22 gradi"
2. **Ollama NLU**: Estrae intent → `{action: "set_temperature", value: 22}`
3. **Guardrail**: Valida → 22°C < 25°C ✅
4. **Execution**: Comando inviato a Home Assistant
5. **Response**: "✅ Temperatura impostata a 22°C"

## 🧪 Test Completo

```bash
# 1. Verifica servizi attivi
curl http://localhost:8003/health
curl http://localhost:8002/health

# 2. Test chatbot
curl -X POST http://localhost:8003/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Imposta a 20 gradi"}'

# 3. Verifica su Home Assistant
curl http://172.28.0.10:8123/api/states/climate.boiler \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Test finestra
mosquitto_pub -h localhost -t "homeassistant/binary_sensor/window_kitchen/set" -m "on"
```

## 🎯 Integrazioni Future

### Web UI
Crea interfaccia web per il chatbot:
```html
<input id="userInput" placeholder="Cosa vuoi fare?">
<button onclick="sendMessage()">Invia</button>
<div id="chatHistory"></div>

<script>
async function sendMessage() {
  const message = document.getElementById('userInput').value;
  const response = await fetch('http://localhost:8003/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({message: message})
  });
  const result = await response.json();
  // Display result.response
}
</script>
```

### Voice Integration
Integra con Google Assistant/Alexa tramite webhook

### Telegram Bot
Usa le API del chatbot da un bot Telegram

## 📝 Log e Debug

```bash
# Log chatbot
sudo docker logs chatbot -f

# Log window simulator
sudo docker logs window_simulator -f

# Log boiler AI
sudo docker logs boiler_ai -f
```

## ⚙️ Configurazione

Tutti i servizi usano le stesse variabili d'ambiente in `docker-compose.yml`:
- `HA_URL`: URL Home Assistant
- `HA_TOKEN`: Token di accesso
- `OLLAMA_URL`: URL servizio Ollama
- `BOILER_AI_URL`: URL guardrail service

## 🔐 Sicurezza

- ✅ Ogni comando passa attraverso guardrail
- ✅ Limiti hard-coded (max 25°C)
- ✅ Rilevamento prompt injection
- ✅ Validazione stato Home Assistant

---

**Servizi Attivi**:
- Window Simulator → `172.28.0.80`
- Chatbot → `172.28.0.90` (porta 8003)
- Boiler AI → `172.28.0.70` (porta 8002)
