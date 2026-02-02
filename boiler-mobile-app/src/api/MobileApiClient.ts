import { API_CONFIG } from '../config/api';

export interface BoilerStatus {
    water_temp: number;
    return_temp: number;
    pressure: number;
    modulation: number;
    flame_on: boolean;
    setpoint: number;
    enabled: boolean;
    indoor_temp: number;
    outdoor_temp: number;
    timestamp: string;
}

export interface ChatResponse {
    response: string;
    validated: boolean;
    action_taken?: string;
    intent?: any;
}

export interface RoomStatus {
    currentTemp: number;
    targetTemp: number;
}

export interface WindowSensor {
    id: string;
    name: string;
    isOpen: boolean;
}

export interface Schedule {
    id: string;
    time: string;
    temperature: number;
    active: boolean;
}

export interface EnergyData {
    currentMonth: number;
    previousMonth: number;
    daily: number[];
}

class MobileApiClient {
    private baseUrl = API_CONFIG.mobileApi;
    private ws: WebSocket | null = null;
    private listeners: ((status: BoilerStatus) => void)[] = [];
    private reconnectTimeout: NodeJS.Timeout | null = null;

    /**
     * Get boiler status from backend
     */
    async getBoilerStatus(): Promise<BoilerStatus> {
        const response = await fetch(`${this.baseUrl}/boiler/status`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Set boiler temperature setpoint
     */
    async setTemperature(temp: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/set_temperature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temperature: temp }),
            });
            return response.ok;
        } catch (error) {
            console.error('Error setting temperature:', error);
            throw error;
        }
    }

    /**
     * Set room target temperature
     */
    async setRoomTemperature(temp: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/set_room_temperature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temperature: temp }),
            });
            return response.ok;
        } catch (error) {
            console.error('Error setting room temperature:', error);
            throw error;
        }
    }

    /**
     * Turn on the boiler
     */
    async turnOn(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/turn_on`, {
                method: 'POST',
            });
            return response.ok;
        } catch (error) {
            console.error('Error turning on boiler:', error);
            throw error;
        }
    }

    /**
     * Turn off the boiler
     */
    async turnOff(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/turn_off`, {
                method: 'POST',
            });
            return response.ok;
        } catch (error) {
            console.error('Error turning off boiler:', error);
            throw error;
        }
    }

    /**
     * Send chat message
     */
    async sendChatMessage(message: string): Promise<ChatResponse> {
        const response = await fetch(`${this.baseUrl}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                entity_id: "climate.boiler"
            }),
        });

        if (!response.ok) {
            throw new Error(`Chat API error: ${response.status}`);
        }
        return await response.json();
    }

    /**
     * Connect to WebSocket for real-time updates
     */
    connectWebSocket() {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.ws = new WebSocket(API_CONFIG.wsBoiler);

        this.ws.onopen = () => {
            console.log('WebSocket connected');
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'status_update') {
                    this.notifyListeners(data.data);
                }
            } catch (error) {
                console.error('WebSocket message parse error:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected, reconnecting in 5s...');
            this.reconnectTimeout = setTimeout(() => this.connectWebSocket(), 5000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    }

    /**
     * Subscribe to boiler status updates
     */
    subscribeToStatus(callback: (status: BoilerStatus) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    private notifyListeners(status: BoilerStatus) {
        this.listeners.forEach(cb => cb(status));
    }

    // Legacy methods adapters (temporarily kept for compatibility with other components)
    // You should refactor components to use the new methods above

    async getRoomStatus(): Promise<RoomStatus> {
        // Fetch from boiler status which allows access to setpoint/indoor temp
        const status = await this.getBoilerStatus();
        return {
            currentTemp: status.indoor_temp,
            targetTemp: status.setpoint
        };
    }

    async getWindowSensors(): Promise<WindowSensor[]> {
        // Fallback or implement real endpoint if available
        // For now returning empty or you need to add an endpoint for this
        return [];
    }

    async getSchedules(): Promise<Schedule[]> {
        // Implement real endpoint if available
        return [];
    }

    async getEnergyData(): Promise<EnergyData> {
        // Implement real endpoint if available
        return { currentMonth: 0, previousMonth: 0, daily: [] };
    }

    async updateSchedule(schedule: Schedule): Promise<boolean> {
        return false;
    }

    async setTargetTemperature(temp: number): Promise<boolean> {
        return this.setTemperature(temp);
    }
}

export const mobileApiClient = new MobileApiClient();
