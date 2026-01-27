import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, SafeAreaView } from 'react-native';
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

export const DashboardScreen: React.FC = () => {
    const [targetTemp, setTargetTemp] = useState(21);
    const [isBoostActive, setIsBoostActive] = useState(false);
    const [activeMode, setActiveMode] = useState<ModeType | null>(null);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Status Banner */}
                <StatusBanner status="active" message="System running normally" />

                {/* Central Dial - Hero Component */}
                <CentralDial
                    currentTemp={20.5}
                    targetTemp={targetTemp}
                    onTempChange={setTargetTemp}
                />

                {/* Boiler Status */}
                <BoilerStatusCard
                    waterTemp={65.3}
                    pressure={1.5}
                    modulation={75}
                    flameOn={true}
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
                    <WindowSensorBadge roomName="Living Room" isOpen={false} />
                    <WindowSensorBadge roomName="Bedroom" isOpen={true} />
                    <WindowSensorBadge roomName="Kitchen" isOpen={false} />
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
