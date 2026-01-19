## Protocollo OpenTherm.md

```markdown
# 1. IL PROTOCOLLO OPENTHERM: IL LINGUAGGIO DELLA CALDAIA

### 1.1 Cos'è OpenTherm?
OpenTherm (OT) è uno standard di comunicazione aperto e non proprietario, creato nel 1996, specifico per il dialogo tra caldaie (slave) e dispositivi di controllo come termostati (master).

### 1.2 Caratteristiche Tecniche e Vantaggi
* **Bidirezionale e Digitale:** Scambio di dati complessi, non solo segnale ON/OFF.
* **Installazione Semplice:** Utilizza solo due fili che trasportano sia l'alimentazione (per il termostato) che i dati.
* **Efficienza Energetica:** Consente la modulazione della fiamma, adattando la potenza della caldaia alla reale richiesta di calore, riducendo i cicli di accensione/spegnimento.
* **Diagnostica Avanzata:** Trasmette codici di errore e stati operativi della caldaia.
* **Dati Scambiati:** Temperatura acqua mandata/ritorno, stato bruciatore, richiesta di modulazione, setpoint, allarmi.

### 1.3 Il Ruolo di OpenTherm nel Progetto
La caldaia "parla" solo OpenTherm. Per integrarla in un sistema domotico, è indispensabile un gateway o adattatore che faccia da traduttore fisico e logico tra il protocollo OT e la rete domestica (IP/MQTT).
---

## 2. IL GATEWAY: LOGICA SULL'ESP32

### 2.1 Ruolo del Microcontrollore
L'ESP32 esegue un firmware personalizzato (in Python/MicroPython o C++) che funge da:
1. **Client MQTT:** Si connette al broker, sottoscrive i topic di comando e pubblica su quelli di stato.
2. **Traduttore Protocolli:** Converte i payload MQTT in messaggi OpenTherm validi e viceversa.

### 2.2 Librerie Software Necessarie
* **Per MQTT:** Libreria come `paho-mqtt` (per MicroPython) o `PubSubClient` (per Arduino C++).
* **Per OpenTherm:** Libreria specifica per il protocollo OT (es. OpenTherm Library per Arduino/ESP32) o implementazione custom.

### 2.3 Logica di Controllo sul Gateway
Il codice sull'ESP32 implementa una logica di controllo in tempo reale per assicurare che i comandi ricevuti via MQTT siano trasmessi correttamente alla caldaia rispettando le tempistiche del protocollo OT.

---

## 3. ANALISI DI SOLUZIONI ALTERNATIVE (RIFERIMENTO)

| Soluzione | Descrizione | Pregi | Limiti per il Progetto |
| :--- | :--- | :--- | :--- |
| **Termostato WiFi DIYLESS** | Prodotto commerciale basato su ESP32 | Pronto all'uso, integrazione HA | "Scatola nera", sensore interno inaffidabile |
| **Plugwise Adam HA/SA** | Soluzione avanzata multi-zona | User-friendly, professionale | Costo elevato, minore flessibilità didattica |
| **Termostati Wi-Fi Economici** | Controllo tramite semplice relè | Basso costo, installazione semplice | No modulazione, no diagnostica approfondita |