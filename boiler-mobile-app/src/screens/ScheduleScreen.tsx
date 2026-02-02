import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Text, TouchableOpacity, Switch, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MapPin, Clock, X, Check, Home, Moon, Leaf } from 'lucide-react-native';
import { ConnectionStatusBar, Header } from '../components';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '../theme';
import { useSchedules, useRoomStatus } from '../contexts/DataContext';
import { Schedule } from '../api/MobileApiClient';
import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';

type QuickModeType = 'away' | 'sleep' | 'eco' | null;

export const ScheduleScreen: React.FC = () => {
    const navigation = useNavigation();
    const { schedules, updateSchedule } = useSchedules();
    const { setTargetTemp } = useRoomStatus();
    const [activeMode, setActiveMode] = useState<QuickModeType>(null);
    const [geofencingEnabled, setGeofencingEnabled] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);

    const quickModes = [
        { id: 'away', label: 'Away Mode', icon: Home, color: COLORS.primary, temp: 15 },
        { id: 'sleep', label: 'Sleep Mode', icon: Moon, color: '#373f47', temp: 18 },
        { id: 'eco', label: 'Smart Eco', icon: Leaf, color: '#c3c9e9', temp: 19 },
    ];

    const handleQuickModePress = async (mode: any) => {
        if (activeMode === mode.id) {
            setActiveMode(null);
        } else {
            setActiveMode(mode.id);
            await setTargetTemp(mode.temp);
        }
    };

    const handleSchedulePress = (schedule: Schedule) => {
        setSelectedSchedule({ ...schedule });
        setModalVisible(true);
    };

    const handleSaveSchedule = async () => {
        if (selectedSchedule) {
            await updateSchedule(selectedSchedule);
            setModalVisible(false);
            setSelectedSchedule(null);
        }
    };

    const getScheduleColor = (temp: number) => {
        if (temp < 19) return '#031926'; // Night/Cold
        if (temp < 21) return '#C0D6DF'; // Mild
        return COLORS.primary; // Warm
    };

    const getScheduleLabel = (time: string, temp: number) => {
        const hour = parseInt(time.split(':')[0]);
        if (hour >= 22 || hour < 6) return 'Night';
        if (hour >= 6 && hour < 9) return 'Morning';
        if (hour >= 17 && hour < 22) return 'Comfort';
        return 'Day';
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ConnectionStatusBar />

            {/* Header */}
            <Header title="Schedule" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Timeline Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Daily Schedule</Text>
                    <Text style={styles.sectionSubtitle}>Tap to edit blocks</Text>
                </View>

                {/* Timeline Blocks */}
                <View style={styles.timelineContainer}>
                    {schedules.map((block) => (
                        <TouchableOpacity
                            key={block.id}
                            style={[
                                styles.timeBlock,
                                { backgroundColor: block.active ? getScheduleColor(block.temperature) : COLORS.disabled }
                            ]}
                            activeOpacity={0.8}
                            onPress={() => handleSchedulePress(block)}
                        >
                            <Text style={styles.timeBlockLabel}>
                                {getScheduleLabel(block.time, block.temperature)}
                            </Text>
                            <Text style={styles.timeBlockTemp}>{block.temperature}°</Text>
                            <Text style={styles.timeBlockTime}>{block.time}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Quick Modes */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
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
                                onPress={() => handleQuickModePress(mode)}
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
                        <View style={styles.iconContainer}>
                            <MapPin size={24} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.geofencingTitle}>Smart Geofencing</Text>
                            <Text style={styles.geofencingSubtitle}>Auto-away when you leave</Text>
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

            {/* Edit Schedule Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Schedule</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {selectedSchedule && (
                            <View style={styles.modalBody}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Start Time</Text>
                                    <View style={styles.inputContainer}>
                                        <Clock size={20} color={COLORS.textSecondary} />
                                        <TextInput
                                            style={styles.input}
                                            value={selectedSchedule.time}
                                            onChangeText={(text) => setSelectedSchedule({ ...selectedSchedule, time: text })}
                                            placeholder="HH:MM"
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Temperature (°C)</Text>
                                    <View style={styles.tempControl}>
                                        <TouchableOpacity
                                            style={styles.tempBtn}
                                            onPress={() => setSelectedSchedule({
                                                ...selectedSchedule,
                                                temperature: selectedSchedule.temperature - 0.5
                                            })}
                                        >
                                            <Text style={styles.tempBtnText}>-</Text>
                                        </TouchableOpacity>
                                        <Text style={styles.tempValue}>{selectedSchedule.temperature}°</Text>
                                        <TouchableOpacity
                                            style={styles.tempBtn}
                                            onPress={() => setSelectedSchedule({
                                                ...selectedSchedule,
                                                temperature: selectedSchedule.temperature + 0.5
                                            })}
                                        >
                                            <Text style={styles.tempBtnText}>+</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <View style={styles.row}>
                                        <Text style={styles.label}>Active</Text>
                                        <Switch
                                            value={selectedSchedule.active}
                                            onValueChange={(val) => setSelectedSchedule({ ...selectedSchedule, active: val })}
                                            trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                        />
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={handleSaveSchedule}
                                >
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
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
        paddingBottom: 100,
    },
    sectionHeader: {
        marginBottom: SPACING.xs,
    },
    sectionTitle: {
        ...TYPOGRAPHY.subtitle,
        color: COLORS.textPrimary,
        fontWeight: '700',
    },
    sectionSubtitle: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    timelineContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
        flexWrap: 'wrap',
    },
    timeBlock: {
        flexBasis: '48%', // 2 columns
        paddingVertical: SPACING.lg,
        paddingHorizontal: SPACING.md,
        borderRadius: 20,
        alignItems: 'center',
        minHeight: 120,
        ...SHADOWS.medium,
        justifyContent: 'space-between',
    },
    timeBlockLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.white,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        opacity: 0.9,
    },
    timeBlockTemp: {
        fontSize: 32,
        fontWeight: '700',
        color: COLORS.white,
        marginVertical: SPACING.xs,
    },
    timeBlockTime: {
        ...TYPOGRAPHY.body,
        color: COLORS.white,
        fontWeight: '500',
        opacity: 0.9,
    },
    quickModesContainer: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    quickModeButton: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
        backgroundColor: COLORS.white,
    },
    quickModeActive: {
        ...SHADOWS.large,
        transform: [{ scale: 1.05 }],
    },
    quickModeLabel: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        marginTop: SPACING.sm,
        textAlign: 'center',
    },
    geofencingCard: {
        backgroundColor: COLORS.white,
        borderRadius: 24,
        padding: SPACING.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...SHADOWS.medium,
    },
    geofencingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F0F9FF',
        alignItems: 'center',
        justifyContent: 'center',
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
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: SPACING.lg,
        minHeight: 400,
        ...SHADOWS.large,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    modalTitle: {
        ...TYPOGRAPHY.h2,
        color: COLORS.textPrimary,
    },
    modalBody: {
        gap: SPACING.lg,
    },
    inputGroup: {
        gap: SPACING.xs,
    },
    label: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        backgroundColor: '#F3F4F6',
        padding: SPACING.md,
        borderRadius: 16,
    },
    input: {
        ...TYPOGRAPHY.title,
        color: COLORS.textPrimary,
        flex: 1,
    },
    tempControl: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F4F6',
        padding: SPACING.sm,
        borderRadius: 16,
    },
    tempBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.white,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    tempBtnText: {
        fontSize: 24,
        color: COLORS.primary,
        fontWeight: '600',
    },
    tempValue: {
        ...TYPOGRAPHY.h1,
        color: COLORS.textPrimary,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        padding: SPACING.md,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: SPACING.md,
        ...SHADOWS.medium,
    },
    saveButtonText: {
        ...TYPOGRAPHY.body,
        color: COLORS.white,
        fontWeight: 'bold',
    },
});
