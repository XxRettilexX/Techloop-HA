import React from 'react';
import { StyleSheet, ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ScheduleTimeline, Schedule } from '../components';
import { COLORS, SPACING, TYPOGRAPHY } from '../theme';
import { Calendar } from 'lucide-react-native';
import { useSchedules } from '../contexts/DataContext';

export const ScheduleScreen: React.FC = () => {
    const { schedules } = useSchedules();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Calendar size={28} color={COLORS.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Heating Schedule</Text>
                        <Text style={styles.subtitle}>Manage your daily temperature timeline</Text>
                    </View>
                </View>

                {/* Schedule Timeline */}
                <ScheduleTimeline schedules={schedules} currentTime={new Date()} />

                {/* TODO: Add schedule management UI */}
                <View style={styles.placeholderCard}>
                    <Text style={styles.placeholderText}>
                        ⚡ Schedule editor coming soon
                    </Text>
                    <Text style={styles.placeholderSubtext}>
                        Add, edit, and manage your heating schedules
                    </Text>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        paddingVertical: SPACING.sm,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: 4,
    },
    subtitle: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    placeholderCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: SPACING.lg,
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    placeholderText: {
        ...TYPOGRAPHY.body,
        color: COLORS.text,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    placeholderSubtext: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
});
