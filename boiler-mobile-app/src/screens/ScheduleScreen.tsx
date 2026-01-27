import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Menu, User, Home, Moon, Leaf, MapPin } from 'lucide-react-native';
import { ConnectionStatusBar } from '../components';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';
import { useSchedules } from '../contexts/DataContext';

type QuickModeType = 'away' | 'sleep' | 'eco' | null;

export const ScheduleScreen: React.FC = () => {
    const { schedules } = useSchedules();
    const [activeMode, setActiveMode] = useState<QuickModeType>(null);
    const [geofencingEnabled, setGeofencingEnabled] = useState(false);

    const timeBlocks = [
        { id: '1', label: 'Night', temp: 18, startTime: '00:00', endTime: '06:00', color: '#373f47' },
        { id: '2', label: 'Morning', temp: 21, startTime: '06:00', endTime: '09:00', color: COLORS.primary },
        { id: '3', label: 'Day', temp: 20, startTime: '09:00', endTime: '17:00', color: '#8b8982' },
        { id: '4', label: 'Comfort', temp: 22, startTime: '17:00', endTime: '22:00', color: COLORS.primary },
        { id: '5', label: 'Night', temp: 18, startTime: '22:00', endTime: '24:00', color: '#373f47' },
    ];

    const quickModes = [
        { id: 'away', label: 'Away Mode', icon: Home, color: COLORS.primary },
        { id: 'sleep', label: 'Sleep Mode', icon: Moon, color: '#373f47' },
        { id: 'eco', label: 'Smart Eco', icon: Leaf, color: '#c3c9e9' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ConnectionStatusBar />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                    <Menu size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Schedule</Text>
                <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
                    <User size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Timeline Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Today's Timeline</Text>
                </View>

                {/* Timeline Blocks */}
                <View style={styles.timelineContainer}>
                    {timeBlocks.map((block) => (
                        <TouchableOpacity
                            key={block.id}
                            style={[styles.timeBlock, { backgroundColor: block.color }]}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.timeBlockLabel}>{block.label}</Text>
                            <Text style={styles.timeBlockTemp}>{block.temp}°</Text>
                            <Text style={styles.timeBlockTime}>{block.startTime}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quick Modes */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Modes</Text>
                </View>

                <View style={styles.quickModesContainer}>
                    {quickModes.map((mode) => {
                        const Icon = mode.icon;
                        const isActive = activeMode === mode.id;
                        return (
                            <TouchableOpacity
                                key={mode.id}
                                style={[
                                    styles.quickModeButton,
                                    { backgroundColor: isActive ? mode.color : COLORS.white },
                                    isActive && styles.quickModeActive,
                                ]}
                                onPress={() => setActiveMode(isActive ? null : mode.id as QuickModeType)}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    size={28}
                                    color={isActive ? COLORS.white : mode.color}
                                    strokeWidth={2}
                                />
                                <Text
                                    style={[
                                        styles.quickModeLabel,
                                        { color: isActive ? COLORS.white : COLORS.textPrimary },
                                    ]}
                                >
                                    {mode.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Geofencing Toggle */}
                <View style={styles.geofencingCard}>
                    <View style={styles.geofencingLeft}>
                        <MapPin size={24} color={COLORS.primary} />
                        <View>
                            <Text style={styles.geofencingTitle}>Geofencing</Text>
                            <Text style={styles.geofencingSubtitle}>Auto-adjust based on location</Text>
                        </View>
                    </View>
                    <Switch
                        value={geofencingEnabled}
                        onValueChange={setGeofencingEnabled}
                        trackColor={{
                            false: COLORS.border,
                            true: COLORS.primary,
                        }}
                        thumbColor={COLORS.white}
                    />
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
        gap: SPACING.lg,
    },
    sectionHeader: {
        marginBottom: SPACING.sm,
    },
    sectionTitle: {
        ...TYPOGRAPHY.subtitle,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    timelineContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    timeBlock: {
        flex: 1,
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.sm,
        borderRadius: 16,
        alignItems: 'center',
        minHeight: 120,
        ...SHADOWS.small,
    },
    timeBlockLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.white,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeBlockTemp: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.white,
        marginVertical: SPACING.sm,
    },
    timeBlockTime: {
        ...TYPOGRAPHY.caption,
        color: 'rgba(255,255,255,0.7)',
        fontSize: 10,
    },
    quickModesContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    quickModeButton: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.medium,
    },
    quickModeActive: {
        ...SHADOWS.large,
    },
    quickModeLabel: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
    geofencingCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.small,
    },
    geofencingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    geofencingTitle: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    geofencingSubtitle: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
});
