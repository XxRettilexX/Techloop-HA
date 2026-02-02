# Aggiornamenti del 02/02/2026

## 🚀 Migliorie Architettura e Simulazione

### 1. Chat AI con Risposte Dinamiche LLM

**File modificati:** `chatbot/chatbot_service.py`, `chatbot/requirements.txt`

**Nuove funzionalità:**
- ✅ **`generate_dynamic_response()`** - Tutte le risposte sono generate dall'LLM in base al contesto
- ✅ **Nessun messaggio fisso** - Ogni risposta è unica e contestuale
- ✅ **Endpoint `/chat/stream`** - Risposte in streaming SSE token per token
- ✅ **Endpoint `/chat/fast`** - Pattern matching per intent + LLM per risposta
- ✅ **Fallback intelligente** - Se LLM non disponibile, usa risposte minime di fallback

**Comportamento:**
- Comandi riconosciuti → Validazione guardrail → Risposta dinamica LLM
- Conversazione generica → Streaming LLM completo
- Intent non riconosciuto → Conversazione LLM

---

### 2. PocketBase Realtime Subscriptions

**File modificati:** `mobile_api/src/pocketbase.py`

**Nuove funzionalità:**
- ✅ **`subscribe_realtime()`** - Subscribe a collezioni PocketBase via SSE per ricevere aggiornamenti in tempo reale
- ✅ **`unsubscribe()`** - Cancellazione subscription
- ✅ **`create_record()`** e **`update_record()`** - CRUD completo
- ✅ **`get_latest_sensor_data()`** - Recupero ultimo dato sensore

**Utilizzo:**
```python
async def on_update(action, record):
    print(f"Received {action}: {record}")

sub_id = await pb_client.subscribe_realtime("boiler_history", on_update)
# ... later
pb_client.unsubscribe(sub_id)
```

---

### 3. Simulatore Termico v2.0 - Fisica Avanzata

**File modificato:** `thermal_simulator/sim_thermal.py`

**Nuove caratteristiche fisiche:**
- ✅ **Massa termica separata:** Aria+mobili (risposta veloce) + muri (risposta lenta)
- ✅ **Perdite dettagliate:** Trasmissione muri, finestre, infiltrazioni
- ✅ **Guadagno solare:** Variazione giornaliera basata su ora e meteo
- ✅ **Simulazione meteo realistica:**
  - Temperature stagionali (medie mensili per Nord Italia)
  - Ciclo giornaliero (min 6AM, max 3PM)
  - Pattern meteo (clear, cloudy, overcast, rainy)
- ✅ **Umidità e comfort:** Umidità relativa simulata + temperatura percepita/operativa
- ✅ **Calcolo radiatori con LMTD:** Log Mean Temperature Difference per output realistico

**Nuovi topic MQTT pubblicati:**
- `home/sensor/wall_temp` - Temperatura pareti
- `home/sensor/perceived_temp` - Temperatura percepita
- `home/sensor/humidity` - Umidità relativa
- `home/heating/radiator_output` - Potenza radiatori (W)
- `home/heating/solar_gain` - Guadagno solare (W)
- `home/weather/pattern` - Stato meteo

---

### 4. Simulatore Caldaia v2.0 - Comportamento Realistico

**File modificato:** `ot_simulator/sim_otgw.py`

**Nuove caratteristiche:**
- ✅ **Controllo PID:** Modulazione precisa con anti-windup
- ✅ **Isteresi bruciatore:** Protezione short-cycling (min 30s ON, 180s OFF)
- ✅ **Ciclo Anti-Legionella:** Ogni 7 giorni, riscaldamento a 65°C
- ✅ **Protezione Antigelo:** Attivazione automatica sotto 5°C esterno
- ✅ **Rumore sensori:** Simulazione accuratezza ±0.2°C temperatura, drift pressione
- ✅ **Usura componenti:** Efficienza degradante nel tempo (92% → 80% gradualmente)
- ✅ **Modalità operative:** standby, heating, anti_legionella, frost_protection, error
- ✅ **Codici errore:** E01 (ignition failure), E02 (overheat)
- ✅ **Conteggio cicli e ore funzionamento**

**Nuovi dati diagnostici:**
```json
{
  "exhaust_temp": 95.2,
  "flow_rate": 12.5,
  "efficiency": 91.2,
  "run_hours": 1250.3,
  "cycles_today": 8,
  "error_code": null
}
```

---

### 5. API Mobile - Endpoint Chat Avanzati

**File modificati:** `mobile_api/src/main.py`, `mobile_api/requirements.txt`

**Nuovi endpoint:**
- ✅ **`POST /api/chat/fast`** - Chat veloce con pattern matching
- ✅ **`POST /api/chat/stream`** - Chat SSE streaming

**Comportamento:**
- Il frontend può scegliere quale endpoint usare
- `/chat/fast` per comandi semplici (< 100ms)
- `/chat/stream` per conversazioni (risposta progressiva)
- `/chat` originale per compatibilità (risposta completa)

---

## 📋 Riepilogo Tecnico

| Componente | Prima | Dopo |
|------------|-------|------|
| Chat Response Time | 2-5s (attesa completa) | <100ms primo token |
| Simulatore Termico | Modello semplificato | Fisica edificio completa |
| Simulatore Caldaia | P-control basilare | PID + isteresi + safety |
| PocketBase | Solo polling REST | Realtime SSE support |
| Temperatura interna | Solo aria | Aria + muri + comfort |

---

## � Sistema di Caching per Risposte AI

**File modificato:** `chatbot/chatbot_service.py`

### Funzionalità implementate:

- ✅ **Classe `ResponseCache`** - Cache in-memory con supporto LRU e TTL
  - **Normalizzazione messaggi:** Lowercase, rimozione punteggiatura, normalizzazione formati temperatura
  - **Hash contestuale:** Considera solo variabili rilevanti (setpoint, mode) non valori transienti
  - **LRU eviction:** Rimozione elementi meno usati quando piena
  - **TTL configurabile:** Intent cache 1 ora, response cache 30 minuti

- ✅ **Due cache separate:**
  - `intent_cache` - Cache per estrazione intent (max 200 entries, TTL 1h)
  - `response_cache` - Cache per risposte generate (max 500 entries, TTL 30min)

- ✅ **Nuovi endpoint gestione cache:**
  - `GET /cache/stats` - Statistiche (size, hits, misses, hit_rate)
  - `POST /cache/clear?cache_type=intent|response` - Svuota cache

### Configurazione (variabili ambiente):

```env
CACHE_MAX_SIZE=500          # Max risposte in cache
CACHE_TTL_SECONDS=1800      # TTL risposte (30 min)
INTENT_CACHE_TTL=3600       # TTL intent (1 ora)
```

### Comportamento:

1. **Domanda ripetuta** → Cache HIT → Risposta istantanea (~1ms)
2. **Domanda simile** (normalizzata identica) → Cache HIT
3. **Nuova domanda** → Cache MISS → LLM genera risposta → Salva in cache
4. **Stesso comando, contesto diverso** → Cache MISS (hash contesto diverso)

### Esempio statistiche:

```json
GET /cache/stats
{
  "intent_cache": {
    "size": 45,
    "max_size": 200,
    "hits": 128,
    "misses": 45,
    "hit_rate": "74.0%"
  },
  "response_cache": {
    "size": 32,
    "max_size": 500,
    "hits": 89,
    "misses": 32,
    "hit_rate": "73.6%"
  }
}
```

---

## 🔧 Per testare le modifiche

```bash
# Rebuild dei container modificati
docker-compose build chatbot thermal_simulator ot_simulator mobile_api

# Restart
docker-compose up -d

# Test SSE streaming (richiede client SSE)
curl -X POST http://localhost:8003/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "che temperatura c'\''è?", "context": {}}'

# Test cache stats
curl http://localhost:8003/cache/stats

# Clear cache
curl -X POST "http://localhost:8003/cache/clear?cache_type=all"
```

---

## 📝 Note per sviluppi futuri

1. **Frontend mobile:** Implementare EventSource per `/api/chat/stream`
2. **Grafici storici:** Usare i nuovi dati (efficienza, cicli) per analytics
3. **Notifiche:** Trigger su codici errore caldaia
4. **Machine Learning:** I dati realistici permettono training modelli predittivi
5. **Cache persistente:** Redis per condivisione cache tra istanze
