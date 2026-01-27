import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, User } from 'lucide-react-native';
import {
    CentralDial,
    StatusBanner,
    HotWaterCard,
    ConnectionStatusBar,
} from '../components';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';
import { useBoilerStatus, useRoomStatus, useConnectionStatus } from '../contexts/DataContext';

export const DashboardScreen: React.FC = () => {
    const { boilerStatus } = useBoilerStatus();
    const { roomStatus, setTargetTemp } = useRoomStatus();
    const { connectionStatus } = useConnectionStatus();

    const [isBoostActive, setIsBoostActive] = useState(false);

    const handleTempChange = async (temp: number) => {
        await setTargetTemp(temp);
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Connection Status Banner */}
            <ConnectionStatusBar />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                    <Menu size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Dashboard</Text>
                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                    <User size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Central Dial in White Card */}
                <View style={styles.dialCard}>
                    <CentralDial
                        currentTemp={roomStatus.currentTemp}
                        targetTemp={roomStatus.targetTemp}
                        onTempChange={handleTempChange}
                    />
                </View>

                {/* Hot Water Toggle */}
                <HotWaterCard
                    isBoostActive={isBoostActive}
                    onToggleBoost={() => setIsBoostActive(!isBoostActive)}
                />

                {/* Status Banner */}
                <StatusBanner
                    status="active"
                    message={boilerStatus.flameOn ? "Il sistema funziona correttamente" : "Sistema in standby"}
                />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    headerTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: SPACING.md,
        gap: SPACING.md,
    },
    dialCard: {
        backgroundColor: COLORS.white,
        borderRadius: 32,
        paddingVertical: SPACING.lg,
        ...SHADOWS.deep,
    },
});
