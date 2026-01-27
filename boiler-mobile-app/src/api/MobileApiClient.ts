/**
 * Mobile API Client - Integration with mobile_api service
 * Connects to the Docker mobile_api service for all boiler operations
 */
import { API_CONFIG } from '../config/api';

export interface BoilerStatus {
    waterTemp: number;
    pressure: number;
    modulation: number;
    flameOn: boolean;
    returnTemp?: number;
    setpoint?: number;
    enabled?: boolean;
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

export interface EnvironmentData {
    indoor_temp: number;
    outdoor_temp: number;
    windows: Array<{
        room_name: string;
        is_open: boolean;
        entity_id: string;
    }>;
}

class MobileApiClient {
    private baseUrl = API_CONFIG.mobileApi;

    /**
     * Get boiler status from Home Assistant via mobile_api
     */
    async getBoilerStatus(): Promise<BoilerStatus> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/status`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const data = await response.json();

            // Map backend snake_case to frontend camelCase
            return {
                waterTemp: data.water_temp ?? 0,
                pressure: data.pressure ?? 0,
                modulation: data.modulation ?? 0,
                flameOn: data.flame_on === true,
                returnTemp: data.return_temp,
                setpoint: data.setpoint,
                enabled: data.enabled,
            };
        } catch (error) {
            console.error('Error fetching boiler status:', error);
            // Return mock data as fallback for development
            return {
                waterTemp: 65.3,
                pressure: 1.5,
                modulation: 75,
                flameOn: true,
            };
        }
    }

    /**
     * Get room status (indoor temperature and target)
     */
    async getRoomStatus(): Promise<RoomStatus> {
        try {
            const response = await fetch(`${this.baseUrl}/environment`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const data: EnvironmentData = await response.json();

            // Get target from boiler status
            const boilerStatus = await this.getBoilerStatus();

            return {
                currentTemp: data.indoor_temp ?? 20,
                targetTemp: boilerStatus.setpoint ?? 21,
            };
        } catch (error) {
            console.error('Error fetching room status:', error);
            return {
                currentTemp: 20.5,
                targetTemp: 21,
            };
        }
    }

    /**
     * Get window sensor status from environment endpoint
     */
    async getWindowSensors(): Promise<WindowSensor[]> {
        try {
            const response = await fetch(`${this.baseUrl}/environment`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const data: EnvironmentData = await response.json();

            return (data.windows || []).map((w, index) => ({
                id: String(index + 1),
                name: w.room_name,
                isOpen: w.is_open === true,
            }));
        } catch (error) {
            console.error('Error fetching window sensors:', error);
            return [
                { id: '1', name: 'Soggiorno', isOpen: false },
                { id: '2', name: 'Camera da Letto', isOpen: true },
                { id: '3', name: 'Cucina', isOpen: false },
                { id: '4', name: 'Bagno', isOpen: false },
            ];
        }
    }

    /**
     * Get temperature schedules
     */
    async getSchedules(): Promise<Schedule[]> {
        try {
            const response = await fetch(`${this.baseUrl}/schedules`, {
                headers: {
                    'Authorization': 'Bearer demo-token', // TODO: Use real auth
                },
            });
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const data = await response.json();
            return (data.schedules || []).map((s: any) => ({
                id: s.id,
                time: s.time,
                temperature: s.temperature,
                active: s.enabled === true || s.active === true,
            }));
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

    /**
     * Get energy consumption data
     */
    async getEnergyData(): Promise<EnergyData> {
        try {
            const response = await fetch(`${this.baseUrl}/history?hours=720`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const data = await response.json();

            // Calculate energy from history data
            // For now return mock data - needs proper calculation
            return {
                currentMonth: 145,
                previousMonth: 168,
                daily: [],
            };
        } catch (error) {
            console.error('Error fetching energy data:', error);
            return {
                currentMonth: 145,
                previousMonth: 168,
                daily: [],
            };
        }
    }

    /**
     * Set target temperature via Home Assistant
     */
    async setTargetTemperature(temperature: number): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/set_temperature`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ temperature }),
            });

            if (response.ok) {
                const data = await response.json();
                return data.success === true;
            }
            return false;
        } catch (error) {
            console.error('Error setting temperature:', error);
            return false;
        }
    }

    /**
     * Turn on the boiler
     */
    async turnOnBoiler(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/turn_on`, {
                method: 'POST',
            });
            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('Error turning on boiler:', error);
            return false;
        }
    }

    /**
     * Turn off the boiler
     */
    async turnOffBoiler(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/boiler/turn_off`, {
                method: 'POST',
            });
            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('Error turning off boiler:', error);
            return false;
        }
    }

    /**
     * Get AI maintenance report
     */
    async getMaintenanceReport(hours: number = 168): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/maintenance/report?hours=${hours}`);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching maintenance report:', error);
            return null;
        }
    }

    /**
     * Check API health
     */
    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
            return response.ok;
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
}

export const mobileApiClient = new MobileApiClient();
