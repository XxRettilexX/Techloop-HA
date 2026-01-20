# 📝 Registro Aggiornamenti - 20 Gennaio 2026

Questo documento riassume tutte le modifiche, le implementazioni e le configurazioni effettuate sul sistema **MQTT-Boiler-App (Phase 2)** in data odierna.

## 1. 🌐 Accessibilità e Rete
*   **Accesso Universale**: Configurato `homeassistant/configuration.yaml` per accettare richieste da qualsiasi proxy (`trusted_proxies: 0.0.0.0/0`), risolvendo i problemi di accesso `400 Bad Request` da indirizzi IP diversi.


## 2. 🤖 Integrazione Intelligenza Artificiale (Ollama)
*   **Bridge REST**: Configurata l'integrazione diretta tra Home Assistant e il server Ollama locale (Llama 3.2).
*   **Comando**: `rest_command.query_ollama` permette di inviare prompt complessi all'AI e ricevere risposte in formato JSON per pilotare le automazioni.

## 3. 🌡️ Gestione Climatica Avanzata
### Modalità Stagionali
*   Creata l'entità `input_select.boiler_season_mode`:
    *   **Inverno ❄️**: Riscaldamento attivo e gestito da AI/Termostato.
    *   **Estate ☀️**: Riscaldamento forzato su OFF, attiva solo ACS (simulazione).
*   Automazione di switch automatico al cambio della selezione.

### Termostato Smart & Finestre
*   **Logica Termostato**: Mantenimento temperatura interna tra **18°C** e **20°C**.
    *   < 18°C: Accensione.
    *   > 20°C: Spegnimento.
*   **Protezione Finestre Aperte**: Se una qualsiasi finestra (Soggiorno, Camera, Cameretta, Bagno) risulta aperta, il riscaldamento viene bloccato immediatamente per evitare sprechi.
*   **Simulazione**:
    *   Aggiunti interruttori virtuali (`input_boolean`) nella dashboard per simulare manualmente l'apertura delle finestre.
    *   Creato sensore `sensor.temperatura_interna_simulata` che calcola dinamicamente la temperatura (Temp. Esterna + 10°C).

## 4. 🇮🇹 Localizzazione e Ridenominazione
Tutte le entità principali sono state tradotte in italiano per una dashboard più comprensibile:
*   `sensor.boiler_water_temperature` -> **Temperatura Acqua Caldaia**
*   `sensor.return_water_temperature` -> **Temperatura Acqua Ritorno**
*   `binary_sensor.window_...` -> **Finestra Soggiorno/Camera/ecc.**
*   Corretti i riferimenti in tutte le automazioni per puntare ai nuovi nomi.

## 5. 🧠 Automazioni Potenziate da LLM
Sono state implementate 4 automazioni avanzate che sfruttano l'IA decisionale:

1.  **Ottimizzazione Temperatura (Inverno)**
    *   *Trigger*: Ore 05:30, 14:00, 19:00 e Meteo avverso.
    *   *Logica*: L'AI analizza Delta-T, modulazione fiamma e previsioni meteo per decidere la temperatura di mandata ideale.

2.  **Monitoraggio Salute Boiler (Manutenzione Predittiva)**
    *   *Trigger*: Pressione anomala (<1.2 o >2.0 bar) o Ritorno troppo caldo (>50°C).
    *   *Azione*: L'AI diagnostica il problema e la gravità. Se "Alta/Critica", invia notifica di allarme.

3.  **Monitoraggio Efficienza Real-Time**
    *   *Trigger*: Modulazione fiamma bloccata al massimo (>85%) o minimo (<25%) per 30 minuti.
    *   *Azione*: L'AI suggerisce correzioni immediate per evitare pendolamenti o scarso rendimento.

4.  **Reportistica (Test Giornaliero)**
    *   *Trigger*: Ore 20:00.
    *   *Azione*: Genera un report testuale sullo stato dell'impianto, visibile come notifica e nell'entità `input_text.ultimo_report_boiler`.

## 6. 🛠️ Fix Tecnici
*   Risolto errore `Map keys must be unique` in vari file YAML.
*   Corretto errore `response_variable` nella configurazione REST.
*   Adattato limite caratteri `input_text` (max 255) per compatibilità con HA.
*   Risolto conflitto di indentazione nel blocco `input_boolean` che impediva l'avvio di HA.
*   Corretta indentazione del parametro `max` nell'entità `input_text.ultimo_report_boiler` per risolvere l'errore `Integration 'max' not found`.

---
**Stato Attuale**: Il sistema è completamente operativo, accessibile via rete locale/VPN e pronto per i test di automazione.
