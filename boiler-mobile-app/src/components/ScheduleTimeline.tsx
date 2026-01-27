import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { Clock } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDER_RADIUS } from '../theme';

export interface Schedule {
    id: string;
    time: string;
    temperature: number;
    active: boolean;
}

interface ScheduleTimelineProps {
    schedules: Schedule[];
    currentTime: Date;
    onSchedulePress?: (schedule: Schedule) => void;
}

const ScheduleTimeline: React.FC<ScheduleTimelineProps> = ({
    schedules,
    currentTime,
    onSchedulePress,
}) => {
    const isCurrentSlot = (schedule: Schedule) => {
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const scheduleTime = new Date(currentTime);
        scheduleTime.setHours(hours, minutes, 0, 0);

        const diff = Math.abs(currentTime.getTime() - scheduleTime.getTime());
        return diff < 30 * 60 * 1000; // Within 30 minutes
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Clock size={20} color={COLORS.textPrimary} strokeWidth={2} />
                <Text style={styles.headerText}>Today's Schedule</Text>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {schedules.map((schedule) => {
                    const isCurrent = isCurrentSlot(schedule);
                    return (
                        <TouchableOpacity
                            key={schedule.id}
                            style={[
                                styles.scheduleCard,
                                isCurrent && styles.scheduleCardActive,
                                !schedule.active && styles.scheduleCardInactive,
                            ]}
                            onPress={() => onSchedulePress?.(schedule)}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.timeText,
                                    isCurrent && styles.timeTextActive,
                                ]}
                            >
                                {schedule.time}
                            </Text>
                            <Text
                                style={[
                                    styles.tempText,
                                    isCurrent && styles.tempTextActive,
                                ]}
                            >
                                {schedule.temperature}°
                            </Text>
                            {isCurrent && <View style={styles.activeDot} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.md,
    },
    headerText: {
        ...TYPOGRAPHY.subtitle,
    },
    scrollContent: {
        paddingHorizontal: SPACING.md,
        gap: SPACING.sm,
    },
    scheduleCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: BORDER_RADIUS.standard,
        padding: SPACING.md,
        minWidth: 100,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    scheduleCardActive: {
        backgroundColor: COLORS.primary,
        borderWidth: 2,
        borderColor: COLORS.primary,
        ...SHADOWS.medium,
    },
    scheduleCardInactive: {
        opacity: 0.5,
    },
    timeText: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
    },
    timeTextActive: {
        color: COLORS.white,
    },
    tempText: {
        ...TYPOGRAPHY.title,
        fontSize: 22,
        color: COLORS.textPrimary,
    },
    tempTextActive: {
        color: COLORS.white,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.white,
        marginTop: SPACING.xs,
    },
});

export default ScheduleTimeline;
