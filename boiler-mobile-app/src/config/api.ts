/**
 * API Configuration
 * Centralized endpoint configuration for all microservices
 * 
 * For development: Use your server's IP/hostname with Docker exposed ports
 * Production: Replace with actual production URLs
 */

// Server configuration - change this to your server's IP or hostname
// For local Docker: use localhost or 127.0.0.1
// For remote server: use the server's IP (e.g., 192.168.1.100 or Tailscale IP)
const SERVER_HOST = '192.168.1.18'; // Change this to your server IP

// Docker exposed ports (from docker-compose.yml)
const PORTS = {
    mobileApi: 8004,    // mobile_api service
    chatbot: 8003,      // chatbot service  
    pocketbase: 8090,   // pocketbase database
    boilerAi: 8002,     // AI boiler service
    mqtt: 1883,         // MQTT broker
};

export const API_CONFIG = {
    // Main API endpoint for mobile app
    mobileApi: `http://${SERVER_HOST}:${PORTS.mobileApi}/api`,

    // Direct chatbot access (also available via mobile_api)
    chatbot: `http://${SERVER_HOST}:${PORTS.chatbot}`,

    // PocketBase for authentication (if needed directly)
    pocketbase: `http://${SERVER_HOST}:${PORTS.pocketbase}`,

    // AI Boiler service (for direct access)
    boilerAi: `http://${SERVER_HOST}:${PORTS.boilerAi}`,

    // MQTT configuration for real-time updates
    mqtt: {
        host: SERVER_HOST,
        port: PORTS.mqtt,
        useSSL: false,
    },

    // WebSocket for real-time boiler status
    wsBoiler: `ws://${SERVER_HOST}:${PORTS.mobileApi}/ws/boiler`,
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

// Export server host for dynamic configuration
export const getServerHost = () => SERVER_HOST;
export const setServerHost = (host: string) => {
    // Note: This won't update the const, but useful for runtime checks
    console.log(`Server host would be: ${host}`);
};
