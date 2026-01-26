"""
Window Simulator for Home Assistant
Simulates virtual windows that can be opened/closed via MQTT
"""
import paho.mqtt.client as mqtt
import time
import json
import os
import random

# Configuration
BROKER = os.getenv("MQTT_BROKER", "172.28.0.20")
PORT = 1883

# Define windows
WINDOWS = {
    "living_room": {"state": "off", "room": "Soggiorno"},
    "bedroom": {"state": "off", "room": "Camera da Letto"},
    "kitchen": {"state": "off", "room": "Cucina"},
    "bathroom": {"state": "off", "room": "Bagno"}
}

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, "Window_Simulator")

def on_connect(client, userdata, flags, rc, properties):
    print(f"Connected to MQTT Broker with result code {rc}")
    
    # Subscribe to control topics
    for window_id in WINDOWS.keys():
        topic = f"homeassistant/binary_sensor/window_{window_id}/set"
        client.subscribe(topic)
        print(f"Subscribed to {topic}")

def on_message(client, userdata, msg):
    """Handle incoming MQTT messages to control windows"""
    try:
        # Extract window ID from topic
        # Topic format: homeassistant/binary_sensor/window_<id>/set
        parts = msg.topic.split("/")
        if len(parts) >= 3:
            window_part = parts[2]  # window_<id>
            if window_part.startswith("window_"):
                window_id = window_part.replace("window_", "")
                
                if window_id in WINDOWS:
                    payload = msg.payload.decode().lower()
                    
                    # Update state
                    if payload in ["on", "open", "1"]:
                        WINDOWS[window_id]["state"] = "on"
                        print(f"✅ {WINDOWS[window_id]['room']}: Finestra APERTA")
                    elif payload in ["off", "close", "closed", "0"]:
                        WINDOWS[window_id]["state"] = "off"
                        print(f"❌ {WINDOWS[window_id]['room']}: Finestra CHIUSA")
                    
                    # Publish new state
                    publish_window_state(window_id)
    except Exception as e:
        print(f"Error handling message: {e}")

def publish_window_state(window_id):
    """Publish window state to MQTT"""
    state = WINDOWS[window_id]["state"]
    room = WINDOWS[window_id]["room"]
    
    # Publish state
    state_topic = f"homeassistant/binary_sensor/window_{window_id}/state"
    client.publish(state_topic, state, retain=True)
    
    # Publish attributes
    attr_topic = f"homeassistant/binary_sensor/window_{window_id}/attributes"
    attributes = {
        "friendly_name": f"Finestra {room}",
        "device_class": "window",
        "room": room
    }
    client.publish(attr_topic, json.dumps(attributes), retain=True)

def publish_discovery_configs():
    """Publish Home Assistant MQTT Discovery configurations"""
    for window_id, window_data in WINDOWS.items():
        room = window_data["room"]
        
        # Discovery topic
        discovery_topic = f"homeassistant/binary_sensor/window_{window_id}/config"
        
        # Configuration payload
        config = {
            "name": f"Finestra {room}",
            "unique_id": f"window_sim_{window_id}",
            "state_topic": f"homeassistant/binary_sensor/window_{window_id}/state",
            "command_topic": f"homeassistant/binary_sensor/window_{window_id}/set",
            "device_class": "window",
            "payload_on": "on",
            "payload_off": "off",
            "json_attributes_topic": f"homeassistant/binary_sensor/window_{window_id}/attributes",
            "device": {
                "identifiers": ["window_simulator"],
                "name": "Simulatore Finestre",
                "model": "Virtual Window",
                "manufacturer": "LabSim"
            }
        }
        
        client.publish(discovery_topic, json.dumps(config), retain=True)
        print(f"📡 Published discovery config for {room}")

def publish_all_states():
    """Publish current state of all windows"""
    for window_id in WINDOWS.keys():
        publish_window_state(window_id)

# Configure MQTT callbacks
client.on_connect = on_connect
client.on_message = on_message

# Connect to broker
print(f"Connecting to MQTT broker at {BROKER}:{PORT}...")
while True:
    try:
        client.connect(BROKER, PORT, 60)
        break
    except Exception as e:
        print(f"Waiting for broker... ({e})")
        time.sleep(5)

# Start MQTT loop
client.loop_start()

# Publish discovery configurations
time.sleep(1)  # Wait for connection to stabilize
publish_discovery_configs()

# Publish initial states
time.sleep(0.5)
publish_all_states()

print("\n" + "="*50)
print("🪟 Window Simulator Running")
print("="*50)
for window_id, window_data in WINDOWS.items():
    print(f"  {window_data['room']}: {window_data['state'].upper()}")
print("="*50)
print("\nControlli disponibili via MQTT:")
for window_id in WINDOWS.keys():
    print(f"  homeassistant/binary_sensor/window_{window_id}/set [on/off]")
print("\nPress Ctrl+C to exit")
print("="*50 + "\n")

# Keep running
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n👋 Shutting down Window Simulator...")
    client.loop_stop()
    client.disconnect()
