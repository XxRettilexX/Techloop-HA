# 🔥 Boiler Mobile App

App mobile React Native per il controllo intelligente della caldaia domestica con AI integrata.

## 📱 Screenshot

*Coming soon*

## ✨ Funzionalità

- **🌡️ Dashboard** - Visualizzazione in tempo reale di temperatura, pressione e stato caldaia
- **⚙️ Controllo** - Regolazione setpoint e modalità operative
- **💬 Chat AI** - Controllo vocale/testuale tramite assistente intelligente
- **📊 Storico** - Grafici e statistiche consumi
- **🔔 Notifiche** - Alert su anomalie e manutenzione

## 🛠️ Tech Stack

- **Framework:** React Native + Expo SDK 54
- **Navigation:** React Navigation (Stack + Bottom Tabs)
- **State:** Redux Toolkit
- **Networking:** Axios + MQTT (paho-mqtt)
- **UI:** Custom components + Lucide icons
- **Language:** TypeScript

## 🚀 Quick Start

### Prerequisiti

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app sul dispositivo (o emulatore)

### Installazione

```bash
# Clone del repository
git clone https://github.com/your-username/boiler-mobile-app.git
cd boiler-mobile-app

# Installa dipendenze
npm install

# Avvia development server
npm start
```

### Configurazione Server

Modifica `src/config/api.ts` con l'IP del tuo server:

```typescript
const SERVER_HOST = '192.168.1.100'; // Il tuo server
```

## 📂 Struttura Progetto

```
src/
├── api/           # Client API
├── components/    # Componenti riutilizzabili
├── config/        # Configurazione (API, costanti)
├── contexts/      # React Context providers
├── navigation/    # Stack e Tab navigators
├── screens/       # Schermate principali
├── services/      # Business logic (Chat, Voice, MQTT)
├── theme/         # Colori, spacing, typography
├── types/         # TypeScript interfaces
└── utils/         # Utility functions
```

## 🔌 Backend Required

Questa app richiede i seguenti servizi backend (vedi repo principale):

| Servizio | Porta | Descrizione |
|----------|-------|-------------|
| mobile_api | 8004 | REST API principale |
| chatbot | 8003 | AI Chat service |
| pocketbase | 8090 | Database + Auth |
| mosquitto | 1883 | MQTT broker |

## 📖 Documentazione

- [Setup dettagliato](SETTINGUP.md) - Note di sviluppo e limitazioni note

## 🤝 Contributing

1. Fork del progetto
2. Crea feature branch (`git checkout -b feature/nuova-feature`)
3. Commit (`git commit -m 'Add: nuova feature'`)
4. Push (`git push origin feature/nuova-feature`)
5. Apri Pull Request

## 📄 License

MIT License - vedi [LICENSE](LICENSE) per dettagli.
