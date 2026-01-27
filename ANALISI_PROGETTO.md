# Analisi Progetto MQTT-Boiler-App Phase 2

## 📊 Riepilogo Architettura Attuale

### Servizi Docker (9 microservizi)

| Servizio | IP | Porta | Funzione |
|----------|-------|-------|----------|
| mqtt_broker | 172.28.0.20 | 1883 | Message broker centrale |
| homeassistant | 172.28.0.10 | 8123 | **UI attuale** - control hub |
| n8n | 172.28.0.30 | 5678 | Automazioni low-code |
| ollama | 172.28.0.40 | 11434 | LLM locale (llama3.2) |
| ot_simulator | 172.28.0.50 | - | Simulatore caldaia OpenTherm |
| thermal_simulator | 172.28.0.55 | - | Fisica riscaldamento casa |
| mcp_server | 172.28.0.60 | 8001 | Bridge MCP per AI agents |
| boiler_ai | 172.28.0.70 | 8002 | Security guardrail + maintenance |
| window_simulator | 172.28.0.80 | - | Sensori finestre virtuali |
| chatbot | 172.28.0.90 | 8003 | Controllo linguaggio naturale |

### Funzionalità Esistenti

1. **Controllo Caldaia**
   - Set temperatura (5-25°C con guardrail)
   - On/Off
   - Monitoraggio: temperatura acqua, ritorno, pressione, modulazione

2. **Simulazione Realistica**
   - Fisica caldaia (PID control, inerzia termica)
   - Riscaldamento ambiente (climate curve)
   - Sensori finestre con impatto su riscaldamento

3. **AI Features**
   - **Security Guardrail**: Validazione 3 livelli (hard limits, state check, LLM)
   - **Maintenance Predictor**: Anomalie pressione, temperatura, cicli
   - **Chatbot Italiano**: NLU con Ollama, integrazione guardrail

4. **Automazioni HA**
   - Ottimizzazione temperatura basata su meteo
   - Manutenzione predittiva
   - Protezione finestre aperte
   - Report giornalieri

### Topic MQTT Principali

```
otgw/
├── setpoint/set           # Imposta temperatura acqua
├── mode/set               # heat | off
└── status/
    ├── boiler_temp        # Temperatura acqua caldaia
    ├── return_temp        # Temperatura ritorno
    ├── modulation         # Modulazione fiamma 0-100%
    ├── pressure           # Pressione bar
    └── flame              # ON | OFF

home/
├── sensor/
│   ├── outdoor_temp       # Temp esterna
│   └── indoor_temp        # Temp interna
└── heating/demand         # Richiesta riscaldamento %

homeassistant/binary_sensor/
└── window_*/set           # on=aperta, off=chiusa
```

### API Endpoints Disponibili

**Home Assistant** (172.28.0.10:8123)
```
GET  /api/states/<entity_id>
POST /api/services/climate/set_temperature
POST /api/services/climate/turn_on
POST /api/services/climate/turn_off
```

**Chatbot** (172.28.0.90:8003)
```
POST /chat
  Body: {"message": "Imposta a 20 gradi", "entity_id": "climate.boiler"}
  Response: {"response": "✅ ...", "validated": true, "intent": {...}}
```

**Boiler AI** (172.28.0.70:8002)
```
POST /validate_command
  Body: {"entity_id": "...", "action": "set_temperature", "value": 22, "user_input": "..."}
  Response: {"allowed": true, "reason": "...", "severity": "safe"}

GET  /maintenance/report?entity_ids=sensor.boiler_pressure&hours=168
  Response: {"health_score": 85, "anomalies": [...], "optimization_suggestions": [...]}
```

## 🎯 Obiettivo Migrazione

**Sostituire Home Assistant UI** con **app mobile React Native** mantenendo:
- Tutte le funzionalità esistenti
- Integrazione AI (chatbot + maintenance)
- Aggiornamenti real-time
- Design moderno mobile-first

## 📱 Architettura Proposta

```
┌─────────────────────────┐
│   React Native App      │
│   (iOS + Android)       │
└───────────┬─────────────┘
            │ HTTP + WebSocket
            v
┌─────────────────────────┐
│   Mobile API Service    │  ← NUOVO servizio (porta 8004)
│   (FastAPI)             │
└───────────┬─────────────┘
            │
    ┌───────┼───────┬─────────┐
    v       v       v         v
┌──────┐ ┌────┐ ┌─────┐ ┌──────────┐
│  HA  │ │Chat│ │AI   │ │MQTT      │
│ API  │ │bot │ │Svc  │ │(realtime)│
└──────┘ └────┘ └─────┘ └──────────┘
```

## 📋 Deliverables

1. **Backend**: Servizio `mobile_api` (FastAPI)
   - Aggrega dati da HA, chatbot, AI service
   - WebSocket per real-time updates
   - JWT authentication

2. **Mobile App**: React Native con Expo
   - 7 schermate principali
   - 10+ componenti UI riutilizzabili
   - Redux state management
   - Tema dark/light

3. **Documentazione**:
   - Setup guide
   - API documentation
   - User manual

4. **Workflows**:
   - ✅ start-services.md
   - ✅ stop-services.md
   - ✅ test-chatbot.md
   - ✅ monitor-system.md
   - ✅ setup-react-native.md
   - ✅ create-mobile-api.md

## 🔧 Tech Stack App Mobile

- **Framework**: Expo (React Native)
- **Language**: TypeScript
- **Navigation**: React Navigation
- **State**: Redux Toolkit
- **HTTP**: Axios
- **Real-time**: WebSocket client
- **UI Library**: React Native Paper
- **Charts**: Victory Native
- **Build**: EAS (Expo Application Services)

## 📅 Prossimi Passi

Consultare:
- [`task.md`](file:///home/vito/.gemini/antigravity/brain/68def9de-593a-4ac6-8045-fac094dda34a/task.md) - Checklist dettagliata 8 fasi
- [`implementation_plan.md`](file:///home/vito/.gemini/antigravity/brain/68def9de-593a-4ac6-8045-fac094dda34a/implementation_plan.md) - Piano implementazione completo
- [`.agent/workflows/`](file:///home/vito/lab_data/MQTT-Boiler-App/Phase2/.agent/workflows) - Workflows operativi

**Pronto per iniziare lo sviluppo!** 🚀
