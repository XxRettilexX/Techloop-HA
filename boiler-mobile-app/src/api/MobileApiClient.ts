/**
 * Mobile API Client - Integration with mobile_api service
 */
import { API_CONFIG } from '../config/api';

export interface BoilerStatus {
    waterTemp: number;
    pressure: number;
    modulation: number;
    flameOn: boolean;
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

    async getBoilerStatus(): Promise<BoilerStatus> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/status`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching boiler status:', error);
            // Return mock data as fallback
            return {
                waterTemp: 65.3,
                pressure: 1.5,
                modulation: 75,
                flameOn: true,
            };
        }
    }

    async getRoomStatus(): Promise<RoomStatus> {
        try {
            const response = await fetch(`${this.baseUrl}/room/status`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching room status:', error);
            return {
                currentTemp: 20.5,
                targetTemp: 21,
            };
        }
    }

    async getWindowSensors(): Promise<WindowSensor[]> {
        try {
            const response = await fetch(`${this.baseUrl}/sensors/windows`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching window sensors:', error);
            return [
                { id: '1', name: 'Living Room', isOpen: false },
                { id: '2', name: 'Bedroom', isOpen: true },
                { id: '3', name: 'Kitchen', isOpen: false },
            ];
        }
    }

    async getSchedules(): Promise<Schedule[]> {
        try {
            const response = await fetch(`${this.baseUrl}/schedules`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching schedules:', error);
            return [
                { id: '1', time: '06:00', temperature: 22, active: true },
                { id: '2', time: '09:00', temperature: 19, active: true },
                { id: '3', time: '17:00', temperature: 21, active: true },
                { id: '4', time: '22:00', temperature: 18, active: true },
            ];
        }
    }

    async getEnergyData(): Promise<EnergyData> {
        try {
            const response = await fetch(`${this.baseUrl}/energy`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching energy data:', error);
            return {
                currentMonth: 145,
                previousMonth: 168,
                daily: [],
            };
        }
    }

    async setTargetTemperature(temperature: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/set_temperature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ temperature }),
            });
            return response.ok;
        } catch (error) {
            console.error('Error setting temperature:', error);
            return false;
        }
    }
}

export const mobileApiClient = new MobileApiClient();
