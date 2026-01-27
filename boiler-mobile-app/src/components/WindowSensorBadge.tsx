import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DoorOpen, DoorClosed } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../theme';

interface WindowSensorBadgeProps {
    roomName: string;
    isOpen: boolean;
}

const WindowSensorBadge: React.FC<WindowSensorBadgeProps> = ({
    roomName,
    isOpen,
}) => {
    return (
        <View
            style={[
                styles.container,
                isOpen ? styles.containerOpen : styles.containerClosed,
            ]}
        >
            {isOpen ? (
                <DoorOpen size={20} color={COLORS.white} strokeWidth={2} />
            ) : (
                <DoorClosed size={20} color={COLORS.textPrimary} strokeWidth={2} />
            )}
            <View style={styles.textContainer}>
                <Text style={[styles.roomName, isOpen && styles.roomNameOpen]}>
                    {roomName}
                </Text>
                <Text style={[styles.status, isOpen && styles.statusOpen]}>
                    {isOpen ? 'Open' : 'Closed'}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.standard,
        gap: SPACING.sm,
        minWidth: 150,
    },
    containerClosed: {
        backgroundColor: COLORS.cardBg,
    },
    containerOpen: {
        backgroundColor: COLORS.primary,
    },
    textContainer: {
        flex: 1,
    },
    roomName: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    roomNameOpen: {
        color: COLORS.white,
    },
    status: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    statusOpen: {
        color: COLORS.white,
        opacity: 0.9,
    },
});

export default WindowSensorBadge;
