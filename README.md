# Documentazione Unificata: Progetto di Integrazione Home Assistant e OpenTherm per la Gestione di una Caldaia

**Data di compilazione:** Gennaio 2026  
**Sintesi preparata per il progetto "Smart Boiler" - ITS**

---

## SOMMARIO ESECUTIVO
Questo documento riunisce e organizza le informazioni tecniche e progettuali provenienti da tre fonti distinte, con l'obiettivo di delineare una soluzione completa per il monitoraggio e il controllo "smart" di una caldaia domestica. La soluzione prevede l'integrazione del protocollo OpenTherm con la piattaforma di domotica Home Assistant, attraverso l'utilizzo di un gateway hardware basato su ESP32 e del protocollo di comunicazione MQTT.

---

## 1. INTRODUZIONE AL PROGETTO

### 1.1 Obiettivo Primario
Sviluppare un sistema autonomo per la gestione intelligente (monitoraggio e controllo) di un boiler/caldaia. Il sistema deve:
* Leggere dati operativi dalla caldaia (temperatura, stato, errori).
* Permettere il controllo remoto e l'impostazione di setpoint.
* Integrarsi perfettamente in un ecosistema domotico locale, senza dipendenza da cloud proprietari.
* Servire come progetto di apprendimento per comprendere a fondo il flusso dati tra hardware industriale (caldaia) e software di automazione.

### 1.2 Filosofia Progettuale: Sviluppo vs. Soluzione Preconfezionata
Il cuore del progetto risiede nello sviluppo autonomo della logica di comunicazione. Mentre esistono soluzioni commerciali pronte all'uso (es. termostato WiFi DIYLESS o Plugwise Adam), il loro utilizzo bypasserebbe gli obiettivi didattici e di sviluppo. L'analisi di questi prodotti serve esclusivamente come riferimento architetturale e funzionale.

---

## 2. ARCHITETTURA DI SISTEMA COMPLETA

### 2.1 Componenti Fisici (Hardware)
(Inclusi nel progetto: Caldaia, Gateway ESP32, Interfaccia OpenTherm, Raspberry Pi per Home Assistant).

### 2.2 Flusso Logico dei Dati
Il flusso dati segue un ciclo continuo di monitoraggio e controllo:
1. **Lettura:** Il dispositivo OpenTherm legge i dati dalla caldaia (es. temperatura attuale).
2. **Traduzione & Invio:** L'ESP32 traduce i dati OT in un formato leggibile (es. JSON) e li pubblica su un topic MQTT specifico (es. homeassistant/boiler/temperature_state).
3. **Ricezione in HA:** Home Assistant, tramite l'integrazione MQTT, è sottoscritto a quel topic. Riceve i dati e aggiorna lo stato delle relative entità sensore.
4. **Comando dall'Utente:** Un utente imposta una temperatura desiderata (setpoint) sul termostato virtuale nell'interfaccia di HA.
5. **Invio Comando:** HA pubblica il nuovo setpoint su un topic di comando MQTT (es. homeassistant/boiler/setpoint_command).
6. **Esecuzione:** L'ESP32 è sottoscritto al topic di comando. Riceve l'ordine, lo traduce in un messaggio OpenTherm valido e lo invia alla caldaia attraverso il dispositivo OT.
7. **Conferma:** Il ciclo riparte dal punto 1, confermando il cambiamento di stato.

---

## 3. CONCLUSIONI E PROSSIMI PASSI

### 3.1 Sintesi della Soluzione Scelta
Il percorso identificato come ottimale per gli obiettivi di apprendimento e controllo completo prevede:
1. **Hardware:** Sviluppo di un gateway basato su ESP32 + scheda interfaccia OpenTherm.
2. **Firmware:** Scrittura di codice personalizzato su ESP32 per la gestione della doppia traduzione OpenTherm <-> MQTT.
3. **Integrazione:** Configurazione in Home Assistant di sensori e un'entità termostato tramite l'integrazione MQTT.
4. **Logica:** Implementazione di automazioni direttamente in HA per un controllo intelligente basato su dati ambientali.

### 3.2 Punti Critici e Rischio
* **Complessità di Programmazione:** Necessaria padronanza della libreria OpenTherm e della programmazione per microcontrollori.
* **Rischio di Danni:** Errori nel firmware o nel cablaggio potrebbero potenzialmente causare malfunzionamenti alla caldaia. Massima cautela in fase di test.
* **Configurazione MQTT:** Requisito di una corretta e robusta configurazione del broker e dei topic per garantire un flusso dati affidabile.

### 3.3 Valore del Progetto
Nonostante la disponibilità di alternative commerciali, lo sviluppo da zero di questa architettura garantisce:
* **Controllo Totale:** Su ogni aspetto del sistema.
* **Apprendimento Profondo:** Comprensione completa dello stack tecnologico.
* **Flessibilità Massima:** Possibilità di personalizzare e adattare il sistema a esigenze future.
