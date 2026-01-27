/**
 * Data Context - Centralized app data state with real-time updates
 * Enhanced with connection status and offline support
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { mobileApiClient, type BoilerStatus, type RoomStatus, type WindowSensor, type Schedule, type EnergyData } from '../api/MobileApiClient';

type ConnectionStatus = 'connected' | 'connecting' | 'offline' | 'error';

interface DataContextType {
    boilerStatus: BoilerStatus;
    roomStatus: RoomStatus;
    windowSensors: WindowSensor[];
    schedules: Schedule[];
    energyData: EnergyData;
    isLoading: boolean;
    connectionStatus: ConnectionStatus;
    lastUpdated: Date | null;
    errorMessage: string | null;
    refreshData: () => Promise<void>;
    setTargetTemp: (temp: number) => Promise<boolean>;
    retryConnection: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Default mock data for offline mode
const DEFAULT_BOILER_STATUS: BoilerStatus = {
    waterTemp: 45,
    pressure: 1.5,
    modulation: 0,
    flameOn: false,
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

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [boilerStatus, setBoilerStatus] = useState<BoilerStatus>(DEFAULT_BOILER_STATUS);
    const [roomStatus, setRoomStatus] = useState<RoomStatus>(DEFAULT_ROOM_STATUS);
    const [windowSensors, setWindowSensors] = useState<WindowSensor[]>(DEFAULT_WINDOWS);
    const [schedules, setSchedules] = useState<Schedule[]>(DEFAULT_SCHEDULES);
    const [energyData, setEnergyData] = useState<EnergyData>(DEFAULT_ENERGY);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const refreshData = useCallback(async () => {
        try {
            if (connectionStatus === 'offline' && retryCount < 3) {
                setConnectionStatus('connecting');
            }

            // Fetch data with timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), 8000)
            );

            const fetchPromise = Promise.all([
                mobileApiClient.getBoilerStatus(),
                mobileApiClient.getRoomStatus(),
                mobileApiClient.getWindowSensors(),
                mobileApiClient.getSchedules(),
                mobileApiClient.getEnergyData(),
            ]);

            const [boiler, room, windows, sched, energy] = await Promise.race([
                fetchPromise,
                timeoutPromise as Promise<never>
            ]) as [BoilerStatus, RoomStatus, WindowSensor[], Schedule[], EnergyData];

            setBoilerStatus(boiler);
            setRoomStatus(room);
            setWindowSensors(windows);
            setSchedules(sched);
            setEnergyData(energy);

            setConnectionStatus('connected');
            setLastUpdated(new Date());
            setErrorMessage(null);
            setRetryCount(0);
        } catch (error: any) {
            console.error('Error refreshing data:', error);

            if (connectionStatus === 'connected') {
                // Keep existing data but mark as potentially stale
                setConnectionStatus('error');
                setErrorMessage('Connessione persa. Usando dati cached.');
            } else {
                setRetryCount(prev => prev + 1);
                if (retryCount >= 2) {
                    setConnectionStatus('offline');
                    setErrorMessage('Server non raggiungibile. Modalità offline.');
                } else {
                    setConnectionStatus('connecting');
                }
            }
        } finally {
            setIsLoading(false);
        }
    }, [connectionStatus, retryCount]);

    const retryConnection = useCallback(async () => {
        setConnectionStatus('connecting');
        setRetryCount(0);
        setErrorMessage(null);
        await refreshData();
    }, [refreshData]);

    const setTargetTemp = async (temp: number): Promise<boolean> => {
        if (connectionStatus === 'offline') {
            setErrorMessage('Impossibile impostare: offline');
            return false;
        }

        try {
            const success = await mobileApiClient.setTargetTemperature(temp);
            if (success) {
                setRoomStatus(prev => ({ ...prev, targetTemp: temp }));
                setTimeout(refreshData, 1000);
            }
            return success;
        } catch (error) {
            setErrorMessage('Errore nell\'impostare la temperatura');
            return false;
        }
    };

    // Initial data load
    useEffect(() => {
        refreshData();

        // Auto-refresh every 10 seconds (15 when offline)
        const interval = setInterval(
            refreshData,
            connectionStatus === 'offline' ? 15000 : 10000
        );

        return () => clearInterval(interval);
    }, [connectionStatus]);

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
                refreshData,
                setTargetTemp,
                retryConnection,
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
    const { schedules, isLoading } = useData();
    return { schedules, isLoading };
};

export const useEnergyData = () => {
    const { energyData, isLoading } = useData();
    return { energyData, isLoading };
};

export const useConnectionStatus = () => {
    const { connectionStatus, lastUpdated, errorMessage, retryConnection } = useData();
    return { connectionStatus, lastUpdated, errorMessage, retryConnection };
};
