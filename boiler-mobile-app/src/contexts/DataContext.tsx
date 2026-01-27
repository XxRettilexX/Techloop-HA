/**
 * Data Context - Centralized app data state with real-time updates
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mobileApiClient, type BoilerStatus, type RoomStatus, type WindowSensor, type Schedule, type EnergyData } from '../api/MobileApiClient';

interface DataContextType {
    boilerStatus: BoilerStatus;
    roomStatus: RoomStatus;
    windowSensors: WindowSensor[];
    schedules: Schedule[];
    energyData: EnergyData;
    isLoading: boolean;
    refreshData: () => Promise<void>;
    setTargetTemp: (temp: number) => Promise<boolean>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [boilerStatus, setBoilerStatus] = useState<BoilerStatus>({
        waterTemp: 0,
        pressure: 0,
        modulation: 0,
        flameOn: false,
    });

    const [roomStatus, setRoomStatus] = useState<RoomStatus>({
        currentTemp: 20,
        targetTemp: 21,
    });

    const [windowSensors, setWindowSensors] = useState<WindowSensor[]>([]);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [energyData, setEnergyData] = useState<EnergyData>({
        currentMonth: 0,
        previousMonth: 0,
        daily: [],
    });

    const [isLoading, setIsLoading] = useState(true);

    const refreshData = async () => {
        try {
            setIsLoading(true);

            // Fetch all data in parallel
            const [boiler, room, windows, sched, energy] = await Promise.all([
                mobileApiClient.getBoilerStatus(),
                mobileApiClient.getRoomStatus(),
                mobileApiClient.getWindowSensors(),
                mobileApiClient.getSchedules(),
                mobileApiClient.getEnergyData(),
            ]);

            setBoilerStatus(boiler);
            setRoomStatus(room);
            setWindowSensors(windows);
            setSchedules(sched);
            setEnergyData(energy);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const setTargetTemp = async (temp: number): Promise<boolean> => {
        const success = await mobileApiClient.setTargetTemperature(temp);
        if (success) {
            setRoomStatus(prev => ({ ...prev, targetTemp: temp }));
            // Refresh boiler status after a short delay
            setTimeout(refreshData, 1000);
        }
        return success;
    };

    // Initial data load
    useEffect(() => {
        refreshData();

        // Auto-refresh every 10 seconds
        const interval = setInterval(refreshData, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <DataContext.Provider
            value={{
                boilerStatus,
                roomStatus,
                windowSensors,
                schedules,
                energyData,
                isLoading,
                refreshData,
                setTargetTemp,
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
    const { boilerStatus, isLoading } = useData();
    return { boilerStatus, isLoading };
};

export const useRoomStatus = () => {
    const { roomStatus, setTargetTemp, isLoading } = useData();
    return { roomStatus, setTargetTemp, isLoading };
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
