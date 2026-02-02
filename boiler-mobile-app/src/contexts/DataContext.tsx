/**
 * Data Context - Centralized app data state with real-time updates
 * Enhanced with PocketBase realtime subscriptions (WebSocket) and offline support
 * Note: Uses WebSocket instead of EventSource for React Native compatibility
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { mobileApiClient, type BoilerStatus, type RoomStatus, type WindowSensor, type Schedule, type EnergyData } from '../api/MobileApiClient';
import { API_CONFIG } from '../config/api';

type ConnectionStatus = 'connected' | 'connecting' | 'offline' | 'error';

// Extended BoilerStatus with new physics metrics
export interface ExtendedBoilerStatus extends BoilerStatus {
    humidity?: number;
    perceived_temp?: number;
    boiler_efficiency?: number;
    runtime_hours?: number;
    solar_gain?: number;
    error_code?: string | null;
}

interface DataContextType {
    boilerStatus: ExtendedBoilerStatus;
    roomStatus: RoomStatus;
    windowSensors: WindowSensor[];
    schedules: Schedule[];
    energyData: EnergyData;
    isLoading: boolean;
    connectionStatus: ConnectionStatus;
    lastUpdated: Date | null;
    errorMessage: string | null;
    hasError: boolean;
    refreshData: () => Promise<void>;
    setTargetTemp: (temp: number) => Promise<boolean>;
    retryConnection: () => Promise<void>;
    updateSchedule: (schedule: Schedule) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Default mock data for offline mode
const DEFAULT_BOILER_STATUS: ExtendedBoilerStatus = {
    water_temp: 45,
    return_temp: 40,
    pressure: 1.5,
    modulation: 0,
    flame_on: false,
    setpoint: 60,
    enabled: true,
    indoor_temp: 20,
    outdoor_temp: 15,
    timestamp: new Date().toISOString(),
    humidity: 50,
    perceived_temp: 19,
    boiler_efficiency: 92,
    runtime_hours: 0,
    solar_gain: 0,
    error_code: null,
};

const DEFAULT_ROOM_STATUS: RoomStatus = {
    currentTemp: 20,
    targetTemp: 21,
};

const DEFAULT_WINDOWS: WindowSensor[] = [
    { id: '1', name: 'Soggiorno', isOpen: false },
    { id: '2', name: 'Camera', isOpen: false },
    { id: '3', name: 'Cucina', isOpen: false },
    { id: '4', name: 'Bagno', isOpen: false },
];

const DEFAULT_SCHEDULES: Schedule[] = [
    { id: '1', time: '06:00', temperature: 22, active: true },
    { id: '2', time: '09:00', temperature: 19, active: true },
    { id: '3', time: '17:00', temperature: 21, active: true },
    { id: '4', time: '22:00', temperature: 18, active: true },
];

const DEFAULT_ENERGY: EnergyData = {
    currentMonth: 145,
    previousMonth: 168,
    daily: [],
};

// PocketBase Realtime subscription helper using EventSource (SSE)
class PocketBaseRealtime {
    private es: any = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private baseUrl = API_CONFIG.pocketbase;
    private subscriptions: Map<string, (data: any) => void> = new Map();
    private clientId: string = '';
    private isConnected = false;

    subscribe(
        collection: string,
        onRecord: (data: any) => void,
        onError?: (error: any) => void
    ): () => void {
        this.subscriptions.set(collection, onRecord);

        if (!this.es || !this.isConnected) {
            this.connect(onError);
        } else if (this.clientId) {
            this.submitSubscriptions();
        }

        return () => {
            this.subscriptions.delete(collection);
            if (this.subscriptions.size === 0) {
                this.disconnect();
            }
        };
    }

    private connect(onError?: (error: any) => void) {
        const url = `${this.baseUrl}/api/realtime`;

        try {
            // @ts-ignore - EventSource is provided by react-native-sse polyfill
            this.es = new EventSource(url);

            this.es.onopen = () => {
                console.log('PocketBase SSE connected');
                this.reconnectAttempts = 0;
            };

            this.es.onmessage = async (event: any) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.clientId) {
                        this.clientId = message.clientId;
                        this.isConnected = true;
                        console.log('PocketBase clientId:', this.clientId);
                        this.submitSubscriptions();
                        return;
                    }

                    if (message.action && message.record) {
                        const callback = this.subscriptions.get(message.record.collectionName);
                        if (callback) callback(message);
                    }
                } catch (e) {
                    console.warn('Failed to parse PocketBase message:', e);
                }
            };

            this.es.onerror = (error: any) => {
                console.error('PocketBase SSE error:', error);
                this.isConnected = false;
                this.clientId = '';
                this.scheduleReconnect(onError);
                onError?.(error);
            };
        } catch (error) {
            console.error('Failed to create EventSource:', error);
            this.scheduleReconnect(onError);
        }
    }

    private async submitSubscriptions() {
        if (!this.clientId || this.subscriptions.size === 0) return;

        try {
            await fetch(`${this.baseUrl}/api/realtime`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId: this.clientId,
                    params: {
                        query: {
                            subscriptions: Array.from(this.subscriptions.keys())
                        }
                    }
                })
            });
            console.log(`Subscribed to: ${Array.from(this.subscriptions.keys()).join(', ')}`);
        } catch (error) {
            console.error('Failed to submit PocketBase subscriptions:', error);
        }
    }

    private scheduleReconnect(onError?: (error: any) => void) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => this.connect(onError), delay);
    }

    disconnect() {
        if (this.es) {
            this.es.close();
            this.es = null;
        }
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.isConnected = false;
        this.clientId = '';
    }
}

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [boilerStatus, setBoilerStatus] = useState<ExtendedBoilerStatus>(DEFAULT_BOILER_STATUS);
    const [roomStatus, setRoomStatus] = useState<RoomStatus>(DEFAULT_ROOM_STATUS);
    const [windowSensors, setWindowSensors] = useState<WindowSensor[]>(DEFAULT_WINDOWS);
    const [schedules, setSchedules] = useState<Schedule[]>(DEFAULT_SCHEDULES);
    const [energyData, setEnergyData] = useState<EnergyData>(DEFAULT_ENERGY);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const pocketBaseRealtime = useRef(new PocketBaseRealtime());

    // Check if there's an active error
    const hasError = boilerStatus.error_code !== null && boilerStatus.error_code !== undefined;

    // Initial data fetch and PocketBase realtime setup
    useEffect(() => {
        let unsubscribeWebSocket: (() => void) | undefined;
        let unsubscribeBoilerHistory: (() => void) | undefined;
        let unsubscribeTelemetry: (() => void) | undefined;

        const init = async () => {
            try {
                setConnectionStatus('connecting');

                // 1. Initial Fetch via REST
                const status = await mobileApiClient.getBoilerStatus();
                setBoilerStatus(status as ExtendedBoilerStatus);
                setRoomStatus({
                    currentTemp: status.indoor_temp,
                    targetTemp: status.setpoint
                });

                // Fetch other data
                const windows = await mobileApiClient.getWindowSensors();
                setWindowSensors(windows.length ? windows : DEFAULT_WINDOWS);

                setConnectionStatus('connected');
                setLastUpdated(new Date());
                setIsLoading(false);

                // 2. Setup WebSocket for immediate updates
                mobileApiClient.connectWebSocket();
                unsubscribeWebSocket = mobileApiClient.subscribeToStatus((newStatus) => {
                    setBoilerStatus(newStatus as ExtendedBoilerStatus);
                    setRoomStatus(prev => ({
                        ...prev,
                        currentTemp: newStatus.indoor_temp,
                        targetTemp: newStatus.setpoint
                    }));
                    setLastUpdated(new Date());
                });

                // 3. Setup PocketBase Realtime Subscriptions
                // Subscribe to boiler_history collection
                unsubscribeBoilerHistory = pocketBaseRealtime.current.subscribe(
                    'boiler_history',
                    (data) => {
                        if (data.action === 'create' || data.action === 'update') {
                            const record = data.record;
                            // Update boiler status with new history record
                            setBoilerStatus(prev => ({
                                ...prev,
                                water_temp: record.water_temp ?? prev.water_temp,
                                return_temp: record.return_temp ?? prev.return_temp,
                                pressure: record.pressure ?? prev.pressure,
                                modulation: record.modulation ?? prev.modulation,
                                flame_on: record.flame_on ?? prev.flame_on,
                                boiler_efficiency: record.efficiency ?? prev.boiler_efficiency,
                                runtime_hours: record.runtime_hours ?? prev.runtime_hours,
                                error_code: record.error_code ?? prev.error_code,
                                timestamp: record.created,
                            }));
                            setLastUpdated(new Date());
                        }
                    },
                    (error) => {
                        console.error('boiler_history subscription error:', error);
                    }
                );

                // Subscribe to telemetry collection
                unsubscribeTelemetry = pocketBaseRealtime.current.subscribe(
                    'telemetry',
                    (data) => {
                        if (data.action === 'create' || data.action === 'update') {
                            const record = data.record;
                            // Update environmental data
                            setBoilerStatus(prev => ({
                                ...prev,
                                indoor_temp: record.indoor_temp ?? prev.indoor_temp,
                                outdoor_temp: record.outdoor_temp ?? prev.outdoor_temp,
                                humidity: record.humidity ?? prev.humidity,
                                perceived_temp: record.perceived_temp ?? prev.perceived_temp,
                                solar_gain: record.solar_gain ?? prev.solar_gain,
                            }));
                            setRoomStatus(prev => ({
                                ...prev,
                                currentTemp: record.indoor_temp ?? prev.currentTemp,
                            }));
                            setLastUpdated(new Date());
                        }
                    },
                    (error) => {
                        console.error('telemetry subscription error:', error);
                    }
                );

            } catch (error) {
                console.error('Initialization error:', error);
                setConnectionStatus('error');
                setErrorMessage('Impossibile connettersi al server.');
                setIsLoading(false);
            }
        };

        init();

        return () => {
            if (unsubscribeWebSocket) unsubscribeWebSocket();
            if (unsubscribeBoilerHistory) unsubscribeBoilerHistory();
            if (unsubscribeTelemetry) unsubscribeTelemetry();
            pocketBaseRealtime.current.disconnect();
        };
    }, []);


    const refreshData = useCallback(async () => {
        // Manual refresh fallback
        try {
            const status = await mobileApiClient.getBoilerStatus();
            setBoilerStatus(status);
            setLastUpdated(new Date());
        } catch (e) {
            console.error(e);
        }
    }, []);

    const retryConnection = useCallback(async () => {
        setConnectionStatus('connecting');
        setErrorMessage(null);
        // Re-run init logic basically
        const status = await mobileApiClient.getBoilerStatus().catch(() => null);
        if (status) {
            setBoilerStatus(status);
            setConnectionStatus('connected');
            mobileApiClient.connectWebSocket();
        } else {
            setConnectionStatus('error');
        }
    }, []);

    const setTargetTemp = async (temp: number): Promise<boolean> => {
        // Optimistic update
        setRoomStatus(prev => ({ ...prev, targetTemp: temp }));

        try {
            // Use setRoomTemperature for room thermostat control
            const success = await mobileApiClient.setRoomTemperature(temp);
            if (!success) {
                // Revert
                refreshData();
                return false;
            }
            return true;
        } catch (error) {
            setErrorMessage('Errore aggiornamento temperatura');
            return false;
        }
    };

    const updateSchedule = async (schedule: Schedule): Promise<boolean> => {
        return await mobileApiClient.updateSchedule(schedule);
    };

    return (
        <DataContext.Provider
            value={{
                boilerStatus,
                roomStatus,
                windowSensors,
                schedules,
                energyData,
                isLoading,
                connectionStatus,
                lastUpdated,
                errorMessage,
                hasError,
                refreshData,
                setTargetTemp,
                retryConnection,
                updateSchedule,
            }}
        >
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

// Individual hooks for convenience
export const useBoilerStatus = () => {
    const { boilerStatus, isLoading, connectionStatus } = useData();
    return { boilerStatus, isLoading, connectionStatus };
};

export const useRoomStatus = () => {
    const { roomStatus, setTargetTemp, isLoading, connectionStatus } = useData();
    return { roomStatus, setTargetTemp, isLoading, connectionStatus };
};

export const useWindowSensors = () => {
    const { windowSensors, isLoading } = useData();
    return { windowSensors, isLoading };
};

export const useSchedules = () => {
    const { schedules, isLoading, updateSchedule } = useData();
    return { schedules, isLoading, updateSchedule };
};

export const useEnergyData = () => {
    const { energyData, isLoading } = useData();
    return { energyData, isLoading };
};

export const useConnectionStatus = () => {
    const { connectionStatus, lastUpdated, errorMessage, retryConnection } = useData();
    return { connectionStatus, lastUpdated, errorMessage, retryConnection };
};
