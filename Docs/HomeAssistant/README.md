# 1. HOME ASSISTANT: IL CERVELLO DOMOTICO

### 1.1 Definizione e Filosofia
Home Assistant (HA) è un software open-source per la domotica, scritto in Python. Funge da "cervello centrale" che integra, automatizza e controlla dispositivi di marche diverse, privilegiando il controllo locale, la privacy e l'indipendenza dal cloud.

### 1.2 Architettura e Componenti Chiave per il Progetto
* **Piattaforma di Integrazione:** Gestisce migliaia di connettori per protocolli e dispositivi.
* **Automazioni:** Motore per creare regole complesse "if-this-then-that" basate su trigger, condizioni e azioni.
* **Dashboard (Lovelace):** Interfaccia utente personalizzabile per il monitoraggio e il controllo in tempo reale.
* **Entità:** Rappresentazioni software interne di ogni sensore, interruttore o dispositivo. Es: `sensor.temperatura_caldaia`.
* **MQTT:** Protocollo di messaggistica leggero e asincrono. È l'integrazione cruciale per questo progetto, poiché funge da ponte di comunicazione tra il gateway hardware e il core di HA.

### 1.3 Hardware e Installazione
* **Software:** Consigliato Home Assistant OS, installabile su Raspberry Pi, VM o mini-PC.
* **Hardware di Riferimento:** Raspberry Pi 4 (o superiore) per affidabilità, basso consumo e vasto supporto comunitario.

### 1.4 Vantaggi e Svantaggi
| Vantaggi | Svantaggi |
| :--- | :--- |
| Privacy e controllo locale | Curva di apprendimento iniziale |
| Estrema personalizzazione | Richiede hardware dedicato |
| Supporto per migliaia di dispositivi | Manutenzione manuale necessaria |

---

## 2. INTEGRAZIONE SOFTWARE: HOME ASSISTANT E MQTT

### 2.1 Configurazione di Base in Home Assistant
* **Broker MQTT:** Deve essere installato e configurato (es. Mosquitto add-on in HA).
* **Integrazione MQTT:** Da abilitare nelle impostazioni di HA.

### 2.2 Definizione delle Entità MQTT
Per far comunicare HA con il gateway, si definiscono entità che "puntano" ai topic MQTT giusti.

### 2.3 Configurazione Dettagliata del Termostato MQTT
L'entità `climate` (climatizzazione) è quella più adatta a rappresentare un termostato. Richiede la definizione di topic specifici.

**Esempio di configurazione YAML per il termostato:**
```yaml
mqtt:
  climate:
    - name: "Caldaia OpenTherm"
      modes:
        - "off"
        - "heat"
      current_temperature_topic: "homeassistant/boiler/temperature_state"
      temp_command_topic: "homeassistant/boiler/setpoint_command"
      temperature_state_topic: "homeassistant/boiler/setpoint_state"
      min_temp: 10
      max_temp: 30
      precision: 0.1# Home Assistant (HA) e l'Integrazione MQTT
**Ruolo nel progetto:** Gestione, Automazione e Interfaccia Utente.
## Cos'è Home Assistant
Home Assistant è una piattaforma open-source che centralizza il controllo dei dispositivi domotici, garantendo privacy e controllo locale. In questo progetto, funge da interfaccia tra l'utente e la caldaia.

### Componenti Chiave
* **Integrazione MQTT:** È il connettore fondamentale. HA si iscrive ai "topic" (canali) MQTT trasmessi dal gateway per aggiornare lo stato dei sensori.
* **Entità:** Ogni dato della caldaia diventa un oggetto nel software (es. `sensor.caldaia_temperatura`).
* **Dashboard Lovelace:** L'interfaccia grafica dove viene visualizzato il termostato virtuale e i grafici di consumo.



### Configurazione del Termostato (Climate)
Per gestire la caldaia, in HA si configura un'entità di tipo `climate`. Questa permette di:
1.  Inviare il **Setpoint** (temperatura desiderata) tramite un comando MQTT.
2.  Ricevere lo **Stato** attuale (temperatura rilevata e modalità operativa).

**Esempio Concettuale Configurazione YAML:**
```yaml
mqtt:
  climate:
    - name: "Termostato Caldaia"
      modes: ["heat", "off"]
      temp_command_topic: "homeassistant/boiler/setpoint_command"
      temp_state_topic: "homeassistant/boiler/temperature_state"