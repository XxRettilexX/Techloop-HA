# Fase 2: Advanced Digital Twin & AI Integration

## 1. Panoramica
In questa Fase 2, il progetto evolve da una semplice simulazione hardware a un'architettura a **microservizi completa basata su Docker**. L'obiettivo è creare un ambiente "Digital Twin" robusto dove testare non solo la telemetria della caldaia, ma anche automazioni complesse (N8N) e intelligenza artificiale locale (Ollama + MCP).

## 2. Architettura del Sistema
Tutti i servizi girano su una rete Docker dedicata (`digital_twin_net`) con indirizzi IP statici per garantire una comunicazione stabile e prevedibile.

| Servizio | IP Interno (Docker) | Porta Interna | Porta Host (Accesso) | Funzione |
| :--- | :--- | :--- | :--- | :--- |
| **Home Assistant** | `172.28.0.10` | 8123 | `http://localhost:8123` | Hub di controllo domotico "Core" |
| **MQTT Broker** | `172.28.0.20` | 1883 | 1883 | Spina dorsale comunicazione messaggi |
| **N8N** | `172.28.0.30` | 5678 | `http://localhost:5678` | Motore di automazione low-code |
| **Ollama** | `172.28.0.40` | 11434 | 11434 | Server LLM (AI) Locale |
| **OT Simulator** | `172.28.0.50` | - | - | Simulatore fisico Caldaia OpenTherm |
| **MCP Server** | `172.28.0.60` | 8000 | 8001 (SSE) | Bridge "Model Context Protocol" per AI Agents |

---

## 3. Installazione e Avvio

### Prerequisiti
*   Docker e Docker Compose installati sulla macchina host (Linux).

### Avvio
Dalla cartella `Phase2/`:
```bash
docker-compose up -d --build
```
Questo comando scaricherà le immagini necessarie, costruirà i simulatori custom e avvierà lo stack.

---

## 4. Configurazione Post-Installazione

Poiché abbiamo migrato a un nuovo stack, alcune configurazioni in Home Assistant devono essere completate manualmente via interfaccia grafica (GUI).

### A. Integrazione MQTT (Caldaia)
La configurazione YAML per il *broker* è deprecata. Va aggiunta via GUI:
1.  In HA, andare su **Impostazioni** > **Dispositivi e servizi**.
2.  Aggiungi integrazione > Cerca **MQTT**.
3.  Inserisci i dati:
    *   **Broker**: `172.28.0.20` (**IMPORTANTE**: Non usare `localhost` o `127.0.0.1`)
    *   **Porta**: `1883`
4.  Conferma.
*Nota*: Le *entità* (sensori) sono invece già configurate automaticamente via `configuration.yaml` e appariranno non appena arriverà il primo dato dal simulatore.

### B. Integrazione Ollama (Intelligenza Artificiale)
1.  Scaricare un modello (una tantum) via terminale:
    ```bash
    docker exec ollama_llm ollama pull llama3.2
    ```
2.  In HA, Aggiungi integrazione > Cerca **Ollama**.
3.  Inserisci i dati:
    *   **URL**: `http://172.28.0.40:11434`
    *   **Modello**: `llama3.2`

---

## 5. Dettagli Tecnici Simulatore (OT Simulator)
Il simulatore (`ot_simulator`) è uno script Python custom che emula la fisica di una caldaia a condensazione.

*   **Logica Fisica**:
    *   Modulazione PID basata sulla differenza tra temperatura attuale e setpoint.
    *   Inerzia termica (riscaldamento e raffreddamento non istantaneo).
    *   Rumore simulato sul sensore di pressione.
*   **Topic MQTT**:
    *   `otgw/setpoint/set`: Riceve il setpoint temperatura acqua (Payload numerico).
    *   `otgw/mode/set`: Riceve comandi accensione (Payload: `heat` o `off`).
    *   `otgw/status/#`: Pubblica telemetria (`boiler_temp`, `pressure`, `flame`, `modulation`).

## 6. Troubleshooting Comune

**1. I sensori in Home Assistant sono "Sconosciuti"**
*   Causa: HA non è connesso al broker MQTT o il simulatore è fermo.
*   Soluzione: Verificare integrazione MQTT (punto 4.A) e controllare logs simulatore: `docker logs ot_simulator`.

**2. Errore "ContainerConfig" all'avvio**
*   Causa: Incompatibilità versione Docker Compose / Cache corrotta.
*   Soluzione: Rimuovere container e ricreare forzatamente:
    ```bash
    docker-compose up -d --force-recreate
    ```

**3. Home Assistant lento all'avvio**
*   Causa: Prima inizializzazione database o download aggiornamenti.
*   Soluzione: Attendere 2-3 minuti al primo boot.
