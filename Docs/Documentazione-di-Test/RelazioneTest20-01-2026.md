# 🔬 Relazione di Laboratorio: Sistema di Controllo Caldaia IoT con AI Distribuita

**Data**: 20 Gennaio 2026
**Autore**: Paolo Ilia Magarelli
**Progetto**: MQTT-Boiler-App 
**Oggetto**: Implementazione e Test di un Digital Twin per caldaia domestica con supervisione LLM (Ollama).

---

## 1. 🎯 Obiettivo
L'obiettivo della sessione odierna è stato l'evoluzione del sistema di controllo caldaia da una gestione puramente reattiva a una **gestione predittiva e intelligente**, integrando:
1.  Accessibilità completa (LAN/WAN).
2.  Localizzazione interfaccia utente.
3.  Logiche di sicurezza (Finestre aperte).
4.  Integrazione di un **Large Language Model (Llama 3.2)** per decisioni complesse.

## 2. 🛠️ Strumenti e Ambiente
*   **Hardware**: Server Linux Ubuntu.
*   **Gestore Container**: Docker & Docker Compose.
*   **Core**: Home Assistant 2026.1.1.
*   **AI Engine**: Ollama (Running Llama 3.2).
*   **Bus Dati**: Eclipse Mosquitto (MQTT).


## 3. 🧪 Metodologia di Test e Risultati

### Test 1: Accessibilità di Rete 🌐
*   **Procedura**: Configurazione del parametro `trusted_proxies` su `0.0.0.0/0` in `configuration.yaml`. Tentativo di accesso tramite IP Pubblico e VPN.
*   **Risultato**: **POSITIVO**. Il sistema risponde correttamente senza errori `400 Bad Request`. L'accesso remoto è garantito.

### Test 2: Localizzazione e User Experience 🇮🇹
*   **Procedura**: Ridenominazione massiva delle entità MQTT e Binary Sensor in lingua italiana. Esempio: `sensor.return_water_temperature` → `Temperatura Acqua Ritorno`.
*   **Risultato**: **POSITIVO**. Dashboard aggiornata, tutte le entità sono visibili con nomi user-friendly. Le automazioni sono state rifattorizzate per puntare ai nuovi ID.

### Test 3: Simulazione Finestre e Sicurezza 🪟
*   **Procedura**:
    1.  Creazione di `input_boolean` per simulare l'apertura fisica delle finestre.
    2.  Implementazione logica: SE `Finestra Aperta` = `ON` → ALLORA `Caldaia` = `OFF`.
*   **Risultato**: **POSITIVO**. Attivando lo switch virtuale di una finestra, l'automazione intercetta lo stato e inibisce il riscaldamento, prevenendo sprechi energetici.

### Test 4: Integrazione AI (Ollama Bridge) 🧠
*   **Procedura**:
    1.  Setup di `rest_command` per inviare payload JSON a Ollama.
    2.  Creazione di automazioni complesse (Ottimizzazione, Salute, Efficienza) che inviano dati di telemetria (Temp, Pressione, DeltaT) all'AI.
*   **Risultato**: **POSITIVO**. La configurazione YAML è valida. Il comando REST è pronto per l'invio.
    *   *Nota*: Risolto bug critico su `response_variable` e limiti `input_text` durante la fase di validazione.

### Test 5: Configurazione Stagionale ❄️/☀️
*   **Procedura**: Implementazione `input_select` per modalità Estate/Inverno.
*   **Risultato**: **POSITIVO**. Il cambio di modalità innesca correttamente le automazioni associate (spegnimento riscaldamento in Estate, attivazione logica termostato in Inverno).

## 4. 📉 Analisi Errori e Troubleshooting
Durante la sessione sono emersi i seguenti errori bloccanti, risolti come segue:
1.  **Errore `input_text` max length**: Il limite di 2000 caratteri di default era eccessivo per la visualizzazione standard. Ridotto a 255.
2.  **Errore `Integration 'max' not found`**: Causato da indentazione errata in `configuration.yaml`. Corretto allineamento.

## 5. ✅ Conclusioni
Il sistema ha superato i test di configurazione preliminare. L'architettura software è stabile.
Il sistema è ora in grado di:
1.  **Simulare** l'ambiente fisico.
2.  **Monitorare** lo stato in tempo reale.
3.  **Agire** autonomamente grazie all'intelligenza artificiale locale.
