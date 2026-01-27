import React, { useState } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
    CentralDial,
    StatusBanner,
    HotWaterCard,
    QuickModeCard,
    BoilerStatusCard,
    WindowSensorBadge,
    ModeType,
} from '../components';
import { COLORS, SPACING } from '../theme';
import { useBoilerStatus, useRoomStatus, useWindowSensors } from '../contexts/DataContext';

export const DashboardScreen: React.FC = () => {
    const { boilerStatus } = useBoilerStatus();
    const { roomStatus, setTargetTemp } = useRoomStatus();
    const { windowSensors } = useWindowSensors();

    const [isBoostActive, setIsBoostActive] = useState(false);
    const [activeMode, setActiveMode] = useState<ModeType | null>(null);

    const handleTempChange = async (temp: number) => {
        await setTargetTemp(temp);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Banner */}
                <StatusBanner status="active" message={boilerStatus.flameOn ? "Sistema attivo" : "Sistema in standby"} />

                {/* Central Dial - Hero Component */}
                <CentralDial
                    currentTemp={roomStatus.currentTemp}
                    targetTemp={roomStatus.targetTemp}
                    onTempChange={handleTempChange}
                />

                {/* Boiler Status */}
                <BoilerStatusCard
                    waterTemp={boilerStatus.waterTemp}
                    pressure={boilerStatus.pressure}
                    modulation={boilerStatus.modulation}
                    flameOn={boilerStatus.flameOn}
                />

                {/* Hot Water */}
                <HotWaterCard
                    isBoostActive={isBoostActive}
                    onToggleBoost={() => setIsBoostActive(!isBoostActive)}
                />

                {/* Quick Modes */}
                <View style={styles.modesContainer}>
                    <QuickModeCard
                        mode="away"
                        label="Away Mode"
                        isActive={activeMode === 'away'}
                        onPress={() => setActiveMode(activeMode === 'away' ? null : 'away')}
                    />
                    <QuickModeCard
                        mode="vacation"
                        label="Vacation"
                        isActive={activeMode === 'vacation'}
                        onPress={() => setActiveMode(activeMode === 'vacation' ? null : 'vacation')}
                    />
                    <QuickModeCard
                        mode="eco"
                        label="Eco Mode"
                        isActive={activeMode === 'eco'}
                        onPress={() => setActiveMode(activeMode === 'eco' ? null : 'eco')}
                    />
                </View>

                {/* Window Sensors */}
                <View style={styles.sensorsContainer}>
                    {windowSensors.map((sensor) => (
                        <WindowSensorBadge
                            key={sensor.id}
                            roomName={sensor.name}
                            isOpen={sensor.isOpen}
                        />
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: SPACING.md,
        gap: SPACING.md,
    },
    modesContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
        justifyContent: 'space-between',
    },
    sensorsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.sm,
    },
});
