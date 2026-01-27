/**
 * API Configuration
 * Centralized endpoint configuration for all microservices
 */

// Use your server's actual IP or hostname
// For testing on local network, replace with your server IP
const SERVER_IP = '172.28.0';

export const API_CONFIG = {
    chatbot: `http://${SERVER_IP}.90:8003`,
    mobileApi: `http://${SERVER_IP}.100:8004`,
    pocketbase: `http://${SERVER_IP}.110:8090`,
    boilerAi: `http://${SERVER_IP}.70:8002`,
    mqtt: {
        host: `${SERVER_IP}.20`,
        port: 1883,
        useSSL: false,
    },
} as const;

export const MQTT_TOPICS = {
    // Subscribe topics (read sensor data)
    boilerStatus: 'ot_simulator/status',
    roomTemp: 'thermal/room_temperature',
    windowLivingRoom: 'homeassistant/binary_sensor/window_living_room/state',
    windowBedroom: 'homeassistant/binary_sensor/window_bedroom/state',
    windowKitchen: 'homeassistant/binary_sensor/window_kitchen/state',
    windowBathroom: 'homeassistant/binary_sensor/window_bathroom/state',

    // Publish topics (control)
    setTemperature: 'climate/boiler/set_temperature',
    setMode: 'climate/boiler/set_mode',
} as const;
